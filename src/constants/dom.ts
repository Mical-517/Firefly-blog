/**
 * DOM 契约集中地：跨文件定位页面结构所用的 id / data 属性 / 选择器。
 *
 * 约定：
 * - 模板负责挂载这些 id，JS 侧一律从这里取选择器；
 * - 类名只承担样式，禁止用样式类组合做定位；
 * - `is:inline` 脚本无法 import 本模块，由模板通过 define:vars 注入同名值。
 */

// 主内容容器：唯一定位符。历史实现曾用 ".w-full.z-30.pointer-events-none"
// 样式类组合定位它，8 处引用在改类名时会静默断裂。
export const MAIN_CONTENT_ID = "main-content";
export const MAIN_CONTENT_SELECTOR = `#${MAIN_CONTENT_ID}`;

// 壁纸 / 横幅
export const WALLPAPER_WRAPPER_ID = "wallpaper-wrapper";
export const WALLPAPER_WRAPPER_SELECTOR = `#${WALLPAPER_WRAPPER_ID}`;
export const BANNER_ID = "banner";
export const BANNER_IMAGES_CONTAINER_ID = "banner-images-container";
export const BANNER_TEXT_OVERLAY_CLASS = "banner-home-text-overlay";
export const BANNER_TEXT_OVERLAY_SELECTOR = `.${BANNER_TEXT_OVERLAY_CLASS}`;

// 布局骨架
export const NAVBAR_ID = "navbar";
export const NAVBAR_WRAPPER_ID = "navbar-wrapper";
export const MAIN_GRID_ID = "main-grid";
export const POST_LIST_CONTAINER_ID = "post-list-container";
export const TOC_WRAPPER_ID = "toc-wrapper";
export const PAGE_HEIGHT_EXTEND_ID = "page-height-extend";
export const PROGRESS_BAR_ID = "progress-bar";
export const HEADER_WAVES_ID = "header-waves";
export const WALLPAPER_GRADIENT_ID = "wallpaper-gradient";
export const CONFIG_CARRIER_ID = "config-carrier";

// html 根上的 data 属性：设置系统写入，CSS 与 JS 共同消费
export const DATA_WALLPAPER_MODE = "data-wallpaper-mode";
export const DATA_BANNER_TITLE_ENABLED = "data-banner-title-enabled";

// 常用 accessor：调用方不接触原始选择器字符串
export function getMainContent(): HTMLElement | null {
	return document.getElementById(MAIN_CONTENT_ID);
}

export function getWallpaperWrapper(): HTMLElement | null {
	return document.getElementById(WALLPAPER_WRAPPER_ID);
}
