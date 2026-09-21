/**
 * 设置注册表 —— 每个设置项（见 CONTEXT.md）的唯一事实源（ADR-0002）。
 *
 * 一个设置项在这里声明：稳定 id、历史存储键、默认值回落、解析/序列化方式、
 * 是否属于首屏防闪烁（FOUC）关键集。运行期读写一律经由 store.ts 的 seam；
 * pre-paint 脚本由 prepaint.ts 从本注册表生成；设置面板条目由本表驱动。
 *
 * 注意：本模块只做纯数据与纯函数（可被 node:test 直接测试），
 * 禁止触碰 DOM；应用（apply-to-DOM）逻辑在 setting-utils.ts。
 */
import {
	DEFAULT_THEME,
	DARK_MODE,
	LIGHT_MODE,
	SYSTEM_MODE,
	WALLPAPER_BANNER,
	WALLPAPER_FULLSCREEN,
	WALLPAPER_NONE,
	WALLPAPER_OVERLAY,
} from "../constants/constants";
import type { LIGHT_DARK_MODE, WALLPAPER_MODE } from "../types/config";
import { backgroundWallpaper, sakuraConfig, siteConfig } from "../config";

export type SettingValue = string | number | boolean;

/** pre-paint 阶段的"属性透传"型设置：存储值存在即写到 html 的该 data 属性上 */
export interface PrepaintAttrSpec {
	attr: string;
}

export interface SettingDefinition<T extends SettingValue = SettingValue> {
	/** 稳定身份，跨版本不变 */
	id: string;
	/** localStorage 历史键。与历史版本保持一致，访客已有设置不丢失（ADR-0002） */
	storageKey: string;
	category: "display" | "wallpaper" | "effects" | "layout";
	/** 无存储值时的回落值（来自站点配置） */
	fallback: () => T;
	/** localStorage 原始字符串（或 null）→ 类型化值，含钳制与兜底 */
	parse: (raw: string | null) => T;
	/** 值 → localStorage 字符串 */
	serialize: (value: T) => string;
	/** pre-paint 属性透传规格；其余 FOUC 关键项由 prepaint.ts 显式处理 */
	prepaintAttr?: PrepaintAttrSpec;
}

export function clampNumber(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function parseNumberInRange(
	raw: string | null,
	min: number,
	max: number,
	fallback: () => number,
): number {
	if (raw === null) return fallback();
	const parsed = Number.parseFloat(raw);
	if (Number.isNaN(parsed)) return fallback();
	return clampNumber(parsed, min, max);
}

function parseBool(raw: string | null, fallback: () => boolean): boolean {
	if (raw === null) return fallback();
	return raw === "true";
}

// ---- 各设置项的默认值回落 ----

export function hueFallback(): number {
	const fallback = "250";
	if (typeof document === "undefined") {
		return Number.parseInt(fallback, 10);
	}
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

/** 分设备的布尔配置取当前设备值（waves/gradient 共用） */
function deviceBool(
	value: { mobile?: boolean; desktop?: boolean } | boolean | undefined,
	desktopDefault: boolean,
): boolean {
	if (typeof value === "object" && value !== null) {
		const isMobile =
			typeof window !== "undefined" ? window.innerWidth < 768 : false;
		return isMobile
			? (value.mobile ?? desktopDefault)
			: (value.desktop ?? desktopDefault);
	}
	return value ?? desktopDefault;
}

const WALLPAPER_MODES: WALLPAPER_MODE[] = [
	WALLPAPER_BANNER,
	WALLPAPER_FULLSCREEN,
	WALLPAPER_OVERLAY,
	WALLPAPER_NONE,
];

// ---- 注册表本体 ----

export const settingRegistry: SettingDefinition[] = [
	{
		id: "hue",
		storageKey: "hue",
		category: "display",
		fallback: hueFallback,
		parse: (raw) =>
			raw === null
				? hueFallback()
				: (Number.parseInt(raw, 10) || hueFallback()),
		serialize: String,
	},
	{
		id: "theme",
		storageKey: "theme",
		category: "display",
		fallback: () => siteConfig.themeColor.defaultMode ?? DEFAULT_THEME,
		parse: (raw) => {
			if (raw === null) return siteConfig.themeColor.defaultMode ?? DEFAULT_THEME;
			return raw === LIGHT_MODE ||
				raw === DARK_MODE ||
				raw === SYSTEM_MODE
				? raw
				: (siteConfig.themeColor.defaultMode ?? DEFAULT_THEME);
		},
		serialize: String,
	},
	{
		id: "wallpaperMode",
		storageKey: "wallpaperMode",
		category: "wallpaper",
		fallback: () => backgroundWallpaper.mode,
		parse: (raw) =>
			raw && WALLPAPER_MODES.includes(raw as WALLPAPER_MODE)
				? (raw as WALLPAPER_MODE)
				: backgroundWallpaper.mode,
		serialize: String,
	},
	{
		id: "overlayOpacity",
		storageKey: "overlayOpacity",
		category: "wallpaper",
		fallback: () => backgroundWallpaper.overlay?.opacity ?? 0.8,
		parse: (raw) => parseNumberInRange(raw, 0, 1, () => backgroundWallpaper.overlay?.opacity ?? 0.8),
		serialize: String,
	},
	{
		id: "overlayBlur",
		storageKey: "overlayBlur",
		category: "wallpaper",
		fallback: () => backgroundWallpaper.overlay?.blur ?? 0,
		parse: (raw) => parseNumberInRange(raw, 0, 20, () => backgroundWallpaper.overlay?.blur ?? 0),
		serialize: String,
	},
	{
		id: "overlayCardOpacity",
		storageKey: "overlayCardOpacity",
		category: "wallpaper",
		fallback: () => backgroundWallpaper.overlay?.cardOpacity ?? 0.6,
		parse: (raw) => parseNumberInRange(raw, 0, 1, () => backgroundWallpaper.overlay?.cardOpacity ?? 0.6),
		serialize: String,
	},
	{
		id: "wavesEnabled",
		storageKey: "wavesEnabled",
		category: "effects",
		fallback: () =>
			deviceBool(backgroundWallpaper.common?.waves?.enable, false),
		parse: (raw) =>
			parseBool(raw, () => deviceBool(backgroundWallpaper.common?.waves?.enable, false)),
		serialize: (v) => String(v),
		prepaintAttr: { attr: "data-waves-enabled" },
	},
	{
		id: "gradientEnabled",
		storageKey: "gradientEnabled",
		category: "effects",
		fallback: () =>
			deviceBool(backgroundWallpaper.common?.gradient?.enable, true),
		parse: (raw) =>
			parseBool(raw, () => deviceBool(backgroundWallpaper.common?.gradient?.enable, true)),
		serialize: (v) => String(v),
		prepaintAttr: { attr: "data-gradient-enabled" },
	},
	{
		id: "sakuraEnabled",
		storageKey: "sakuraEnabled",
		category: "effects",
		fallback: () => sakuraConfig?.enable ?? false,
		parse: (raw) => parseBool(raw, () => sakuraConfig?.enable ?? false),
		serialize: (v) => String(v),
	},
	{
		id: "bannerTitleEnabled",
		storageKey: "bannerTitleEnabled",
		category: "display",
		fallback: () => backgroundWallpaper.common?.homeText?.enable ?? true,
		parse: (raw) =>
			parseBool(raw, () => backgroundWallpaper.common?.homeText?.enable ?? true),
		serialize: (v) => String(v),
		prepaintAttr: { attr: "data-banner-title-enabled" },
	},
	{
		id: "bannerCarouselEnabled",
		storageKey: "bannerCarouselEnabled",
		category: "display",
		fallback: () => backgroundWallpaper.banner?.carousel?.enable ?? false,
		parse: (raw) =>
			parseBool(raw, () => backgroundWallpaper.banner?.carousel?.enable ?? false),
		serialize: (v) => String(v),
	},
	{
		id: "postListLayout",
		storageKey: "postListLayout",
		category: "layout",
		fallback: () => siteConfig.postListLayout.defaultMode,
		parse: (raw) =>
			raw === "list" || raw === "grid"
				? raw
				: siteConfig.postListLayout.defaultMode,
		serialize: String,
	},
	{
		id: "immersiveHome",
		storageKey: "immersiveHome",
		category: "layout",
		fallback: () => true,
		parse: (raw) => parseBool(raw, () => true),
		serialize: (v) => String(v),
		prepaintAttr: { attr: "data-immersive-home" },
	},
];

export function getSettingDefinition(
	id: string,
): SettingDefinition | undefined {
	return settingRegistry.find((def) => def.id === id);
}
