/**
 * 壁纸模式 → DOM 规格：唯一的映射事实源。
 *
 * 历史上同一套 body 类 / 主内容定位规则分别手写在
 * setting-utils.ts、Layout.astro 的 pre-paint 内联脚本、三个 swup 钩子与 CSS 中，
 * 改一条规则要动四处且互相漂移（同一 top 值出现过 -3rem 与 -3.5rem 两个版本）。
 * 现在：运行期切换、pre-paint 脚本生成、swup 钩子全部引用本模块的纯函数；
 * pre-paint 的完整决策表由 prepaint.ts 从这里序列化生成。
 */
import {
	WALLPAPER_BANNER,
	WALLPAPER_FULLSCREEN,
	WALLPAPER_NONE,
	WALLPAPER_OVERLAY,
} from "../constants/constants";
import type { WALLPAPER_MODE } from "../types/config";

export interface WallpaperBodyState {
	/** body 是否带 enable-banner（否则带 no-banner-layout） */
	enableBanner: boolean;
	/** body 是否带 wallpaper-transparent（仅 overlay 模式） */
	transparent: boolean;
}

/** 壁纸模式对应的 body 类状态。四种模式的唯一裁决处。 */
export function wallpaperBodyState(mode: WALLPAPER_MODE): WallpaperBodyState {
	return {
		enableBanner: mode === WALLPAPER_BANNER,
		transparent: mode === WALLPAPER_OVERLAY,
	};
}

export interface MainContentContext {
	/** 当前是否站点首页 */
	isHome: boolean;
	/** 是否移动端视口（< 1024px，与布局断点一致） */
	isMobile: boolean;
}

export interface ElementSpec {
	/** 需要存在的类 */
	addClasses: string[];
	/** 需要不存在的类 */
	removeClasses: string[];
	/** 内联样式；null 表示移除该属性 */
	styles: Record<string, string | null>;
}

const NAV_CLEARANCE_TOP = "5.5rem";
const BANNER_TARGET_TOP = "calc(var(--banner-height) - 3rem)";

/**
 * 主内容容器（#main-content）在给定壁纸模式与视口/页面上下文下的目标状态。
 * 这张表统一了历史上 pre-paint / setting-utils / swup 三处各自维护的定位规则。
 */
export function mainContentSpecFor(
	mode: WALLPAPER_MODE,
	ctx: MainContentContext,
): ElementSpec {
	const mobileNonHome = ctx.isMobile && !ctx.isHome;

	if (mode === WALLPAPER_BANNER) {
		if (mobileNonHome) {
			return {
				addClasses: ["mobile-main-no-banner"],
				removeClasses: ["no-banner-layout"],
				styles: {
					top: NAV_CLEARANCE_TOP,
					"margin-top": "0",
					position: "",
					"z-index": "",
					"min-height": "",
				},
			};
		}
		// 桌面端（首页与非首页统一）：主内容挂在横幅下方，清除 inline top 让 CSS 生效
		if (ctx.isMobile) {
			// 移动端首页：清除 inline top，响应式 CSS 接管
			return {
				addClasses: [],
				removeClasses: ["mobile-main-no-banner", "no-banner-layout"],
				styles: {
					top: null,
					"margin-top": "0",
					position: "",
					"z-index": "",
					"min-height": "",
				},
			};
		}
		return {
			addClasses: [],
			removeClasses: ["mobile-main-no-banner", "no-banner-layout"],
			styles: {
				top: BANNER_TARGET_TOP,
				"margin-top": "0",
				position: "",
				"z-index": "",
				"min-height": "",
			},
		};
	}

	if (mode === WALLPAPER_FULLSCREEN) {
		if (mobileNonHome) {
			// 壁纸已隐藏，主内容从导航栏下方开始
			return {
				addClasses: ["mobile-main-no-banner", "no-banner-layout"],
				removeClasses: [],
				styles: {
					top: NAV_CLEARANCE_TOP,
					"margin-top": "0",
					position: "",
					"z-index": "",
					"min-height": "",
				},
			};
		}
		// 壁纸占满 100vh 文档流，主内容 relative 紧跟其后
		return {
			addClasses: ["no-banner-layout"],
			removeClasses: ["mobile-main-no-banner"],
			styles: {
				position: "relative",
				"z-index": "30",
				top: "0",
				"margin-top": "1rem",
				"min-height": "",
			},
		};
	}

	// overlay 与 none：紧凑布局，主内容从导航栏下方开始
	return {
		addClasses: ["no-banner-layout"],
		removeClasses: ["mobile-main-no-banner"],
		styles: {
			top: NAV_CLEARANCE_TOP,
			"margin-top": "0",
			position: "",
			"z-index": "",
			"min-height": "",
		},
	};
}

export interface WallpaperWrapperSpec {
	display: "none" | "block";
	addClasses: string[];
	removeClasses: string[];
	/** null 表示清除内联 top */
	top: string | null;
	/** display 为 block 时是否执行揭示（移除 hidden/opacity-0、加 opacity-100） */
	reveal: boolean;
}

/** 壁纸容器（#wallpaper-wrapper）在给定模式与上下文下的目标状态（不含动画）。 */
export function wallpaperWrapperSpecFor(
	mode: WALLPAPER_MODE,
	ctx: MainContentContext,
): WallpaperWrapperSpec {
	const mobileNonHome = ctx.isMobile && !ctx.isHome;

	switch (mode) {
		case WALLPAPER_BANNER:
			if (mobileNonHome) {
				return {
					display: "none",
					addClasses: ["mobile-hide-banner"],
					removeClasses: ["wallpaper-overlay", "wallpaper-fullscreen"],
					top: null,
					reveal: false,
				};
			}
			return {
				display: "block",
				removeClasses: [
					"mobile-hide-banner",
					"wallpaper-overlay",
					"wallpaper-fullscreen",
				],
				addClasses: [],
				top: null,
				reveal: true,
			};
		case WALLPAPER_FULLSCREEN:
			if (mobileNonHome) {
				return {
					display: "none",
					addClasses: ["mobile-hide-banner"],
					removeClasses: ["wallpaper-overlay"],
					top: null,
					reveal: false,
				};
			}
			return {
				display: "block",
				addClasses: ["wallpaper-fullscreen"],
				removeClasses: ["wallpaper-overlay", "mobile-hide-banner"],
				top: null,
				reveal: true,
			};
		case WALLPAPER_OVERLAY:
			return {
				display: "block",
				addClasses: ["wallpaper-overlay"],
				removeClasses: ["wallpaper-fullscreen", "mobile-hide-banner"],
				top: null,
				reveal: true,
			};
		case WALLPAPER_NONE:
		default:
			return {
				display: "none",
				addClasses: [],
				removeClasses: ["wallpaper-overlay", "wallpaper-fullscreen"],
				top: null,
				reveal: false,
			};
	}
}

/** 将 ElementSpec 应用到元素（运行期共用的小执行器） */
export function applyElementSpec(
	element: HTMLElement,
	spec: ElementSpec,
): void {
	for (const cls of spec.removeClasses) {
		element.classList.remove(cls);
	}
	for (const cls of spec.addClasses) {
		element.classList.add(cls);
	}
	for (const [prop, value] of Object.entries(spec.styles)) {
		if (value === null) {
			element.style.removeProperty(prop);
		} else {
			element.style.setProperty(prop, value, "important");
		}
	}
}
