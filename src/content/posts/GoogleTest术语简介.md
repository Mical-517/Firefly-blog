---
title: GoogleTest术语简介.md
published: 2026-07-04
description: '简单介绍一下GoogleTest中的概念'
image: ''
tags: [GoogleTest]
category: 'c++环境配置'
group: tech
postType: post
draft: false
lang: ''
---

# GoogleTest 术语分析

> 本文档以 [视频教程字幕.md](./视频教程字幕.md) 和 [mini_gtest](./mini_gtest/) 简易实现为基础，系统梳理 GoogleTest 生态中的关键术语和概念。

---

## 一、测试层次相关

### 1. 单元测试（Unit Test）

**定义**：对一个软件中的最小可测试单元（通常是一个函数或一个类的方法）进行验证的测试方法。

**在本项目中的位置**：整个 `mini_gtest` 项目就是一个单元测试框架。在 GoogleTest 层次结构中，"单元测试"指整个测试程序，对应一个项目。通常一个项目只需要一个单元测试程序。

**层次位置**：最顶层。`main()` → `RUN_ALL_TESTS()` → 整个测试程序。

---

### 2. 测试套件（Test Suite）

**定义**：一组相关测试的集合，通常对应一个被测功能或一个被测类。例如 `FactorialTest` 套件包含所有测试阶乘函数的测试。

**在本项目中的位置**：`TEST` 宏的第一个参数就是测试套件名。

```cpp
TEST(FactorialTest, HandlesZeroInput) { ... }     // 套件名：FactorialTest
TEST(FactorialTest, HandlesPositiveInput) { ... }  // 同一个套件
```

**在运行时的体现**：`RunAllTests()` 中通过比较 `current_suite` 来判断套件切换，切换时触发 `OnTestSuiteStart` / `OnTestSuiteEnd` 事件，控制台输出 `[----------] FactorialTest`。

---

### 3. 测试案例 / 测试用例（Test Case）

**定义**：测试套件下的一个具体测试，验证一个特定的输入场景或行为方向。例如 `HandlesZeroInput` 测试阶乘函数对输入 0 的处理。

**在本项目中的位置**：`TEST` 宏的第二个参数就是测试案例名。

```cpp
TEST(FactorialTest, HandlesZeroInput) { ... }       // 案例名：HandlesZeroInput
TEST(FactorialTest, HandlesPositiveInput) { ... }    // 案例名：HandlesPositiveInput
```

**在运行时的体现**：每个测试案例在运行时创建一个新的测试类实例，独立执行 SetUp → TestBody → TearDown 生命周期。

---

### 4. 断言（Assertion）

**定义**：测试案例内部的验证语句，用于判断实际值是否等于期望值。是测试的最小执行单元。

**在本项目中的位置**：`EXPECT_EQ`、`ASSERT_TRUE`、`EXPECT_FALSE` 等宏。

```cpp
EXPECT_EQ(Factorial(3), 6);   // 断言：Factorial(3) 应该等于 6
EXPECT_TRUE(IsPrime(2));      // 断言：IsPrime(2) 应该返回 true
```

**层次关系图**：

```
Unit Test（整个测试程序）
 ├── Test Suite（测试套件，如 FactorialTest）
 │    ├── Test Case（测试案例，如 HandlesPositiveInput）
 │    │    ├── Assertion 1（EXPECT_EQ(Factorial(1), 1)）
 │    │    ├── Assertion 2（EXPECT_EQ(Factorial(2), 2)）
 │    │    └── Assertion 3（EXPECT_EQ(Factorial(3), 6)）
 │    └── Test Case（测试案例，如 HandlesZeroInput）
 └── Test Suite（测试套件，如 IsPrimeTest）
      └── ...
```

---

### 5. 非致命断言 vs 致命断言（EXPECT vs ASSERT）

| 类型           | 宏前缀     | 失败后行为                     | 使用场景                             |
| -------------- | ---------- | ------------------------------ | ------------------------------------ |
| **非致命断言** | `EXPECT_*` | 记录失败，当前测试案例继续执行 | 一般业务验证，希望看到所有失败点     |
| **致命断言**   | `ASSERT_*` | 记录失败，立即中止当前测试案例 | 前置条件不满足时继续执行无意义或危险 |

**示例**：

```cpp
// EXPECT 失败后继续
EXPECT_EQ(1 + 1, 3);   // 失败，但后面还会执行
EXPECT_TRUE(true);      // 仍然执行

// ASSERT 失败后中止
ASSERT_NE(ptr, nullptr); // 如果失败，下面不执行
EXPECT_EQ(*ptr, 42);     // 不会执行（防止空指针解引用）
```

**实现原理**：两者的底层判断逻辑完全相同（都调用 `Eq`、`IsTrue` 等函数），区别仅在于传入 `ReportAssertion` 的 `fatal` 参数。当 `fatal=true` 且断言失败时，抛出 `FatalFailure` 异常中止测试体。

---

## 二、框架核心概念

### 6. 测试夹具（Test Fixture）

**定义**：允许在多个测试案例之间共享数据初始化和清理逻辑的机制。用户定义一个继承自 `testing::Test` 的类，在其中声明成员变量、重写 `SetUp()` 和 `TearDown()`。

**关键特征**：

- 每个测试案例创建**新的** fixture 对象（不会共享同一个对象的状态）。
- `SetUp()` 在每个测试案例开始前执行。
- `TearDown()` 在每个测试案例结束后执行（即使测试失败）。

**在本项目中的位置**：`pass_demo_tests.cpp` 中的 `QueueTest` 类配合 `TEST_F` 宏。

```cpp
class QueueTest : public mini_testing::Test {
 protected:
  void SetUp() override {
    q1_.push(1);
    q2_.push(2);
    q2_.push(3);
  }
  std::queue<int> q0_, q1_, q2_;
};

TEST_F(QueueTest, IsEmptyInitially) { ... }
TEST_F(QueueTest, DequeueWorks) { ... }
```

**与简单测试（TEST）的区别**：

|                | `TEST`               | `TEST_F`                  |
| -------------- | -------------------- | ------------------------- |
| 生成的类继承   | `mini_testing::Test` | 用户自定义 fixture 类     |
| 数据共享       | 不支持               | 通过 fixture 成员变量共享 |
| SetUp/TearDown | 默认空实现           | 用户可自定义              |

---

### 7. 静态注册（Static Registration）

**定义**：利用 C++ 静态变量在 `main()` 函数执行前初始化的特性，将测试信息自动添加到全局注册表中，无需手动列举测试。

**工作原理**：

1. `TEST` 宏展开后生成一个 `static bool registered_` 变量。
2. 该变量的初始化表达式调用 `Registry::AddTest(...)`。
3. C++ 标准保证全局/静态变量在 `main()` 之前初始化。
4. 因此，当 `main()` 开始执行时，所有测试已自动注册完毕。

**在本项目中的位置**：`mini_gtest.h` 第 517~523 行。

---

### 8. 注册表（Registry）

**定义**：一个全局单例对象，保存所有已注册测试的元信息（`TestInfo`）。运行器通过读取注册表来获知有哪些测试需要执行。

**在本项目中的位置**：`mini_gtest.h` 第 85~101 行的 `Registry` 类。

**核心接口**：

- `AddTest(suite_name, test_name, factory)` —— 注册一个测试。
- `tests()` —— 返回所有已注册测试的列表。

**数据结构**：内部使用 `std::vector<TestInfo>` 存储测试元信息。

---

### 9. 测试上下文（TestContext）

**定义**：每个测试案例执行期间的数据容器，保存该测试产生的所有断言记录。运行器通过测试上下文判断该测试通过还是失败。

**生命周期**：每次执行一个测试案例时，运行器创建一个新的 `TestContext`。测试结束后销毁。

**在本项目中的位置**：`mini_gtest.h` 第 51~62 行。通过全局指针 `g_current_context` 访问。

```cpp
TestContext context;               // 创建
g_current_context = &context;      // 指向当前上下文
// ... 执行测试 ...
g_current_context = nullptr;       // 清空
```

**与 TestResult 的关系**：`TestContext` 内部包含一个 `TestResult` 对象，`TestResult` 包含一个 `std::vector<AssertionRecord>`。

---

### 10. TestInfo（测试元信息）

**定义**：注册表中描述一个测试的数据结构，包含套件名、测试名和工程函数。它在测试对象创建之前就存在。

**与 Test 的区别**：

| 对象       | 角色                | 存在时机                         |
| ---------- | ------------------- | -------------------------------- |
| `TestInfo` | 测试目录项 / 元数据 | 程序启动时（静态注册阶段）已存在 |
| `Test`     | 真正执行的测试对象  | 运行到该测试时才创建             |

**为什么需要两者分离**：如果没有 TestInfo，框架在创建对象之前无法知道有哪些测试、如何过滤、排序和输出日志。

---

### 11. 事件监听器（EventListener）

**定义**：实现观察者模式的回调接口，允许在测试生命周期的关键节点插入自定义逻辑。共 7 个回调点，覆盖程序/套件/案例/断言四个维度。

**7 个回调事件**：

| 回调方法                           | 触发时机           |
| ---------------------------------- | ------------------ |
| `OnTestProgramStart(total)`        | 测试程序开始前     |
| `OnTestProgramEnd(passed, failed)` | 所有测试结束后     |
| `OnTestSuiteStart(suite_name)`     | 进入新的测试套件时 |
| `OnTestSuiteEnd(suite_name)`       | 测试套件结束时     |
| `OnTestStart(test_info)`           | 每个测试案例开始前 |
| `OnTestEnd(test_info, result)`     | 每个测试案例结束后 |
| `OnAssertionResult(assertion)`     | 每次断言判断后     |

**在本项目中的实现**：

- `DefaultPrinter`：控制台输出 GoogleTest 风格的 `[ RUN ]` / `[ OK ]` / `[ FAILED ]` 日志。
- `MemoryLeakListener`：在测试开始/结束时记录对象数量，检测泄漏。

---

### 12. 运行器（Runner）

**定义**：测试的执行引擎，负责从注册表读取所有测试，按顺序为每个测试创建上下文、构造测试对象、执行生命周期方法、收集结果并返回退出码。

**在本项目中的位置**：`mini_gtest.h` 第 412~501 行的 `RunAllTests()` 函数。通过 `RUN_ALL_TESTS()` 宏调用。

---

## 三、C++ 语言机制相关

### 13. 宏（Macro）

**定义**：C/C++ 预处理指令 `#define` 定义的代码替换规则。在编译前由预处理器进行文本替换。

**GoogleTest 中的关键宏用途**：

- `TEST` / `TEST_F`：生成测试类、静态注册变量和 TestBody 函数体。
- `EXPECT_*` / `ASSERT_*`：展开为断言判断 + 结果上报代码。
- `MGT_NEW` / `MGT_DELETE`：包装内存追踪函数。

**关键预处理运算符**：

- `#`（字符串化）：`#param` → `"param"`（将参数转为字符串字面量）。
- `##`（连接）：`a ## b` → `ab`（将两个 token 拼接成一个）。

---

### 14. 单例模式（Singleton Pattern）

**定义**：确保一个类只有一个实例，并提供全局访问点。GoogleTest 中多个核心组件都是单例。

**在本项目中的单例类**：

- `Registry`：全局测试注册表。
- `EventListeners`：全局监听器管理器。
- `MemoryTracker`：全局内存计数器。

**实现方式**：均使用 C++11 的 Meyer's Singleton（函数内局部静态变量），天然线程安全。

---

### 15. 工厂模式（Factory Pattern）

**定义**：通过工厂函数/工厂类创建对象，而不是直接使用 new。GoogleTest 中通过工厂模式在运行时按需创建测试对象。

**在本项目中的体现**：

```cpp
using TestFactory = std::function<std::unique_ptr<Test>()>;

// 注册时传入 lambda 作为工厂
[] { return std::make_unique<SomeTestClass>(); }

// 运行时调用工厂创建对象
std::unique_ptr<Test> test = info.factory();
```

**优点**：注册表不存储实际对象，只存储"如何创建对象"的函数，实现了"延迟创建"。

---

### 16. 观察者模式（Observer Pattern）

**定义**：定义对象间的一对多依赖关系，当一个对象状态改变时，所有依赖它的对象都会得到通知。

**GoogleTest 中的应用**：运行器（被观察者）在测试生命周期关键节点广播事件，EventListeners（观察者）接收并处理这些事件。

**优点**：输出格式、统计报告、内存检测等功能可以独立扩展，无需修改运行器核心逻辑。

---

### 17. do-while(false) 惯用法

**定义**：在宏定义中使用 `do { ... } while(false)` 包裹多行代码，使宏展开后像一个普通语句。

**为什么需要**：

- 创建一个块作用域，局部变量不泄漏。
- 确保宏末尾的分号能正确参与语法（如 if-else 语句）。
- 保证只有一个入口和一个出口。

**在本项目中的位置**：`mini_gtest.h` 第 546~551 行的 `MINI_EXPECT_IMPL` 宏。

---

### 18. 纯虚函数（Pure Virtual Function）

**定义**：在基类中声明为 `= 0` 的虚函数，强制派生类必须实现。

**在 GoogleTest 中**：`Test::TestBody()` 是一个纯虚函数，由 `TEST` 宏展开后生成的子类实现。

```cpp
class Test {
 public:
  virtual void TestBody() = 0;  // 纯虚函数，子类必须实现
};
```

---

## 四、库与编译相关

### 19. 静态库（Static Library）

**定义**：编译时直接链接进可执行文件的库。扩展名 `.a`（Linux/macOS）或 `.lib`（Windows）。运行时不需要额外的库文件。

**GoogleTest 中的静态库**：

- `libgtest.a`：包含测试框架核心逻辑（注册表、运行器、断言系统）。
- `libgtest_main.a`：提供一个默认的 `main()` 函数。

**编译时链接**：

```bash
g++ test.cpp -L/path/to/lib -lgtest -lgtest_main -lpthread -o test
# -lgtest      链接 libgtest.a
# -lgtest_main 链接 libgtest_main.a（提供 main 函数）
```

**优点**：运行时不需要依赖外部文件，执行速度快。
**缺点**：如果多个程序使用同一个库，每个程序都包含一份拷贝，占用更多磁盘空间。

---

### 20. 动态库（Dynamic Library / Shared Library）

**定义**：运行时才加载的库。扩展名 `.so`（Linux/macOS）或 `.dll`（Windows）。多个程序可以共享同一个动态库文件。

**与静态库的对比**：

|          | 静态库               | 动态库         |
| -------- | -------------------- | -------------- |
| 链接时机 | 编译时               | 运行时         |
| 文件大小 | 每个程序包含完整拷贝 | 多程序共享一份 |
| 更新方式 | 需要重新编译程序     | 替换库文件即可 |
| 启动速度 | 较快                 | 需要加载时间   |
| 依赖性   | 无运行时依赖         | 运行时必须存在 |

---

### 21. main 函数的作用

**定义**：C/C++ 程序的入口点。在 GoogleTest 中，main 函数负责初始化框架并运行所有测试。

**两种方式**：

1. **链接 gtest_main 库**——不需要自己写 main 函数，框架自动提供。适合简单场景。
2. **自己写 main 函数**——可以自定义初始化逻辑（如注册监听器）。适合需要扩展的场景。

**本项目中自己写 main**：

```cpp
int main() {
  mini_testing::AddGlobalTestEnvironment(
      std::make_unique<mini_testing::MemoryLeakListener>());
  mini_testing::AddGlobalTestEnvironment(
      std::make_unique<mini_testing::DefaultPrinter>());
  return RUN_ALL_TESTS();
}
```

---

## 五、测试方法相关

### 22. 打桩测试（Mock / Stub Testing）

**定义**：用模拟对象替代真实的依赖对象，使测试能隔离地进行。当被测模块依赖外部服务（网络、数据库、文件系统）或复杂模块时使用。

**GoogleMock 的核心**：用一个 Mock 类模拟被依赖对象，然后用 `EXPECT_CALL` 描述期望的交互行为。

**使用场景**（字幕 1:08:28~1:11:15）：

- 依赖太多库，运行时间长。
- 需要通过网络请求其他服务。
- 边界条件很难通过正常流程触发。
- 交互流程难以观察。

**打桩测试五要素**：

1. 调用哪个接口（`EXPECT_CALL(mock, Method)`）
2. 调用多少次（`.Times(n)`）
3. 调用顺序（多个 EXPECT_CALL 的书写顺序）
4. 参数是什么（`.With(args)`）
5. 返回值是什么（`.WillOnce(Return(value))`）

---

### 23. 内存泄漏（Memory Leak）

**定义**：程序在堆上分配了内存，但在不再需要时没有释放，导致内存逐渐被耗尽。

**GoogleTest 中的检测方法**：

- 利用事件机制的 `OnTestStart` / `OnTestEnd` 做前后对比。
- 测试开始时记录存活对象数，结束时检查是否增加。
- 如果增加，说明测试中有对象未释放。

**本项目的简化实现**：通过 `MGT_NEW` / `MGT_DELETE` 宏包装内存分配/释放，配合 `MemoryLeakListener` 检测。

**注意**：这只是教学演示。真实 GoogleTest 可通过重载 `operator new` / `operator delete` 实现更透明的内存检测，也可配合 Valgrind、AddressSanitizer 等专业工具。

---

### 24. 测试独立性（Test Independence）

**定义**：每个测试应该独立运行，不依赖其他测试的执行顺序或执行结果。

**GoogleTest 如何保证**：

- 每个测试案例创建**新的**测试对象。
- 每个测试案例使用**独立的** TestContext。
- `SetUp()` 在每个案例前重新执行。
- 不同测试之间不共享可变状态。

**反面示例**（不可取）：

```cpp
// 错误：依赖全局状态
static int counter = 0;
TEST(A, Test1) { counter = 5; }
TEST(A, Test2) { EXPECT_EQ(counter, 5); }  // 假设 Test1 先运行，不可靠
```

---

### 25. 测试完备性（Test Completeness）

**定义**：测试用例应覆盖所有重要的输入情况，包括正常值、边界值、异常值。

**以判断质数为例**：

| 测试方向 | 测试值   | 类别     |
| -------- | -------- | -------- |
| 负数     | -1, -10  | 异常输入 |
| 0 和 1   | 0, 1     | 边界值   |
| 最小质数 | 2        | 边界值   |
| 合数     | 4, 9, 25 | 正常输入 |
| 大质数   | 17, 97   | 正常输入 |

---

## 六、GoogleTest 生态组件

### 26. GoogleTest（GTest）

**定义**：Google 开源的 C++ 单元测试框架，提供测试定义、断言、测试夹具、事件监听等功能。

**核心能力**：

- `TEST` / `TEST_F` 宏定义测试。
- `EXPECT_*` / `ASSERT_*` 断言。
- 测试过滤（`--gtest_filter`）。
- 参数化测试（`TEST_P`）。
- 死亡测试（`EXPECT_DEATH`）。

---

### 27. GoogleMock（GMock）

**定义**：Google 开源的 C++ Mock 框架，构建在 GoogleTest 之上，提供打桩测试能力。

**与 GoogleTest 的关系**：

- GMock **包含于** GTest，即 GMock 是基于 GTest 扩展开发的。
- 如果同时使用，只需包含 GMock 的头文件和库即可。

---

### 28. 退出码（Exit Code）

**定义**：进程结束时返回给操作系统的整数值。GoogleTest 用退出码告诉 CI/CD 系统测试是否通过。

- 退出码 `0`：所有测试通过。
- 退出码 `1`：存在测试失败。

**在本项目中的实现**：`return failed_count == 0 ? 0 : 1;`

---

## 术语速查表

| 术语       | 英文                | 简要定义                             |
| ---------- | ------------------- | ------------------------------------ |
| 单元测试   | Unit Test           | 验证最小可测试单元的测试方法         |
| 测试套件   | Test Suite          | 一组相关测试案例的集合               |
| 测试案例   | Test Case           | 测试套件中验证一个具体场景的测试     |
| 断言       | Assertion           | 测试中的判断语句                     |
| 致命断言   | Fatal Assertion     | 失败后中止当前测试的断言（ASSERT_*） |
| 非致命断言 | Non-fatal Assertion | 失败后继续执行的断言（EXPECT_*）     |
| 测试夹具   | Test Fixture        | 为多个测试共享数据的机制             |
| 静态注册   | Static Registration | 利用静态变量在 main 前自动注册测试   |
| 注册表     | Registry            | 保存所有已注册测试元信息的全局容器   |
| 测试上下文 | Test Context        | 保存单个测试执行期间断言结果的容器   |
| 事件监听器 | Event Listener      | 在测试生命周期节点接收回调的组件     |
| 运行器     | Runner              | 遍历并执行注册表中所有测试的引擎     |
| 宏         | Macro               | C/C++ 预处理器的代码替换规则         |
| 单例模式   | Singleton           | 确保类只有一个实例的设计模式         |
| 工厂模式   | Factory             | 通过工厂函数创建对象的设计模式       |
| 观察者模式 | Observer            | 一对多依赖通知的设计模式             |
| 静态库     | Static Library      | 编译时链接进可执行文件的库           |
| 动态库     | Dynamic Library     | 运行时加载的共享库                   |
| 打桩测试   | Mock Testing        | 用模拟对象替代真实依赖的测试方法     |
| 内存泄漏   | Memory Leak         | 分配后未释放的内存                   |
| 测试独立性 | Test Independence   | 测试之间不互相依赖                   |
| 测试完备性 | Test Completeness   | 覆盖所有重要输入情况的测试设计       |
| 退出码     | Exit Code           | 进程结束时的返回值（0=成功）         |
