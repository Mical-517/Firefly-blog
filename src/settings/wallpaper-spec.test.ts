import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	mainContentSpecFor,
	wallpaperBodyState,
	wallpaperWrapperSpecFor,
} from "./wallpaper-spec";

describe("wallpaperBodyState（body 类唯一裁决）", () => {
	it("banner 模式开启 enable-banner", () => {
		assert.deepEqual(wallpaperBodyState("banner"), {
			enableBanner: true,
			transparent: false,
		});
	});

	it("overlay 模式透明且无横幅", () => {
		assert.deepEqual(wallpaperBodyState("overlay"), {
			enableBanner: false,
			transparent: true,
		});
	});

	it("fullscreen 与 none 均无横幅无透明", () => {
		assert.deepEqual(wallpaperBodyState("fullscreen"), {
			enableBanner: false,
			transparent: false,
		});
		assert.deepEqual(wallpaperBodyState("none"), {
			enableBanner: false,
			transparent: false,
		});
	});
});

describe("mainContentSpecFor（主内容定位唯一裁决）", () => {
	const spec = mainContentSpecFor;

	it("banner 桌面端：挂在横幅下方", () => {
		const s = spec("banner", { isHome: true, isMobile: false });
		assert.equal(s.styles.top, "calc(var(--banner-height) - 3rem)");
		assert.ok(!s.addClasses.includes("mobile-main-no-banner"));
		assert.ok(s.removeClasses.includes("mobile-main-no-banner"));
	});

	it("banner 移动端首页：清除 inline top 交给 CSS", () => {
		const s = spec("banner", { isHome: true, isMobile: true });
		assert.equal(s.styles.top, null);
		assert.ok(!s.addClasses.includes("mobile-main-no-banner"));
	});

	it("banner 移动端非首页：类 + 5.5rem 避让", () => {
		const s = spec("banner", { isHome: false, isMobile: true });
		assert.ok(s.addClasses.includes("mobile-main-no-banner"));
		assert.equal(s.styles.top, "5.5rem");
		assert.equal(s.styles["margin-top"], "0");
	});

	it("fullscreen 桌面端：relative 紧跟壁纸", () => {
		const s = spec("fullscreen", { isHome: true, isMobile: false });
		assert.equal(s.styles.position, "relative");
		assert.equal(s.styles["z-index"], "30");
		assert.equal(s.styles.top, "0");
		assert.equal(s.styles["margin-top"], "1rem");
		assert.ok(s.addClasses.includes("no-banner-layout"));
	});

	it("fullscreen 移动端非首页：壁纸已隐藏，从导航下方开始", () => {
		const s = spec("fullscreen", { isHome: false, isMobile: true });
		assert.ok(s.addClasses.includes("mobile-main-no-banner"));
		assert.equal(s.styles.top, "5.5rem");
		assert.equal(s.styles.position, "");
	});

	it("overlay 与 none：紧凑布局从导航下方开始", () => {
		for (const mode of ["overlay", "none"] as const) {
			const s = spec(mode, { isHome: true, isMobile: false });
			assert.equal(s.styles.top, "5.5rem");
			assert.equal(s.styles["margin-top"], "0");
			assert.ok(s.addClasses.includes("no-banner-layout"));
		}
	});
});

describe("wallpaperWrapperSpecFor（壁纸容器唯一裁决）", () => {
	it("none 隐藏且不揭示", () => {
		const s = wallpaperWrapperSpecFor("none", { isHome: true, isMobile: false });
		assert.equal(s.display, "none");
		assert.equal(s.reveal, false);
	});

	it("banner 桌面端显示并揭示", () => {
		const s = wallpaperWrapperSpecFor("banner", { isHome: true, isMobile: false });
		assert.equal(s.display, "block");
		assert.equal(s.reveal, true);
		assert.ok(s.removeClasses.includes("wallpaper-overlay"));
		assert.ok(s.removeClasses.includes("wallpaper-fullscreen"));
	});

	it("banner 移动端非首页隐藏", () => {
		const s = wallpaperWrapperSpecFor("banner", { isHome: false, isMobile: true });
		assert.equal(s.display, "none");
		assert.ok(s.addClasses.includes("mobile-hide-banner"));
	});

	it("overlay 加 overlay 类并揭示", () => {
		const s = wallpaperWrapperSpecFor("overlay", { isHome: true, isMobile: true });
		assert.equal(s.display, "block");
		assert.ok(s.addClasses.includes("wallpaper-overlay"));
		assert.equal(s.reveal, true);
	});

	it("fullscreen 桌面端加 fullscreen 类", () => {
		const s = wallpaperWrapperSpecFor("fullscreen", { isHome: true, isMobile: false });
		assert.equal(s.display, "block");
		assert.ok(s.addClasses.includes("wallpaper-fullscreen"));
	});
});
