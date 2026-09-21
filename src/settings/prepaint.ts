/**
 * pre-paint 脚本生成器（ADR-0002 的核心）。
 *
 * 首屏防闪烁脚本必须在首次绘制之前运行，因此不能是打包后的 ES module，
 * 只能是内联脚本。历史上它是 setting-utils.ts 的第二份手抄实现，靠注释
 * "与 setting-utils.ts 保持一致" 人工同步。现在它在服务端渲染时由
 * 设置注册表 + wallpaper-spec 决策表**生成**：漂移在机制上不可能发生。
 *
 * 本模块是纯函数（输入可序列化配置，输出脚本字符串），node:test 可直接断言
 * 生成代码中包含注册表派生的存储键与规格表。
 */
import type { LIGHT_DARK_MODE, WALLPAPER_MODE } from "../types/config";
import { settingRegistry } from "./registry";
import {
	mainContentSpecFor,
	wallpaperWrapperSpecFor,
	wallpaperBodyState,
	type ElementSpec,
	type WallpaperWrapperSpec,
} from "./wallpaper-spec";

export interface PrepaintConfig {
	configHue: number;
	defaultMode: LIGHT_DARK_MODE;
	defaultWallpaperMode: WALLPAPER_MODE;
	isWallpaperSwitchable: boolean;
	darkTheme: string;
	lightTheme: string;
	baseUrl: string;
	cardTransparentOpacity: number;
	bannerHeightExtend: number;
	/** 主内容容器 id（来自 constants/dom.ts 的契约） */
	mainContentId: string;
	/** 壁纸容器 id */
	wallpaperWrapperId: string;
	/** 横幅首页文本选择器 */
	bannerTextOverlaySelector: string;
}

type CtxKey = "d-home" | "d-page" | "m-home" | "m-page";

function buildDecisionTables(): {
	body: Record<string, { enableBanner: boolean; transparent: boolean }>;
	wrapper: Record<WALLPAPER_MODE, Record<CtxKey, WallpaperWrapperSpec>>;
	main: Record<WALLPAPER_MODE, Record<CtxKey, ElementSpec>>;
} {
	const modes: WALLPAPER_MODE[] = [
		"banner",
		"fullscreen",
		"overlay",
		"none",
	];
	const ctxKeys: CtxKey[] = ["d-home", "d-page", "m-home", "m-page"];
	const ctxFor = (key: CtxKey) => ({
		isMobile: key.startsWith("m"),
		isHome: key.endsWith("home"),
	});

	const body: Record<string, { enableBanner: boolean; transparent: boolean }> =
		{};
	const wrapper = {} as Record<
		WALLPAPER_MODE,
		Record<CtxKey, WallpaperWrapperSpec>
	>;
	const main = {} as Record<WALLPAPER_MODE, Record<CtxKey, ElementSpec>>;

	for (const mode of modes) {
		body[mode] = wallpaperBodyState(mode);
		wrapper[mode] = {} as Record<CtxKey, WallpaperWrapperSpec>;
		main[mode] = {} as Record<CtxKey, ElementSpec>;
		for (const key of ctxKeys) {
			wrapper[mode][key] = wallpaperWrapperSpecFor(mode, ctxFor(key));
			main[mode][key] = mainContentSpecFor(mode, ctxFor(key));
		}
	}
	return { body, wrapper, main };
}

export function generatePrepaintScript(config: PrepaintConfig): string {
	const attrPassthrough = settingRegistry
		.filter((def) => def.prepaintAttr)
		.map(
			(def) => `  v = localStorage.getItem(${JSON.stringify(def.storageKey)});
  if (v !== null) document.documentElement.setAttribute(${JSON.stringify(def.prepaintAttr!.attr)}, v);`,
		)
		.join("\n");

	const tables = JSON.stringify(buildDecisionTables());

	return `<script>(function () {
  // 本脚本由 src/settings/prepaint.ts 在构建时生成（ADR-0002），请勿手改。
  var DARK_MODE = "dark", LIGHT_MODE = "light", SYSTEM_MODE = "system";

  // ---- 主题（存储键 theme，注册表 id: theme）----
  var theme = localStorage.getItem("theme") || ${JSON.stringify(config.defaultMode)};
  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? DARK_MODE : LIGHT_MODE;
  }
  function resolveTheme(value) {
    return value === SYSTEM_MODE ? getSystemTheme() : value;
  }
  var resolvedTheme = resolveTheme(theme);
  var isDark = resolvedTheme === DARK_MODE;
  if (isDark) { document.documentElement.classList.add("dark"); }
  else { document.documentElement.classList.remove("dark"); }
  document.documentElement.setAttribute("data-theme", isDark ? ${JSON.stringify(config.darkTheme)} : ${JSON.stringify(config.lightTheme)});

  // ---- 主题色相（存储键 hue，注册表 id: hue）----
  var hue = localStorage.getItem("hue") || ${JSON.stringify(String(config.configHue))};
  document.documentElement.style.setProperty("--hue", hue);

  // ---- 卡片透明度（存储键 overlayCardOpacity，注册表 id: overlayCardOpacity）----
  var storedCardOpacity = localStorage.getItem("overlayCardOpacity");
  var parsedCardOpacity = storedCardOpacity === null ? NaN : parseFloat(storedCardOpacity);
  var resolvedCardOpacity = isFinite(parsedCardOpacity)
    ? Math.min(1, Math.max(0, parsedCardOpacity))
    : ${JSON.stringify(config.cardTransparentOpacity)};
  document.documentElement.style.setProperty("--card-transparent-opacity", String(resolvedCardOpacity));

  // ---- 横幅高度延伸量（布局机制，非设置项）----
  function calculateBannerHeightExtend() {
    var offset = Math.floor(window.innerHeight * (${config.bannerHeightExtend} / 100));
    offset = offset - (offset % 4);
    document.documentElement.style.setProperty("--banner-height-extend", offset + "px");
  }
  calculateBannerHeightExtend();
  requestAnimationFrame(function () {
    var oldValue = parseInt(document.documentElement.style.getPropertyValue("--banner-height-extend"));
    calculateBannerHeightExtend();
    var newValue = parseInt(document.documentElement.style.getPropertyValue("--banner-height-extend"));
    if (Math.abs(oldValue - newValue) > 4) {
      requestAnimationFrame(calculateBannerHeightExtend);
    }
  });

  // ---- 壁纸模式（存储键 wallpaperMode，注册表 id: wallpaperMode）----
  var WALLPAPER_BANNER = "banner", WALLPAPER_FULLSCREEN = "fullscreen",
      WALLPAPER_OVERLAY = "overlay", WALLPAPER_NONE = "none";
  var wallpaperMode = ${config.isWallpaperSwitchable ? 'localStorage.getItem("wallpaperMode") || ' : ""}${JSON.stringify(config.defaultWallpaperMode)};
  document.documentElement.setAttribute("data-wallpaper-mode", wallpaperMode);

  var SPEC = ${tables};
  var WRAPPER_ID = ${JSON.stringify(config.wallpaperWrapperId)};
  var MAIN_ID = ${JSON.stringify(config.mainContentId)};
  var OVERLAY_SELECTOR = ${JSON.stringify(config.bannerTextOverlaySelector)};
  var BASE_URL = ${JSON.stringify(config.baseUrl)};

  function ctxKey() {
    var isHome = window.location.pathname === BASE_URL ||
      (BASE_URL !== "/" && window.location.pathname === BASE_URL.replace(/\\/$/, "")) ||
      window.location.pathname === "/";
    var isMobile = window.innerWidth < 1024;
    return (isMobile ? "m" : "d") + "-" + (isHome ? "home" : "page");
  }

  (function applyWallpaperMode() {
    requestAnimationFrame(function () {
      var key = ctxKey();
      var modeSpec = SPEC[wallpaperMode] || SPEC.none;

      // body 类：wallpaperBodyState 的唯一裁决
      var body = document.body;
      if (modeSpec.body.enableBanner) {
        body.classList.add("enable-banner");
        body.classList.remove("no-banner-layout");
      } else {
        body.classList.remove("enable-banner");
        body.classList.add("no-banner-layout");
      }
      if (modeSpec.body.transparent) { body.classList.add("wallpaper-transparent"); }
      else { body.classList.remove("wallpaper-transparent"); }

      // 壁纸容器
      var wrapper = document.getElementById(WRAPPER_ID);
      if (wrapper) {
        var w = modeSpec.wrapper[key];
        wrapper.style.display = w.display;
        w.addClasses.forEach(function (c) { wrapper.classList.add(c); });
        w.removeClasses.forEach(function (c) { wrapper.classList.remove(c); });
        if (w.top === null) { wrapper.style.top = ""; } else { wrapper.style.top = w.top; }
        if (w.display === "block" && w.reveal) {
          wrapper.classList.remove("hidden", "opacity-0");
          wrapper.classList.add("opacity-100");
        }
      }

      // 主内容容器：mainContentSpecFor 的唯一裁决
      var mainContent = document.getElementById(MAIN_ID);
      if (mainContent) {
        var m = modeSpec.main[key];
        mainContent.style.setProperty("transition", "none", "important");
        m.removeClasses.forEach(function (c) { mainContent.classList.remove(c); });
        m.addClasses.forEach(function (c) { mainContent.classList.add(c); });
        Object.keys(m.styles).forEach(function (prop) {
          var value = m.styles[prop];
          if (value === null) { mainContent.style.removeProperty(prop); }
          else { mainContent.style.setProperty(prop, value, "important"); }
        });
        mainContent.style.visibility = "visible";
        requestAnimationFrame(function () {
          mainContent.style.removeProperty("transition");
        });
      }

      // 横幅首页文本
      var bannerTextOverlay = document.querySelector(OVERLAY_SELECTOR);
      if (bannerTextOverlay) {
        var overlayVisible = (wallpaperMode === WALLPAPER_BANNER || wallpaperMode === WALLPAPER_FULLSCREEN) &&
          (window.location.pathname === BASE_URL ||
            (BASE_URL !== "/" && window.location.pathname === BASE_URL.replace(/\\/$/, "")) ||
            window.location.pathname === "/");
        if (overlayVisible) { bannerTextOverlay.classList.remove("hidden"); }
        else { bannerTextOverlay.classList.add("hidden"); }
      }
    });
  })();

  // ---- FOUC 属性透传（注册表 prepaintAttr 集合）----
  var v;
${attrPassthrough}
})();</script>`;
}
