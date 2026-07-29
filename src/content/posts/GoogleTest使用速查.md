---
title: GoogleTest使用速查.md
published: 2026-07-05
description: 'GoogleTest使用速查'
image: './images/GoogleTest.png'
tags: [GoogleTest]
category: 'GoogleTest'
group: tech
draft: false
lang: ''
---

# GoogleTest 使用速查

---

## 一、快速入门

### 写简单的代码

C++ 具有许多强大的功能，但这种功能也带来了复杂性，使代码更容易出错，更难阅读和维护

如果某个项目预计将持续相当长的一段时间，一般阅读代码的时间将比编写代码的时间更多

优先编写易于工程师阅读、维护和调试的代码非常重要，而不是盲目使用各种新特性，或者是复杂的代码



### GoogleTest 介绍

单元测试是用来对一个模块、一个函数或者一个类来进行正确性检验的测试工作

常用的单元测试是 GoogleTest，是 Google 开源的测试框架，很多开源软件都使用 GoogleTest 编写单元测试用例。

### 链接 GoogleTest

如果将 GoogleTest 安装到系统默认路径

使用 gtest，只需要在 CMakeLists.txt 中加入

或者将 GoogleTest 添加到源码目录 third_party 中

gtest_main 是 GoogleTest 写好的单元测试 main 函数

```bash
$ sudo su
$ apt install libgtest-dev
```

```cmake
find_package(GTest)
add_executable(sample_test sample.cc sample_test.cc)
target_link_libraries(sample_test GTest::gtest GTest::gtest_main)
```

```cmake
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
set(install_gtest OFF)
set(install_gmock OFF)
set(build_gmock ON)
# This project is tested using GoogleTest.
add_subdirectory("third_party/googletest")
add_executable(sample_test sample.cc sample_test.cc)
target_link_libraries(sample_test gtest gtest_main)
```

```cpp
/// gtest_main.cc
GTEST_API_ int main(int argc, char **argv) {
  printf("Running main() from %s\n", __FILE__);
  testing::InitGoogleTest(&argc, argv);
  return RUN_ALL_TESTS();
}
```

当然可以不使用 gtest_main，而是自己写 main 函数，target_link_libraries 就不用链接 gtest_main 静态库了

---

## 二、断言

使用断言测试函数运行是否符合预期

当断言失败时，GoogleTest 会打印断言的源文件和行号位置，以及失败消息。

每个断言有三个结果：

- 成功
- 普通错误
- 严重错误

断言相关的宏有两个类别

- `ASSERT_*` 失败后生成严重错误，停止当前测试
- `EXPECT_*` 失败后生成普通错误，继续测试，包括继续当前测试用例

### 基本比较宏

| ASSERT \| EXPECT                        | 行为           |
| --------------------------------------- | -------------- |
| `{ ASSERT \| EXPECT }_EQ(v1, v2)`       | v1 == v2       |
| `{ ASSERT \| EXPECT }_NE(v1, v2)`       | v1 != v2       |
| `{ ASSERT \| EXPECT }_LT(v1, v2)`       | v1 < v2        |
| `{ ASSERT \| EXPECT }_LE(v1, v2)`       | v1 <= v2       |
| `{ ASSERT \| EXPECT }_GT(v1, v2)`       | v1 > v2        |
| `{ ASSERT \| EXPECT }_GE(v1, v2)`       | v1 >= v2       |
| `{ ASSERT \| EXPECT }_TRUE(condition)`  | condition 为真 |
| `{ ASSERT \| EXPECT }_FALSE(condition)` | condition 为假 |

### 字符串比较宏

如果使用 EXPECT_EQ 做字符串比较，只是比较指针，并不是比较字符串内容

下面是用于字符串比较相关的宏

| ASSERT \| EXPECT 宏                      | 行为                 |
| ---------------------------------------- | -------------------- |
| `{ ASSERT \| EXPECT }_STREQ(s1, s2)`     | s1 == s2             |
| `{ ASSERT \| EXPECT }_STRNE(s1, s2)`     | s1 != s2             |
| `{ ASSERT \| EXPECT }_STRCASEEQ(s1, s2)` | s1 == s2（忽略大小） |
| `{ ASSERT \| EXPECT }_STRCASENE(s1, s2)` | s1 != s2（忽略大小） |

### 浮点数比较宏

浮点数不能精确表示，直接比较会有 BUG，下面是用于判断浮点数是否相等的宏，只要

```
|val1 - val2| <= abs_error
```

便相等，前两个宏默认 abs_error = 4ULPs

| ASSERT \| EXPECT 宏                            | 行为         |
| ---------------------------------------------- | ------------ |
| `{ ASSERT \| EXPECT }_FLOAT_EQ(val1, val2)`    | val1 == val2 |
| `{ ASSERT \| EXPECT }_DOUBLE_EQ(val1, val2)`   | val1 == val2 |
| `{ ASSERT \| EXPECT }_NEAR(v1, v2, abs_error)` | val1 == val2 |

### 特殊断言

当测试不可能出现的情况时，需要用到 ADD_FAILURE 或者 FAIL，主动触发一次失败。ADD_FAILURE 产生普通错误，FAIL 产生严重错误

比如在条件判断 if-else 或者 switch-case 可能会使用到。

SUCCEED() 表示成功，和当前测试用例成功没有关系，只是一种注释性用法。

EXPECT_NO_FATAL_FAILURE 可以判断测试代码是否有普通错误出现，可以结合 ADD_FAILURE 和 FAIL 使用

### 死亡测试

`{ ASSERT | EXPECT }_DEATH`

EXPECT_DEATH 第二个参数是 matcher，一般是字符串或者正则表达式：用于匹配失败时输出的错误信息。

```cpp
void TestHelper(int i) {
  int* ptr = nullptr;
  *ptr = i;
}
TEST(SampleTest, Death) {
  EXPECT_DEATH(TestHelper(0), "");
}
```

---

## 三、TEST — 编写测试用例

使用 TEST 就可以编写一条测试用例

需要注意的是，下划线 _ 是 GoogleTest 保留字符，在内部有特殊作用，指定 TestSuiteName 和 TestName 时不建议使用下划线，另外需要符合 C++ 命名规则。

```cpp
void TestHelper(int i) {
  if (i > 0) {
    SUCCEED();
  } else {
    ADD_FAILURE() << "negative";
  }
}
TEST(SampleTest, Positive) { 
  EXPECT_NO_FATAL_FAILURE(TestHelper(1)); 
}
TEST(SampleTest, Negative) { 
  EXPECT_NO_FATAL_FAILURE(TestHelper(-1)); 
}
```

---

## 四、TEST_F — 测试夹具

如果测试代码有依赖（环境或者资源），可以使用 TEST_F 编写测试用例

使用 TEST_F 之前，必须继承 testing::Test 类，实现 SetUp() 和 TearDown() 两个函数

每个测试用例开始前，都会执行构造函数和 SetUp() 函数，测试用例结束后，执行 TearDown() 和 析构函数

从下面的输出结果可以看到，每个测试用例，都会执行 SampleTest 构造函数和析构函数，SetUp 和 TearDown 也会每次都执行，所以单个测试用例的状态不会影响下一个测试用例。

```cpp
class SampleTest : public testing::Test {
 protected:
  SampleTest() { std::cout << __func__ << std::endl; }
  ~SampleTest() { std::cout << __func__ << std::endl; }
  void SetUp() override { std::cout << __func__ << std::endl; }
  void TearDown() override { std::cout << __func__ << std::endl; }
};
TEST_F(SampleTest, Case1) { std::cout << "case1" << std::endl; }
TEST_F(SampleTest, Case2) { std::cout << "case2" << std::endl; }
```

输出：

```
[----------] 2 tests from SampleTest
[ RUN      ] SampleTest.Case1
SampleTest
SetUp
case1
TearDown
~SampleTest
[       OK ] SampleTest.Case1 (0 ms)
[ RUN      ] SampleTest.Case2
SampleTest
SetUp
case2
TearDown
~SampleTest
[       OK ] SampleTest.Case2 (0 ms)
[----------] 2 tests from SampleTest (0 ms total)
```

---

## 五、TEST_P — 参数化测试

如果测试用例依赖参数输入，TEST_P 可以编写可复用代码，指定不同的参数，针对每个输入参数都执行测试代码，避免测试代码拷贝以测试不同的输入

使用 TEST_P 需要继承 Test 和 WithParamInterface，或者直接继承 TestWithParam

### 基础示例

TestWithParam 继承了 Test 和 WithParamInterface，WithParamInterface 提供 GetParam() 接口用于返回指定的参数

比如下面的例子，

INSTANTIATE_TEST_SUITE_P 就是为了指定候选参数

- 第一个参数表示一个前缀
- 第二个参数 MyEnumTest 必须是 TestSuite 的名字
- 第三个参数用于指定候选参数，需要使用生成器

上述测试代码编译执行：每个候选参数都被执行一次

上面用到了 testing::Values 指定候选参数，GoogleTest 还提供其他的生成器。

```cpp
// in testing namespace
template <typename T>
class TestWithParam : public Test, public WithParamInterface<T> {};

enum MyEnums {
  ENUM1 = 1,
  ENUM2 = 3,
  ENUM3 = 8,
};
class MyEnumTest : public testing::TestWithParam<MyEnums> {};
TEST_P(MyEnumTest, ChecksParamMoreThanZero) { EXPECT_GE(GetParam(), 0); }
INSTANTIATE_TEST_SUITE_P(MyEnumTests, MyEnumTest,
                         ::testing::Values(ENUM1, ENUM2, ENUM3));
```

```
$ ./sample
Running main() from ./googletest/src/gtest_main.cc
[==========] Running 3 tests from 1 test suite.
[----------] Global test environment set-up.
[----------] 3 tests from MyEnumTests/MyEnumTest
[ RUN      ] MyEnumTests/MyEnumTest.ChecksParamMoreThanZero/0
[       OK ] MyEnumTests/MyEnumTest.ChecksParamMoreThanZero/0 (0 ms)
[ RUN      ] MyEnumTests/MyEnumTest.ChecksParamMoreThanZero/1
[       OK ] MyEnumTests/MyEnumTest.ChecksParamMoreThanZero/1 (0 ms)
[ RUN      ] MyEnumTests/MyEnumTest.ChecksParamMoreThanZero/2
[       OK ] MyEnumTests/MyEnumTest.ChecksParamMoreThanZero/2 (0 ms)
[----------] 3 tests from MyEnumTests/MyEnumTest (0 ms total)
[----------] Global test environment tear-down
[==========] 3 tests from 1 test suite ran. (0 ms total)
[  PASSED  ] 3 tests.
```

### 参数生成器

| generators/                  | 行为                            |
| ---------------------------- | ------------------------------- |
| `Range(begin, end [, step])` | 生成序列数，step 默认为 1       |
| `Values(v1, v2, ..., vN)`    | 从 {v1, v2, ..., vN} 生成参数   |
| `ValuesIn(container)`        | 从数组/容器中生成参数           |
| `ValuesIn(begin,end)`        | 从容器迭代器范围生成参数        |
| `Bool()`                     | 从 {true, false} 生成参数       |
| `Combine(g1, g2, ..., gN)`   | 组合 {g1, g2, ..., gN} 生成的值 |

### Combine 笛卡尔乘积

testing::Combine 生成的是笛卡尔乘积，可以从下面的例子看出来

如下面日志所示，生成 4 组参数。

```cpp
enum Color { BLACK, WHITE };
class AnimalTest
    : public testing::TestWithParam<std::tuple<const char*, Color>> {
 protected:
  void PrintParam(const std::tuple<const char*, Color>& param) {
    std::cout << std::get<const char*>(param) << " " << std::get<Color>(param)
              << std::endl;
  }
};
TEST_P(AnimalTest, Combine) { PrintParam(GetParam()); }
INSTANTIATE_TEST_SUITE_P(AnimalTests, AnimalTest,
                         ::testing::Combine(::testing::Values("cat", "dog"),
                                            ::testing::Values(BLACK, WHITE)));
```

```
Running main() from ./googletest/src/gtest_main.cc
[==========] Running 4 tests from 1 test suite.
[----------] Global test environment set-up.
[----------] 4 tests from AnimalVariations/AnimalTest
[ RUN      ] AnimalVariations/AnimalTest.AnimalLooksNice/0
cat 0
[       OK ] AnimalVariations/AnimalTest.AnimalLooksNice/0 (0 ms)
[ RUN      ] AnimalVariations/AnimalTest.AnimalLooksNice/1
cat 1
[       OK ] AnimalVariations/AnimalTest.AnimalLooksNice/1 (0 ms)
[ RUN      ] AnimalVariations/AnimalTest.AnimalLooksNice/2
dog 0
[       OK ] AnimalVariations/AnimalTest.AnimalLooksNice/2 (0 ms)
[ RUN      ] AnimalVariations/AnimalTest.AnimalLooksNice/3
dog 1
[       OK ] AnimalVariations/AnimalTest.AnimalLooksNice/3 (0 ms)
[----------] 4 tests from AnimalVariations/AnimalTest (0 ms total)
[----------] Global test environment tear-down
[==========] 4 tests from 1 test suite ran. (0 ms total)
[  PASSED  ] 4 tests.
```

### TEST 简单示例（补充）

```cpp
TEST(FactorialTest, Positive) {
  EXPECT_EQ(1, Factorial(1));
  EXPECT_EQ(2, Factorial(2));
  EXPECT_EQ(6, Factorial(3));
  EXPECT_EQ(40320, Factorial(8));
}
```

---

## 六、TYPED_TEST — 类型参数化测试

### TYPED_TEST 测试多个实现

当一个接口有多个实现类，或者多个类有公共的接口，可以使用 TYPED_TEST 编写可复用测试代码

比如下面的例子，SimpleA 和 SimpleB 都有 DoSomething() 接口，使用 TYPED_TEST 就比较方便测试两个类。

需要注意的是：TYPED_TEST_SUITE 必须在 TYPED_TEST 之前出现

```cpp
/// simple_interface.h
class SimpleInterface {
 public:
  virtual ~SimpleInterface() = default;
 protected:
  virtual void DoSomething() = 0;
};

/// simple_a.h
class SimpleA : public SimpleInterface {
 public:
  void DoSomething() override { std::cout << "SimpleA" << std::endl; }
};

/// simple_b.h 
class SimpleB : public SimpleInterface {
 public:
  void DoSomething() override { std::cout << "SimpleB" << std::endl; }
};

// ======================
// simple_test.cc
template <typename Impl>
class SimpleTest : public testing::Test {
 protected:
  Impl impl_;
};
using ImplTypes = ::testing::Types<SimpleA, SimpleB>;
TYPED_TEST_SUITE(SimpleTest, ImplTypes);
TYPED_TEST(SimpleTest, DoSomething) { 
  this->impl_.DoSomething();
}
```

### TYPED_TEST_P 分类测试

TYPED_TEST_P 和 TESTD_TEST 类似，不同的是 TYPED_TEST_P 可以不先指定 TypeList。

例如下面的例子，SimpleInterface 有两个接口

```cpp
/// simple_interface.h
class SimpleInterface {
 public:
  virtual ~SimpleInterface() = default;
 protected:
  virtual void Lookup() = 0;
  virtual void Insert() = 0;
};
```

我们可以在 simple_lookup_test 编写 LookupTest，在 simple_insert_test 编写 InsertTest。不一定需要分别写入两个文件，这里只是示例。

后续开发实现 SimpleA，SimpleB

这时候在 simple_test 中引用写的测试代码

**定义测试模板：**

```cpp
// simple_lookup_test.h
template <typename T>
class LookupTest : public testing::Test {
 protected:
};
// 必须在 TYPED_TEST_P 之前使用
TYPED_TEST_SUITE_P(LookupTest);
TYPED_TEST_P(LookupTest, Lookup) {
  // 测试用例用，使用 TypeParam 获取候选参数
  TypeParam simple;
  simple.Lookup();
}
// 必须注册单元测试用例
REGISTER_TYPED_TEST_SUITE_P(LookupTest, Lookup);
```

```cpp
// simple_insert_test.h
template <typename T>
class InsertTest : public testing::Test {
 protected:
};
TYPED_TEST_SUITE_P(InsertTest);
TYPED_TEST_P(InsertTest, Insert) {
  TypeParam simple;
  simple.Insert();
}
REGISTER_TYPED_TEST_SUITE_P(InsertTest, Insert);
```

**实现类与实例化：**

```cpp
/// simple_a.h
class SimpleA : public SimpleInterface {
 public:
  void Lookup() override {}
  void Insert() override {}
};

/// simple_b.h
class SimpleB : public SimpleInterface {
 public:
  void Lookup() override {}
  void Insert() override {}
};

// simple_test.cc
using SimpleTypes = ::testing::Types<SimpleA, SimpleB>;
INSTANTIATE_TYPED_TEST_SUITE_P(SimpleTest, LookupTest, SimpleTypes);
INSTANTIATE_TYPED_TEST_SUITE_P(SimpleTest, InsertTest, SimpleTypes);
```

---

## 七、Environment — 全局环境

我们在运行测试程序的时候，会有这两句日志输出：Global test environment set-up/tear-down

如果需要在所有测试用例执行前，做某些配置或初始化，可以重载 testing::Environment

testing::Environment 和 testing::Test 具有类似的接口：提供 SetUp 和 TearDown 两个接口。我们可以在 SetUp 函数中做全局的配置。

在执行 RUN_ALL_TESTS() 之前，需要调用 AddGlobalTestEnvironment() 函数将 SimpleEnvironment 添加到测试程序

强烈建议自己编写 main 函数。

从测试程序日志可以看到，在测试用例执行前，调用了 Environment::SetUp 函数

```
$ ./simple 
Running main() from ./googletest/src/gtest_main.cc
[==========] Running 2 tests from 1 test suite.
[----------] Global test environment set-up.
[----------] 2 tests from SimpleTest
...
[----------] Global test environment tear-down
[==========] 2 tests from 1 test suite ran. (0 ms total)
[  PASSED  ] 2 tests.
```

```cpp
class SimpleEnvironment : public ::testing::Environment {
 public:
  SimpleEnvironment() {}
  ~SimpleEnvironment() override {}
  // Override this to define how to set up the environment.
  void SetUp() override { std::cout << __func__ << std::endl; }
  // Override this to define how to tear down the environment.
  void TearDown() override { std::cout << __func__ << std::endl; }
};

TEST(SimpleTest, Empty) {
  // ...
}

int main(int argc, char* argv[]) {
  testing::InitGoogleTest(&argc, argv);
  testing::Environment* const env =
      testing::AddGlobalTestEnvironment(new SimpleEnvironment);
  return RUN_ALL_TESTS();
}
```

---

## 八、命令行参数

| Flag                                     | Description                     |
| ---------------------------------------- | ------------------------------- |
| `--gtest_filter=*`                       | 过滤测试用例                    |
| `--gtest_repeat=N`                       | 重复执行 N 次，N 为负数一直执行 |
| `--gtest_break_on_failure`               | 遇到 failure 停止               |
| `--gtest_shuffle`                        | 打乱测试用例                    |
| `--gtest_output="xml:output/directory/"` | 生成测试结果报告                |

gtest_filter 的输入是 : 分离的多个 filter，- 表示不包含，比如

表示执行 FooTest 中除了 FooTest.Bar 之外的所有测试，执行 BarTest 中除了 BarTest.Foo 的所有测试用例

```
./foo_test --gtest_filter=FooTest.*:BarTest.*-FooTest.Bar:BarTest.Foo
```

---

## 九、GMock

当使用接口，有不想在测试代码中依赖接口实现，可以使用 GMock 定义一个 mock 对象

### MOCK_METHOD

```
$ ./simple 
[==========] Running 1 test from 1 test suite.
[----------] Global test environment set-up.
SetUp
[----------] 1 test from SimpleTest
[ RUN      ] SimpleTest.Empty
[       OK ] SimpleTest.Empty (0 ms)
[----------] 1 test from SimpleTest (0 ms total)
[----------] Global test environment tear-down
TearDown
[==========] 1 test from 1 test suite ran. (0 ms total)
[  PASSED  ] 1 test.
```

```cpp
class Foo {
 public:
  virtual void UseFoo(int) = 0;
  virtual size_t size() const = 0;
  virtual ~Foo() = default;
};

class MockFoo : public Foo {
  public:
  MOCK_METHOD(void, UseFoo, (int), (override));
  MOCK_METHOD(size_t, size, (), (const, override));
};
```

### EXPECT_CALL

在调用 MockFoo 函数之前， 需要使用 EXPECT_CALL 设置期望的行为，类似于这样

EXPECT_CALL

- 第一个参数是 mock 对象
- 第二个参数是函数和输入参数

输入参数可以使用 Matchers，用于匹配模糊输入

更多 Matcher 以及用法，可以参考官方文档

**语法模板：**

```cpp
EXPECT_CALL(mock_object, method(matchers))
    .Times(cardinality)
    .WillOnce(action)
    .WillRepeatedly(action);
```

**示例 — 基础匹配：**

```cpp
TEST(FooTest, UseFoo) {
  MockFoo foo;
  EXPECT_CALL(foo, UseFoo(10));
  foo.UseFoo(10);
}
```

**示例 — 模糊匹配：**

```cpp
TEST(FooTest, UseFoo2) {
  {
    MockFoo foo;
    using ::testing::_;
    using ::testing::Ge;
    EXPECT_CALL(foo, UseFoo(_));
    foo.UseFoo(10);
  }
  {
    MockFoo foo;
    using ::testing::Ge;
    EXPECT_CALL(foo, UseFoo(Ge(100)));
    foo.UseFoo(101);
  }
}
```

**示例 — 调用次数：**

```cpp
TEST(FooTest, UseFoo3) {
  {
    MockFoo foo;
    EXPECT_CALL(foo, UseFoo(10)).Times(2);
    foo.UseFoo(10);
    foo.UseFoo(10);
  }
  {
    MockFoo foo;
    using ::testing::AtLeast;
    EXPECT_CALL(foo, UseFoo(10)).Times(AtLeast(1));
    foo.UseFoo(10);
  }
}
```

### Cardinality — 调用次数

默认的期望行为是调用一次，可以是 Times 设置期望的调用次数

| Cardinality         | 描述          |
| ------------------- | ------------- |
| `AtLeast(n)`        | 至少调用 n 次 |
| `AtMost(n)`         | 至多调用 n 次 |
| `AnyNumber()`       | 任意次        |
| `Between(min, max)` | [min, max] 次 |
| `Exactly(int n)`    | n 次          |

常用的 Cardinality 可以是 ...

### Action — 函数行为

Action 可以配置 mock 函数被调用时的行为

Action 需要通过 WillOnce() 或者 WillRepeatedly() 配置，前者只执行一次 Action，后者一直执行 Action

更多 Action 以及用法，可以参考官方文档

```cpp
TEST(FooTest, UseFoo4) {
  MockFoo foo;
  using ::testing::Return;
  EXPECT_CALL(foo, UseFoo(10))
    .Times(3)
    .WillOnce(Return(1))
    .WillRepeatedly(Return(2));
  EXPECT_EQ(foo.UseFoo(10), 1);
  EXPECT_EQ(foo.UseFoo(10), 2);
  EXPECT_EQ(foo.UseFoo(10), 2);
}
```
