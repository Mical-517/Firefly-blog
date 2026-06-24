---
title: 关于配置vscode与wsl环境
published: 2026-06-24
description: '关于vscode远程连接wsl的配置以及一些原理'
image: ''
tags: [c++学习：环境搭建]
category: 'c++环境配置'
group: tech
postType: post
draft: false
lang: ''
---



# WSL + VS Code 搭建现代 C++ 开发环境记录

## 1. 写在前面

这篇文章记录我在 Windows 上使用 WSL 和 VS Code 搭建现代 C++ 开发环境的过程。

我目前已经完成的进度：

- 安装好了 WSL。
- 使用 Windows 里的 VS Code 连接 WSL。
- 在 WSL 中创建并编译运行了一个简单的 `helloworld.cpp`。

主要参考资料：

- VS Code 官方文档：https://code.visualstudio.com/docs
- VS Code Remote WSL 官方文档：https://code.visualstudio.com/docs/remote/wsl
- Microsoft WSL + VS Code 官方教程：https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-vscode
- Microsoft WSL 介绍：https://learn.microsoft.com/en-us/windows/wsl/about

这篇文章重点不是简单罗列命令，而是想弄清楚几个问题：

- WSL 到底是什么？
- WSL 的定位是什么？
- VS Code 是如何连接 WSL 的？
- 为什么不能只在 Windows 里直接打开 WSL 挂载目录？
- 为什么一些工具和插件需要在 WSL 环境里重新安装？

## 2. WSL 是什么

WSL 的全称是 Windows Subsystem for Linux，也就是 Windows 的 Linux 子系统。

根据 Microsoft 官方文档，WSL 是 Windows 的一项功能，它允许用户在 Windows 机器上运行 Linux 环境，而不需要单独安装传统虚拟机，也不需要做双系统。它的目标是让开发者可以同时使用 Windows 和 Linux。

简单说：

**WSL 不是一个普通软件，也不是一个完整桌面虚拟机，而是 Windows 提供的一套 Linux 开发环境。**

在 WSL 中可以做很多 Linux 开发相关的事情：

- 安装 Ubuntu、Debian、Kali 等 Linux 发行版。
- 使用 Bash、grep、sed、awk 等 Linux 命令。
- 运行 C/C++、Python、Node.js、Go、Rust 等开发工具链。
- 使用 Linux 的包管理器安装软件。
- 在 Windows 中调用 Linux 程序，也可以在 Linux shell 中调用 Windows 程序。

## 3. WSL 的定位

我对 WSL 的理解是：

**WSL 适合作为 Windows 用户的 Linux 开发环境，而不是完整替代传统虚拟机的 Linux 学习环境。**

如果目标是学习 Linux 系统管理、桌面环境、完整服务部署，VMware 或 VirtualBox 中的 Linux 虚拟机仍然有价值。

但如果目标是写代码，尤其是：

- C++ 后端开发
- Linux C++ 项目
- WebServer
- 数据库或存储项目
- 使用 Linux 命令行工具
- 使用 VS Code 做跨平台开发

那么 WSL 的体验通常更轻量、更方便。

WSL2 使用虚拟化技术运行 Linux 内核，但它不是传统意义上的完整虚拟机体验。Microsoft 官方文档中提到，WSL2 会在一个轻量级 utility VM 中运行 Linux 内核，各个 Linux 发行版运行在这个 WSL2 管理的 VM 中。

所以我的理解是：

- WSL2 有真实 Linux 内核。
- WSL2 比传统虚拟机更轻。
- WSL2 与 Windows 集成更紧密。
- WSL2 更适合作为日常开发环境。

## 4. 为什么我选择 WSL 做 C++ 开发环境

我之前已经有 Linux 学习环境，也接触过 Red Hat 系统。但这次做 C++ 项目开发，我更倾向于使用 WSL，原因是：

- VS Code 可以直接连接 WSL。
- 代码编辑、终端、调试、Git 都能在一个工具里完成。
- Windows 和 Linux 可以同时使用，不需要频繁切换虚拟机窗口。
- 后续做 WebServer、TinyKV、MyTinySTL 这类项目时，更贴近日常开发体验。
- 出问题时，官方文档和社区资料很多。

我的定位不是用 WSL 替代所有 Linux 学习，而是把它作为主力开发环境。

可以这样分工：

- WSL：主力 C++ 开发环境。
- VMware / Red Hat：Linux 系统学习、命令练习、服务配置实验。

## 5. VS Code 是如何连接 WSL 的

一开始我以为 VS Code 只是“打开了 WSL 里的文件”。后来阅读官方文档后才发现，VS Code 连接 WSL 不是简单的文件访问，而是一种 client-server 架构。

VS Code Remote WSL 官方文档中说明：

- VS Code 的界面运行在 Windows 上。
- VS Code Server 会安装并运行在 WSL 中。
- 代码、Git、插件、终端、调试器等开发相关操作可以在 WSL 中执行。

也就是说，连接 WSL 后，VS Code 大概分成两部分：

- Windows 侧：负责显示界面，也就是我看到的编辑器窗口。
- WSL 侧：负责真正运行项目、工具链、调试器、语言服务和部分插件。

这也是为什么连接成功后，VS Code 左下角会显示类似 `WSL: Ubuntu` 的标记。

此时打开终端，终端默认进入的也是 WSL 环境，而不是 Windows 的 PowerShell 或 cmd。

## 6. `code .` 做了什么

官方教程推荐在 WSL 终端中进入项目目录后执行：

```bash
code .
```

这个命令的作用不是简单地“用 Windows VS Code 打开当前文件夹”，而是让 VS Code 以 Remote WSL 的方式打开当前目录。

第一次执行时，VS Code 会在 WSL 中下载并安装 VS Code Server。安装完成后，VS Code 才能把很多开发操作放到 WSL 内部执行。

所以正确的工作流通常是：

```bash
mkdir -p ~/projects/hello-cpp
cd ~/projects/hello-cpp
code .
```

打开后要确认 VS Code 左下角显示的是 WSL 环境。

如果只是从 Windows 资源管理器里双击某个 Linux 路径，或者在 Windows 本地 VS Code 中打开某个挂载目录，不一定等价于 Remote WSL 开发模式。

## 7. 为什么不建议直接打开 WSL 挂载文件

WSL 和 Windows 可以互相访问文件系统。

例如：

- 在 WSL 中可以访问 Windows 盘符：`/mnt/c/Users/...`
- 在 Windows 中也可以通过类似 `\\wsl$` 的路径访问 WSL 文件。

但开发时不能只看“能不能打开”，还要看“工具链在哪边运行”。

如果只是用 Windows 侧的 VS Code 打开 WSL 的文件，但没有进入 Remote WSL 模式，就会出现一个问题：

**文件看起来在 Linux 里，但工具链可能仍然在 Windows 里运行。**

这样就容易出现：

- 路径格式不一致。
- 编译器找不到。
- 调试器不匹配。
- 插件运行位置不对。
- Python、C++、Git 等工具不是同一个环境里的版本。

官方文档也强调，Remote WSL 扩展的意义是让命令和扩展直接在 WSL 中运行，从而避免路径、二进制兼容性、跨系统差异等问题。

所以我的结论是：

**不要把 WSL 当成一个普通文件夹来打开，而要把它当成一个远程开发环境来连接。**

## 8. 项目文件应该放在哪里

推荐做法：

```bash
~/projects
```

比如：

```bash
mkdir -p ~/projects/cpp-study
cd ~/projects/cpp-study
code .
```

不太推荐长期把 Linux 项目放在：

```bash
/mnt/c/Users/用户名/Desktop
/mnt/c/Users/用户名/Documents
```

原因是：

- Linux 工具访问 WSL 自己的文件系统通常更自然。
- 权限、符号链接、大小写敏感、换行符等问题更少。
- 对后续 CMake、Git、编译、调试更稳定。

Windows 目录不是不能用，但如果是 Linux C++ 项目，最好放在 WSL 的 Linux 文件系统里。

## 9. 为什么插件要在 WSL 里重新安装

这是我一开始比较疑惑的地方。

我已经在 Windows 的 VS Code 装过插件了，为什么连接 WSL 后，VS Code 还提示某些插件要 `Install in WSL`？

官方文档解释得很清楚：VS Code 在 Remote WSL 模式下会把插件分成两类：

- 本地插件：运行在 Windows 侧，通常是主题、图标、快捷键这类只影响界面的插件。
- 远程插件：运行在 WSL 侧，通常是语言服务、调试、lint、格式化、测试等需要访问工具链的插件。

比如：

- C/C++ 插件需要调用 WSL 里的 `g++`、`gdb`。
- Python 插件需要识别 WSL 里的 Python 解释器、虚拟环境和包。
- CMake Tools 需要调用 WSL 里的 `cmake`、`ninja`。

这些插件如果只装在 Windows 侧，就只能看到 Windows 的工具链。它们无法天然使用 WSL 里的编译器、解释器和调试器。

因此，一些开发类插件必须在 WSL 中再安装一份。

这不是重复劳动，而是因为：

**VS Code 的界面在 Windows，但真正的开发环境在 WSL。插件必须跟着开发环境走。**

## 10. 为什么工具也要在 WSL 里重新安装

另一个疑惑是：我 Windows 里已经安装过 Python、Git 或 C++ 编译器，为什么 WSL 里还要再装？

原因是 Windows 和 WSL 是两个不同的运行环境。

Windows 里的工具一般是：

```text
C:\Program Files\...
C:\Users\...
```

WSL 里的工具一般是：

```text
/usr/bin/g++
/usr/bin/python3
/usr/bin/git
/usr/bin/cmake
```

它们的路径、二进制格式、依赖库、包管理方式都不一样。

例如：

- Windows 的 Python 使用 Windows 路径和 Windows 依赖。
- WSL 的 Python 使用 Linux 路径和 Linux 依赖。
- Windows 的 `g++` 编译出来的是 Windows 程序。
- WSL 的 `g++` 编译出来的是 Linux ELF 程序。

所以如果我要在 WSL 中做 Linux C++ 开发，就应该在 WSL 中安装 Linux 版本的开发工具。

常用安装命令：

```bash
sudo apt update
sudo apt install -y build-essential gdb cmake ninja-build git
```

这里：

- `build-essential`：提供 `gcc`、`g++`、`make` 等基础编译工具。
- `gdb`：C/C++ 调试器。
- `cmake`：现代 C++ 项目常用构建系统。
- `ninja-build`：常用高效构建后端。
- `git`：版本控制工具。

## 11. 我的 Hello World 流程

我在 WSL 中创建了一个简单的 C++ 文件：

```cpp
#include <iostream>

int main() {
    std::cout << "Hello, WSL C++!" << std::endl;
    return 0;
}
```

然后使用 `g++` 编译：

```bash
g++ helloworld.cpp -o helloworld
```

运行：

```bash
./helloworld
```

这一步的意义不是程序本身，而是确认：

- WSL 可以正常运行。
- VS Code 可以连接 WSL。
- WSL 中有可用的 C++ 编译器。
- 编译出的程序是 Linux 环境中的可执行文件。
- VS Code 的终端确实在 WSL 中运行。

## 12. 我的理解总结

这次配置后，我对 WSL + VS Code 的理解更清楚了。

WSL 的定位：

**它是 Windows 上的 Linux 开发环境。**

VS Code 的定位：

**它是运行在 Windows 上的编辑器界面，但可以通过 Remote WSL 把开发操作交给 WSL。**

Remote WSL 的定位：

**它让 VS Code 变成 client-server 架构：Windows 负责界面，WSL 负责项目、工具链、插件和调试。**

项目文件的推荐位置：

**Linux 项目尽量放在 WSL 的 Linux 文件系统里，例如 `~/projects`。**

工具安装原则：

**在哪个环境里编译、运行、调试，就在哪个环境里安装工具链。**

插件安装原则：

**只影响界面的插件装 Windows 侧；涉及编译、解释器、调试、lint、格式化的插件要装 WSL 侧。**

## 13. 后续计划

这次已经完成了最基本的 Hello World 验证。下一步我准备继续完成：

- 配置 VS Code 的 C/C++ 插件。
- 配置 CMake Tools。
- 创建第一个 CMake C++ 项目。
- 学会 Debug 断点调试。
- 给项目加入 `.vscode` 配置。
- 建立自己的 `cpp-project-template`。

后续我的 C++ 项目都会尽量按照这个方式组织：

```text
~/projects/project-name
├── CMakeLists.txt
├── include
├── src
├── tests
└── README.md
```

## 14. 参考资料

- VS Code 官方文档：https://code.visualstudio.com/docs
- VS Code Remote WSL 文档：https://code.visualstudio.com/docs/remote/wsl
- VS Code C++ with WSL 文档：https://code.visualstudio.com/docs/cpp/config-wsl
- Microsoft WSL + VS Code 教程：https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-vscode
- Microsoft WSL 介绍：https://learn.microsoft.com/en-us/windows/wsl/about
