import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatePrepaintScript } from "./prepaint";
import { settingRegistry } from "./registry";

const baseConfig = {
	configHue: 250,
	defaultMode: "light" as const,
	defaultWallpaperMode: "banner" as const,
	isWallpaperSwitchable: true,
	darkTheme: "github-dark-default",
	lightTheme: "github-light-default",
	baseUrl: "/",
	cardTransparentOpacity: 0.6,
	bannerHeightExtend: 12,
	mainContentId: "main-content",
	wallpaperWrapperId: "wallpaper-wrapper",
	bannerTextOverlaySelector: ".banner-home-text-overlay",
};

describe("generatePrepaintScript", () => {
	it("输出自包含的内联脚本", () => {
		const script = generatePrepaintScript(baseConfig);
		assert.ok(script.startsWith("<script>"));
		assert.ok(script.trimEnd().endsWith("</script>"));
		// 不应残留 Astro 指令或 import（is:inline 环境无法使用）
		assert.ok(!script.includes("import "));
		assert.ok(!script.includes("is:inline"));
	});

	it("包含注册表的历史存储键", () => {
		const script = generatePrepaintScript(baseConfig);
		for (const key of ["theme", "hue", "overlayCardOpacity", "wallpaperMode"]) {
			const def = settingRegistry.find((d) => d.id === key)!;
			assert.ok(
				script.includes(`localStorage.getItem(${JSON.stringify(def.storageKey)})`),
				`缺少存储键读写: ${def.storageKey}`,
			);
		}
	});

	it("包含 FOUC 属性透传集合", () => {
		const script = generatePrepaintScript(baseConfig);
		for (const def of settingRegistry.filter((d) => d.prepaintAttr)) {
			assert.ok(
				script.includes(JSON.stringify(def.prepaintAttr!.attr)),
				`缺少属性透传: ${def.prepaintAttr!.attr}`,
			);
		}
	});

	it("决策表携带 wallpaper-spec 的裁决结果", () => {
		const script = generatePrepaintScript(baseConfig);
		assert.ok(script.includes('"enableBanner":true'), "banner 模式的 body 裁决缺失");
		assert.ok(script.includes('"transparent":true'), "overlay 透明的 body 裁决缺失");
		assert.ok(script.includes('"display":"none"'), "none 模式隐藏裁决缺失");
		assert.ok(script.includes('"position":"relative"'), "fullscreen 的 relative 裁决缺失");
		assert.ok(script.includes("calc(var(--banner-height) - 3rem)"), "banner 定位裁决缺失");
	});

	it("switchable=false 时不读壁纸模式存储键", () => {
		const script = generatePrepaintScript({
			...baseConfig,
			isWallpaperSwitchable: false,
		});
		assert.ok(!script.includes('localStorage.getItem("wallpaperMode")'));
	});

	it("DOM 契约 id 来自常量注入而非硬编码", () => {
		const script = generatePrepaintScript(baseConfig);
		assert.ok(script.includes(JSON.stringify("main-content")));
		assert.ok(script.includes(JSON.stringify(".banner-home-text-overlay")));
	});
});
