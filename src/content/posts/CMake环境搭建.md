---
title: CMake环境搭建
published: 2026-06-25
description: 'c++环境配置中cmake环境搭建'
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

## 7. 参考资源

- VS Code 官方 CMake 教程：https://code.visualstudio.com/docs/cpp/cmake-linux
- CMake 官方教程：https://cmake.org/cmake/help/latest/guide/tutorial/index.html
- CMake Presets 官方文档：https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html
- Ninja 构建系统：https://ninja-build.org/

------

这篇博客已经完整覆盖了 CMake 从产生背景到实际配置的全过程，以及你在部署过程中遇到并解决的所有关键疑惑。如果你在 WSL 恢复正常后，想把它存到工作区的 `outputs/` 目录里，或者再补一本书籍推荐，告诉我就行。
