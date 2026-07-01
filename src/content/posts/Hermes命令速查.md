---
title: Hermes命令速查
published: 2026-07-01
description: '用于终端Hermes的快速使用命令，因为桌面端有些任务调用过程不太好'
image: ''
tags: [Hermes]
category: 'Agent'
group: tech
postType: post
draft: false
lang: ''
---



# Hermes 终端指令速查手册

---

## 1. 新建一个对话

| 场景               | 命令                                                | 说明                                            |
| ------------------ | --------------------------------------------------- | ----------------------------------------------- |
| 启动交互式对话     | `hermes`                                            | 默认进入 CLI 交互模式                           |
| TUI 界面           | `hermes --tui`                                      | 使用 Ink 终端 UI（更丰富的界面）                |
| 桌面应用           | `hermes desktop` 或 `hermes gui`                    | 启动原生 Electron 桌面应用                      |
| 单次查询（非交互） | `hermes chat -q "你的问题"`                         | 一次性执行，不进入交互循环                      |
| 静默模式           | `hermes -z "你的问题"`                              | 只输出最终回复，无 banner/spinner，适合脚本管道 |
| 指定模型           | `hermes -m deepseek-v4-pro --provider opencode-go`  | 启动时指定模型和 provider                       |
| 预加载技能         | `hermes -s skill-name` 或 `hermes -s skill1,skill2` | 启动时加载指定技能                              |
| 对话内新建         | `/new` 或 `/reset`                                  | 在交互对话中直接开启全新会话                    |

---

## 2. 查看已有对话 & 切换到另一个对话

### 查看对话列表

```bash
# 列出最近的对话
hermes sessions list

# 显示更多条（默认条数有限）
hermes sessions list --limit 50

# 按来源过滤（cli / telegram / discord 等）
hermes sessions list --source cli

# 交互式浏览 + 搜索 + 恢复对话（推荐）
hermes sessions browse
```

### 启动时直接切换到指定对话

```bash
# 通过 session ID 恢复
hermes --resume 20260701_143052_a1b2c3

# 通过标题恢复
hermes --resume "my-session-title"

# 恢复最近的对话
hermes --continue

# 恢复特定名称的对话
hermes --continue "my-session-title"
```

### 在对话内切换

```
/resume 20260701_143052_a1b2c3    # 恢复指定 session
/resume my-session-title          # 按名称恢复
```

---

## 3. 已有对话的常用操作

| 操作                | 命令                                           | 说明                             |
| ------------------- | ---------------------------------------------- | -------------------------------- |
| **重命名**          | `hermes sessions rename <session_id> "新标题"` | 给对话起个有意义的标题           |
| **删除**            | `hermes sessions delete <session_id>`          | 删除指定对话（加 `-y` 跳过确认） |
| **清理旧对话**      | `hermes sessions prune --older-than 30`        | 删除 30 天前的对话（默认 90 天） |
| **导出**            | `hermes sessions export output.jsonl`          | 导出对话为 JSONL 格式            |
| **查看统计**        | `hermes sessions stats`                        | 对话存储统计信息                 |
| **对话内设标题**    | `/title 新标题`                                | 无需退出即可命名当前对话         |
| **对话内分支**      | `/branch` 或 `/fork`                           | 从当前点分叉出一个新会话         |
| **撤销上一轮**      | `/undo`                                        | 移除最后一轮对话                 |
| **重新发送**        | `/retry`                                       | 重新发送上一条消息               |
| **清除屏幕+新会话** | `/clear`                                       | CLI 下清屏并开启新会话           |
| **查看历史**        | `/history`                                     | 查看当前对话历史                 |
| **保存对话**        | `/save`                                        | 保存对话到文件                   |
| **压缩上下文**      | `/compress`                                    | 手动触发上下文压缩               |

---

## 4. 创建项目

Hermes 的 Project 是一个可跨越多个文件夹/仓库的命名工作区，支持会话分组和 Kanban 绑定。

```bash
# 基础创建：名称 + 文件夹路径（第一个 = primary）
hermes project create "My Project" /c/Users/qjy/code/my-repo

# 创建并设为当前活跃项目
hermes project create "My Project" /c/Users/qjy/code/my-repo --use

# 创建多文件夹项目（跨多个仓库）
hermes project create "Full Stack" /c/Users/qjy/code/backend /c/Users/qjy/code/frontend

# 带完整元数据
hermes project create "Aurora" \
  /c/Users/qjy/code/aurora \
  --slug aurora \
  --description "Aurora AI 项目" \
  --icon "🚀" \
  --color "#ff6600" \
  --use

# 绑定 Kanban 看板
hermes project create "Team Tasks" /c/Users/qjy/code/repo --board my-board
```

---

## 5. 查看项目列表 & 项目管理

### 查看项目

```bash
# 列出项目
hermes project list          # 或 hermes project ls

# 包含已归档项目
hermes project list --all

# 查看项目详情
hermes project show "My Project"     # 按名称
hermes project show aurora           # 按 slug
```

### 项目管理操作

| 操作           | 命令                                                       | 说明                          |
| -------------- | ---------------------------------------------------------- | ----------------------------- |
| **切换项目**   | `hermes project use aurora`                                | 设为当前活跃项目（会自动 cd） |
| **重命名**     | `hermes project rename aurora "新名称"`                    | 修改项目名称                  |
| **添加文件夹** | `hermes project add-folder aurora /c/Users/qjy/new-folder` | 向项目追加文件夹              |
| **移除文件夹** | `hermes project remove-folder aurora /c/Users/qjy/old`     | 从项目中移除文件夹            |
| **设为主路径** | `hermes project set-primary aurora /c/Users/qjy/main`      | 修改主文件夹                  |
| **归档**       | `hermes project archive aurora`                            | 归档（不删除，可恢复）        |
| **恢复**       | `hermes project restore aurora`                            | 从归档恢复                    |
| **绑定看板**   | `hermes project bind-board aurora --board board-slug`      | 关联 Kanban 看板              |

> **注意**：Hermes 项目设计为「归档」而非「删除」——没有 `delete` 子命令。归档后的项目可通过 `restore` 恢复，用 `list --all` 查看。

---

## 6. 其他常用场景指令

### 模型 & Provider 管理

```bash
hermes model                    # 交互式选择模型/Provider
hermes config set model.default "deepseek-v4-pro"
hermes config set model.provider "opencode-go"
hermes doctor                   # 检查配置和依赖
hermes doctor --fix             # 自动修复问题
hermes config check             # 检查缺失/过时配置
hermes config edit              # 在编辑器中打开 config.yaml
hermes config path              # 打印 config.yaml 路径
hermes config env-path          # 打印 .env 路径
```

### 对话内快捷指令

```
/model deepseek-v4-pro          # 切换模型
/reasoning high                 # 设置推理深度 (none/minimal/low/medium/high/xhigh)
/yolo                           # 切换危险命令自动批准
/background "长时间任务描述"     # 后台执行任务
/stop                           # 终止所有后台进程
/skill skill-name               # 加载技能
/tools                          # 管理工具开关（CLI 界面）
/usage                          # 查看 token 使用量
/insights 7                     # 查看近 7 天使用分析
/debug                          # 上传调试报告并获取分享链接
/copy                           # 复制最后一条回复到剪贴板
/quit 或 /exit                  # 退出
```

### Gateway（多平台接入）

```bash
hermes gateway setup            # 配置消息平台
hermes gateway run              # 前台启动
hermes gateway start            # 后台服务启动
hermes gateway stop             # 停止
hermes gateway restart          # 重启
hermes gateway status           # 状态检查
hermes send --platform telegram --chat xxx "消息"  # 发送消息到指定平台
```

### 定时任务（Cron）

```bash
hermes cron list                           # 列出所有任务
hermes cron create "0 9 * * *"             # 每日 9 点
hermes cron create "30m"                   # 每 30 分钟
hermes cron create "every 2h"              # 每 2 小时
hermes cron edit <job_id>                  # 编辑任务
hermes cron pause <job_id>                 # 暂停
hermes cron resume <job_id>                # 恢复
hermes cron run <job_id>                   # 立即触发一次
hermes cron remove <job_id>                # 删除
```

### 配置管理

```bash
hermes config set section.key value        # 设置配置项
hermes config                              # 查看当前配置
hermes config migrate                      # 更新配置到新版本
hermes setup                               # 交互式设置向导
hermes setup model                         # 仅设置模型
hermes setup gateway                       # 仅设置 Gateway
```

### Profile（多实例）

```bash
hermes profile list                   # 列出所有 profile
hermes profile create work            # 创建新 profile
hermes profile use work               # 设为默认
hermes profile delete work            # 删除
hermes -p work                        # 用指定 profile 启动
```

### 技能管理

```bash
hermes skills list                    # 列出已安装技能
hermes skills search "关键词"         # 搜索技能市场
hermes skills install skill-id        # 安装技能
hermes skills uninstall skill-id      # 卸载
hermes skills update                  # 更新所有
hermes skills browse                  # 浏览技能市场
```

### 其他实用命令

```bash
hermes update                         # 升级 Hermes 到最新版
hermes version                        # 查看版本
hermes backup                         # 备份 Hermes 配置和数据
hermes import backup.zip              # 恢复备份
hermes logs                           # 查看日志
hermes prompt-size                    # 查看 system prompt + tool schema 字节占用
hermes completion bash                # 生成 bash 自动补全脚本
hermes --yolo                         # 跳过危险命令确认
hermes --ignore-rules                 # 跳过 .hermes.md / AGENTS.md / SOUL.md
hermes --safe-mode                    # 安全模式启动
hermes status                         # 查看所有组件状态
hermes status --all                   # 详细状态
```

---

## 💡 快速参考卡片

| 我想...        | 用这个                                  |
| -------------- | --------------------------------------- |
| 开个新对话     | `hermes` 或 `/new`                      |
| 接着上次的聊   | `hermes --continue`                     |
| 看看有哪些对话 | `hermes sessions browse`                |
| 给对话起个名   | `/title 名字`                           |
| 删掉不要的对话 | `hermes sessions delete <id>`           |
| 创建项目       | `hermes project create "名" 路径 --use` |
| 切换项目       | `hermes project use 名`                 |
| 查看项目列表   | `hermes project list`                   |
| 归档项目       | `hermes project archive 名`             |
| 设置定时任务   | `hermes cron create "0 9 * * *"`        |
| 换个模型       | `/model` 或 `hermes model`              |
| 退出           | `/quit`                                 |
