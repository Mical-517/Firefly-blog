---
title: CMake环境搭建
published: 2026-06-25
description: 'CMake 从基础概念到 GoogleTest 实战：工作流程、CMakeLists.txt 模板、构建命令、运行单个测试、日常开发节奏与常见问题速查'
image: ''
tags: [CMake]
category: 'c++环境配置'
group: tech
postType: post
draft: false
lang: ''
---

WSL 侧也在报同样的进程创建错误。没关系，内容已经完整生成好了，我直接把整篇博客正文贴在这里。你新建一个 `cmake.md` 文件，把以下内容复制进去即可。

------

# CMake 学习笔记：从零到第一个项目

## 1. CMake 是什么？为什么需要它？

### 1.1 手动编译的极限

一个最简单的 C++ 程序，只有一个 .cpp 文件时，编译很简单：

```
g++ main.cpp -o hello
```

但当项目变大，情况迅速复杂起来：

- 有多个 .cpp 文件需要编译和链接。
- 有些文件编译成可执行文件，有些编译成静态库或动态库。
- 不同操作系统、不同编译器、不同构建后端需要不同的编译参数。
- Debug 和 Release 模式需要完全不同的编译器选项。
- 项目需要依赖第三方库，要找到它们的头文件和库文件路径。

手动敲 g++ 命令来管理这一切，在单文件阶段还可以接受，但一旦文件数量和依赖关系增多，手动管理就会变得不可维护。

### 1.2 构建系统的出现

构建系统的出现，就是为了解决"自动管理编译过程"这个问题。你只需要描述"项目有哪些源文件、要生成什么、用什么参数编译"，构建系统会自动处理：

- 只重新编译修改过的文件。
- 按正确的顺序编译和链接。
- 管理不同配置下的编译参数。

C++ 生态中常见的构建系统包括：

- **Make**：经典的构建系统，使用 Makefile 描述规则。
- **Ninja**：更现代的构建系统，比 Make 更快，特别适合大型项目。
- **CMake**：不是构建系统本身，而是**构建系统的生成器**。

### 1.3 CMake 的角色

CMake 是一个 build-system generator（构建系统生成器）。

它的工作方式是：

```
CMakeLists.txt（你写的项目描述）
    ↓
cmake 解析并生成
    ↓
build.ninja 或 Makefile（构建系统能读懂的施工图纸）
    ↓
ninja 或 make 读取施工图纸并执行
    ↓
    可执行文件 / 库
```

CMake 的核心设计理念是：

- **你只写一份项目描述**（CMakeLists.txt），它能跨平台使用。
- **CMake 替你生成当前平台的构建文件**，无论你是 Windows、Linux 还是 macOS。
- **你不需要手写 Makefile 或 Ninja 文件**，CMake 替你做这件事。

这就是 CMake 的定位：它不直接编译代码，而是替你在当前机器上写一份正确的"施工图纸"，交给实际的构建工具去执行。

## 2. 基本工作流程

### 2.1 配置阶段（Configure）

执行：

```
cmake -B build -G Ninja
```

这条命令做三件事：

1. 读取当前目录下的 CMakeLists.txt。
2. 根据当前机器的编译器、操作系统、目录结构，生成一份 Ninja（或 Make）能认的构建文件。
3. 把所有生成的文件放在 build/ 目录下，不污染源码目录。

-B build 指定构建产物的输出目录，-G Ninja 指定生成的构建文件类型。

### 2.2 构建阶段（Build）

执行：

```
cmake --build build
```

这条命令：

1. 进入 build/ 目录。
2. 读取上一步生成的构建文件（build/build.ninja）。
3. 调用底层的构建工具（Ninja）执行编译和链接。
4. 产出可执行文件或库。

cmake --build build 是一条平台无关的命令，无论底层用的是 Ninja 还是 Make，语法完全一致。

### 2.3 一句话的工作流理解

```
CMakeLists.txt → cmake → build.ninja → ninja → g++ → hello
  你写的         配置阶段      施工图纸     执行      编译     产物
```

整个流程中，只有 CMakeLists.txt 是你手写的，其余全部由工具自动完成。

## 3. CMakeLists.txt

### 3.1 作用

CMakeLists.txt 是 CMake 项目最核心的配置文件。它写在项目根目录中，描述项目的源文件、目标（可执行文件或库）、依赖关系、编译参数等。CMake 的配置阶段就是读取并解析这个文件。

### 3.2 最简单的模板

```
cmake_minimum_required(VERSION 3.15)
project(HelloCMake VERSION 1.0)
add_executable(hello main.cpp)
```

**逐行解释：**

- `cmake_minimum_required(VERSION 3.15)`：声明项目要求的最低 CMake 版本。如果当前系统的 CMake 低于 3.15，配置阶段会直接报错并停止。它的作用是防止旧版本 CMake 因不支持某些语法而静默产生错误行为。
- `project(HelloCMake VERSION 1.0)`：声明项目名称和版本号。项目名称用于内部变量引用，版本号用于后续的安装和打包。执行完这一行后，CMake 会自动定义一些变量，比如 PROJECT_NAME、PROJECT_VERSION。
- `add_executable(hello main.cpp)`：声明要生成一个名为 hello 的可执行文件，它由 main.cpp 编译链接而来。hello 就是这个目标的名称，后续可以用 --target hello 指定只编译这个目标。

### 3.3 多源文件的写法

当有多个源文件时：

```
add_executable(hello main.cpp utils.cpp network.cpp)
```

更常见的做法是显式列出源文件，这样 CMake 能正确追踪每个文件的依赖关系。

## 4. CMakePresets.json

### 4.1 作用

CMakePresets.json 的作用是：**把 CMake 配置参数从每次都要手动敲的一长串命令，变成一个可复用的、可放入版本管理的配置文件。**

没有 presets 之前，每次都要敲完整参数：

```
cmake -B build/debug -G Ninja -DCMAKE_BUILD_TYPE=Debug -DCMAKE_CXX_STANDARD=20
```

有了 presets 之后，同样的效果只要：

```
cmake --preset debug
```

### 4.2 一份典型的 presets 文件

```
{
    "version": 6,
    "configurePresets": [
        {
            "name": "debug",
            "displayName": "Debug",
            "generator": "Ninja",
            "binaryDir": "${sourceDir}/build/debug",
            "cacheVariables": {
                "CMAKE_BUILD_TYPE": "Debug",
                "CMAKE_CXX_STANDARD": "20",
                "CMAKE_CXX_STANDARD_REQUIRED": "ON"
            }
        },
        {
            "name": "release",
            "displayName": "Release",
            "generator": "Ninja",
            "binaryDir": "${sourceDir}/build/release",
            "cacheVariables": {
                "CMAKE_BUILD_TYPE": "Release",
                "CMAKE_CXX_STANDARD": "20",
                "CMAKE_CXX_STANDARD_REQUIRED": "ON"
            }
        }
    ]
}
```

### 4.3 逐字段解释

**顶层**

- `"version": 6`：声明 presets 文件遵循 CMake Presets 规范的第 6 版。CMake 3.27+ 才完整支持 version 6。
- `"configurePresets": [...]`：配置预设的数组。CMake Presets 分为 configurePresets（配置阶段）和 buildPresets（构建阶段），这里只定义了配置预设。

**单个预设内的字段**

- `"name": "debug"`：预设在命令行中的唯一标识符。执行 `cmake --preset debug` 时，CMake 通过这个名字找到整套配置。
- `"displayName": "Debug"`：在 VS Code CMake Tools 扩展的下拉菜单中显示的名字，对命令行无影响。
- `"generator": "Ninja"`：指定 CMake 使用 Ninja 作为构建后端。CMake 会产出 build.ninja 文件。如果改为 "Unix Makefiles"，则产出 Makefile。
- `"binaryDir": "${sourceDir}/build/debug"`：构建产物的输出目录。${sourceDir} 是 CMake 内置变量，表示 CMakeLists.txt 所在目录。
- `"cacheVariables": { }`：在配置阶段向 CMake 缓存写入变量。
  - `CMAKE_BUILD_TYPE`: Debug 模式输出 `-O0 -g`（不优化，保留调试符号）；Release 模式对应 `-O3 -DNDEBUG`。
  - `CMAKE_CXX_STANDARD`: 要求以 C++20 标准编译。
  - `CMAKE_CXX_STANDARD_REQUIRED`: 强制编译器支持 C++20，不支持则配置失败。

### 4.4 presets 的使用效果

```
cmake --preset debug        # 配置
cmake --build build/debug   # 编译
```

如果不使用 presets，等效命令是：

```
cmake -B build/debug -G Ninja -DCMAKE_BUILD_TYPE=Debug -DCMAKE_CXX_STANDARD=20 -DCMAKE_CXX_STANDARD_REQUIRED=ON
```

## 5. 完整的最小项目示例

### 5.1 目录结构

```
~/projects/my-first-cmake/
├── CMakeLists.txt
├── CMakePresets.json
├── main.cpp
├── build/
│   ├── debug/     (cmake --preset debug 生成)
│   └── release/   (cmake --preset release 生成)
```

### 5.2 文件内容

main.cpp：

```
#include <iostream>

int main() {
    std::cout << "Hello from CMake" << std::endl;
    return 0;
}
```

CMakeLists.txt：

```
cmake_minimum_required(VERSION 3.15)
project(HelloCMake VERSION 1.0)
add_executable(hello main.cpp)
```

CMakePresets.json：见第 4 节的示例。

### 5.3 完整操作命令

```
# 配置（Debug 模式）
cmake --preset debug

# 编译
cmake --build build/debug

# 运行
./build/debug/hello

# 配置（Release 模式）
cmake --preset release

# 编译 Release 版本
cmake --build build/release
```

## 6. 常见疑惑与解答

**问：执行 cmake -B build -G Ninja 后生成了什么？**

答：生成的是"构建文件"。最核心的是 build/build.ninja，Ninja 直接读取它来调度编译和链接任务。此外还有 CMakeCache.txt（缓存变量）、CMakeFiles/ 目录（辅助追踪）等文件。

**问：CMakeLists.txt 和 build/build.ninja 是什么关系？**

答：CMakeLists.txt 是你手写的"项目说明书"。build/build.ninja 是 CMake 根据项目说明书和当前机器环境自动生成的"施工图纸"。你写前者，CMake 替你生成后者。

**问：cmake --build build 是在读取哪个文件？**

答：它读取的是 build/build.ninja（如果用 Ninja 生成器）。但 cmake --build build 不是直接打开这个文件，而是通过 CMake 的抽象接口调用底层的 Ninja，Ninja 再去读 build/build.ninja 执行构建。

**问：每增加一个预设，就需要增加一套完整的构建流程吗？**

答：不是。增加一个预设只是增加了一套配置。每份预设独立产出一份对应的 build.ninja，Ninja 根据这份施工图纸执行编译。你的源码只有一份，变化的是编译参数和生成器的选择。

**问：预设的 binaryDir 必须手动写吗？**

答：对于 configurePresets，必须手动写。不会自动从 name 推导。如果省略 binaryDir，所有预设会共享默认的 build/ 目录，导致不同配置的产物混在一起。

**问：Debug 和 Release 预设的核心区别是什么？**

答：核心是 CMAKE_BUILD_TYPE 变量的值：

- Debug：-O0 -g（不优化，保留调试信息）
- Release：-O3 -DNDEBUG（最高优化，去掉断言和调试符号）

**问：cmake --build build --target hello 是什么意思？**

答：只编译名为 hello 的目标，跳过其他目标。在只有一个目标时加不加都一样。当项目有多个目标时，可以指定只编其中一个。如果 hello 依赖了其他目标，CMake 会先编译被依赖的目标。

**问：构建文件损坏了怎么办？**

答：直接删除 build/ 目录，重新执行 cmake --preset debug。build/ 目录中的所有文件都是自动生成的，不会被 Git 追踪，可以随时安全删除重建。

**问：为什么工具链要装在 WSL 里，而不是用 Windows 里的版本？**

答：Windows 和 WSL 是两套运行环境。Windows 的工具编译出 Windows PE 格式的程序；WSL 的工具编译出 Linux ELF 格式的程序。如果要在 WSL 里做 Linux C++ 项目，工具链也必须在 WSL 里安装。

## 7. 实战：CMake + GoogleTest 项目构建与测试

前面的章节覆盖了 CMake 的基础概念和最小项目。本节以一个包含 GoogleTest 单元测试的真实项目为例，展示从零搭建到日常开发的完整流程。

### 7.1 标准工程目录结构

```
MyProject/
├── CMakeLists.txt
├── include/
│   ├── add.h
│   └── hello.h
├── src/
│   ├── add.cpp
│   ├── hello.cpp
│   └── main.cpp
├── tests/
│   ├── add_test.cpp
│   └── hello_test.cpp
└── build/
```

核心设计：**业务代码编译成库，主程序和测试程序都链接这个库**。头文件搜索路径、编译选项集中在库目标上管理，app 和测试只负责复用。

### 7.2 标准 CMakeLists.txt 模板

```cmake
cmake_minimum_required(VERSION 3.15)
project(GoogleTestDemo LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

option(BUILD_TESTING "Build unit tests" ON)

# 业务代码 → 库
add_library(my_lib
    hello.cpp
    add.cpp
)

target_include_directories(my_lib
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# 主程序
add_executable(app
    main.cpp
)

target_link_libraries(app
    PRIVATE
        my_lib
)

# 测试
if(BUILD_TESTING)
    include(CTest)
    find_package(GTest CONFIG REQUIRED)
    include(GoogleTest)

    add_executable(test_lib
        add_test.cpp
        hello_test.cpp
    )

    target_link_libraries(test_lib
        PRIVATE
            my_lib
            GTest::gtest_main
    )

    gtest_discover_tests(test_lib)
endif()
```

**逐句解释与编译/链接/头文件的关系：**

| 语句 | 阶段 | 作用 |
|------|------|------|
| `add_library(my_lib ...)` | 编译 | 把业务源文件编成一个库目标，是其他目标复用的中间产物 |
| `target_include_directories(my_lib PUBLIC ...)` | 编译 | 把 include 加进头文件搜索路径。`PUBLIC` 表示链接了 my_lib 的目标也会继承此路径 —— 这是解决 `#include "xxx.h"` 找不到的关键 |
| `add_executable(app ...)` | 编译+链接 | 定义主程序可执行文件 |
| `add_executable(test_lib ...)` | 编译+链接 | 定义测试可执行文件 |
| `target_link_libraries(app PRIVATE my_lib)` | 链接 | 把 my_lib 的实现链接进 app |
| `target_link_libraries(test_lib PRIVATE my_lib GTest::gtest_main)` | 链接 | 同时链接业务库和 GoogleTest（gtest_main 提供 main 入口） |
| `gtest_discover_tests(test_lib)` | 配置 | 构建后自动扫描所有 `TEST()` 用例，注册到 CTest |

**关键认知：`target_link_libraries` 管链接（找实现），`target_include_directories` 管编译（找声明）。**

链接库不能解决"编译时找不到头文件声明"的问题。如果 `main.cpp` 调用了 `add()` 但没 `#include "add.h"`，即使链接了 my_lib，编译器仍然会报"找不到标识符"。

### 7.3 完整构建流程

```bash
# ===== 第一步：配置工程（在 build/ 目录执行） =====
mkdir build && cd build
cmake ..

# ===== 第二步：编译 =====
cmake --build . --config Debug

# ===== 第三步（可选）：运行主程序 =====
./Debug/app.exe
```

`cmake ..` 只负责生成工程文件，不编译源码。真正编译是在第二步 `cmake --build` 中完成的。

Visual Studio 生成器下的产物位置：
- 主程序：`build/Debug/app.exe`
- 测试程序：`build/Debug/test_lib.exe`

### 7.4 运行测试

> 以下命令均在 `build/` 目录下执行。

#### 运行全部测试

```bash
ctest -C Debug
```

#### 列出所有已注册的测试名

```bash
ctest -N -C Debug
```

CTest 中的测试名来自 `TEST(TestSuiteName, TestName)` 宏，格式为 `TestSuiteName.TestName`，例如 `AdditionTest.HandlesPositiveNumbers`。

#### 运行单个测试 — 方式一：CTest 按名称过滤

```bash
ctest -C Debug -R AdditionTest.HandlesPositiveNumbers
```

`-R` 后跟正则表达式，匹配测试用例名。例如 `-R AdditionTest` 会跑 AdditionTest 下所有用例。

#### 运行单个测试 — 方式二：直接运行 test_lib.exe + gtest_filter

```bash
# 绝对路径（可在任意目录执行）
./Debug/test_lib.exe --gtest_filter=AdditionTest.HandlesPositiveNumbers

# 通配符：跑 AdditionTest 下全部用例
./Debug/test_lib.exe --gtest_filter=AdditionTest.*
```

直接运行 exe 方式更适合临时调试单个测试，CTest 方式更适合集成到 CI/CD。

### 7.5 日常开发节奏

| 步骤 | 命令 | 目录 |
|------|------|------|
| 1. 改代码 | 编辑业务代码或测试代码 | — |
| 2. 构建 | `cmake --build . --config Debug` | `build/` |
| 3. 跑全部测试 | `ctest -C Debug` | `build/` |
| 4. 跑单个测试 | `ctest -C Debug -R 测试名` 或 `./Debug/test_lib.exe --gtest_filter=测试名` | `build/` |
| 5. 改了 CMakeLists.txt | 重新 `cmake ..` 再构建 | `build/` |

**核心原则：**
- CMakeLists.txt 负责描述项目结构（写一次）
- 日常开发只需要重复步骤 1-4
- 只有 CMakeLists.txt 本身改动时才需要重新 `cmake ..`
- 代码改了就 build，不需要每次重写 CMakeLists

### 7.6 常见问题速查

| 症状 | 原因 | 解决 |
|------|------|------|
| `ctest -R xxx` 显示 "No tests were found" | 正则没匹配到真实测试名（如写成了文件名 `add_test`） | 先执行 `ctest -N -C Debug` 列出真实测试名 |
| 改了 CMakeLists.txt 但报旧错误 | build 目录缓存了旧配置 | 删除 build 目录，重新 `cmake ..` |
| `error C3861: "xxx": 找不到标识符` | 源文件没 include 对应头文件 | 加上 `#include "xxx.h"` |
| 编辑器红线但 cmake 能编过 | IntelliSense 没读到 CMake 配置 | 重新 CMake configure，或设置 `CMAKE_EXPORT_COMPILE_COMMANDS ON` |
| 头文件报错消失后仍链接失败 | 库在但实现文件是空的或有重复定义 | 检查源文件内容是否完整、无重复函数定义 |

## 8. 命令速查卡

```bash
# ===== 第一次 / 改了 CMakeLists.txt =====
cd build && cmake ..

# ===== 每次改代码后 =====
cmake --build . --config Debug

# ===== 运行主程序 =====
./Debug/app.exe

# ===== 运行全部测试 =====
ctest -C Debug

# ===== 运行单个测试 =====
ctest -C Debug -R AdditionTest.HandlesPositiveNumbers
./Debug/test_lib.exe --gtest_filter=AdditionTest.HandlesPositiveNumbers

# ===== 列出所有测试 =====
ctest -N -C Debug
```

## 9. 参考资源

- VS Code 官方 CMake 教程：https://code.visualstudio.com/docs/cpp/cmake-linux
- CMake 官方教程：https://cmake.org/cmake/help/latest/guide/tutorial/index.html
- CMake Presets 官方文档：https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html
- Ninja 构建系统：https://ninja-build.org/
- GoogleTest 官方仓库：https://github.com/google/googletest
