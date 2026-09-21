# T2 · DOM 契约集中化

阻塞：无（与 T1 并行；T3 依赖本票）。

- 新建 `src/constants/dom.ts`：集中定义 id 与命名空间化 data 属性常量 +
  唯一 accessor（querySelector 封装）。至少覆盖：
  - 主内容容器：新增 `id="main-content"`（MainGridLayout.astro:847 现为
    `.w-full.z-30.pointer-events-none` 类组合），替换 8 处类组合查询
    （Layout.astro:454,975,1127,1239；setting-utils.ts:455,690；
    layout-styles.css:759-775 的 CSS 改用 id 选择器）。
  - `.banner-home-text-overlay`（定义 MainGridLayout:662；查询 setting-utils ×5、
    Layout:500）。
  - `#wallpaper-wrapper`、`#navbar`、`#main-grid`、`#banner-images-container`
    及其 data 属性（MainGridLayout:316-321 下发）。
- 类名只管样式，定位只走常量。

验收：check/build 全绿；壁纸模式切换、banner 轮播、swup 翻页后行为与改前一致。


---
**状态**：已完成（2026-09-19）。src/constants/dom.ts 落地；主内容容器 id=main-content；8 处类组合定位与 CSS 全部收口；is:inline 经 define:vars 注入同名常量。