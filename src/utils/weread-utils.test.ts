import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WeReadShelf, WeReadStats } from "@/types/weread";
import {
	filterShelfItems,
	finishedCountFromStats,
	isItemFinished,
	isItemSecret,
	normalizeShelf,
	splitReadingStatus,
} from "./weread-utils";

// 纯函数测试，不发网络请求

describe("isItemFinished", () => {
	it("书籍 finishReading=1 视为读完", () => {
		assert.equal(isItemFinished({ finishReading: 1 }, undefined), true);
		assert.equal(isItemFinished({ finishReading: 0 }, undefined), false);
		assert.equal(isItemFinished({}, undefined), false);
	});

	it("有声书 albumInfo.finish=1 视为读完", () => {
		assert.equal(
			isItemFinished(undefined, {
				albumInfo: { albumId: "a", name: "x", finish: 1 },
			}),
			true,
		);
		assert.equal(
			isItemFinished(undefined, { albumInfo: { albumId: "a", name: "x" } }),
			false,
		);
	});
});

describe("isItemSecret", () => {
	it("书籍按 secret 字段判断", () => {
		assert.equal(isItemSecret({ secret: 1 }, undefined), true);
		assert.equal(isItemSecret({ secret: 0 }, undefined), false);
		assert.equal(isItemSecret({}, undefined), false);
	});

	it("有声书按 albumInfoExtra.secret 判断", () => {
		assert.equal(
			isItemSecret(undefined, {
				albumInfo: { albumId: "a", name: "x" },
				albumInfoExtra: { secret: 1 },
			}),
			true,
		);
		assert.equal(
			isItemSecret(undefined, { albumInfo: { albumId: "a", name: "x" } }),
			false,
		);
	});
});

describe("normalizeShelf", () => {
	it("书籍与有声书归一化为同构条目", () => {
		const shelf: WeReadShelf = {
			books: [
				{
					bookId: "b1",
					title: "诡秘之主",
					author: "爱潜水的乌贼",
					cover: "https://example.com/c.jpg",
					secret: 1,
					finishReading: 0,
					readUpdateTime: 100,
				},
			],
			albums: [
				{
					albumInfo: {
						albumId: "a1",
						name: "三体广播剧",
						authorName: "演播者",
					},
					albumInfoExtra: { secret: 0, lectureReadUpdateTime: 200 },
				},
			],
		};
		const items = normalizeShelf(shelf);
		assert.equal(items.length, 2);
		assert.deepEqual(
			{
				title: items[0].title,
				finished: items[0].finished,
				secret: items[0].secret,
			},
			{ title: "诡秘之主", finished: false, secret: true },
		);
		assert.deepEqual(
			{
				title: items[1].title,
				finished: items[1].finished,
				secret: items[1].secret,
			},
			{ title: "三体广播剧", finished: false, secret: false },
		);
		assert.equal(items[1].readUpdateTime, 200);
	});

	it("mp 文章收藏入口归一化为一条私密在读条目", () => {
		const shelf: WeReadShelf = {
			books: [],
			mp: { show: 1, book: { bookId: "mpbook", title: "文章收藏" } },
		};
		const items = normalizeShelf(shelf);
		assert.equal(items.length, 1);
		assert.deepEqual(
			{
				title: items[0].title,
				secret: items[0].secret,
				finished: items[0].finished,
				isMpEntry: items[0].isMpEntry,
			},
			{ title: "文章收藏", secret: true, finished: false, isMpEntry: true },
		);
	});
});

describe("filterShelfItems", () => {
	const items = normalizeShelf({
		books: [
			{ bookId: "1", title: "公开书", secret: 0 },
			{ bookId: "2", title: "私密书", secret: 1 },
		],
	});

	it("showPrivate=true 保留全部", () => {
		assert.equal(filterShelfItems(items, true).length, 2);
	});

	it("showPrivate=false 剔除私密条目", () => {
		const filtered = filterShelfItems(items, false);
		assert.equal(filtered.length, 1);
		assert.equal(filtered[0].title, "公开书");
	});
});

describe("splitReadingStatus", () => {
	it("按读完状态分栏，各自按最近阅读时间降序", () => {
		const items = normalizeShelf({
			books: [
				{ bookId: "1", title: "旧在读", finishReading: 0, readUpdateTime: 100 },
				{ bookId: "2", title: "新在读", finishReading: 0, readUpdateTime: 300 },
				{ bookId: "3", title: "新读完", finishReading: 1, readUpdateTime: 200 },
				{ bookId: "4", title: "旧读完", finishReading: 1, readUpdateTime: 50 },
			],
		});
		const { reading, finished } = splitReadingStatus(items);
		assert.deepEqual(
			reading.map((i) => i.title),
			["新在读", "旧在读"],
		);
		assert.deepEqual(
			finished.map((i) => i.title),
			["新读完", "旧读完"],
		);
	});

	it("缺 readUpdateTime 的条目排在最后", () => {
		const items = normalizeShelf({
			books: [
				{ bookId: "1", title: "无时间", finishReading: 0 },
				{ bookId: "2", title: "有时间", finishReading: 0, readUpdateTime: 100 },
			],
		});
		const { reading } = splitReadingStatus(items);
		assert.deepEqual(
			reading.map((i) => i.title),
			["有时间", "无时间"],
		);
	});
});

describe("finishedCountFromStats", () => {
	it("从 readStat 摘要中提取读完本数", () => {
		const stats: WeReadStats = {
			readStat: [
				{ stat: "读过", counts: "12本" },
				{ stat: "读完", counts: "3本" },
			],
		};
		assert.equal(finishedCountFromStats(stats), 3);
	});

	it("没有读完条目时返回 undefined", () => {
		assert.equal(finishedCountFromStats(undefined), undefined);
		assert.equal(finishedCountFromStats({}), undefined);
	});
});
