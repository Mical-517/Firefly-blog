import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { settingRegistry, getSettingDefinition, clampNumber } from "./registry";
import { backgroundWallpaper, siteConfig } from "../config";

describe("设置注册表", () => {
	it("id 与存储键均唯一", () => {
		const ids = settingRegistry.map((d) => d.id);
		const keys = settingRegistry.map((d) => d.storageKey);
		assert.equal(new Set(ids).size, ids.length, "id 重复");
		assert.equal(new Set(keys).size, keys.length, "storageKey 重复");
	});

	it("覆盖全部历史存储键（访客设置不丢失的契约）", () => {
		const keys = settingRegistry.map((d) => d.storageKey);
		for (const legacy of [
			"hue",
			"theme",
			"wallpaperMode",
			"overlayOpacity",
			"overlayBlur",
			"overlayCardOpacity",
			"wavesEnabled",
			"gradientEnabled",
			"sakuraEnabled",
			"bannerTitleEnabled",
			"bannerCarouselEnabled",
			"postListLayout",
		]) {
			assert.ok(keys.includes(legacy), `缺少历史键: ${legacy}`);
		}
	});

	it("FOUC 属性透传集合包含四个 data 属性", () => {
		const attrs = settingRegistry
			.filter((d) => d.prepaintAttr)
			.map((d) => d.prepaintAttr!.attr);
		for (const attr of [
			"data-waves-enabled",
			"data-gradient-enabled",
			"data-banner-title-enabled",
			"data-immersive-home",
		]) {
			assert.ok(attrs.includes(attr), `缺少 pre-paint 属性: ${attr}`);
		}
	});

	it("getSettingDefinition 返回声明过的项", () => {
		assert.equal(getSettingDefinition("hue")?.storageKey, "hue");
		assert.equal(getSettingDefinition("不存在的项"), undefined);
	});
});

describe("设置项解析", () => {
	it("overlayOpacity 钳制到 [0,1]，非法值回落默认", () => {
		const def = getSettingDefinition("overlayOpacity")!;
		assert.equal(def.parse("0.35"), 0.35);
		assert.equal(def.parse("-1"), 0);
		assert.equal(def.parse("5"), 1);
		assert.equal(def.parse("abc"), backgroundWallpaper.overlay?.opacity ?? 0.8);
		assert.equal(def.parse(null), backgroundWallpaper.overlay?.opacity ?? 0.8);
	});

	it("overlayBlur 钳制到 [0,20]", () => {
		const def = getSettingDefinition("overlayBlur")!;
		assert.equal(def.parse("55"), 20);
		assert.equal(def.parse("-3"), 0);
	});

	it("theme 非法值回落站点配置", () => {
		const def = getSettingDefinition("theme")!;
		const fallback = siteConfig.themeColor.defaultMode ?? "light";
		assert.equal(def.parse("bogus"), fallback);
		assert.equal(def.parse("dark"), "dark");
	});

	it("wallpaperMode 非法值回落站点配置", () => {
		const def = getSettingDefinition("wallpaperMode")!;
		assert.equal(def.parse("fullscreen"), "fullscreen");
		assert.equal(def.parse("diagonal"), backgroundWallpaper.mode);
	});

	it("布尔项只认字符串 true", () => {
		const def = getSettingDefinition("wavesEnabled")!;
		assert.equal(def.parse("true"), true);
		assert.equal(def.parse("false"), false);
		assert.equal(def.parse("1"), false);
	});

	it("postListLayout 只认 list/grid", () => {
		const def = getSettingDefinition("postListLayout")!;
		assert.equal(def.parse("grid"), "grid");
		assert.equal(def.parse("bogus"), siteConfig.postListLayout.defaultMode);
	});
});

describe("clampNumber", () => {
	it("边界钳制", () => {
		assert.equal(clampNumber(5, 0, 1), 1);
		assert.equal(clampNumber(-5, 0, 1), 0);
		assert.equal(clampNumber(0.5, 0, 1), 0.5);
	});
});
