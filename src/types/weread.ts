// 微信读书官方 Agent API 的数据类型定义
// 接口文档见 https://i.weread.qq.com/api/agent/gateway（POST，Bearer WEREAD_API_KEY）

// /shelf/sync 回包
export type WeReadShelf = {
	books: WeReadBook[];
	// 专辑/有声书，与 books 完全独立
	albums?: WeReadAlbum[];
	// 文章收藏目录入口；非空表示书架有 1 个"文章收藏"条目
	mp?: {
		show: number;
		book?: WeReadBook;
	};
};

export type WeReadBook = {
	bookId: string;
	title: string;
	author?: string;
	cover?: string;
	category?: string;
	// 是否读完（1 = 读完）
	finishReading?: number;
	// 是否私密阅读（1 = 私密）
	secret?: number;
	// 最近阅读时间（Unix 秒）
	readUpdateTime?: number;
	deepLink?: string;
};

export type WeReadAlbum = {
	albumInfo: {
		albumId: string;
		name: string;
		authorName?: string;
		cover?: string;
		// 是否完结（1 = 完结）
		finish?: number;
	};
	albumInfoExtra?: {
		secret?: number;
		// 最近收听时间（Unix 秒）
		lectureReadUpdateTime?: number;
	};
};

// /readdata/detail 回包（字段按需取用，接口按 mode 可选返回）
export type WeReadStats = {
	// 当前周期总阅读/收听时长（秒）
	totalReadTime?: number;
	// 有效阅读天数（单日满 1 分钟）
	readDays?: number;
	readStat?: WeReadStatItem[];
};

export type WeReadStatItem = {
	// 统计项名称：读过 / 读完 / 阅读 / 笔记
	stat: string;
	// 统计值文案，如 "12本"、"45天"
	counts: string;
};

// /book/getprogress 回包
export type WeReadProgress = {
	bookId: string;
	// 进度数据在 book 子对象中；progress 为阅读进度百分比，负数或缺失表示无法确定
	book?: {
		progress?: number;
	};
};

// 页面消费的展示模型：书架条目（书籍与有声书归一化后同构）
export type WeReadDisplayItem = {
	bookId: string;
	title: string;
	author?: string;
	cover?: string;
	finished: boolean;
	secret: boolean;
	// 最近阅读/收听时间（Unix 秒）
	readUpdateTime?: number;
	// 阅读进度百分比（0-100），undefined 表示无法确定
	progress?: number;
	deepLink?: string;
	// 来自文章收藏入口（mp）的条目，不是真实书籍，没有阅读进度
	isMpEntry?: boolean;
};
