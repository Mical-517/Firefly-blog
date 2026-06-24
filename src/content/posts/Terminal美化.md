---
title: Terminal美化.md
published: 2026-06-24
description: '通过终端设置以及oh my posh实现基础终端美化'
image: 'https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/202606241451951.png'
tags: [Terminal]
category: '美化技术'
group: tech
postType: post
draft: false
lang: ''
---

![image-20260624145106758](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/202606241451951.png)



# PS

教程参考：[windows终端美化（原生配置+oh my posh）_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1p4uSznEsX/?spm_id_from=333.337.search-card.all.click&vd_source=86d06d10a03dcd75fe3a632194bc3c3c)

博客参考：[windows终端美化（原生设置+Oh My Posh主题美化） - 知兀 - 博客园](https://www.cnblogs.com/zhiwu215/p/18991784)



只是完整记录一下内容，防止网络内容丢失



# Start



------

## Windows 终端美化设置流程

基于博客园文章「windows终端美化（原生设置+Oh My Posh主题美化）」，完整流程如下。

------

### 一、安装/确认 Windows Terminal

- **Win10**：去微软商店搜索下载 **Windows Terminal**。
- **Win11**：系统已自带，无需额外安装。

------

### 二、更新 PowerShell（可选但推荐）

1. 打开微软商店，搜索 **PowerShell**，下载最新版。
2. 安装完成后，在 Windows Terminal 的下拉菜单中切换到最新的 PowerShell 版本。

------

### 三、Windows Terminal 基础设置

#### 3.1 设置默认配置文件

打开 Windows Terminal 设置 → 「启动」→ 「默认配置文件」，选择你最常用的终端（如 PowerShell 7），以后点击标题栏 "+" 号就会默认打开它。

#### 3.2 设置默认终端应用程序

在「启动」→ 「默认终端应用程序」中，选择 **Windows Terminal**。这样在运行 `cmd` 或其他程序时，都会在 Windows Terminal 中打开，而非旧版控制台主机。

------

### 四、快捷键设置

Windows Terminal 内置了丰富的快捷键，在设置 → 「操作」中可查看和修改。

| 快捷键                       | 功能                     |
| ---------------------------- | ------------------------ |
| <code>Win + ~</code>（sc41） | Quake 窗口（下拉式终端） |
| `Alt + Shift + +`（加号）    | 横向分隔窗格             |
| `Alt + Shift + -`（减号）    | 竖向分隔窗格             |
| `Alt + 方向键`               | 在窗格间移动焦点         |

以下快捷键默认未开启，需要在「操作」中手动添加：

| 快捷键                                   | 功能                   |
| ---------------------------------------- | ---------------------- |
| 自定义（如 `Ctrl + Shift + W`）          | 关闭当前窗格           |
| 自定义（如 `Ctrl + Shift + F` 或 `F11`） | 专注模式（隐藏标题栏） |

> 专注模式配合 Quake 窗口可以实现多窗口效果。

------

### 五、字体设置

#### 5.1 推荐字体

- **Cascadia Code**：微软推出，支持编程连字（Ligatures），在[GitHub](https://github.com/microsoft/cascadia-code)下载。选择 `ttf` 格式的 `CascadiaCode.ttf` 即可。
- **Nerd Fonts**（推荐）：如果需要显示特殊图标符号（如 Oh My Posh 的图标），请从 [nerdfonts.com](https://www.nerdfonts.com/) 下载 Nerd Fonts 版本字体。常见后缀含义：
  - **NF**：Nerd Fonts，包含大量图标字形
  - **PL**：Powerline 兼容
  - **Mono**：等宽字体
  - **Italic**：斜体

#### 5.2 配置字体

Windows Terminal 设置 → 配置文件（如 PowerShell）→ 「外观」→ **字体 face** 中选择安装的字体，**字体粗细**（字重）可选 `regular`（正常）、`bold`（粗体）、`light`（较细）。

------

### 六、背景外观设置

1. 打开 Windows Terminal 设置 → 配置文件 → 「外观」。
2. 在「背景图像」中，选择一张本地图片作为背景。
3. 推荐设置壁纸的**不透明度**，让文字更清晰。
4. 选图建议：
   - 图片色彩种类尽量少，避免花哨干扰阅读代码
   - 推荐深色系图片，否则需将不透明度调低
   - 如使用人物壁纸，人物最好在右侧，左侧留白给代码

免费壁纸网站：[哲风壁纸](https://haowallpaper.com/homeView)

------

### 七、Oh My Posh 主题美化

Oh My Posh 是一个跨平台提示符美化工具。

#### 7.1 安装

使用 Windows 自带的包管理器 winget 安装：

```
winget install JanDeDobbeleer.OhMyPosh --source winget --scope user --force
```

#### 7.2 启用

打开 PowerShell 配置文件：

```
notepad $PROFILE
```

在弹出的记事本中添加以下内容，然后保存：

```
oh-my-posh init pwsh | Invoke-Expression
```

#### 7.3 选择主题

1. 在 [Oh My Posh 官网](https://ohmyposh.dev/docs/themes) 浏览所有主题。
2. 所有主题文件位于 Oh My Posh 安装目录下的 `themes` 文件夹中。
3. 选择一个喜欢的主题（如 `negligible`），获取其完整路径。
4. 修改 $PROFILE 中的配置，指定具体主题：

```
oh-my-posh init pwsh --config "C:\路径\到\主题文件.omp.json" | Invoke-Expression
```

#### 7.4 重新加载配置

保存文件后，在终端执行以下命令使配置生效：

```
. $PROFILE
```

#### 7.5 卸载/取消美化

如果想恢复原样，只需打开 $PROFILE，删除里面的 Oh My Posh 相关内容即可：

```
notepad $PROFILE
```

清空内容或删除对应行，保存后重新加载。

#### 7.6 自定义主题（进阶）

阅读 Oh My Posh 官方文档中的 **Configuration** 和 **Segments** 部分，可以完全自定义提示符的每一个部分（颜色、图标、显示内容等）。

------

### 八、注意事项

- 安装 Oh My Posh 后，务必使用 **Nerd Fonts** 字体，否则图标可能显示为乱码方框。
- 配置文件 $PROFILE 按用户级别存储，不同用户的配置互不影响。
- 如需在 Git Bash 等其他 shell 中使用 Oh My Posh，需相应修改对应 shell 的配置文件。
