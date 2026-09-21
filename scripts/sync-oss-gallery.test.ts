import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	albumIdFromFileName,
	buildGeneratedAlbumsFile,
	discoverAlbumIds,
	discoverAlbumIdsFromKeys,
	excludeManualConflicts,
	filterImageObjects,
	parseAlbumMeta,
	resolveMetaCover,
	toObjectUrl,
	toUrlsFileContent,
} from "./sync-oss-core.ts";

// 注意：这些是纯函数测试，不依赖网络，也不依赖 OSS SDK

describe("toObjectUrl", () => {
	it("用 https + 自定义域名 + region 拼接对象 URL", () => {
		assert.equal(
			toObjectUrl(
				"images.gallery.example.com",
				"oss-cn-hangzhou",
				"my-bucket",
				"albums/summer/01.jpg",
			),
			"https://images.gallery.example.com/albums/summer/01.jpg",
		);
	});

	it("无自定义域名时回退到 bucket+region 默认域名", () => {
		assert.equal(
			toObjectUrl("", "oss-cn-beijing", "my-bucket", "albums/x/01.webp"),
			"https://my-bucket.oss-cn-beijing.aliyuncs.com/albums/x/01.webp",
		);
	});

	it("去掉前缀路径中的斜杠冗余", () => {
		assert.equal(
			toObjectUrl(
				"img.example.com",
				"oss-cn-hangzhou",
				"b",
				"/albums/x/01.webp",
			),
			"https://img.example.com/albums/x/01.webp",
		);
	});

	it("key 中的中文与空格按路径段编码", () => {
		assert.equal(
			toObjectUrl(
				"img.example.com",
				"oss-cn-hangzhou",
				"b",
				"albums/我的照片/01 号.jpg",
			),
			"https://img.example.com/albums/%E6%88%91%E7%9A%84%E7%85%A7%E7%89%87/01%20%E5%8F%B7.jpg",
		);
	});

	it("已有百分号编码的 key 不会被双重编码", () => {
		assert.equal(
			toObjectUrl(
				"img.example.com",
				"oss-cn-hangzhou",
				"b",
				"albums/my%20photo.jpg",
			),
			"https://img.example.com/albums/my%20photo.jpg",
		);
	});
});

describe("filterImageObjects", () => {
	const objects = [
		{ key: "albums/summer/01.jpg" },
		{ key: "albums/summer/02.JPG" },
		{ key: "albums/summer/03.webp" },
		{ key: "albums/summer/04.png" },
		{ key: "albums/summer/05.avif" },
		{ key: "albums/summer/06.gif" },
		{ key: "albums/summer/notes.txt" },
		{ key: "albums/summer/README.md" },
		{ key: "albums/summer/07.jpeg" },
	];

	it("只保留图片扩展名，大小写不敏感", () => {
		const result = filterImageObjects(objects);
		const keys = result.map((o) => o.key);
		assert.deepEqual(keys, [
			"albums/summer/01.jpg",
			"albums/summer/02.JPG",
			"albums/summer/03.webp",
			"albums/summer/04.png",
			"albums/summer/05.avif",
			"albums/summer/06.gif",
			"albums/summer/07.jpeg",
		]);
	});

	it("空对象列表返回空数组", () => {
		assert.deepEqual(filterImageObjects([]), []);
	});
});

describe("toUrlsFileContent", () => {
	it("每行一个 URL，带注释头部", () => {
		const content = toUrlsFileContent([
			"https://img.example.com/albums/summer/01.jpg",
			"https://img.example.com/albums/summer/02.webp",
		]);
		const lines = content.split("\n").filter((l) => l.trim() !== "");
		// 去掉注释行后只剩两个 URL
		const urls = lines.filter((l) => !l.startsWith("#"));
		assert.deepEqual(urls, [
			"https://img.example.com/albums/summer/01.jpg",
			"https://img.example.com/albums/summer/02.webp",
		]);
	});
});

describe("discoverAlbumIds", () => {
	it("只取相册根的直接子目录名，忽略更深层级", () => {
		assert.deepEqual(
			discoverAlbumIds("picture/favorites/", [
				"picture/favorites/anime/",
				"picture/favorites/wallpaper/",
				"picture/favorites/anime/2024/",
				"picture/notes/",
			]),
			["anime", "wallpaper"],
		);
	});

	it("容忍根前缀不带尾斜杠", () => {
		assert.deepEqual(
			discoverAlbumIds("picture/favorites", ["picture/favorites/anime/"]),
			["anime"],
		);
	});

	it("结果按名称排序且去重", () => {
		assert.deepEqual(
			discoverAlbumIds("root/", ["root/b/", "root/a/", "root/b/"]),
			["a", "b"],
		);
	});

	it("根自身与不含子目录时返回空数组", () => {
		assert.deepEqual(discoverAlbumIds("root/", ["root/", "other/x/"]), []);
	});
});

describe("albumIdFromFileName", () => {
	it("取文件名开头的连续小写字母作为相册 id", () => {
		assert.equal(albumIdFromFileName("anime20260921122149911.png"), "anime");
		assert.equal(
			albumIdFromFileName("wallpaper20260921122951980.jpg"),
			"wallpaper",
		);
	});

	it("遇到大写字母即停止，混合大小写文件名不会误组相册", () => {
		// ZOSYzq3QsmJ3602.png 以大写开头，无小写前缀
		assert.equal(albumIdFromFileName("ZOSYzq3QsmJ3602.png"), null);
		// 前缀后紧跟大写也算该前缀（如 anime-ZOSYzq…）
		assert.equal(albumIdFromFileName("anime-ZOSYzq3Q.png"), "anime");
	});

	it("子目录 key 取文件名部分，忽略目录路径", () => {
		// 目录不参与归属判定；文件名本身无前缀（数字/大写开头）时归不入相册
		assert.equal(
			albumIdFromFileName("picture/favorites/anime/20221019010934_be561.jpeg"),
			null,
		);
		assert.equal(
			albumIdFromFileName("picture/favorites/anime/anime20260921122149911.png"),
			"anime",
		);
	});

	it("文件名以数字开头时返回 null（无前缀，归不入相册）", () => {
		assert.equal(albumIdFromFileName("20260917174359934.png"), null);
		assert.equal(
			albumIdFromFileName("picture/favorites/20260917174359934.png"),
			null,
		);
	});

	it("无扩展名的对象也按同一规则解析", () => {
		assert.equal(albumIdFromFileName("anime20260921122149911"), "anime");
	});
});

describe("discoverAlbumIdsFromKeys", () => {
	it("按文件名前缀发现相册，根下与子目录里的图片都算", () => {
		assert.deepEqual(
			discoverAlbumIdsFromKeys("picture/favorites/", [
				"picture/favorites/anime20260921122149911.png",
				"picture/favorites/wallpaper20260921122951980.jpg",
				"picture/favorites/anime/anime20260921122153901.png",
				"picture/favorites/20260917174359934.png",
				"picture/favorites/ZOSYzq3QsmJ3602.png",
				"picture/notes/foo.jpg",
			]),
			["anime", "wallpaper"],
		);
	});

	it("容忍根前缀不带尾斜杠", () => {
		assert.deepEqual(
			discoverAlbumIdsFromKeys("picture/favorites", [
				"picture/favorites/anime2026.png",
			]),
			["anime"],
		);
	});

	it("全部图片都无前缀时返回空数组", () => {
		assert.deepEqual(
			discoverAlbumIdsFromKeys("root/", ["root/2024.jpg", "root/ZOSY.png"]),
			[],
		);
	});
});

describe("parseAlbumMeta", () => {
	it("元数据缺失时回退到目录名", () => {
		assert.deepEqual(parseAlbumMeta(null, "anime"), { name: "anime" });
	});

	it("非法 JSON 时回退到目录名", () => {
		assert.deepEqual(parseAlbumMeta("{ not json", "anime"), { name: "anime" });
	});

	it("读取合法字段并保留标签数组", () => {
		const meta = parseAlbumMeta(
			JSON.stringify({
				name: "动漫",
				description: "追番截图",
				date: "2026-09-01",
				location: "B站",
				tags: ["anime", "二次元"],
				cover: "cover.jpg",
			}),
			"anime",
		);
		assert.deepEqual(meta, {
			name: "动漫",
			description: "追番截图",
			date: "2026-09-01",
			location: "B站",
			tags: ["anime", "二次元"],
			cover: "cover.jpg",
		});
	});

	it("丢弃类型不符的字段，并忽略 id 字段（id 由目录名决定）", () => {
		const meta = parseAlbumMeta(
			JSON.stringify({ name: 123, tags: "anime", id: "hacked" }),
			"anime",
		);
		assert.deepEqual(meta, { name: "anime" });
	});

	it("标签数组中的非字符串项被剔除", () => {
		const meta = parseAlbumMeta(
			JSON.stringify({ name: "动漫", tags: ["anime", 42, null] }),
			"anime",
		);
		assert.deepEqual(meta.tags, ["anime"]);
	});
});

describe("buildGeneratedAlbumsFile", () => {
	it("生成可被 TS 直接导入的相册数组文件", () => {
		const content = buildGeneratedAlbumsFile([
			{ id: "anime", name: "动漫" },
			{ id: "wallpaper", name: "wallpaper" },
		]);
		assert.match(content, /export const galleryOssAlbums: GalleryAlbum\[\]/);
		assert.match(
			content,
			/import type \{ GalleryAlbum \} from "@\/types\/config";/,
		);
		assert.match(content, /"id": "anime"/);
		assert.match(content, /"id": "wallpaper"/);
	});

	it("空相册清单生成空数组", () => {
		const content = buildGeneratedAlbumsFile([]);
		assert.match(
			content,
			/export const galleryOssAlbums: GalleryAlbum\[\] = \[\];/,
		);
	});

	it("输出是确定性的（与输入顺序无关的排序由调用方保证，此处原样输出）", () => {
		const a = buildGeneratedAlbumsFile([{ id: "a", name: "a" }]);
		const b = buildGeneratedAlbumsFile([{ id: "a", name: "a" }]);
		assert.equal(a, b);
	});
});

describe("excludeManualConflicts", () => {
	it("保留不与手写冲突的自动发现相册", () => {
		const { kept, conflicts } = excludeManualConflicts(
			[{ id: "anime" }, { id: "wallpaper" }],
			["manual-one"],
		);
		assert.deepEqual(
			kept.map((a) => a.id),
			["anime", "wallpaper"],
		);
		assert.deepEqual(conflicts, []);
	});

	it("剔除与手写同 id 的相册并报告冲突", () => {
		const { kept, conflicts } = excludeManualConflicts(
			[{ id: "anime" }, { id: "wallpaper" }],
			["anime"],
		);
		assert.deepEqual(
			kept.map((a) => a.id),
			["wallpaper"],
		);
		assert.deepEqual(conflicts, ["anime"]);
	});

	it("重复运行幂等：已生成的相册再次传入仍被保留（不会被当成手写而吞噬）", () => {
		// 第一次发现得到的清单
		const first = excludeManualConflicts(
			[{ id: "anime" }, { id: "wallpaper" }],
			[],
		);
		// 第二次发现得到同样的清单，手写仍为空 —— 结果应完全一致
		const second = excludeManualConflicts(first.kept, []);
		assert.deepEqual(
			second.kept.map((a) => a.id),
			["anime", "wallpaper"],
		);
		assert.deepEqual(second.conflicts, []);
	});

	it("空输入返回空结果", () => {
		const { kept, conflicts } = excludeManualConflicts([], ["x"]);
		assert.deepEqual(kept, []);
		assert.deepEqual(conflicts, []);
	});
});

describe("resolveMetaCover", () => {
	const toUrl = (key: string) => `https://cdn.example.com/${key}`;

	it("未提供时不返回封面", () => {
		assert.equal(resolveMetaCover(undefined, "root/anime/", toUrl), undefined);
	});

	it("完整 http(s) 地址原样返回", () => {
		assert.equal(
			resolveMetaCover("https://other.com/a.jpg", "root/anime/", toUrl),
			"https://other.com/a.jpg",
		);
	});

	it("相对文件名拼到相册前缀上（修正只写文件名会 404 的问题）", () => {
		assert.equal(
			resolveMetaCover("cover.jpg", "root/anime/", toUrl),
			"https://cdn.example.com/root/anime/cover.jpg",
		);
	});

	it("容忍前缀缺少尾斜杠与文件名前置的 ./", () => {
		assert.equal(
			resolveMetaCover("./cover.webp", "root/anime", toUrl),
			"https://cdn.example.com/root/anime/cover.webp",
		);
	});
});
