---
title: Typora 使用笔记
published: 2026-09-25
description: 'Typora 常用 Markdown 语法速查与实用写作技巧，包括代码块快捷退出、表格操作、快捷键汇总等日常高频操作'
image: ''
tags: [Typora, Markdown, 写作技巧, 效率]
category: 'Tools'
group: tech
draft: false
lang: ''
---

# 简介

Typora 是一款所见即所得的 Markdown 编辑器：你在编辑区写什么，预览区就显示什么，没有左右分栏的割裂感。写完标题、列表、代码块，渲染效果立刻出现，非常适合日常写博客、记笔记、写文档。

它支持 GFM（GitHub Flavored Markdown）语法，也内置了表格、数学公式、Mermaid 流程图、TOC 目录等扩展能力。下面分两个板块整理：常用 Markdown 语法、实用写作技巧。

---

# 一、常用 Markdown 语法

## 1. 标题

在行首输入 1~6 个 `#` 加一个空格，对应六级标题。也可以用快捷键 `Ctrl+1`~`Ctrl+6` 直接切换，`Ctrl+0` 恢复为正文。

```markdown
# 一级标题
## 二级标题
### 三级标题
```

## 2. 强调与样式

```markdown
**加粗**  —— 快捷键 Ctrl+B
*斜体*    —— 快捷键 Ctrl+I
<u>下划线</u> —— 快捷键 Ctrl+U
~~删除线~~
`行内代码` —— 快捷键 Ctrl+Shift+`
```

## 3. 列表

无序列表用 `-`、`+`、`*` 加空格开头；有序列表用 `1.` 加空格开头。Typora 会自动帮你把序号排好，回车后还会自动延续列表项。

```markdown
- 无序列表项
- 无序列表项

1. 有序列表项
2. 有序列表项
```

**这里注意：**如果强制退出使用`ctrl+tab`

## 4. 引用

行首用 `>` 加空格，快捷键 `Ctrl+Shift+Q`。多级引用可以用多个 `>` 嵌套。

```markdown
> 这是一段引用
> 第二行引用
```

**注意**：强制退出同样是`ctrl+enter`

## 5. 链接与图片

```markdown
[链接文字](https://example.com)
![图片描述](https://example.com/image.png)
```

快捷键：链接 `Ctrl+K`，图片 `Ctrl+Shift+I`。图片支持直接拖拽或粘贴进 Typora，会自动复制到本地图片目录。

## 6. 表格

用管道符 `|` 和分隔行 `---` 声明表格，也可以在菜单里插入，快捷键 `Ctrl+T`。

```markdown
| 列1 | 列2 |
| --- | --- |
| 内容 | 内容 |
```

## 7. 代码块

用三个反引号加语言名包裹，快捷键 `Ctrl+Shift+K`。指定语言后 Typora 会做语法高亮。

````markdown
```python
print("hello")
```
````

## 8. 数学公式

行内公式用 `$...$`，块级公式用 `$$...$$`（或 `Ctrl+Shift+M`），Typora 内置 KaTeX 渲染。

```markdown
行内公式 $E=mc^2$

块级公式：
$$
\sum_{i=1}^n i = \frac{n(n+1)}{2}
$$
```

## 9. TOC 目录

在文档任意位置插入 `[TOC]`，Typora 会自动根据标题生成目录（只对当前文档生效）。

## 10. 分隔线

三个及以上连续的 `-`、`*` 或 `_` 组成分隔线。

---

# 二、实用写作技巧

## 1. 快捷退出代码块：Ctrl+Enter

写完代码块后，不用连按三下方向键↓ 再回车，直接在代码块内按 **`Ctrl+Enter`**，光标就会跳到代码块外面、新起一段正文。

:::tip
这个技巧同样适用于数学公式块、引用块等块级元素，写完后按 `Ctrl+Enter` 即可退出。
:::

## 2. 表格快捷操作

- 在表格任意单元格按 **`Ctrl+Enter`**：在当前行下方快速插入一行
- 表格中 **`Tab`**：跳到下一个单元格；**`Shift+Tab`**：跳回上一个单元格
- **`Ctrl+L`**：选中当前单元格内容（连续按可扩展选中范围）
- **`Ctrl+Shift+Backspace`**：删除当前行
- 右键菜单也能完成增删行列

## 3. 换行 vs 新段落

- **`Enter`**：新起一个段落（块级元素，间距更大）
- **`Shift+Enter`**：在段落内换行（行内换行，间距更小）

## 4. 快速输入常用语法

- `Ctrl+B` 加粗、`Ctrl+I` 斜体、`Ctrl+U` 下划线，选中文字后按快捷键直接套用
- `Ctrl+Shift+K` 代码块、`Ctrl+Shift+M` 数学块、`Ctrl+Shift+Q` 引用块
- `Ctrl+Shift+]` 无序列表、`Ctrl+Shift+[` 有序列表
- `Ctrl+Shift+\`` 行内代码
- `Ctrl+K` 链接、`Ctrl+Shift+I` 图片

## 5. 复制为 Markdown / 粘贴为纯文本

- **`Ctrl+Shift+C`**：复制选中内容为 Markdown 源码（默认 `Ctrl+C` 复制的是渲染后的富文本）
- **`Ctrl+Shift+V`**：粘贴为纯文本，去掉格式

## 6. 查找与替换

- **`Ctrl+F`** 查找，**`Ctrl+H`** 替换
- **`Ctrl+J`** 跳到当前选中的位置

## 7. 大纲与文件树

- **`Ctrl+Shift+1`**：大纲（Outline），按标题快速跳转
- **`Ctrl+Shift+2`**：文章列表（Articles）
- **`Ctrl+Shift+3`**：文件树（File Tree）
- **`Ctrl+Shift+L`**：显示/隐藏侧边栏

## 8. 专注模式

- **`F8`**：专注模式（Focus Mode），隐藏其他元素只留当前段落
- **`F9`**：打字机模式（Typewriter Mode），光标始终居中

## 9. 源码模式

**`Ctrl+/`** 在源码模式和所见即所得之间切换，需要查看原始 Markdown 时很方便。

## 10. 其他高频快捷键

| 功能 | 快捷键 |
| --- | --- |
| 新建文档 | Ctrl+N |
| 打开文档 | Ctrl+O |
| 保存 | Ctrl+S |
| 另存为/复制 | Ctrl+Shift+S |
| 全选 | Ctrl+A |
| 跳到顶部 | Ctrl+Home |
| 跳到底部 | Ctrl+End |
| 切换文档 | Ctrl+Tab |

---

# 三、常用快捷键速查表

| 功能 | 快捷键 (Windows/Linux) |
| --- | --- |
| 标题 1~6 | Ctrl+1 ~ Ctrl+6 |
| 正文 | Ctrl+0 |
| 加粗 | Ctrl+B |
| 斜体 | Ctrl+I |
| 下划线 | Ctrl+U |
| 删除线 | Alt+Shift+5 |
| 行内代码 | Ctrl+Shift+\` |
| 代码块 | Ctrl+Shift+K |
| 数学公式块 | Ctrl+Shift+M |
| 引用块 | Ctrl+Shift+Q |
| 无序列表 | Ctrl+Shift+] |
| 有序列表 | Ctrl+Shift+[ |
| 链接 | Ctrl+K |
| 图片 | Ctrl+Shift+I |
| 表格 | Ctrl+T |
| 新建段落 | Enter |
| 段内换行 | Shift+Enter |
| 退出代码块/公式块 | Ctrl+Enter |
| 查找 / 替换 | Ctrl+F / Ctrl+H |
| 源码模式 | Ctrl+/ |
| 专注模式 | F8 |
| 打字机模式 | F9 |
| 侧边栏 | Ctrl+Shift+L |

> 以上快捷键均以 Windows/Linux 为准，macOS 对应将 `Ctrl` 换成 `Command`。
