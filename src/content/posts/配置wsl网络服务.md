---
title: 配置wsl网络服务
published: 2026-06-24
description: '简要记录配置wsl使用代理的网络服务问题'
image: ''
tags: []
category: ''
group: tech
postType: post
draft: false
lang: ''
---

# WSL 中 Git 通过 Clash 代理访问 GitHub 排查总结

## 1. 问题背景

当前场景：

- Windows 11
- 使用 `WSL`
- Windows 上使用 `Clash Verge`
- 国内网络本身可用
- Windows 下打开代理后可以正常访问 GitHub
- 但在 `WSL` 中执行 `git clone https://github.com/...` 时，出现卡住、超时、无法连接代理等问题

本次排查的目标是：

- 只让 `WSL` 中的 `git` 走代理
- 不让 `WSL` 中所有网络程序都强制走代理
- 最终形成一套稳定、可复用、可回溯的问题处理方案

---

## 2. 现在的最终配置

### 2.1 Windows / WSL 侧最终状态

最终确认可用的关键配置如下。

#### WSL 网络设置

- 网络模式：`Mirrored`
- 启用 `localhost` 转发：`开`
- 自动代理：`开`

这些设置的作用是让 `WSL` 更容易直接访问 Windows 本机上的代理端口。

#### Clash Verge 关键配置

根据最终确认的配置，关键项如下：

```yaml
mode: rule
mixed-port: 7897
allow-lan: true
bind-address: '*'
```

说明：

- `mixed-port: 7897`
  表示当前使用的混合代理端口是 `7897`
- `allow-lan: true`
  表示允许其他网络环境访问这个代理端口
- `bind-address: '*'`
  表示监听不是只绑定在 `127.0.0.1`，而是对外开放

### 2.2 Git 最终配置

最终采用的是只给 Git 配代理的方式：

```bash
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
```

验证命令：

```bash
git config --global --get http.proxy
git config --global --get https.proxy
```

期望结果：

```bash
http://127.0.0.1:7897
http://127.0.0.1:7897
```

### 2.3 最终验证结果

最终通过下面命令验证成功：

```bash
git ls-remote https://github.com/Mical-517/Log-Module.git
```

返回了远程仓库的提交哈希，例如：

```text
6ce40ef169efe61932c12f42553f36403ced87cb  HEAD
6ce40ef169efe61932c12f42553f36403ced87cb  refs/heads/master
```

这说明：

- `WSL` 中的 Git 已经可以访问 GitHub
- 当前 Git 代理配置有效
- 问题已经解决

---

## 3. 之前做过的尝试与排查记录

这一部分用于以后再次出问题时，快速回顾“哪些方法试过、为什么不行”。

### 3.1 最开始的理解

一开始的判断是：

- Windows 上 Clash 已经能用
- 但 `WSL` 默认不会自动继承 Windows 的代理
- 因此需要为 `WSL` 中的 Git 单独配代理

这个判断本身是对的。

### 3.2 尝试 1：使用 `/etc/resolv.conf` 中的 nameserver 作为 Windows 主机 IP

尝试过类似命令：

```bash
HOST_IP=$(awk '/nameserver/ {print $2; exit}' /etc/resolv.conf)
git config --global http.proxy http://$HOST_IP:7897
git config --global https.proxy http://$HOST_IP:7897
```

当时拿到的地址类似：

```text
10.255.255.254
```

以及后续曾使用：

```text
172.25.144.1
```

问题：

- `resolv.conf` 里的 `nameserver` 在这台机器上并不稳定等价于可直接访问的 Windows 代理入口
- 某些地址会直接连接失败
- 某些地址会“看起来像通了”，但实际代理请求会卡住

结论：

- 不能简单认为 `/etc/resolv.conf` 的 `nameserver` 一定就是最佳代理地址

### 3.3 尝试 2：使用旧端口 `7890`

早期脚本里曾使用：

```bash
http://...:7890
```

后来从 Clash Verge 界面确认实际端口是：

```text
7897
```

问题：

- 旧配置里的 `7890` 已经过时
- 导致 Git 报错连接代理失败

典型报错：

```text
Failed to connect to 10.255.255.254 port 7890
```

结论：

- 排查前必须先确认 Clash 当前实际端口
- 本次最终正确端口是 `7897`

### 3.4 尝试 3：在 WSL 中直接使用 `127.0.0.1:7897`

曾尝试：

```bash
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
```

在当时的 WSL 网络状态下报错：

```text
Failed to connect to 127.0.0.1 port 7897
```

结论：

- 当时 `WSL` 还没有调整到最终可用的网络模式
- 因此 `WSL` 内的 `127.0.0.1` 不能直接访问 Windows 上的 Clash

### 3.5 尝试 4：使用 Windows 主机名

曾尝试：

```bash
git config --global http.proxy http://LAPTOP-TDCOL57P:7897
git config --global https.proxy http://LAPTOP-TDCOL57P:7897
```

之后用 `curl` 排查发现：

```text
LAPTOP-TDCOL57P -> 127.0.1.1
```

问题：

- 在当前 `WSL` 环境中，主机名被解析成了 Linux 子系统自己的回环地址
- 并不是 Windows 主机的真实可访问地址

结论：

- 当前环境下不能依赖 Windows 主机名访问 Clash 端口

### 3.6 尝试 5：使用 `curl -x` 直接测代理

后面使用了更准确的测试方式：

```bash
curl -v -x http://172.25.144.1:7897 https://github.com
```

这个命令的意义是：

- 不是直接访问代理端口本身
- 而是把该地址当作 HTTP 代理来访问 GitHub

在问题仍未解决时，曾卡在：

```text
Trying 172.25.144.1:7897...
```

这说明当时问题发生在：

- `WSL` 到 Windows 代理端口之间的 TCP 连接阶段
- 还没进入 GitHub 请求阶段

这个测试帮助确认：

- 问题并不在 GitHub
- 也不只是 Git 自己的问题
- 而是在 `WSL` 与 Windows 代理的连通方式上

### 3.7 尝试 6：检查 Clash 配置本身

之后查看了 Clash 配置，确认包含：

```yaml
mixed-port: 7897
allow-lan: true
bind-address: '*'
```

这一步很重要，因为它排除了两个常见问题：

- 不是因为 Clash 只监听在 `127.0.0.1`
- 不是因为完全没允许外部访问

### 3.8 最终转折点：调整 WSL 网络模式

最终排查发现，问题核心不只是 Git，也不只是 Clash，而是：

- `WSL` 与 Windows 本机代理之间的网络映射方式

在 WSL 设置里将网络改为：

- `Mirrored`

并开启：

- `localhost` 转发
- 自动代理

之后再重启 WSL：

```powershell
wsl --shutdown
```

此后，`WSL` 中使用 `127.0.0.1:7897` 终于可用。

这是本次真正解决问题的关键步骤。

---

## 4. 当前不再需要的旧配置

之前曾在 `~/.bashrc` 中加入过一段旧脚本，大意如下：

```bash
gitproxyon() {
  local HOST_IP
  HOST_IP=$(awk '/nameserver/ {print $2; exit}' /etc/resolv.conf)

  git config --global http.proxy "http://$HOST_IP:7890"
  git config --global https.proxy "http://$HOST_IP:7890"
}

gitproxyoff() {
  git config --global --unset http.proxy 2>/dev/null
  git config --global --unset https.proxy 2>/dev/null
}

gitproxyrefresh() {
  gitproxyon >/dev/null
}

gitproxyrefresh
```

这段现在建议删除，原因如下：

- 使用的是旧端口 `7890`
- 依赖 `/etc/resolv.conf` 的旧思路
- `gitproxyrefresh` 会在每次打开终端时自动覆盖当前 Git 配置
- 可能把已经正确的 `127.0.0.1:7897` 配置冲掉

因此当前建议：

- 删除这段旧脚本
- 不再通过 `~/.bashrc` 自动改 Git 代理
- 只保留 Git 全局配置即可

---

## 5. 最终使用手则

这一部分是以后日常使用时直接参考的最简规则。

### 5.1 当前推荐的日常用法

在 `WSL` 中执行一次：

```bash
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
```

之后就可以正常使用：

```bash
git clone https://github.com/xxx/yyy.git
git pull
git fetch
git push
```

### 5.2 这是否意味着整个 WSL 都走代理

不是。

当前配置只影响 Git：

- `git clone`
- `git pull`
- `git fetch`
- `git push`

不会自动影响：

- `curl`
- `pip`
- `npm`
- `apt`
- Python 脚本里的网络请求

如果以后希望这些也走代理，需要另行配置环境变量或工具自身的代理设置。

### 5.3 Clash 的“局域网连接”还需不需要开

当前建议：

- 先保持 `allow-lan: true`

原因：

- 本次问题排查过程中，这一项是有帮助的
- 当前整套方案已经稳定可用
- 在没有额外验证前，不建议再随意改动

### 5.4 打开“局域网连接”会不会影响 Windows 自己的网络

通常不会直接影响 Windows 自己的正常联网。

它的主要含义是：

- 允许别的网络环境访问 Clash 提供的代理端口

真正影响 Windows 网络行为的，通常是：

- 是否启用系统代理
- Clash 当前规则模式
- 节点是否可用

### 5.5 每次重新打开 WSL 是否需要重新配置

一般不需要。

因为：

```bash
git config --global ...
```

写入的是 Git 的全局配置，而不是当前终端的临时变量。

所以在以下条件不变时，通常可以长期使用：

- Clash 端口仍然是 `7897`
- WSL 网络模式仍然是 `Mirrored`
- `localhost` 转发和自动代理仍然开启

### 5.6 如果以后又出问题，优先按这个顺序排查

#### 第一步：确认 WSL 设置

检查：

- 网络模式是否还是 `Mirrored`
- `localhost` 转发是否开启
- 自动代理是否开启

必要时执行：

```powershell
wsl --shutdown
```

然后重新打开 WSL。

#### 第二步：确认 Clash 端口

检查 Clash Verge：

- 当前混合代理端口是否仍然是 `7897`

如果端口变了，需要把 Git 代理里的端口也改掉。

#### 第三步：确认 Git 当前代理值

```bash
git config --global --get http.proxy
git config --global --get https.proxy
```

期望值：

```bash
http://127.0.0.1:7897
http://127.0.0.1:7897
```

#### 第四步：快速测试 GitHub 连通性

```bash
git ls-remote https://github.com/Mical-517/Log-Module.git
```

如果返回哈希，说明已经恢复正常。

#### 第五步：如果还是不行，再测代理链路

```bash
curl -v -x http://127.0.0.1:7897 https://github.com
```

如果这一步也失败，再进一步排查：

- Clash 是否正常运行
- Windows 防火墙是否拦截
- 端口是否变化

---

## 6. 最简结论

本次问题最终的根因，不是单纯的 Git 配置错误，而是：

- 旧的代理地址和端口尝试不稳定
- `WSL` 与 Windows 本机代理之间的访问方式没有调整到合适状态

最终稳定方案是：

1. 将 WSL 网络模式改为 `Mirrored`
2. 开启 `localhost` 转发和自动代理
3. Clash 使用 `mixed-port: 7897`
4. Git 全局代理固定为：

```bash
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
```

这一方案的特点是：

- 只让 Git 走代理
- 不强制整个 WSL 都走代理
- 长期配置，通常不需要每次重配

