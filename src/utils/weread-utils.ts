import type {
	WeReadAlbum,
	WeReadBook,
	WeReadDisplayItem,
	WeReadProgress,
	WeReadShelf,
	WeReadStats,
} from "@/types/weread";

// 微信读书官方 Agent API 网关。POST，Bearer 鉴权，业务参数平铺在 body 顶层，
// 每次请求必须带 skill_version（与官方 skill 文档保持一致）。
const WEREAD_GATEWAY = "https://i.weread.qq.com/api/agent/gateway";
const WEREAD_SKILL_VERSION = "1.0.4";

type GatewayRequest = {
	api_name: string;
	skill_version: string;
	[key: string]: unknown;
};

async function callGateway<T>(
	apiKey: string,
	request: GatewayRequest,
): Promise<T> {
	const response = await fetch(WEREAD_GATEWAY, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(request),
	});
	if (!response.ok) {
		throw new Error(
			`[WeRead] 接口 ${request.api_name} 请求失败 (HTTP ${response.status})`,
		);
	}
	const data = (await response.json()) as T & { errcode?: number };
	// errcode 非 0 表示业务错误
	if (typeof data.errcode === "number" && data.errcode !== 0) {
		throw new Error(
			`[WeRead] 接口 ${request.api_name} 返回错误 (errcode ${data.errcode})`,
		);
	}
	return data;
}

// 书架条目是否读完：书籍看 finishReading，有声书看 albumInfo.finish
export function isItemFinished(
	book: Partial<WeReadBook> | undefined,
	album: WeReadAlbum | undefined,
): boolean {
	if (book) return book.finishReading === 1;
	if (album) return album.albumInfo.finish === 1;
	return false;
}

// 书架条目是否私密阅读：mp 文章收藏入口固定视为私密
export function isItemSecret(
	book: Partial<WeReadBook> | undefined,
	album: WeReadAlbum | undefined,
): boolean {
	if (book) return book.secret === 1;
	if (album) return album.albumInfoExtra?.secret === 1;
	return true;
}

// 书架条目的最近阅读/收听时间（Unix 秒）
export function itemReadUpdateTime(
	book: WeReadBook | undefined,
	album: WeReadAlbum | undefined,
): number | undefined {
	if (book) return book.readUpdateTime;
	if (album) return album.albumInfoExtra?.lectureReadUpdateTime;
	return undefined;
}

// mp（文章收藏入口）归一化为一条展示条目
function mpDisplayItem(
	book: WeReadBook | undefined,
): WeReadDisplayItem | undefined {
	if (!book) return undefined;
	return {
		bookId: book.bookId,
		title: book.title,
		author: book.author,
		cover: book.cover,
		finished: false,
		secret: true,
		readUpdateTime: book.readUpdateTime,
		deepLink: book.deepLink,
		isMpEntry: true,
	};
}

// 把书架回包归一化为展示条目列表（书籍 + 有声书 + 文章收藏入口）
export function normalizeShelf(shelf: WeReadShelf): WeReadDisplayItem[] {
	const items: WeReadDisplayItem[] = (shelf.books ?? []).map((book) => ({
		bookId: book.bookId,
		title: book.title,
		author: book.author,
		cover: book.cover,
		finished: isItemFinished(book, undefined),
		secret: isItemSecret(book, undefined),
		readUpdateTime: itemReadUpdateTime(book, undefined),
		deepLink: book.deepLink,
	}));

	for (const album of shelf.albums ?? []) {
		items.push({
			bookId: album.albumInfo.albumId,
			title: album.albumInfo.name,
			author: album.albumInfo.authorName,
			cover: album.albumInfo.cover,
			finished: isItemFinished(undefined, album),
			secret: isItemSecret(undefined, album),
			readUpdateTime: itemReadUpdateTime(undefined, album),
		});
	}

	const mpItem = mpDisplayItem(shelf.mp?.book);
	if (shelf.mp && mpItem) {
		items.push(mpItem);
	}

	return items;
}

// 按展示策略过滤书架：showPrivate=false 时剔除私密阅读条目
export function filterShelfItems(
	items: WeReadDisplayItem[],
	showPrivate: boolean,
): WeReadDisplayItem[] {
	if (showPrivate) return items;
	return items.filter((item) => !item.secret);
}

// 在读 = 未读完，按最近阅读时间降序；读完 = 已读完，按最近阅读时间降序
export function splitReadingStatus(items: WeReadDisplayItem[]): {
	reading: WeReadDisplayItem[];
	finished: WeReadDisplayItem[];
} {
	const byRecent = (a: WeReadDisplayItem, b: WeReadDisplayItem) =>
		(b.readUpdateTime ?? 0) - (a.readUpdateTime ?? 0);
	return {
		reading: items.filter((item) => !item.finished).sort(byRecent),
		finished: items.filter((item) => item.finished).sort(byRecent),
	};
}

// 从阅读统计摘要中取出"读完"条目的本数，如 "12本" -> 12
export function finishedCountFromStats(
	stats: WeReadStats | undefined,
): number | undefined {
	const item = stats?.readStat?.find((entry) => entry.stat === "读完");
	if (!item) return undefined;
	const match = item.counts.match(/(\d+)/);
	return match ? Number.parseInt(match[1], 10) : undefined;
}

// 拉取整个模块需要的全部数据。apiKey 缺失或任一接口失败时返回 undefined，
// 页面据此展示占位提示，不阻塞构建。
export async function fetchWeReadData(apiKey: string | undefined): Promise<
	| {
			items: WeReadDisplayItem[];
			stats: WeReadStats | undefined;
	  }
	| undefined
> {
	if (!apiKey) {
		console.warn("[WeRead] 未配置 WEREAD_API_KEY，跳过数据获取");
		return undefined;
	}

	try {
		const shelf = await callGateway<WeReadShelf>(apiKey, {
			api_name: "/shelf/sync",
			skill_version: WEREAD_SKILL_VERSION,
		});
		const items = normalizeShelf(shelf);

		// 在读书目有限，逐本查进度；读完的书不需要进度。单本失败不影响整体。
		// mp（文章收藏入口）不是真实书籍，查询进度只会失败（HTTP 499），跳过。
		const reading = items.filter((item) => !item.finished && !item.isMpEntry);
		const progresses = await Promise.allSettled(
			reading.map((item) =>
				callGateway<WeReadProgress>(apiKey, {
					api_name: "/book/getprogress",
					bookId: item.bookId,
					skill_version: WEREAD_SKILL_VERSION,
				}),
			),
		);
		for (let i = 0; i < reading.length; i++) {
			const result = progresses[i];
			if (result.status === "fulfilled") {
				// progress 位于回包 book 子对象，为负数时表示无有效进度
				const value = result.value.book?.progress;
				if (typeof value === "number" && value >= 0) {
					reading[i].progress = value;
				}
			} else {
				console.warn(
					`[WeRead] 获取《${reading[i].title}》进度失败:`,
					result.reason,
				);
			}
		}

		// 阅读统计失败不阻塞书架展示
		let stats: WeReadStats | undefined;
		try {
			stats = await callGateway<WeReadStats>(apiKey, {
				api_name: "/readdata/detail",
				mode: "monthly",
				skill_version: WEREAD_SKILL_VERSION,
			});
		} catch (error) {
			console.warn("[WeRead] 获取阅读统计失败:", error);
		}

		return { items, stats };
	} catch (error) {
		console.error("[WeRead] 获取书架数据失败:", error);
		return undefined;
	}
}
