---
title: Linux高性能服务器第一篇实战
published: 2026-07-26
description: 'Linux高性能服务器第一篇基础实战讲解'
image: 'https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260726223400929.png'
tags: [Linux高性能服务器编程]
category: 'Linux网络'
group: tech
draft: false
lang: ''
---



# 第一篇----各个协议实战讲解

## 1.协议概览

![image-20260726223623216](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260726223623247.png)

​	

上层协议使用下层协议提供的服务，比如网络层ip模块就需要数据链路层的ARP协议提供ARP服务来得到ip地址对应的mac地址



协议从底层到高层的作用简述：

1. 数据链路层：封装数字信号转换为电信号的转换以及传输过程，**实现网卡接口的网络驱动程序，处理数据在物理媒介的传输**
2. 网络层：对上层（传输层）隐藏端到端过程中的中转路由等过程，**实现数据包的选路和转发**
3. 传输层：只关注端到端的通信，不关心中间的转发过程。**提供端到端通信**
4. 应用层：处理应用程序的逻辑，比如文件传输，名称查询等





## 2.以太网络包中常见形式

### 1.常用报头组合

- TCP流量：以太网头部+ip头部+tcp头部+应用层数据（适用于：网页，ssh，数据库等）
- UDP流量：以太网头部+ip头部+udp头部+应用层数据（适用于：DNS查询，视频流，游戏，DHCP等）
- ICMP报文：以太网头部+ip头部+ICMP数据（适用于：ping，traceroute，网络探测等）
- ARP报文：以太网头部+ARP报文（适用于：地址解析等）
- DHCP报文：以太网头部+ip头部+udp头部+DHCP数据
- IPV6数据包：以太网头部+ipv6头部+tcp/udp头部+应用数据



| 报文类型        | 完整封装结构                      | 有无 IP 头 | 有无 TCP/UDP |
| --------------- | --------------------------------- | ---------- | ------------ |
| ARP 请求 / 应答 | 以太网头 + ARP 报文               | ❌ 无       | ❌ 无         |
| Ping（ICMP）    | 以太网头 + IP 头 + ICMP           | ✅ 有       | ❌ 无         |
| 浏览器访问网站  | 以太网头 + IP 头 + TCP + 应用数据 | ✅ 有       | ✅ TCP        |
| DNS 域名查询    | 以太网头 + IP 头 + UDP + DNS 数据 | ✅ 有       | ✅ UDP        |



### 2.头部主要包含信息



1. 以太网头部（length： 14 byte）

   主要字段：

   - 目的mac地址
   - 源mac地址
   - 类型字段：表示载荷什么类型（载荷就是简单描述一个包分为头部和载荷），比如ipv4，ipv6，arp报文

   作用：局域网内，根据mac寻址交付帧

2. IPv4头部（三层ip头，网络层）

   核心字段：

   - 源ip地址
   - 目的ip地址
   - 协议号：表示ip内部上层协议比如tcp，udp，icmp
   - ttl：生存时间
   - ip首部长度，总长度，标识，标志，片偏移：用于ip分片

   作用：跨网段路由寻址，把包从一个网络送到另一个网络

3. TCP头部（最小20字节，**面向连接，可靠传输**）

   核心字段：

   - 源端口，目的端口：区分主机上不同应用程序
   - 序号：字节流编号，用于重组数据，重传
   - 确认好（ACK）：确认收到对方数据
   - 6位标志位：SYN，ACK，FIN，RST，PSH，URG
   - 窗口大小：流量控制
   - 校验和：校验头部+数据完整性

   作用：端到端可靠传输，连接管理，流量拥塞控制

4. UDP头部（**固定8字节**）

   仅4个字段：

   - 源端口
   - 目的端口
   - UDP报文总长度
   - 校验和

   作用：端到端快速交付，**不保证可靠，没有握手，重传机制**

5. ARP报文（不属于任何头部，以太网载荷）

   核心字段：

   - 硬件类型，协议类型，等等
   - 操作类型：1=ARP请求，2=ARP应答
   - 发送端mac，发送端ip
   - 目标mac，目标ip

   作用：一直ip，查询对应的mac地址





## 3.抓包实验认识

### 1.ARP协议

ARP协议能实现任意网络层地址到任意物理地址的转换，不过本书仅讨论从IP地址到以太网地址（MAC地址）的转换。其工作原理是：主机向自己所在的网络广播一个ARP请求，该请求包含目标机器的网络地址。此网络上的其他机器都将收到这个请求，但只有被请求的目标机器会回应一个ARP应答，其中包含自己的物理地址。

ARP

![image-20260726224646404](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260726224646438.png)



步骤：

1. ifconfig查看本机ip地址
2. arp -a 查看本地arp缓存，arp -d删除默认网关记录
3. 在开始一个终端，使用tcpdump监听ens160网卡
4. 连接www.qq.com查看抓取的arp包

![image-20260726233032951](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260726233033034.png)

![image-20260726233059674](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260726233059713.png)

```
时间  源MAC > 目标MAC, ethertype ARP (0x0806), length XX: Request/Reply 报文内容
```



### 2.DNS协议

DNS是一套分布式的域名服务系统。每个DNS服务器上都存放着大量的机器名和IP地址的映射，并且是动态更新的。众多网络客户端
程序都使用DNS协议来向DNS服务器查询目标主机的IP地址。

![image-20260727084039875](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260727084039916.png)

![image-20260727083846964](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260727083847001.png)

![image-20260727083836810](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260727083836861.png)

```
12:51:58.285640 IP 192.168.65.130.58193 > 192.168.65.2.domain: 52687+ A? www.baidu.com. (31)
```

1. `12:51:58.285640`
报文捕获时间：时：分: 秒。微秒
2. `IP`
四层协议为 IPv4
3. `192.168.65.130.58193`
源 IP：虚拟机本机`192.168.65.130`；**源端口 58193（本机随机临时 UDP 端口）**
4. `>`
数据传输方向：从左→右
5. `192.168.65.2.domain`
目标 IP：网关`192.168.65.2`；`domain`等价于**53 端口（DNS 服务端口）**

>
> 你的虚拟机把 DNS 查询发给 VMware 网关，由网关代为递归查询域名。

6. `52687+`
DNS 事务 ID：`52687`；`+`代表**开启递归查询（RD=1）**，要求 DNS 服务器帮我们继续查询。
7. `A?`
查询类型：**A 记录**；`?`表示这是**查询请求报文**

>
> A 记录 = 将域名解析为 IPv4 地址

8. `www.baidu.com.`
被查询的域名（末尾`.`代表 DNS 根域，标准完整域名写法）
9. `(31)`
DNS 报文载荷长度：31 字节

✅含义总结：
虚拟机发起 DNS 请求，询问 DNS 服务器：`www.baidu.com`对应的 IPv4 地址是多少。



### 3.IPv4头部

![image-20260727084451875](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260727084451920.png)

![image-20260727084547080](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260727084547128.png)

该数据包描述的是一个IP数据报。由于我们是使用telnet登录本机的，所以IP数据报的源端IP地址和目的端IP地址都是“127.0.0.1”。telnet服务器程序使用的端口号是23（参见/etc/services文件），而telnet客户端程序使用临时端口号41621与服务器通信。

**一个字节8位，一个十六进制表示的是4位二进制，所以说一个字节是两个十六进制数字**

![image-20260727084640041](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260727084640096.png)



### 4.ICMP重定向报文

![image-20260727084840963](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260727084840999.png)

ICMP报文头部的3个固定字段：8位类型、8位代码和16位校验和。ICMP重定向报文的类型值是5，代码字段有4个可选值，用来区分不同的重定向类型。本书仅讨论主机重定向，其代码值为1。

ICMP重定向报文的数据部分含义很明确，它给接收方提供了如下两个信息：

- 引起重定向的IP数据报（即图2-4中的原始IP数据报）的源端IP地址。
- 应该使用的路由器的IP地址。



### 5.IPv6头部

![image-20260727085145825](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260727085145865.png)



### 6. TCP协议

![image-20260727085224686](https://bucket-qjy.oss-cn-qingdao.aliyuncs.com/picture/20260727085224727.png)
