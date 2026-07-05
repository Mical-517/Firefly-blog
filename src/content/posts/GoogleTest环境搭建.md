---
title: GoogleTest环境搭建.md
published: 2026-07-05
description: 'Windows / Linux 双平台 GoogleTest 下载与环境配置完整指南，含 vcpkg、apt、源码编译三种方式及 CMake 集成模板'
image: './images/GoogleTest.png'
tags: [GoogleTest, CMake, vcpkg, '环境配置']
category: '环境配置'
group: tech
postType: post
draft: false
lang: ''
---

# GoogleTest 环境搭建

> 本文整理自 VSCode 实操,覆盖 **Windows** 和 **Linux** 两个平台下 GoogleTest 的下载、安装、编译与 CMake 集成全流程。

---

## 1. 概述

GoogleTest（gtest）是 Google 开源的 C++ 单元测试框架。C++ 没有像 Java、Python 那样标准的包管理体系，因此安装和配置第三方测试库一直是个痛点。

本文按平台分为两大部分：

| 平台 | 推荐方式 | 备选方式 |
|---|---|---|
| Windows | vcpkg 包管理器 | Git 源码 + CMake 编译 |
| Linux | apt 系统包（快速）或源码编译（新版） | 源码编译 |
| 跨平台 | CMake FetchContent（项目内嵌） | — |

**前置依赖（两平台均需）：**
- Git
- CMake ≥ 3.15
- C++ 编译器（Windows：MSVC 或 MinGW；Linux：GCC 或 Clang）

---

## 2. Windows 端

### 2.1 方式一：vcpkg 包管理器（推荐）

vcpkg 是微软推出的跨平台 C/C++ 包管理器，一键解决下载、编译、配置第三方库的痛点。Windows 下体验最佳，与 Visual Studio 深度适配。

#### 2.1.1 安装 vcpkg

```powershell
# 1. 克隆 vcpkg 仓库（以 E:\SoftWare\vcpkg 为例）
git clone https://github.com/microsoft/vcpkg.git
cd vcpkg

# 2. 引导编译（生成 vcpkg.exe）
.\bootstrap-vcpkg.bat
```

可选：关闭遥测收集（隐私优化）

```powershell
# 方式 A：bootstrap 时永久关闭
.\bootstrap-vcpkg.bat -disableMetrics

# 方式 B：临时关闭（仅当前终端生效）
$env:VCPKG_DISABLE_METRICS=1
```

#### 2.1.2 安装 GoogleTest

```powershell
# 安装 64 位 Windows 静态库版本
vcpkg install gtest:x64-windows
```

vcpkg 会自动下载 gtest 源码、编译生成 `.lib` 文件，并输出头文件和库文件的路径。

常用三元组（triplet）：

| 三元组 | 说明 |
|---|---|
| `x64-windows` | 64 位 Windows 静态库 |
| `x86-windows` | 32 位 Windows 静态库 |
| `x64-windows-static` | 64 位 Windows 完全静态链接 |
| `x64-linux` | 64 位 Linux |

#### 2.1.3 集成到项目

**方式 A：VS 全局集成（执行一次，所有 VS 项目自动识别）**

```powershell
vcpkg integrate install
```

执行后 VS 自动识别 vcpkg 安装的所有库，无需手动配置包含目录和库目录。

**方式 B：CMake 项目集成（在 CMake 命令中指定工具链）**

```powershell
cmake -B build -S . `
  -DCMAKE_TOOLCHAIN_FILE="E:/SoftWare/vcpkg/scripts/buildsystems/vcpkg.cmake"
```

之后在 `CMakeLists.txt` 中直接使用 `find_package(GTest CONFIG REQUIRED)` 即可。

**方式 C：使用 vcpkg.json 清单文件（推荐团队协作）**

在项目根目录创建 `vcpkg.json`：

```json
{
  "name": "my-project",
  "version-string": "1.0.0",
  "dependencies": [
    "gtest"
  ]
}
```

#### 2.1.4 国内镜像加速

安装前设置镜像环境变量，大幅提升下载速度：

```powershell
$env:X_VCPKG_ASSET_SOURCES="x-azurl,https://mirrors.tuna.tsinghua.edu.cn/github-release/"
```

### 2.2 方式二：Git 源码 + CMake 编译

#### 2.2.1 获取源码

```powershell
# 克隆最新版
git clone https://github.com/google/googletest.git

# 或指定稳定版本（推荐）
git clone -b v1.17.0 https://github.com/google/googletest.git
```

无 Git 时可从 [GitHub Releases](https://github.com/google/googletest/releases) 下载 ZIP。

#### 2.2.2 编译安装

```powershell
cd googletest
mkdir build && cd build

# 配置（生成 Visual Studio 工程）
cmake .. -G "Visual Studio 17 2022"

# 编译
cmake --build . --config Debug
cmake --build . --config Release

# 安装到系统目录（可选，需要管理员权限）
cmake --install . --config Release
```

编译产物：
- 静态库：`build/lib/Debug/gtest.lib`、`gtest_main.lib`
- DLL：`build/bin/Debug/gtest.dll`
- 头文件：`googletest/include/gtest/`

---

## 3. Linux 端

### 3.1 方式一：apt 系统包（最简）

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libgtest-dev cmake

# 注意：apt 只安装源码到 /usr/src/gtest/，仍需手动编译
cd /usr/src/gtest
sudo cmake CMakeLists.txt
sudo make
sudo cp lib/*.a /usr/lib/
```

**优点：** 命令少，适合快速验证。**缺点：** 版本偏旧（Ubuntu 22.04 自带 gtest 1.11.0）。

### 3.2 方式二：源码编译（推荐，获得最新版）

```bash
# 1. 安装编译工具链
sudo apt install build-essential cmake git

# 2. 克隆源码
git clone https://github.com/google/googletest.git
cd googletest

# 3. 创建构建目录
mkdir build && cd build

# 4. CMake 配置
cmake .. -DCMAKE_BUILD_TYPE=Release

# 5. 编译（-j$(nproc) 使用所有 CPU 核心）
make -j$(nproc)

# 6. 安装
sudo make install
```

安装后的文件布局：

```
/usr/local/
├── include/gtest/        # 头文件
│   ├── gtest.h
│   └── ...
└── lib/
    ├── libgtest.a        # 静态库
    ├── libgtest_main.a   # 含 main() 入口的静态库
    └── cmake/GTest/      # CMake 查找配置
```

### 3.3 验证安装

```bash
# 检查库文件是否存在
ls /usr/local/lib/libgtest*.a

# 或使用 pkg-config（如果安装了）
pkg-config --libs gtest
```

---

## 4. 跨平台方案：CMake FetchContent

如果不想在系统全局安装 gtest，可以让 CMake 在构建时自动下载并编译 gtest，这是最推荐的工程级方案：

```cmake
cmake_minimum_required(VERSION 3.15)
project(MyProject LANGUAGES CXX)

include(FetchContent)

FetchContent_Declare(
  googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG        v1.17.0
)
FetchContent_MakeAvailable(googletest)

# 之后即可直接使用
enable_testing()
add_executable(unit_tests tests/foo_test.cpp)
target_link_libraries(unit_tests PRIVATE gtest_main)
gtest_discover_tests(unit_tests)
```

**优点：** 零外部依赖，克隆项目即可构建；版本锁定在 CMakeLists.txt 中，团队一致。**缺点：** 首次构建需下载 gtest（约 10MB）。

---

## 5. CMakeLists.txt 集成模板

### 5.1 纯测试项目（无业务代码）

```cmake
# 指定 CMake 最低版本
cmake_minimum_required(VERSION 3.15)

# 定义项目名称和语言
project(MyTest LANGUAGES CXX)

# 设置 C++ 标准为 17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# 启用 CTest 测试管理功能
enable_testing()

# 查找已安装的 GoogleTest（vcpkg 或系统安装）
find_package(GTest CONFIG REQUIRED)

# 引入 GoogleTest 的 CMake 辅助模块
include(GoogleTest)

# 生成测试可执行文件
add_executable(unit_tests
    tests/main_test.cpp
    tests/foo_test.cpp
    tests/bar_test.cpp
)

# 链接 gtest_main（提供 main() 函数，无需手写）
target_link_libraries(unit_tests
    PRIVATE
    GTest::gtest_main
)

# 自动发现并注册每个 GTest 测试用例到 CTest
gtest_discover_tests(unit_tests)
```

### 5.2 标准工程（业务代码 + 测试分离）

```cmake
cmake_minimum_required(VERSION 3.15)
project(MyProject LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# 控制是否构建测试的开关（默认开启）
option(BUILD_TESTING "Build unit tests" ON)

# 把业务代码编成库，供 app 和测试复用
add_library(my_project_lib
    src/foo.cpp
    src/bar.cpp
)

# 暴露头文件目录（PUBLIC 表示使用者也能继承此路径）
target_include_directories(my_project_lib
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# 生成主程序
add_executable(app
    src/main.cpp
)
target_link_libraries(app PRIVATE my_project_lib)

# -- 测试部分 --
if(BUILD_TESTING)
    include(CTest)

    find_package(GTest CONFIG REQUIRED)
    include(GoogleTest)

    # 生成测试程序
    add_executable(unit_tests
        tests/foo_test.cpp
        tests/bar_test.cpp
    )

    # 测试链接业务库 + gtest_main
    target_link_libraries(unit_tests
        PRIVATE
            my_project_lib
            GTest::gtest_main
    )

    # 自动发现测试用例
    gtest_discover_tests(unit_tests)
endif()
```

对应的标准工程目录结构：

```
MyProject/
├── CMakeLists.txt
├── include/my_project/
│   ├── foo.h
│   └── bar.h
├── src/
│   ├── foo.cpp
│   ├── bar.cpp
│   └── main.cpp
├── tests/
│   ├── foo_test.cpp
│   └── bar_test.cpp
└── build/
```

### 5.3 关键命令解析

| 命令 | 作用 |
|---|---|
| `enable_testing()` | 启用 CTest 框架入口，让 CMake 能管理测试 |
| `find_package(GTest CONFIG REQUIRED)` | 查找已安装的 GoogleTest，找不到就报错 |
| `include(GoogleTest)` | 引入 GoogleTest 的 CMake 辅助模块 |
| `gtest_discover_tests(unit_tests)` | 构建后扫描可执行文件中的 TEST/TEST_F 用例，逐个注册到 CTest |
| `GTest::gtest_main` | 提供默认 `main()`，普通测试无需自己写入口 |

`enable_testing()` 和 `gtest_discover_tests()` 的配合关系：

1. `enable_testing()` — 告诉 CMake「本项目有测试」，打开测试管理功能
2. `gtest_discover_tests(target)` — 从 gtest 可执行文件中自动扫描出每个 `TEST(xxx)` 用例，逐一注册，运行 `ctest` 时能看到每个用例的独立结果

---

## 6. 常见问题

### 6.1 `Gtest::gtest_main` vs `GTest::gtest_main`（大小写错误）

```cmake
# ❌ 错误 — 小写 s 会导致链接失败
target_link_libraries(unit_tests PRIVATE Gtest::gtest_main)

# ✅ 正确 — GT 首字母大写，est 小写
target_link_libraries(unit_tests PRIVATE GTest::gtest_main)
```

如果 CMake 报 `找不到 Gtest::gtest_main` 这类错误，先检查大小写。

### 6.2 CMake 报 "source directory does not appear to contain CMakeLists.txt"

这通常是因为 `cmake ..` 的当前目录层级不对，没有进入到有 `CMakeLists.txt` 的目录。建议显式指定路径：

```bash
# Windows
cmake -S D:/Study/Test/GoogleTest -B D:/Study/Test/GoogleTest/build

# Linux
cmake -S /home/user/project -B /home/user/project/build
```

### 6.3 vcpkg 下载超时

国内网络环境可使用清华镜像：

```powershell
$env:X_VCPKG_ASSET_SOURCES="x-azurl,https://mirrors.tuna.tsinghua.edu.cn/github-release/"
vcpkg install gtest:x64-windows
```

### 6.4 apt 安装后 `find_package(GTest)` 找不到

Ubuntu 的 `libgtest-dev` 只安装源码，不安装编译好的 `.a` 文件和 CMake 配置。需要手动编译后安装：

```bash
cd /usr/src/gtest
sudo cmake CMakeLists.txt
sudo make
sudo cp lib/*.a /usr/lib/
```

---

## 7. 参考链接

- GoogleTest 官方仓库：[https://github.com/google/googletest](https://github.com/google/googletest)
- vcpkg 官方仓库：[https://github.com/microsoft/vcpkg](https://github.com/microsoft/vcpkg)
- GoogleTest 使用文档：[https://google.github.io/googletest/](https://google.github.io/googletest/)
