---
title: GoogleTest分析
published: 2026-07-04
description: 'GoogleTest的核心知识点'
image: './images/GoogleTest.png'
tags: [GoogleTest]
category: 'GoogleTest'
group: tech
draft: false
lang: ''
---

# GoogleTest 技术点分析：字幕讲解 × 实现代码对照

> 本文档以 [视频教程字幕.md](./视频教程字幕.md) 中 Mark 老师讲解的技术点为主线，逐一对照 `mini_gtest/` 目录中的简易实现代码，进行端到端的原理讲解。
> 同时参考了 [GoogleTest原理.md](./GoogleTest原理.md) 中的深入分析。

---

## 目录

1. [技术点一：测试自动注册与发现 —— "不需要枚举"](#tp1)
2. [技术点二：宏展开机制 —— TEST / TEST_F](#tp2)
3. [技术点三：测试层次结构 —— Unit Test → Test Suite → Test Case → Assertion](#tp3)
4. [技术点四：单例模式的全局注册表](#tp4)
5. [技术点五：断言系统 —— EXPECT vs ASSERT](#tp5)
6. [技术点六：致命断言的中止机制 —— FatalFailure 异常](#tp6)
7. [技术点七：测试上下文 TestContext —— 断言与运行器的数据桥](#tp7)
8. [技术点八：TestInfo 元信息与工厂模式](#tp8)
9. [技术点九：Test 基类与 SetUp / TearDown 生命周期](#tp9)
10. [技术点十：TEST_F 测试夹具 —— fixture 数据共享](#tp10)
11. [技术点十一：事件监听机制 —— Observer 模式](#tp11)
12. [技术点十二：内存泄漏检测 —— 埋点 + 事件回调](#tp12)
13. [技术点十三：静态库与 main 函数的作用](#tp13)
14. [技术点十四：GoogleMock 打桩测试的核心思想](#tp14)
15. [技术点十五：宏技巧 —— 字符串化 # 与连接 ##](#tp15)
16. [技术点十六：do-while(false) 惯用法](#tp16)
17. [技术点十七：RUN_ALL_TESTS 完整执行流程](#tp17)
18. [技术点十八：测试框架应具备的特性总结](#tp18)

---

<h2 id="tp1">技术点一：测试自动注册与发现 —— "不需要枚举"</h2>

### 字幕讲解

> 字幕 8:00~11:53：测试代码散落在不同模块中，希望写完测试后能一次性全部执行，不需要手动枚举。做法是用一个容器保存所有测试，通过注册逻辑自动添加，最后统一调用 run 函数遍历执行。

### 实现代码对照

**全局注册表（Registry）—— 测试的"容器"**  
`mini_gtest.h` 第 85~101 行：

```cpp
class Registry {
 public:
  static Registry& Instance() {     // 单例
    static Registry instance;
    return instance;
  }

  bool AddTest(std::string suite_name, std::string test_name, TestFactory factory) {
    tests_.push_back(TestInfo{std::move(suite_name), std::move(test_name),
                              std::move(factory)});
    return true;
  }

  const std::vector<TestInfo>& tests() const { return tests_; }

 private:
  std::vector<TestInfo> tests_;
};
```

**自动注册的关键——静态变量在 main() 前执行**  
`mini_gtest.h` 第 517~523 行，`TEST` 宏展开后的核心代码：

```cpp
bool SomeTestClass::registered_ =           // ← 静态成员变量
    ::mini_testing::Registry::Instance().AddTest(  // 初始化时自动注册
        #test_suite_name, #test_name, [] {
          return std::make_unique<SomeTestClass>();
        });
```

**统一运行入口 RUN_ALL_TESTS**  
`mini_gtest.h` 第 412 行，`RunAllTests()` 读取注册表并遍历执行：

```cpp
inline int RunAllTests() {
  const auto& tests = Registry::Instance().tests();  // 取出所有已注册测试
  for (std::size_t i = 0; i < tests.size(); ++i) {
    // ... 逐个执行
  }
}
```

### 原理讲解

1. C++ 规定全局/静态变量的初始化在 `main()` 之前完成。
2. `TEST` 宏展开后生成一个 `static bool registered_` 变量，其初始化表达式调用了 `Registry::AddTest()`。
3. 所有测试因此在程序启动时就自动"报名"进了注册表。
4. `RUN_ALL_TESTS()` 只需从注册表中读取，逐个执行即可——不需要手动列出测试函数名。

这就是 GoogleTest "写完测试不用枚举" 的核心原理。

---

<h2 id="tp2">技术点二：宏展开机制 —— TEST / TEST_F</h2>

### 字幕讲解

> 字幕 15:12~15:41：通过宏定义的方式，用户只需关注测试内容，不需要关心 if-else 判断、容器添加等框架细节。

### 实现代码对照

**TEST 宏** `mini_gtest.h` 第 508~525 行：

```cpp
#define TEST(test_suite_name, test_name)                                      \
  class MINI_GTEST_CONCAT(test_suite_name, MINI_GTEST_CONCAT(_, test_name))   \
      : public ::mini_testing::Test {                                         \
   public:                                                                    \
    void TestBody() override;                                                 \
   private:                                                                   \
    static bool registered_;                                                  \
  };                                                                          \
  bool MINI_GTEST_CONCAT(test_suite_name, MINI_GTEST_CONCAT(_, test_name))::  \
      registered_ =                                                           \
          ::mini_testing::Registry::Instance().AddTest(                       \
              #test_suite_name, #test_name, [] {                              \
                return std::make_unique<MINI_GTEST_CONCAT(                    \
                    test_suite_name, MINI_GTEST_CONCAT(_, test_name))>();     \
              });                                                             \
  void MINI_GTEST_CONCAT(test_suite_name, MINI_GTEST_CONCAT(_, test_name))::  \
      TestBody()
```

**TEST_F 宏** `mini_gtest.h` 第 527~544 行：

```cpp
#define TEST_F(test_fixture_name, test_name)                                  \
  class MINI_GTEST_CONCAT(test_fixture_name, MINI_GTEST_CONCAT(_, test_name)) \
      : public test_fixture_name {   // ← 注意：继承的是 fixture 类，不是 Test
   public:                                                                    \
    void TestBody() override;                                                 \
   private:                                                                   \
    static bool registered_;                                                  \
  };                                                                          \
  // ... 注册和 TestBody() 定义类似
```

### 展开示例

用户写的：

```cpp
TEST(FactorialTest, HandlesPositiveInput) {
  EXPECT_EQ(Factorial(1), 1);
}
```

展开后大致等价于：

```cpp
class FactorialTest_HandlesPositiveInput : public mini_testing::Test {
 public:
  void TestBody() override;
 private:
  static bool registered_;
};

bool FactorialTest_HandlesPositiveInput::registered_ =
    mini_testing::Registry::Instance().AddTest(
        "FactorialTest", "HandlesPositiveInput",
        [] { return std::make_unique<FactorialTest_HandlesPositiveInput>(); });

void FactorialTest_HandlesPositiveInput::TestBody() {
  EXPECT_EQ(Factorial(1), 1);
}
```

### 原理讲解

- TEST 宏做了三件事：**生成类 → 注册 → 生成 TestBody()**。
- TEST 宏的最后一行是 `void ClassName::TestBody()`，没有函数体。用户写的 `{ ... }` 自然接在后面成为函数体实现。
- TEST_F 与 TEST 的唯一区别：继承的是用户自定义的 fixture 类而非 `Test` 基类。
- 类名通过 `##` 预处理运算符拼接（如 `FactorialTest_HandlesPositiveInput`），保证唯一性。

---

<h2 id="tp3">技术点三：测试层次结构 —— Unit Test → Test Suite → Test Case → Assertion</h2>

### 字幕讲解

> 字幕 30:06~33:26：GoogleTest 有五个层次：单元测试（整个项目一个），下面包含多个测试套件，每个套件包含多个测试案例，每个案例包含多个断言。

```
Unit Test (整个项目)
 ├── Test Suite (一个功能/一个类)
 │    ├── Test Case (该功能的一个测试方向)
 │    │    ├── Assertion 1
 │    │    ├── Assertion 2
 │    │    └── ...
 │    └── Test Case ...
 └── Test Suite ...
```

### 实现代码对照

**在 mini_gtest 中的体现：**

| 层次       | mini_gtest 中对应                                            | 位置                     |
| ---------- | ------------------------------------------------------------ | ------------------------ |
| Unit Test  | `main.cpp` → `RUN_ALL_TESTS()`                               | main.cpp 第 11 行        |
| Test Suite | `TestInfo::suite_name` （如 `"FactorialTest"`）              | mini_gtest.h 第 78~82 行 |
| Test Case  | `TestInfo::test_name` （如 `"HandlesPositiveInput"`）        | mini_gtest.h 第 78~82 行 |
| Assertion  | `EXPECT_EQ(...)` / `ASSERT_TRUE(...)` 产生的 `AssertionRecord` | mini_gtest.h 第 24~31 行 |

**RunAllTests 中的 suite 分组逻辑** `mini_gtest.h` 第 429~443 行：

```cpp
for (std::size_t i = 0; i < tests.size(); ++i) {
  const TestInfo& info = tests[i];

  if (current_suite != info.suite_name) {   // suite 切换时触发事件
    if (!current_suite.empty()) {
      for (const auto& listener : listeners.all()) {
        listener->OnTestSuiteEnd(current_suite);
      }
    }
    current_suite = info.suite_name;
    for (const auto& listener : listeners.all()) {
      listener->OnTestSuiteStart(current_suite);
    }
  }
  // ... 执行测试
}
```

### 原理讲解

- `Registry::tests_` 向量按 `TestInfo` 存储，每个 TestInfo 携带 suite_name 和 test_name。
- 运行器按顺序遍历，当 suite_name 变化时触发 suite 的事件回调。
- TEST 宏的第一个参数是 suite_name，第二个是 test_name——直接对应这两个层次。
- 断言是测试案例内部的具体判断语句，对应最底层。

---

<h2 id="tp4">技术点四：单例模式的全局注册表</h2>

### 字幕讲解

> 字幕 12:21~12:49：因为测试代码分布在不同的模块当中，所以需要用单例模式实现，让所有模块都能访问到同一个注册表对象。

### 实现代码对照

**Registry 单例** `mini_gtest.h` 第 85~101 行：

```cpp
class Registry {
 public:
  static Registry& Instance() {
    static Registry instance;   // ← C++11 保证线程安全的局部静态变量
    return instance;
  }
  // ...
};
```

同样**EventListeners** 也是单例 `mini_gtest.h` 第 132~149 行：

```cpp
class EventListeners {
 public:
  static EventListeners& Instance() {
    static EventListeners instance;
    return instance;
  }
  // ...
};
```

**MemoryTracker** 也是单例 `mini_gtest.h` 第 218~237 行：

```cpp
class MemoryTracker {
 public:
  static MemoryTracker& Instance() {
    static MemoryTracker instance;
    return instance;
  }
  // ...
};
```

### 原理讲解

- 三个全局共享对象都使用了 **Meyer's Singleton**（C++11 局部静态变量）模式。
- 为什么用单例？因为测试分散在多个 .cpp 文件中，静态注册代码在各自的编译单元执行，需要访问同一个注册表对象。
- 如果不用单例，就需要在 main() 中创建对象并传递给每个模块——这在 C++ 静态初始化阶段无法实现。
- 字幕中提到"设计模式中的单例"，正是这个意思。

---

<h2 id="tp5">技术点五：断言系统 —— EXPECT vs ASSERT</h2>

### 字幕讲解

> 字幕 37:16~42:33：断言分两种类型——EXPECT（期望）和 ASSERT（断言）。EXPECT 失败后继续执行，ASSERT 失败后立即中止当前测试。尽量用 EXPECT 以发现多个错误，只有致命场景用 ASSERT。

### 实现代码对照

**断言结果结构** `mini_gtest.h` 第 24~31 行：

```cpp
struct AssertionRecord {
  bool success = true;
  bool fatal = false;       // ← true = ASSERT_*, false = EXPECT_*
  std::string file;
  int line = 0;
  std::string expression;
  std::string message;
};
```

**关键函数：Eq / IsTrue / IsFalse** `mini_gtest.h` 第 328~376 行——这些是断言的实际判断逻辑：

```cpp
template <typename Left, typename Right>
AssertionResult Eq(const Left& left, const Right& right,
                   const char* left_expression, const char* right_expression) {
  if (left == right) return {true, ""};
  // 失败：构造详细错误信息
  std::ostringstream oss;
  oss << "Expected equality of these values:\n"
      << "  " << left_expression << "\n"
      << "    Which is: " << ToString(left) << "\n"
      << "  " << right_expression << "\n"
      << "    Which is: " << ToString(right);
  return {false, oss.str()};
}
```

**宏定义中的 fatal 参数差异** `mini_gtest.h` 第 573~579 行：

```cpp
#define EXPECT_EQ(left, right)       // fatal = false
  MINI_EXPECT_IMPL(..., false)

#define ASSERT_EQ(left, right)       // fatal = true
  MINI_EXPECT_IMPL(..., true)
```

### 原理讲解

1. EXPECT 和 ASSERT 底层用的是同一套判断函数（Eq、Ne、Lt 等）。
2. 区别仅在于传入 `ReportAssertion` 的 `fatal` 参数不同。
3. `AssertionResult` 是轻量返回值（只含 success + message），而 `AssertionRecord` 是完整的现场记录（加上 file、line、expression、fatal）。
4. 字幕中说"断言成对出现"，指的是每个判断功能都有 EXPECT_ 和 ASSERT_ 两个版本。

---

<h2 id="tp6">技术点六：致命断言的中止机制 —— FatalFailure 异常</h2>

### 字幕讲解

> 字幕 40:09：ASSERT 出错会直接报错，后面的流程不会运行了。但整个测试程序不会崩，只是当前测试案例停下来。

### 实现代码对照

**异常类定义** `mini_gtest.h` 第 19~22 行：

```cpp
class FatalFailure final : public std::exception {
 public:
  const char* what() const noexcept override { return "fatal assertion failed"; }
};
```

**触发异常的代码** `mini_gtest.h` 第 403~405 行：

```cpp
if (!record.success && fatal) {
  throw FatalFailure();   // ← ASSERT 失败时抛出，中止当前 TestBody()
}
```

**运行器捕获异常** `mini_gtest.h` 第 454~466 行：

```cpp
try {
  test = info.factory();
  test->SetUp();
  test->TestBody();
} catch (const FatalFailure&) {
  // ASSERT_* 到这里结束当前测试体。不崩溃，继续下一个测试。
} catch (const std::exception& ex) {
  ReportAssertion(__FILE__, __LINE__, "unexpected exception",
                  {false, ex.what()}, true);
} catch (...) {
  ReportAssertion(__FILE__, __LINE__, "unknown exception",
                  {false, "A non-standard exception was thrown."}, true);
}
```

**TearDown 仍然会执行** `mini_gtest.h` 第 468~475 行——注意 TearDown 在 try-catch 外部，所以异常也不会跳过它：

```cpp
try {
  if (test) {
    test->TearDown();    // ← 即使 ASSERT 失败了，TearDown 也会执行
  }
} catch (...) { ... }
```

### 原理讲解

- 用异常作为控制流，而不是 exit() / abort()——这样整个进程不会崩溃。
- 异常被运行器的 try-catch 精确捕获，只终止当前测试体。
- TearDown 在 catch 块之后独立执行，保证资源清理不被跳过。
- 后续测试完全不受影响，继续正常执行。

---

<h2 id="tp7">技术点七：测试上下文 TestContext —— 断言与运行器的数据桥</h2>

### 字幕讲解

> 字幕未直接提及 TestContext，但原理.md 对此做了深入分析：断言不是靠 TestBody 返回 bool 来判成败，而是断言宏在运行期间主动把结果记录到当前测试上下文中。

### 实现代码对照

**TestContext 定义** `mini_gtest.h` 第 51~62 行：

```cpp
class TestContext {
 public:
  void AddAssertion(AssertionRecord record) {
    result_.assertions.push_back(std::move(record));
  }
  TestResult& result() { return result_; }
  const TestResult& result() const { return result_; }
 private:
  TestResult result_;
};

inline TestContext* g_current_context = nullptr;  // ← 全局指针，指向当前测试上下文
```

**断言写入上下文** `mini_gtest.h` 第 397~399 行：

```cpp
if (g_current_context != nullptr) {
  g_current_context->AddAssertion(record);
}
```

**运行器设置上下文** `mini_gtest.h` 第 449~450 行：

```cpp
TestContext context;
g_current_context = &context;   // ← 指向当前测试上下文
// ... 执行 Setup / TestBody / TearDown ...
g_current_context = nullptr;    // ← 执行完毕后清空
```

### 原理讲解

- 每个测试执行时，运行器创建一个新的 TestContext。
- 全局指针 `g_current_context` 指向当前正在执行的测试上下文。
- 断言宏通过 `g_current_context` 找到上下文，写入 AssertionRecord。
- 测试结束后，运行器通过 `context.result().Passed()` 判断该测试是否通过。
- 这解决了"断言发生在 TestBody 内部，运行器在外面怎么知道结果"的问题。

---

<h2 id="tp8">技术点八：TestInfo 元信息与工厂模式</h2>

### 字幕讲解

> 原理.md 中详细讨论了 TestInfo 与 Test 的区别——TestInfo 是"登记表里的一行"，Test 是"真正执行的对象"。二者职责不同，生命周期不同。

### 实现代码对照

**TestInfo 结构体** `mini_gtest.h` 第 78~82 行：

```cpp
struct TestInfo {
  std::string suite_name;   // 套件名
  std::string test_name;    // 测试名
  TestFactory factory;       // 工厂函数
};
```

**TestFactory 类型** `mini_gtest.h` 第 76 行：

```cpp
using TestFactory = std::function<std::unique_ptr<Test>()>;
```

**工厂函数的 lambda 表达式**（TEST 宏内部）`mini_gtest.h` 第 520~523 行：

```cpp
[] {
  return std::make_unique<MINI_GTEST_CONCAT(
      test_suite_name, MINI_GTEST_CONCAT(_, test_name))>();
}
```

### 原理讲解

- TestInfo 是一行"元数据"，包含 suite_name、test_name 和一个创建测试对象的工厂。
- 注册表只存 TestInfo，不存实际的 Test 对象。
- 当运行到某个测试时，才调用 `info.factory()` 创建 Test 对象。
- 这是一种"延迟创建"模式：先登记，再按需构造。
- TestInfo 的存在使框架可以在创建对象之前就知道有哪些测试、如何过滤和排序。

---

<h2 id="tp9">技术点九：Test 基类与 SetUp / TearDown 生命周期</h2>

### 字幕讲解

> 字幕 49:44~50:39：Test 基类中有 SetUp 和 TearDown 两个虚函数。SetUp 在测试开始前回调，TearDown 在结束后回调。可以在 SetUp 里初始化数据，在 TearDown 里清理。

### 实现代码对照

**Test 基类定义** `mini_gtest.h` 第 67~74 行：

```cpp
class Test {
 public:
  virtual ~Test() = default;
  virtual void SetUp() {}       // ← 子类可重写
  virtual void TearDown() {}    // ← 子类可重写
  virtual void TestBody() = 0;  // ← 纯虚函数，必须由 TEST 宏实现
};
```

**运行器中的调用顺序** `mini_gtest.h` 第 454~475 行：

```cpp
test = info.factory();     // 1. 创建测试对象
test->SetUp();             // 2. 准备环境
test->TestBody();          // 3. 执行测试逻辑
// ...                     // 4. （即使异常也执行）清理
test->TearDown();          // 5. 清理资源
```

### 原理讲解

- `SetUp()` 在每个测试的 TestBody() 之前调用，用于准备测试数据。
- `TestBody()` 是由宏生成的纯虚函数实现，包含用户的测试代码。
- `TearDown()` 在 TestBody() 之后（即使发生异常）也会执行，用于清理资源。
- 对普通 TEST（非 TEST_F），SetUp/TearDown 是空实现，什么都不做。
- 对 TEST_F，用户在 fixture 类中重写 SetUp/TearDown 以初始化共享数据。

---

<h2 id="tp10">技术点十：TEST_F 测试夹具 —— fixture 数据共享</h2>

### 字幕讲解

> 字幕 44:28~56:53：测试夹具让多个测试案例共享数据。需要继承 testing::Test，用 TEST_F 代替 TEST。每个测试案例会创建新的 fixture 对象，SetUp 每次都会重新执行。

### 实现代码对照

**pass_demo_tests.cpp 中的 fixture 示例** `pass_demo_tests.cpp` 第 52~81 行：

```cpp
class QueueTest : public mini_testing::Test {   // 继承 Test
 protected:
  void SetUp() override {     // 每个测试前都会调用
    q1_.push(1);
    q2_.push(2);
    q2_.push(3);
  }

  std::queue<int> q0_;
  std::queue<int> q1_;
  std::queue<int> q2_;
};

TEST_F(QueueTest, IsEmptyInitially) {   // 第一个测试案例
  EXPECT_TRUE(q0_.empty());
  EXPECT_EQ(q1_.size(), 1u);
  EXPECT_EQ(q2_.size(), 2u);
}

TEST_F(QueueTest, DequeueWorks) {       // 第二个测试案例
  ASSERT_FALSE(q1_.empty());
  EXPECT_EQ(q1_.front(), 1);
  // ...
}
```

**TEST_F 宏的关键差异** `mini_gtest.h` 第 528~529 行：

```cpp
class MINI_GTEST_CONCAT(test_fixture_name, MINI_GTEST_CONCAT(_, test_name))
    : public test_fixture_name {    // ← 继承 fixture 类，非 Test 基类
```

### 原理讲解

- `QueueTest` 是用户定义的 fixture 类，继承自 `Test`，包含成员变量和 SetUp。
- `TEST_F(QueueTest, ...)` 生成的类继承自 `QueueTest`，因此可以使用 `q0_`、`q1_`、`q2_`。
- 每个测试（IsEmptyInitially、DequeueWorks）都会创建**新的** QueueTest 子类对象。
- SetUp() 在每个测试对象创建后、TestBody 执行前各调用一次。
- 这保证了测试的独立性：一个测试修改了 queue 不会影响下一个测试。

---

<h2 id="tp11">技术点十一：事件监听机制 —— Observer 模式</h2>

### 字幕讲解

> 字幕 57:21~1:00:11：事件机制就是在单元测试/测试套件/测试案例/断言的前后做埋点工作（回调函数）。可以在不同维度插入自定义逻辑。

### 实现代码对照

**EventListener 接口** `mini_gtest.h` 第 105~130 行：

```cpp
class EventListener {
 public:
  virtual ~EventListener() = default;

  virtual void OnTestProgramStart(int total_test_count) {}
  virtual void OnTestProgramEnd(int passed_count, int failed_count) {}
  virtual void OnTestSuiteStart(const std::string& suite_name) {}
  virtual void OnTestSuiteEnd(const std::string& suite_name) {}
  virtual void OnTestStart(const TestInfo& test_info) {}
  virtual void OnAssertionResult(const AssertionRecord& assertion) {}
  virtual void OnTestEnd(const TestInfo& test_info, const TestResult& result) {}
};
```

共 7 个回调点，覆盖四个维度：

| 维度     | 开始事件             | 结束事件           |
| -------- | -------------------- | ------------------ |
| 测试程序 | `OnTestProgramStart` | `OnTestProgramEnd` |
| 测试套件 | `OnTestSuiteStart`   | `OnTestSuiteEnd`   |
| 测试案例 | `OnTestStart`        | `OnTestEnd`        |
| 断言     | `OnAssertionResult`  | —                  |

**EventListeners 管理器** `mini_gtest.h` 第 132~149 行：

```cpp
class EventListeners {
 public:
  static EventListeners& Instance();
  void Append(std::unique_ptr<EventListener> listener);
  const std::vector<std::unique_ptr<EventListener>>& all() const;
 private:
  std::vector<std::unique_ptr<EventListener>> listeners_;
};
```

**广播事件的方式** `mini_gtest.h` 第 378~382 行（以断言通知为例）：

```cpp
inline void NotifyAssertion(const AssertionRecord& record) {
  for (const auto& listener : EventListeners::Instance().all()) {
    listener->OnAssertionResult(record);   // ← 逐个通知所有监听器
  }
}
```

**DefaultPrinter 实现** `mini_gtest.h` 第 155~203 行：

```cpp
class DefaultPrinter final : public EventListener {
 public:
  void OnTestProgramStart(int total_test_count) override {
    std::cout << "[==========] Running " << total_test_count << " tests.\n";
  }
  void OnTestStart(const TestInfo& test_info) override {
    std::cout << "[ RUN      ] " << test_info.suite_name << '.'
              << test_info.test_name << '\n';
  }
  void OnAssertionResult(const AssertionRecord& assertion) override {
    if (assertion.success) return;
    std::cout << assertion.file << ':' << assertion.line << ": Failure\n"
              << assertion.expression << '\n'
              << assertion.message << '\n';
  }
  void OnTestEnd(const TestInfo& test_info, const TestResult& result) override {
    if (result.Passed()) {
      std::cout << "[       OK ] " << ...;
    } else {
      std::cout << "[  FAILED  ] " << ...;
    }
  }
  // ...
};
```

### 原理讲解

- 这是典型的**观察者模式**（Observer Pattern）：运行器是被观察者，EventListener 是观察者。
- 运行器不关心"怎么输出"，只在关键节点广播事件。
- 任何监听器都可以挂载进来做自定义处理（打印、写日志、统计、内存检测等）。
- 优点：输出格式、报告生成、内存检测等可以独立扩展，无需修改运行器核心逻辑。

---

<h2 id="tp12">技术点十二：内存泄漏检测 —— 埋点 + 事件回调</h2>

### 字幕讲解

> 字幕 1:00:38~1:06:37：内存泄漏检测依赖于事件机制。在测试案例开始前记录对象个数，结束后再检查。如果结束后的数量大于开始前，说明发生了泄漏。C++ 中通过重载 operator new/delete 实现，本简易框架通过 TrackedNew/TrackedDelete 做教学演示。

### 实现代码对照

**MemoryTracker 计数器** `mini_gtest.h` 第 218~237 行：

```cpp
class MemoryTracker {
 public:
  static MemoryTracker& Instance();
  void OnAllocate() { ++alive_objects_; }
  void OnDeallocate() { if (alive_objects_ > 0) --alive_objects_; }
  std::size_t alive_objects() const { return alive_objects_; }
 private:
  std::size_t alive_objects_ = 0;
};
```

**TrackedNew / TrackedDelete 埋点函数** `mini_gtest.h` 第 239~249 行：

```cpp
template <typename T, typename... Args>
T* TrackedNew(Args&&... args) {
  MemoryTracker::Instance().OnAllocate();   // ← 分配时计数 +1
  return new T(std::forward<Args>(args)...);
}

template <typename T>
void TrackedDelete(T* ptr) {
  delete ptr;
  MemoryTracker::Instance().OnDeallocate(); // ← 释放时计数 -1
}
```

**MemoryLeakListener 监听器** `mini_gtest.h` 第 251~274 行：

```cpp
class MemoryLeakListener final : public EventListener {
 public:
  void OnTestStart(const TestInfo& test_info) override {
    before_ = MemoryTracker::Instance().alive_objects();  // ← 测试前快照
  }

  void OnTestEnd(const TestInfo& test_info, const TestResult& result) override {
    const std::size_t after = MemoryTracker::Instance().alive_objects();
    if (after > before_) {   // ← 结束后存活对象 > 开始前 → 泄漏！
      std::ostringstream oss;
      oss << "Possible memory leak: " << (after - before_)
          << " tracked object(s) not released in this test.";
      ReportAssertion(__FILE__, __LINE__, "tracked memory leak",
                      {false, oss.str()}, false);
    }
  }
 private:
  std::size_t before_ = 0;
};
```

**main.cpp 中注册监听器** `main.cpp` 第 6~9 行：

```cpp
mini_testing::AddGlobalTestEnvironment(
    std::make_unique<mini_testing::MemoryLeakListener>());
mini_testing::AddGlobalTestEnvironment(
    std::make_unique<mini_testing::DefaultPrinter>());
```

**failure_demo_tests.cpp 中的泄漏演示** `failure_demo_tests.cpp` 第 18~23 行：

```cpp
TEST(MemoryLeakDemoTest, ReportsTrackedLeakAtTestEnd) {
  int* leaked = MGT_NEW(int, 100);   // 分配但未释放
  EXPECT_EQ(*leaked, 100);
  // 故意不调用 MGT_DELETE(leaked)
}
```

### 原理讲解

- 利用事件机制的 `OnTestStart` 和 `OnTestEnd` 做"前后对比"。
- 每个测试独立检测：测试开始时记快照，结束时比较差异。
- 这套方案依赖于用户使用 `MGT_NEW` / `MGT_DELETE` 宏而非原生 new/delete。
- 字幕中讲到的真实 GoogleTest 方案是重载全局 operator new/delete，原理相同但更透明。
- 在 C 语言中无法重载操作符，需要用 hook 技术拦截 malloc/free。

---

<h2 id="tp13">技术点十三：静态库与 main 函数的作用</h2>

### 字幕讲解

> 字幕 19:32~24:50：GoogleTest 编译后生成 libgtest.a（测试流程逻辑）和 libgtest_main.a（提供 main 函数，负责初始化并调用所有测试）。写测试时不需要自己写 main 函数。

### 实现代码对照

**main.cpp 中的 main 函数** `main.cpp` 第 5~11 行：

```cpp
int main() {
  mini_testing::AddGlobalTestEnvironment(
      std::make_unique<mini_testing::MemoryLeakListener>());
  mini_testing::AddGlobalTestEnvironment(
      std::make_unique<mini_testing::DefaultPrinter>());

  return RUN_ALL_TESTS();
}
```

**编译配置** `CMakeLists.txt` 第 5~12 行——两个可执行文件共用同一个 main.cpp：

```cmake
add_executable(mini_gtest_pass_demo     main.cpp  pass_demo_tests.cpp)
add_executable(mini_gtest_failure_demo  main.cpp  failure_demo_tests.cpp)
```

### 原理讲解

- **libgtest.a**（静态库）：包含测试流程的核心逻辑——注册表、运行器、断言系统、事件监听等。对应本项目中 `mini_gtest.h` 中的大部分内容。
- **libgtest_main.a**（静态库）：提供一个默认的 main 函数。对应本项目的 `main.cpp`。
- 当你链接 `-lgtest` 而不链接 `-lgtest_main` 时，需要自己写 main 函数。
- 当你链接 `-lgtest_main` 时，框架自动提供 main，init + run 一气呵成。
- 字幕中说"测试案例中没有 main 函数也能编译"，就是因为链接了 gtest_main。

**静态库 vs 动态库：**

- 静态库（.a / .lib）：编译时链接进可执行文件，运行时不需要额外文件。
- 动态库（.so / .dll）：运行时加载，多个程序可共享，更新库不需要重新编译程序。

---

<h2 id="tp14">技术点十四：GoogleMock 打桩测试的核心思想</h2>

### 字幕讲解

> 字幕 26:17~1:18:56：GoogleMock 用于模拟复杂的依赖（网络、文件、其他模块）。核心是通过一个 Mock 类模拟被依赖对象的行为，然后用 EXPECT_CALL 描述期望行为（调用哪个接口、调用多少次、参数是什么、返回值是什么、调用顺序）。

### 实现代码对照

本项目中**没有实现 GoogleMock 的打桩功能**，因为 mini_gtest 只实现了测试框架的核心运行逻辑。但理解其原理对整体认知很重要。

### 原理讲解

打桩测试的核心五要素（字幕 1:14:11~1:15:08）：

1. **调用哪个接口**：`EXPECT_CALL(mock_obj, MethodName(...))` 指定模拟哪个方法。
2. **调用多少次**：`.Times(n)` 指定期望调用的次数。
3. **调用顺序**：多个 `EXPECT_CALL` 按照书写顺序构成期望的调用顺序。
4. **参数是什么**：`.With(Args(...))` 指定期望的参数值。
5. **返回值是什么**：`.WillOnce(Return(value))` 或 `.WillRepeatedly(Return(value))`。

GoogleMock 与 GoogleTest 的关系（字幕 28:12~29:10）：

- GMock **包含于** GTest 的基础上开发。
- 如果项目同时使用 GTest 和 GMock，只需包含 GMock 的头文件和库（它内部已包含 GTest）。
- GMock 的断言宏（EXPECT_CALL 等）底层复用 GTest 的断言上报机制。

---

<h2 id="tp15">技术点十五：宏技巧 —— 字符串化 # 与连接 ##</h2>

### 字幕讲解

> 字幕未直接讲解预处理技巧，但这是理解 TEST 宏的核心基础知识。

### 实现代码对照

**连接运算符 ##** `mini_gtest.h` 第 505~506 行：

```cpp
#define MINI_GTEST_CONCAT_IMPL(left, right) left##right
#define MINI_GTEST_CONCAT(left, right) MINI_GTEST_CONCAT_IMPL(left, right)
```

为什么需要两层宏？因为 `##` 会阻止参数的宏展开。两层宏确保参数先展开再拼接：

- `MINI_GTEST_CONCAT(FactorialTest, _HandlesPositiveInput)` → `FactorialTest_HandlesPositiveInput`

**字符串化运算符 #** 在 TEST 宏中使用 `mini_gtest.h` 第 520 行：

```cpp
#test_suite_name, #test_name
```

将宏参数转为字符串字面量：

- `TEST(FactorialTest, HandlesPositiveInput)` → `"FactorialTest"`, `"HandlesPositiveInput"`

**断言宏中的字符串化** `mini_gtest.h` 第 555~556 行：

```cpp
#define EXPECT_TRUE(condition)
  MINI_EXPECT_IMPL(::mini_testing::IsTrue(static_cast<bool>(condition),
                                          #condition),        // ← 把条件表达式变成字符串
                   "EXPECT_TRUE(" #condition ")", false)      // ← 拼接成完整表达式文本
```

### 原理讲解

- `#` 运算符：将宏参数转换为 C 字符串字面量，如 `#condition` → `"condition"`。
- `##` 运算符：将两个 token 拼接成一个新 token，如 `a ## b` → `ab`。
- 两层 `MINI_GTEST_CONCAT` 的原因：如果参数本身也是宏，需要先展开再拼接。直接使用 `##` 会阻止参数展开。

---

<h2 id="tp16">技术点十六：do-while(false) 惯用法</h2>

### 实现代码对照

**MINI_EXPECT_IMPL 宏** `mini_gtest.h` 第 546~551 行：

```cpp
#define MINI_EXPECT_IMPL(assertion_result, expression_text, fatal)            \
  do {                                                                        \
    const auto mini_gtest_result = (assertion_result);                        \
    ::mini_testing::ReportAssertion(__FILE__, __LINE__, expression_text,      \
                                    mini_gtest_result, fatal);                \
  } while (false)
```

### 原理讲解

为什么用 `do { ... } while(false)` 而不是直接用 `{ ... }`？

```cpp
// 如果用 { ... } 包裹：
if (condition)
  EXPECT_EQ(a, b);   // 展开为 { ... };  ← 末尾的分号会破坏 if-else 语法
else
  do_something();

// 如果用 do { ... } while(false)：
if (condition)
  do { ... } while(false);  // ← 分号是 do-while 语句的一部分，语法正确
else
  do_something();
```

`do { ... } while(false)` 技巧：

1. 创建一个块作用域，局部变量不会泄漏。
2. 吃掉末尾的分号，使宏可以像普通语句一样使用（`EXPECT_EQ(...);`）。
3. 确保只有一个入口和一个出口。

---

<h2 id="tp17">技术点十七：RUN_ALL_TESTS 完整执行流程</h2>

### 实现代码对照

**RunAllTests 完整实现** `mini_gtest.h` 第 412~501 行：

```cpp
inline int RunAllTests() {
  // 1. 确保有默认打印器
  auto& listeners = EventListeners::Instance();
  if (listeners.all().empty()) {
    listeners.Append(std::make_unique<DefaultPrinter>());
  }

  // 2. 获取所有已注册测试
  const auto& tests = Registry::Instance().tests();

  // 3. 广播：测试程序开始
  for (const auto& listener : listeners.all()) {
    listener->OnTestProgramStart(static_cast<int>(tests.size()));
  }

  int passed_count = 0;
  int failed_count = 0;
  std::string current_suite;

  // 4. 遍历每个测试
  for (std::size_t i = 0; i < tests.size(); ++i) {
    const TestInfo& info = tests[i];

    // suite 切换 → 广播 suite 结束/开始
    if (current_suite != info.suite_name) {
      if (!current_suite.empty()) { /* OnTestSuiteEnd */ }
      current_suite = info.suite_name;
      /* OnTestSuiteStart */
    }

    // 5. 广播：测试用例开始
    /* OnTestStart */

    // 6. 创建上下文
    TestContext context;
    g_current_context = &context;

    // 7. 执行测试
    std::unique_ptr<Test> test;
    try {
      test = info.factory();   // 创建对象
      test->SetUp();           // 准备
      test->TestBody();        // 执行
    } catch (const FatalFailure&) {
      // ASSERT 失败
    } catch (...) { /* 意外异常 */ }

    // 8. 清理（即使异常也执行）
    try { if (test) test->TearDown(); } catch (...) { }

    // 9. 广播：测试用例结束
    /* OnTestEnd */

    g_current_context = nullptr;

    // 10. 统计结果
    if (context.result().Passed()) ++passed_count;
    else ++failed_count;
  }

  // 11. 最后一个 suite 结束
  /* OnTestSuiteEnd */

  // 12. 广播：测试程序结束
  /* OnTestProgramEnd */

  // 13. 返回退出码（CI 系统根据此判断成败）
  return failed_count == 0 ? 0 : 1;
}
```

### 原理讲解

流程概览：

```
获取注册表 → OnTestProgramStart → 遍历测试 → [OnTestStart → 创建Context → 
factory() → SetUp() → TestBody() → TearDown() → OnTestEnd] × N →
OnTestProgramEnd → 返回 exit code
```

关键点：

- **退出码**：全通过返回 0，有失败返回 1——CI/CD 系统据此判断构建是否成功。
- **异常安全**：测试体、TearDown 都有独立的 try-catch，单个测试失败不影响整体。
- **suite 边界**：通过比较 suite_name 的变化触发 suite 级别的开始/结束事件。

---

<h2 id="tp18">技术点十八：测试框架应具备的特性总结</h2>

### 字幕讲解

> 字幕 2:23~9:29，Mark 老师总结了好测试框架的六大特性。

| 特性                 | 字幕描述                                | mini_gtest 中的体现                                |
| -------------------- | --------------------------------------- | -------------------------------------------------- |
| **独立的、可重复的** | 测试彼此不干扰，可以反复运行            | 每个测试独立创建对象，独立 TestContext，互不影响   |
| **反映代码结构**     | 通过测试代码能知道被测功能              | suite_name 对应功能/类，test_name 描述测试方向     |
| **具备完备性**       | 覆盖边界情况（负数、0、1、大数等）      | IsPrimeTest 测试了 -1, 0, 1, 2, 4, 9, 25           |
| **提供详细错误信息** | 失败时输出 file:line 和期望值 vs 实际值 | Eq/Ne/Lt 函数生成详细消息，error_demo 输出具体差异 |
| **一次发现多个错误** | EXPECT 失败后继续执行                   | EXPECT_EQ 的 fatal=false，不中止测试体             |
| **简洁、无需枚举**   | 自动跟踪，不需要手动列举                | 静态注册 + 全局注册表实现自动发现                  |
| **执行高效**         | 运行速度要快                            | header-only 设计，无动态反射开销                   |

---

## 总结：核心模型

GoogleTest 的核心可以压缩为一条主线：

```
TEST/TEST_F 宏展开（生成类 + 注册代码）
    → 静态变量在 main() 前初始化（自动注册进 Registry）
    → RUN_ALL_TESTS() 遍历 Registry 中所有 TestInfo
    → factory() 创建 Test 对象
    → SetUp() → TestBody()（其中 EXPECT/ASSERT 将结果写入 TestContext）
    → TearDown()
    → EventListener 输出结果、检测泄漏、统计汇总
    → 返回退出码（0 = 全通过，1 = 有失败）
```

六个关键词：**宏展开 + 静态注册 + 统一运行器 + 断言上报 + 事件监听 + 退出码**。
