import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterImageObjects, toObjectUrl, toUrlsFileContent } from "./sync-oss-core.ts";

// 注意：这些是纯函数测试，不依赖网络，也不依赖 OSS SDK

describe("toObjectUrl", () => {
	it("用 https + 自定义域名 + region 拼接对象 URL", () => {
		assert.equal(
			toObjectUrl("images.gallery.example.com", "oss-cn-hangzhou", "my-bucket", "albums/summer/01.jpg"),
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
			toObjectUrl("img.example.com", "oss-cn-hangzhou", "b", "/albums/x/01.webp"),
			"https://img.example.com/albums/x/01.webp",
		);
	});

	it("key 中的中文与空格按路径段编码", () => {
		assert.equal(
			toObjectUrl("img.example.com", "oss-cn-hangzhou", "b", "albums/我的照片/01 号.jpg"),
			"https://img.example.com/albums/%E6%88%91%E7%9A%84%E7%85%A7%E7%89%87/01%20%E5%8F%B7.jpg",
		);
	});

	it("已有百分号编码的 key 不会被双重编码", () => {
		assert.equal(
			toObjectUrl("img.example.com", "oss-cn-hangzhou", "b", "albums/my%20photo.jpg"),
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
