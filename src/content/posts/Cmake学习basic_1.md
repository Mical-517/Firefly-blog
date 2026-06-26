---
title: Cmake学习basic_1.md
published: 2026-06-26
description: '对与CMake_01_basic_ABC三个示例进行梳理'
image: './images/CMake.png'
tags: [CMake_Study]
category: 'CMake_Study'
group: tech
postType: post
draft: false
lang: ''
---

# CMake 入门：A-hello-cmake / B-hello-headers / C-static-library 系统学习笔记

 > 本文档整理自与 Copilot 的学习对话，对 CMake 的三个基础示例进行了系统化的梳理与总结。

---

## 目录

  1. [前置准备：CMake 构建的基本流程](#1-前置准备cmake-构建的基本流程)
  2. [A-hello-cmake：最简单的 CMake 项目](#2-a-hello-cmake最简单的-cmake-项目)
  3. [B-hello-headers：头文件管理与可见性控制](#3-b-hello-headers头文件管理与可见性控制)
     - [3.1 target_include_directories 详解](#31-target_include_directories-详解)
     - [3.2 PRIVATE vs PUBLIC vs INTERFACE](#32-private-vs-public-vs-interface)
     - [3.3 源文件组织的最佳实践](#33-源文件组织的最佳实践)
     - [3.4 关于 GLOB 的注意事项](#34-关于-glob-的注意事项)
  4. [C-static-library：静态库与依赖管理](#4-c-static-library静态库与依赖管理)
     - [4.1 项目结构与代码](#41-项目结构与代码)
     - [4.2 add_library 创建静态库](#42-add_library-创建静态库)
     - [4.3 target_link_libraries 与依赖传播](#43-target_link_libraries-与依赖传播)
     - [4.4 静态库的编译链接机制](#44-静态库的编译链接机制)
     - [4.5 头文件命名空间隔离技巧](#45-头文件命名空间隔离技巧)
  5. [模块化项目的两种组织模式](#5-模块化项目的两种组织模式)
     - [5.1 并行模式：模块互不依赖](#51-并行模式模块互不依赖)
     - [5.2 嵌套模式：模块之间存在依赖](#52-嵌套模式模块之间存在依赖)
     - [5.3 黄金法则：什么时候用 PRIVATE / PUBLIC](#53-黄金法则什么时候用-private--public)
  6. [附录：完整 CMake 命令速查表](#6-附录完整-cmake-命令速查表)

---

 ## 1. 前置准备：CMake 构建的基本流程

 一个典型的 CMake 项目构建分为两步：

 ```bash
mkdir build && cd build   # 创建独立的构建目录（推荐）
cmake ..                  # 配置阶段：读取 CMakeLists.txt，生成 Makefile
make                      # 编译阶段：根据 Makefile 编译链接
 ```

 **配置阶段的产物**：`Makefile`（或其他构建系统文件）

 **编译阶段的产物**：目标文件（`.o`）、库文件（`.a` / `.so`）、可执行文件

 > 💡 构建目录与源码目录分离，避免编译产物污染源码目录。

---

 ## 2. A-hello-cmake：最简单的 CMake 项目

 A-hello-cmake 是最基础的入门示例，仅包含一个源文件和一个 CMakeLists.txt。

### 项目结构

 ```
A-hello-cmake/
├── CMakeLists.txt
└── main.cpp
 ```

 ### CMakeLists.txt

 ```cmake
cmake_minimum_required(VERSION 3.5)

project(hello_cmake)

add_executable(hello_cmake main.cpp)
 ```

 ### 知识点

| 命令                                   | 作用                     |
| -------------------------------------- | ------------------------ |
| `cmake_minimum_required(VERSION 3.5)`  | 指定所需 CMake 最低版本  |
| `project(hello_cmake)`                 | 定义项目名称             |
| `add_executable(hello_cmake main.cpp)` | 将源文件编译为可执行文件 |

 **构建运行：**

 ```bash
cd A-hello-cmake
mkdir build && cd build
cmake ..
make
./hello_cmake
 ```

---

 ## 3. B-hello-headers：头文件管理与可见性控制

 B-hello-headers 在 A 的基础上引入了**头文件**的概念：多个源文件共享一个头文件。

 ### 项目结构

 ```
B-hello-headers/
├── CMakeLists.txt
├── include/
│   └── Hello.h              # 头文件
└── src/
    ├── Hello.cpp             # 实现
    └── main.cpp              # 入口
 ```

 ### CMakeLists.txt

 ```cmake
cmake_minimum_required(VERSION 3.5)

project(hello_headers)

# 创建可执行文件
add_executable(hello_headers
    src/Hello.cpp
    src/main.cpp
)

# 指定头文件搜索路径
target_include_directories(hello_headers
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)
 ```

 ### 3.1 target_include_directories 详解

 ```cmake
target_include_directories(hello_headers
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)
 ```

 这条命令告诉编译器：编译 `hello_headers` 目标时，在 `-I` 参数中添加该路径，使源文件可以直接 `#include "Hello.h"`，无需写繁琐的相对路径。

 实际效果等价于：

 ```bash
g++ -I/home/user/project/B-hello-headers/include ...
 ```

 ### 3.2 PRIVATE vs PUBLIC vs INTERFACE

 这是 CMake 现代化设计的核心概念，控制**依赖传递**。

| 关键字      | 对自身生效 | 传递给依赖者 | 典型场景                       |
| ----------- | :--------: | :----------: | ------------------------------ |
| `PRIVATE`   |     ✅      |      ❌       | 头文件只在目标内部使用         |
| `PUBLIC`    |     ✅      |      ✅       | 头文件既是自用也是对外 API     |
| `INTERFACE` |     ❌      |      ✅       | header-only 库，自身不需要编译 |

 **B-hello-headers 为什么用 PRIVATE？**

 因为 `hello_headers` 是一个**可执行文件**，不会有其他目标链接它，所以用 PRIVATE 最合适——自身能编译即可，不需要考虑传递问题。

 ### 3.3 源文件组织的最佳实践

 **不推荐的做法（现代 CMake 已弃用）：**

 ```cmake
set(SOURCES
    src/Hello.cpp
    src/main.cpp
)
add_executable(hello_headers ${SOURCES})
 ```

 **推荐的现代做法：**

 ```cmake
add_executable(hello_headers
    src/Hello.cpp
    src/main.cpp
)
 ```

 直接将源文件写在 `add_executable` 的参数中，更简洁直观。

 ### 3.4 关于 GLOB 的注意事项

 `file(GLOB ...)` 可以用通配符自动收集源文件：

 ```cmake
file(GLOB SOURCES "src/*.cpp")
add_executable(hello_headers ${SOURCES})
 ```

 但这有一个**致命缺陷**：

 > ⚠️ CMake 在**配置阶段**就确定了文件列表。如果你之后在 `src/` 下新增了 `.cpp` 文件，CMake **不会自动检测到**新文件。你需要手动重新运行 `cmake ..`，否则新文件不会被编译。

 而显式列出每个源文件时，当你修改 CMakeLists.txt 添加新文件时，CMake 会**自动触发重新配置**（因为 Makefile 依赖 CMakeLists.txt），不会遗漏。

| 做法             | 新增文件时需手动 cmake？ | 推荐？ |
| ---------------- | :----------------------: | :----: |
| 显式列出源文件   |      ❌ 自动重新配置      |   ✅    |
| `file(GLOB ...)` |     ✅ 需要手动 cmake     |   ❌    |

---

 ## 4. C-static-library：静态库与依赖管理

 C-static-library 在前两个示例的基础上引入了**静态库**的概念，实现了代码的**分离编译和复用**。

 ### 4.1 项目结构与代码

 ```
C-static-library/
├── CMakeLists.txt
├── include/
│   └── static/
│       └── Hello.h           # 头文件（放在 static/ 子目录下）
└── src/
    ├── Hello.cpp              # 库的实现
    └── main.cpp               # 主程序
 ```

 **`include/static/Hello.h`：**

 ```cpp
#ifndef __HELLO_H__
#define __HELLO_H__

class Hello
{
public:
    void print();
};

#endif
 ```

 **`src/Hello.cpp`：**

 ```cpp
#include <iostream>
#include "static/Hello.h"

void Hello::print()
{
    std::cout << "Hello Static Library!" << std::endl;
}
 ```

 **`src/main.cpp`：**

 ```cpp
#include "static/Hello.h"

int main(int argc, char *argv[])
{
    Hello hi;
    hi.print();
    return 0;
}
 ```

 **CMakeLists.txt：**

 ```cmake
cmake_minimum_required(VERSION 3.5)

project(hello_library)

# 第一步：创建静态库
add_library(hello_library STATIC
    src/Hello.cpp
)

target_include_directories(hello_library
    PUBLIC
        ${PROJECT_SOURCE_DIR}/include
)

# 第二步：创建可执行文件并链接库
add_executable(hello_binary
    src/main.cpp
)

target_link_libraries(hello_binary
    PRIVATE
        hello_library
)
 ```

 ### 4.2 add_library 创建静态库

 ```cmake
add_library(hello_library STATIC
    src/Hello.cpp
)
 ```

| 参数            | 说明                                            |
| --------------- | ----------------------------------------------- |
| `hello_library` | 库的目标名称，后续用这个名字引用                |
| `STATIC`        | 生成静态库（Linux 下产生 `libhello_library.a`） |
| `src/Hello.cpp` | 库的源文件                                      |

 > 如果把 `STATIC` 换成 `SHARED`，则生成动态库（`.so`）。

 ### 4.3 target_link_libraries 与依赖传播

 ```cmake
target_link_libraries(hello_binary
    PRIVATE
        hello_library
)
 ```

 这里用 `PRIVATE` 的理由：`hello_binary` 是最终的可执行文件，不会再被其他目标链接，所以依赖不需要继续传递。

 **这里的 PUBLIC 意味着什么？**

 `hello_library` 的 `target_include_directories` 用了 `PUBLIC`：

 ```cmake
target_include_directories(hello_library
    PUBLIC
        ${PROJECT_SOURCE_DIR}/include
)
 ```

 因为 `hello_binary` 链接了 `hello_library`，`hello_library` 的 `PUBLIC` 头文件路径会自动传递给 `hello_binary`。所以 `main.cpp` 中写 `#include "static/Hello.h"` 能正常工作，**不需要**再给 `hello_binary` 单独设置 `target_include_directories`。

 ### 4.4 静态库的编译链接机制

 这是一个容易混淆的关键点。来看核心问题：

 > **如果 Hello.cpp 中调用了另一个模块（如 Add.cpp）的函数，而 Hello.cpp 被编译为静态库时，为什么 CMake 不会报错？**

 答案在于区分**编译、归档、链接**三个阶段：

| 阶段                        | 做了什么                                                 | 检查什么                         | 对未解析符号的处理   |
| --------------------------- | -------------------------------------------------------- | -------------------------------- | -------------------- |
| ① 编译 Hello.cpp → Hello.o  | `g++ -c Hello.cpp`                                       | 只检查**声明**（头文件中有即可） | 生成"未解析引用"占位 |
| ② 归档 → libhello_library.a | `ar rcs libhello_library.a Hello.o`                      | **不检查任何符号**               | "欠条"留在 .a 中     |
| ③ 最终链接 → 可执行文件     | `g++ main.o libhello_library.a libadd_library.a -o prog` | 所有符号必须有**定义**           | 必须找到"兑现"的地方 |

 ```mermaid
graph LR
    A[Hello.cpp] -->|g++ -c| B[Hello.o]
    B -->|ar 打包| C[libhello_library.a<br/>⚠️ 不检查符号]
    D[Add.cpp] -->|g++ -c| E[Add.o]
    E -->|ar 打包| F[libadd_library.a]
    C -->|链接器 ld| G[可执行文件]
    F -->|链接器 ld| G

    style C fill:#ff9,stroke:#333
    style G fill:#9f9,stroke:#333
 ```

 **关键理解：静态库本质是 `.o` 文件的压缩包（`ar` 归档格式）**。它不做链接，不解析符号。只有到最后生成可执行文件时，**链接器**才会检查所有"欠条"（未解析引用）是否都有对应的"兑现"（符号定义）。

 > ⚠️ **如果 `hello_binary` 只链接 `hello_library` 而不链接 `add_library`，链接器就会报 `undefined reference` 错误。** 正确做法是让 `hello_library` 显式声明它对 `add_library` 的依赖。

 ### 4.5 头文件命名空间隔离技巧

 注意 C-static-library 的头文件不是直接放在 `include/` 下，而是放在 `include/static/` 子目录下：

 ```
include/
└── static/          ← 这一层就是"命名空间"
    └── Hello.h
 ```

 源文件中这样引入：

 ```cpp
#include "static/Hello.h"    # 带路径前缀
 ```

 **好处**：当项目中有多个第三方库时，避免头文件重名冲突。比如两个库都有 `config.h`，通过子目录区分：

 ```cpp
#include "libA/config.h"
#include "libB/config.h"
 ```

---

 ## 5. 模块化项目的两种组织模式

 以下是对整个 CMake 依赖管理体系的核心总结，覆盖两种典型的工程场景。

 ### 5.1 并行模式：模块互不依赖

 **场景：** 最终程序由多个完全独立的模块组成，模块之间互不调用。

 ```
最终程序 game
    ├── 图形模块 (libgraphics)   ← 独立
    ├── 音频模块 (libaudio)      ← 独立
    └── 网络模块 (libnetwork)    ← 独立
 ```

 **CMakeLists.txt 模式：**

 ```cmake
# 每个模块独立声明
add_library(graphics STATIC src/graphics/render.cpp)
target_include_directories(graphics PUBLIC ${CMAKE_SOURCE_DIR}/include/graphics)

add_library(audio STATIC src/audio/sound.cpp)
target_include_directories(audio PUBLIC ${CMAKE_SOURCE_DIR}/include/audio)

add_library(network STATIC src/network/socket.cpp)
target_include_directories(network PUBLIC ${CMAKE_SOURCE_DIR}/include/network)

# 最终程序聚合所有模块
add_executable(game src/main.cpp)
target_link_libraries(game
    PRIVATE           # 最终点，不需要再传递
        graphics
        audio
        network
)
 ```

 ```mermaid
graph BT
    G[graphics PUBLIC]
    A[audio PUBLIC]
    N[network PUBLIC]
    GM[game]
    G -->|PRIVATE| GM
    A -->|PRIVATE| GM
    N -->|PRIVATE| GM
    style G fill:#9cf,stroke:#333
    style A fill:#9cf,stroke:#333
    style N fill:#9cf,stroke:#333
    style GM fill:#9f9,stroke:#333
 ```

| 关键点     | 说明                                   |
| ---------- | -------------------------------------- |
| 模块之间   | 没有 `target_link_libraries`，互不关联 |
| 头文件路径 | 各自 `PUBLIC`，game 自动继承           |
| game 链接  | `PRIVATE`，因为 game 是最终点          |

 ### 5.2 嵌套模式：模块之间存在依赖

 **场景：** 一个模块内部使用了另一个模块的功能，依赖关系存在层级。

 ```
最终程序 game
    └── 物理引擎 (libphysics)
            └── 数学库 (libmath)   ← physics 内部用了 math
 ```

 **CMakeLists.txt 模式：**

 ```cmake
# 数学库：底层，独立
add_library(math STATIC src/math/matrix.cpp)
target_include_directories(math PUBLIC ${CMAKE_SOURCE_DIR}/include/math)

# 物理库：中层，内部依赖 math
add_library(physics STATIC src/physics/vec3.cpp)
target_include_directories(physics PUBLIC ${CMAKE_SOURCE_DIR}/include/physics)
target_link_libraries(physics
    PRIVATE math          # ← PRIVATE：math 只在 .cpp 内部使用
)

# 最终程序：只依赖 physics
add_executable(game src/main.cpp)
target_link_libraries(game
    PRIVATE physics       # ← 只写 physics，math 自动传递
)
 ```

 ```mermaid
graph BT
    M[math PUBLIC]
    P[physics PUBLIC]
    G[game]
    M -->|PRIVATE| P
    P -->|PRIVATE| G
    style M fill:#9cf,stroke:#333
    style P fill:#f96,stroke:#333
    style G fill:#9f9,stroke:#333
 ```

 **game 最终能得到什么？**

| 来源                      | 链接时得到的库 |              头文件路径              |
| ------------------------- | :------------: | :----------------------------------: |
| physics 自身              | `libphysics.a` |        `-I include/physics/`         |
| math（通过 physics 传递） |  `libmath.a`   | `-I include/math/` ❌（因为 PRIVATE） |

 编译命令大致为：

 ```bash
g++ -I include/physics/ ... main.cpp          # 只有 physics 的头文件路径
g++ main.o libphysics.a libmath.a -o game     # 两个 .a 都参与链接
 ```

 ### 5.3 黄金法则：什么时候用 PRIVATE / PUBLIC

 **两条核心判断依据：**

| 法则       | 内容                                                         |
| ---------- | ------------------------------------------------------------ |
| **法则 1** | 谁的**头文件出现在 `.h` 中** → `target_link_libraries` 用 `PUBLIC` |
| **法则 2** | 谁**只在 `.cpp` 中使用** → `target_link_libraries` 用 `PRIVATE` |

 **具体判断示例：**

 ```cpp
// ===== physics/vec3.h =====
#include "matrix.h"            // ← 头文件中引用了 math！
class Vec3 {
    Matrix m;                  // ← 暴露了 math 的类型
};
// → target_link_libraries(physics PUBLIC math)

// ===== physics/vec3.cpp =====
#include "matrix.h"            // ← 只在 .cpp 中使用 math
float computeForce(float m, float a) {
    return multiply(m, a);
}
// → target_link_libraries(physics PRIVATE math)
 ```

 **综合决策表：**

| 场景                                | `target_include_directories` | `target_link_libraries` |
| ----------------------------------- | :--------------------------: | :---------------------: |
| 最终可执行文件                      |          通常不需要          |   `PRIVATE` 所有依赖    |
| 头文件只自己用                      |          `PRIVATE`           |            —            |
| 头文件是下游的 API                  |           `PUBLIC`           |            —            |
| .cpp 内部调用另一个库               |              —               |    `PRIVATE` 那个库     |
| .h 中 `#include` 了另一个库的头文件 |              —               |     `PUBLIC` 那个库     |
| header-only 库                      |         `INTERFACE`          |       `INTERFACE`       |

 **依赖传播速查表：**

 ```
A --PUBLIC--> B --PUBLIC--> C  →  C 拿到 A
A --PRIVATE-> B --PUBLIC--> C  →  C 拿不到 A（B 吞了）
A --PUBLIC--> B --PRIVATE-> C  →  C 拿不到 A（C 只拿 B，不深挖）
 ```

---

 ## 6. 附录：完整 CMake 命令速查表

 ### 核心命令

| 命令                                                         | 功能                     |
| ------------------------------------------------------------ | ------------------------ |
| `cmake_minimum_required(VERSION x.xx)`                       | 声明最低 CMake 版本      |
| `project(name)`                                              | 定义项目名称             |
| `add_executable(name src1 src2 ...)`                         | 创建可执行文件目标       |
| `add_library(name STATIC/SHARED src...)`                     | 创建库目标（静态/动态）  |
| `target_include_directories(target PUBLIC/PRIVATE/INTERFACE dir)` | 添加头文件搜索路径       |
| `target_link_libraries(target PUBLIC/PRIVATE/INTERFACE lib)` | 链接其他目标（传递依赖） |

 ### B 与 C 的核心区别一览

| 维度                 |    B-hello-headers     |        C-static-library         |
| -------------------- | :--------------------: | :-----------------------------: |
| Hello.cpp 处理方式   |  和 main.cpp 一同编译  | 单独编译为 `libhello_library.a` |
| 修改 main.cpp 的影响 | Hello.cpp 也要重新编译 |  Hello.cpp 不重编（缓存生效）   |
| 编译产物数量         |   1 个（可执行文件）   |    2 个（`.a` + 可执行文件）    |
| 代码可复用性         |    不能给其他项目用    |      `.a` 可被其他项目链接      |
| 依赖关系复杂度       |       无依赖传播       |   有 PRIVATE/PUBLIC 传递机制    |

---

 > 📝 本文档由学习对话整理而成，保留了所有关键知识点的问答逻辑，但去除了调试过程中的零散信息

