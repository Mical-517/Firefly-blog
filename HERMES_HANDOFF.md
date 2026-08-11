# Firefly Blog - Hermes 移交文档

> 生成时间: 2026-08-11 | 仓库: E:\SoftWare\fireflyblog\Firefly-blog | 远端: https://github.com/Mical-517/Firefly-blog.git | 当前 HEAD: master @ 9ca8d27

本文档面向接手 agent (Hermes)，全面梳理此 Astro 博客仓库的架构、模块、配置入口、近期改动、构建验证方式与注意事项。所有路径相对仓库根目录。

---

## 1. 项目概述

- 名称: Firefly (流萤)，基于 Astro 6 + Svelte 5 + Tailwind 4 的静态博客主题，Fork 自 saicaca/fuwari
- 技术栈: Astro 6.4.4 / TypeScript 5.9 / Svelte 5 / Tailwind 4 / pnpm 9.14.4 (强制, preinstall 锁定) / Node >= 22
- 部署: 静态站点，输出 dist/；支持 Cloudflare Workers (CF_WORKERS 环境变量启用 @astrojs/cloudflare 适配器)，也可 Vercel/Netlify
- 站点语言: zh_CN (默认)，UI 支持 zh_CN/zh_TW/en/ja/ru
- 模型/部署无关: 这是纯前端项目，与所用 Codex 模型无关

## 2. 命令速查

| 命令 | 作用 |
|---|---|
| pnpm install | 安装依赖 |
| pnpm dev | 开发服务器 http://localhost:4321 |
| pnpm build | 生成图标 + lqip + Astro 构建 + pagefind 索引，输出 dist/ |
| pnpm preview | 预览构建产物 |
| pnpm check | astro check |
| pnpm type-check | tsc --noEmit --isolatedDeclarations |
| pnpm format | biome format --write ./src |
| pnpm lint | biome check --write ./src |
| pnpm new-post 文件名.md | 创建新文章 (含 frontmatter 骨架) |
| pnpm icons | 仅生成图标 |
| pnpm lqips | 仅生成低质量占位图 |

注意: pnpm build 比纯 astro build 慢，因为先跑 scripts/generate-icons.js 和 scripts/generate-lqips.ts。type-check 用的 --isolatedDeclarations 会报一堆预先存在的 须显式返回类型 错误，这些不是本次改动引入；用 npx tsc --noEmit (项目实际配置) 才是干净基线。
## 3. 目录结构

src/
  config/        # 全站配置入口，一个功能一个 ts 文件，见第 4 节
  content/
    posts/       # 所有文章 md/mdx，frontmatter 决定分类/加密/置顶等
    spec/        # 特殊内容 (如 friends.md 友链页底部内容)
  components/
    layout/      # Navbar, Footer, SideBar, PostCard, PostPage, PostMeta, CategoryBar, DropdownMenu, NavMenuPanel, ConfigCarrier
    widget/      # Profile, Announcement, Categories, Tags, Calendar, Music, SiteStats, SidebarTOC, Advertisement, SpineModel
    features/    # EncryptedContent/EncryptedPost, FancyboxManager, FontManager, KatexManager, Live2DWidget, MusicManager/MusicPlayer, SakuraEffect, SpineModel, TypewriterText
    controls/    # FloatingTOC, 搜索等交互控件
    comment/     # 评论系统集成 (twikoo/waline/giscus/disqus/artalk)
    analytics/   # 统计集成 (GA/Clarity/Umami/51la)
    misc/        # RecommendedPost 等
    common/      # 通用组件
    pages/       # 页面级组件
  pages/
    index/[...page].astro   # 首页分页列表
    posts/[...slug].astro    # 文章详情 (含加密渲染分支)
    archive.astro            # 归档 (按 group 分组)
    categories/index.astro   # 分类
    tags/index.astro         # 标签
    friends.astro / sponsor.astro / guestbook.astro / bangumi.astro  # 独立页面 (受 siteConfig.pages.* 开关控制)
    about.astro / search.astro / 404.astro
    gallery/ (index.astro + [album].astro)
    api/allPostMeta.json.ts  # 日历/统计用的文章元数据端点
    rss.astro / rss.xml.ts   # RSS
    og/[...slug].png.ts      # OpenGraph 海报生成
    robots.txt.ts
  layouts/        # Layout.astro (基础) / MainGridLayout.astro (主网格)
  plugins/        # 自定义 remark/rehype: github-card, email-protection, external-links, figure, mermaid, plantuml, image-grid, excerpt, reading-time, directive
  i18n/           # i18nKey.ts (枚举) / translation.ts / languages/ (zh_CN/zh_TW/en/ja/ru)
  types/          # config.ts (所有配置类型 + LinkPreset 枚举), bangumi.ts
  constants/      # constants.ts, icon.ts, icons.ts, link-presets.ts (导航预设文案), lqips.json
  utils/          # 见第 5 节
  styles/         # 全局样式
  assets/         # 优化过的图片 (avatar, logo 等，构建时自动优化)
public/           # 不经过优化的静态资源 (favicon, pio 看板娘, gallery 原图等)
scripts/          # generate-icons.js, generate-lqips.ts, new-post.js
docs/             # README 多语言版本 + 截图
.github/          # CI/Actions

## 4. 配置入口 (src/config/)

组件通过 src/config/index.ts 统一导出，改配置只需动对应文件，一般无需改组件。

- siteConfig.ts   站点核心: title/subtitle/site_url/description/keywords, themeColor(色相 hue + 模式), pageWidth, card, favicon, navbar(logo/title/菜单), siteStartDate, timezone, rehypeCallouts 主题, showLastModified/outdatedThreshold, sharePoster, generateOgImages, bangumi(userId/mode), pages 开关(friends/sponsor/guestbook/bangumi/gallery), categoryBar, postListLayout, pagination, analytics(GA/Clarity/Umami/51la), imageOptimization, font 引用, lang
- profileConfig.ts  头像 avatar/名字 name/签名 bio/社交 links 数组
- navBarConfig.ts   导航菜单 getDynamicNavBarConfig()，links 数组 + LinkPreset 内置项，多级 children 支持；部分项受 siteConfig.pages.* 控制
- announcementConfig.ts  公告标题/内容/可关闭/链接
- sidebarConfig.ts 站点侧边栏: position(left/right/both), tabletSidebar, showBothSidebarsOnPostPage, leftComponents/rightComponents/mobileBottomComponents
- commentConfig.ts 评论: type(none/twikoo/waline/giscus/disqus/artalk) + 各系统配置块
- friendsConfig.ts 友链数组 (weight 排序, enabled 开关) + friendsPageConfig
- galleryConfig.ts 相册分组/图片
- musicConfig.ts   播放器配置 (需在 sidebarConfig 开启 music 组件)
- footerConfig.ts / FooterConfig.html  页脚
- fontConfig.ts    字体
- effectsConfig.ts 樱花动画
- coverImageConfig.ts 封面图
- expressiveCodeConfig.ts 代码块高亮/折叠/行号
- pioConfig.ts     Live2D/Spine 看板娘
- plantumlConfig.ts PlantUML
- adConfig.ts      广告 (ad1/ad2 两套)
- backgroundWallpaper.ts 壁纸
- licenseConfig.ts / sponsorConfig.ts  许可证/赞助

## 5. 工具函数 (src/utils/)

- content-utils.ts   核心: getSortedPosts/getStaticPaths/post 查询/相邻文章/分类标签聚合。文章分类维度只保留 group
- crypto-utils.ts    AES-256-GCM 加密 (encryptContent)，构建期加密文章正文
- url-utils.ts        URL 生成 (getPostUrl/getCategoryUrl/getGroupedCategoryUrl 等，已移除 getNotesUrl)
- navigation-utils.ts 导航相关
- layout-utils.ts    布局计算
- image-utils.ts / lqip-utils.ts / toc-utils.ts / date-utils.ts / gallery-utils.ts / icon-loader.ts / language-utils.ts / responsive-utils.ts / sakura-manager.ts / setting-utils.ts

## 6. 文章系统 (重点)

### 6.1 分类规则 (src/content.config.ts)

schema 仅保留一个分组维度:
  group: z.enum([thoughts,tech]).optional().default(tech)
  tech = 技术记录, thoughts = 生活记录
已移除的维度: postType (note/post) 及随附的 noteImages/noteMood/noteLocation/noteWeather——这是近期重构的关键，详见第 7 节。

### 6.2 frontmatter 字段

title(必填), published(必填, 日期), updated, draft, description, image, tags[], category, group(tech|thoughts), lang, pinned, author, sourceLink, licenseName, licenseUrl, comment, password, passwordHint。

### 6.3 文章加密

在 frontmatter 加:
  password: Wkwc2016.
  passwordHint: 提示文案
机制: 构建时 crypto-utils.encryptContent 用 AES-256-GCM 加密正文，页面只有密文；访客输入正确密码后浏览器 Web Crypto API 本地解密；sessionStorage 缓存密码，刷新免输，关浏览器失效。实现: src/utils/crypto-utils.ts + src/components/features/EncryptedPost.astro + EncryptedContent.astro。示例文章: src/content/posts/encrypted-demo.md (密码 123456)。

### 6.4 现有文章 (src/content/posts/)

技术类: CMake 系列, GoogleTest 系列, Hermes 命令速查, Linux 高性能服务器, Terminal 美化, WSL/vscode/网络配置, markdown 扩展, code-examples, firefly(主题介绍) + firefly-layout-system, katex/mermaid/plantuml/mdx 示例, startingBlog
加密: 博客基础使用指南.md (密码 Wkwc2016.) + encrypted-demo.md (123456)
草稿: draft.md

### 6.5 创建文章

  pnpm new-post 新文章.md                 # 默认 group=tech
  pnpm new-post 生活.md --group thoughts
  pnpm new-post 技术.md --group tech
脚本: scripts/new-post.js (注意: 顶部旧 --type note 注释已在本轮被清理掉，别误用 --type)
## 7. 近期关键改动 (HEAD: 9ca8d27, 上一个 5edf35a)

这是给 Hermes 最重要的上下文，两条提交是同一次重构:

1. 简化文章分类: 移除 postType 维度，只保留 group (tech/thoughts)
   - content.config.ts: 删 postType/noteImages/noteMood/noteLocation/noteWeather 字段
   - content-utils.ts: 删 PostType 类型、includeNotes 查询参数、NoteDateGroup/NoteAdjacentPosts、getNotesList/getGroupedNotesByDate/getAdjacentNotes、所有 postType===note 过滤
   - url-utils.ts: 删 getNotesUrl
   - 16 篇 md: 清掉 frontmatter 的 postType: post 行
   - new-post.js: 改为只 --group tech|thoughts，删 note frontmatter 生成
2. 删除随笔/朋友圈功能 (notes 页)
   - 删 src/pages/notes.astro 与 src/content/posts/test.md
   - navBarConfig.ts / link-presets.ts / config.ts(LinkPreset enum Notes) / i18nKey / zh_CN: 删 notes 相关
   - rss.xml.ts / rss.astro / api/allPostMeta.json.ts: 去掉 includeNotes
   - [...slug].astro: 删 isNotePost/note 渲染分支 (note-post-head/gallery/adjacentNotes) 及 note-post CSS
3. 补齐 i18n 缺键: en/ja/ru/zh_TW 补 thoughts/techRecords/groupNavigation/allPostsGroup (各语言翻译已配齐)
4. announcementConfig.ts: 公告内容改为 欢迎来到Mical的博客，分享娱乐活动以及学习日常。
5. 新增使用文档: src/content/posts/博客基础使用指南.md (group=tech, 已加密 Wkwc2016.)

### 验证状态 (重构完成时)

- npx tsc --noEmit: 0 错误 (项目实际配置，不用 --isolatedDeclarations)
- npx astro check: 0 errors / 0 warnings / 2 hints (CategoryBar 隐式 any 与 content-utils 未用 import getCategoryUrl，均为预先存在的 hint，非本次引入)
- pnpm build: 成功，44 页面，exit 0
- Playwright 实测: 首页/文章页渲染正常，导航无随笔入口，notes/ 返回 404；控制台 2-3 个错误均为 Vite dev-toolbar 504 与 51.la 统计 403，与代码无关

## 8. 验证建议给 Hermes

1. npx tsc --noEmit (务必不带 --isolatedDeclarations，那是 package.json type-check 脚本的，会报一堆预先存在的强制类型错误)
2. npx astro check
3. pnpm build (慢，约 1-2 分钟，含图标/lqip/pagefind)
4. 开发期可视化: pnpm dev 后用 Playwright CLI 访问 localhost:4321 验证
   - 注意: 环境限制下 Codex 的内置浏览器/Chrome 插件依赖 node_repl MCP 工具，当前会话(非 OpenAI 官方模型) 注入不了；用 npx @playwright/cli playwright-cli 做 CLI 验证是可靠替代
5. 不要盲信 git diff 显示的内容，注意中文文件名在 git 里是转义显示的

## 9. 注意事项与坑

1. --isolatedDeclarations 陷阱: pnpm type-check 用的是它，会产出大量 Function must have explicit return type / const arrays 报错，这些是预先存在的，不是改动引入的。判干净基线改用 npx tsc --noEmit。
2. 预先存在的 i18n 残缺: 历史 en/ja/ru/zh_TW 缺了 thoughts/techRecords/groupNavigation/allPostsGroup，本轮已补齐。若再加新 i18nKey，务必给 5 个语言文件全部补齐，否则 Translation 类型检查报缺失。
3. 中文文件名: apply_patch 的 Add File 对中文文件名解析不稳 (反复报 last line must be End Patch)，可靠写法是用 node 脚本写盘。git 里中文文件名显示为八进制转义 (如 \345\215... == 博)。
4. 文章加密: 改密码只需改 frontmatter 的 password/passwordHint，别动 crypto-utils。
5. 随笔功能已彻底删除: 不要根据历史代码或 fuwari 模板把 note 系统加回来，除非用户明确要求恢复四分类。
6. 部分页面受 siteConfig.pages.* 控制 (friends/sponsor/guestbook/bangumi/gallery)，关闭返回 404；改开关后要同步 navBarConfig 去掉对应导航项，避免死链。
7. 配置热更新: 大部分改 config 会热更新，但 rehypeCallouts 主题和部分 i18n 改动需重启 pnpm dev。
8. 构建会 minify 时 drop console/debugger (astro.config.mjs vite.build.esbuildOptions.drop)，调试时注意。
9. 未跟踪产物: output/ (Playwright 截图) 和 .playwright-cli/ 不在 .gitignore，但本仓库一直没提交它们，保持不入库即可。dist/ 与 .astro/ 已在 .gitignore。
10. README.md 里有官方文档链接 https://docs-firefly.cuteleaf.cn/ 和社区教程，遇到不确定的功能先查官方文档。

## 10. 当前待办/无遗留

- 无未完成任务，所有改动已提交并推送 (9ca8d27 -> origin/master)
- 公告文案、使用指南加密都已生效

## 11. 给 Hermes 的快速上手

1. cd E:\SoftWare\fireflyblog\Firefly-blog && pnpm install && pnpm dev
2. 读本文档第 4-6 节定位配置入口
3. 改文章: src/content/posts/*.md，用 pnpm new-post 生成骨架
4. 改站点外观: src/config/siteConfig.ts (主题色/导航/页面开关) + profileConfig.ts (头像/名字)
5. 加密: frontmatter 加 password
6. 验证: npx tsc --noEmit && pnpm build
7. 推送: git add -> commit -> git push origin master

祝顺利。