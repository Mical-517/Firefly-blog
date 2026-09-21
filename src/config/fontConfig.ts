import type { FontConfig } from "@/types/config";

// 字体配置
export const fontConfig: FontConfig = {
	// 是否启用自定义字体功能
	enable: true,
	// 是否预加载字体文件
	preload: true,
	// 当前选择的字体，支持多个字体组合
	selected: ["lxgw-wenkai"],

	// 字体列表
	// 推荐使用可靠的 CDN 服务商提供的字体链接，它天然做了按需分片加载，且性能较好
	//
	// 也可以使用本地字体文件，需自行进行字体子集化处理，否则会因为字体文件庞大增加带宽负担导致页面加载缓慢甚至无法加载
	// 如果进行字体子集化处理，会导致动态内容（如评论，Bangumi等）无法正确显示字体，因此不推荐使用本地字体文件
	//
	// 注意：src 可以是一个数组。为同一个 family 传入多个 css 时，浏览器会按
	// unicode-range + font-weight 自动挑选，因此"常规体 + 粗体"应分成两个 css 链接，
	// 而不是用 style.css 那种内部 @import 汇总文件（@import 会串行阻塞字体发现）。
	fonts: {
		// 系统字体
		system: {
			id: "system",
			name: "系统字体",
			src: "", // 系统字体无需 src
			family:
				"system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
		},

		// 霞鹭文楷（LXGW WenKai）—— 正文字体
		//
		// 只引"常规 400 + 粗体 700"两个 css，字体家族都是 LXGW WenKai，
		// 由 unicode-range 分片按需加载，粗体标题不会再被浏览器伪加粗。
		//
		// CDN 选择。实测（国内网络，同一时刻浏览器内冷请求 lxgwwenkai-regular.css）：
		//   registry.npmmirror.com   688ms   ← 采用
		//   cdn.jsdelivr.net        2684ms～直接超时/失败
		//   fastly.jsdelivr.net    21956ms
		// jsDelivr 在国内会间歇性完全不可达，而每个 unicode-range 分片都是独立
		// 请求：个别分片超时就导致"那部分字始终不变、其余字已变成文楷"。
		// 这是本站字体问题的直接原因，因此默认使用阿里 npmmirror 源。
		//
		// 若访客以海外为主，可换回 jsDelivr（路径把 /files/files/ 改为 /npm/...@1.7.0/）：
		//   https://fastly.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/lxgwwenkai-regular.css
		//   https://fastly.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/lxgwwenkai-bold.css
		"lxgw-wenkai": {
			id: "lxgw-wenkai",
			name: "霞鹭文楷",
			src: [
				"https://registry.npmmirror.com/lxgw-wenkai-webfont/1.7.0/files/lxgwwenkai-regular.css",
				"https://registry.npmmirror.com/lxgw-wenkai-webfont/1.7.0/files/lxgwwenkai-bold.css",
			],
			family: "LXGW WenKai",
			display: "swap" as const,
		},

		// Google Fonts - Zen Maru Gothic
		"zen-maru-gothic": {
			id: "zen-maru-gothic",
			name: "Zen Maru Gothic",
			src: "https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@300;400;500;700;900&display=swap",
			family: "Zen Maru Gothic",
			display: "swap" as const,
		},

		// Google Fonts - Inter
		inter: {
			id: "inter",
			name: "Inter",
			src: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
			family: "Inter",
			display: "swap" as const,
		},

		// 小米字体 - MiSans Normal
		"misans-normal": {
			id: "misans-normal",
			name: "MiSans Normal",
			src: "https://unpkg.com/misans@4.1.0/lib/Normal/MiSans-Normal.min.css",
			family: "MiSans",
			weight: 400,
			display: "swap" as const,
		},

		// 小米字体 - MiSans Regular
		"misans-regular": {
			id: "misans-regular",
			name: "MiSans Regular",
			src: "https://unpkg.com/misans@4.1.0/lib/Normal/MiSans-Regular.min.css",
			family: "MiSans",
			weight: 500,
			display: "swap" as const,
		},

		// 小米字体 - MiSans Semibold
		"misans-semibold": {
			id: "misans-semibold",
			name: "MiSans Semibold",
			src: "https://unpkg.com/misans@4.1.0/lib/Normal/MiSans-Semibold.min.css",
			family: "MiSans",
			weight: 600,
			display: "swap" as const,
		},
	},

	// 全局字体回退
	fallback: [
		"system-ui",
		"-apple-system",
		"BlinkMacSystemFont",
		"Segoe UI",
		"Roboto",
		"sans-serif",
	],
};
