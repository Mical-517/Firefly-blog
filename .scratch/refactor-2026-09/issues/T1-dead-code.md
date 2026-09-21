# T1 · 死代码清理与顺手修复

阻塞：无（独立，可先行）。

- 删除 `src/utils/sakura-manager.ts`（src/ 内零 import，含 resize 监听器泄漏 bug）。
  删除前 grep 确认无引用。
- 删除三个文件头自注"已弃用"的控件：`DisplaySettings.svelte`、
  `WallpaperSwitch.svelte`、`LayoutSwitchButton.svelte`。删除前 grep 确认无真实
  import（Navbar.astro 用的是 DisplaySettingsIntegrated 的别名）。
- 修复 `src/utils/content-utils.ts:309` 附近 `!p.data.password && !p.data.password`
  重复条件——先读上下文确认原意，勿盲目删一半。

验收：check/build 全绿；首页樱花特效仍工作（SakuraEffect.astro 内联实现不受影响）。


---
**状态**：已完成（2026-09-19）。删除 sakura-manager.ts 与三个弃用控件、更新 components/README.md、修复 content-utils 重复条件。