# T3 · 设置注册表 + SettingsStore（ADR-0002）

阻塞：T2（apply-to-DOM 的规格需要 dom.ts 常量）。

- 新建 `src/settings/`：
  - `registry.ts`：SettingDefinition 声明（id、storageKey=历史键、默认值来源、
    serialize/parse、apply 规格、foucCritical 标记）。覆盖现存 13 键 + 新增
    `immersiveHome`。
  - `store.ts`：get/set/subscribe，唯一读写 seam。
  - `wallpaper-spec.ts`：`wallpaperModeToSpec(mode)` 纯函数——body 类集合、
    html 属性、主内容样式。运行期切换、swup 钩子、pre-paint 三方共用此实现。
  - `prepaint.ts`：`generatePrepaintScript()` 纯函数，服务端渲染时由注册表生成
    首屏防闪烁脚本，替换 Layout.astro:242-540 手抄段。
  - `registry.test.ts` / `prepaint.test.ts` / `wallpaper-spec.test.ts`：
    node:test，范式对齐 `scripts/sync-oss-gallery.test.ts`；package.json 加
    `test` 脚本聚合。
- `setting-utils.ts` 重写为注册表投影，对外接口收缩；更新全部调用点。
- `DisplaySettingsIntegrated.svelte` 条目由注册表驱动（开关类），自定义 UI 保留。
- `MainGridLayout.astro` 的 data 下发与内联消费改走注册表派生常量。
- Layout.astro 三个 swup 钩子中的 body 类规则改为调用 wallpaper-spec（脚本改为
  可打包形式，配置经 JSON 载体传入，不再 define:vars）。

验收：node:test 全绿；dev 手测无 FOUC；旧 localStorage 键被读取；面板功能不回归。
不做：window.swup 收口、Layout 全面拆解（候选 3/4 另票）。


---
**状态**：已完成（2026-09-19）。src/settings/{registry,store,wallpaper-spec,prepaint}.ts + 31 个 node:test；setting-utils 重写为注册表投影（1286→约 800 行）；Layout pre-paint 300 行手抄改为构建期生成；swup 三钩子定位与 body 类规则收编 wallpaper-spec；面板裸 localStorage 改走 store。