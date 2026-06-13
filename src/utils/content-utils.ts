import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl, getGroupedCategoryUrl } from "@utils/url-utils";

export type PostGroup = "thoughts" | "tech";
export type PostType = "post" | "note";

export type ContentQuery = {
	includeNotes?: boolean;
	group?: PostGroup;
	category?: string;
	tag?: string;
	uncategorized?: boolean;
};

export type GroupInfo = {
	key: PostGroup;
	name: string;
	count: number;
	url: string;
};

export type GroupedCategory = {
	name: string;
	count: number;
	group: PostGroup;
	groupName: string;
	url: string;
};

export type NoteDateGroup = {
	dateKey: string;
	date: Date;
	label: string;
	items: CollectionEntry<"posts">[];
};

export type NoteAdjacentPosts = {
	prev: CollectionEntry<"posts"> | null;
	next: CollectionEntry<"posts"> | null;
};

function getGroupName(group: PostGroup): string {
	return group === "thoughts" ? i18n(I18nKey.thoughts) : i18n(I18nKey.techRecords);
}

function normalizeGroup(group?: string | null): PostGroup | undefined {
	if (group === "thoughts" || group === "tech") {
		return group;
	}
	return undefined;
}

function matchesQuery(
	post: CollectionEntry<"posts">,
	query: ContentQuery = {},
): boolean {
	if (!query.includeNotes && post.data.postType === "note") {
		return false;
	}

	if (query.group && post.data.group !== query.group) {
		return false;
	}

	if (query.tag && !post.data.tags.includes(query.tag)) {
		return false;
	}

	if (query.uncategorized) {
		return !post.data.category || post.data.category.trim() === "";
	}

	if (query.category) {
		return (post.data.category || "").trim() === query.category.trim();
	}

	return true;
}

// // Retrieve posts and sort them by publication date
async function getRawSortedPosts(query: ContentQuery = {}) {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const filteredPosts = allBlogPosts.filter((post) => matchesQuery(post, query));

	const sorted = filteredPosts.sort((a, b) => {
		// 首先按置顶状态排序，置顶文章在前
		if (a.data.pinned && !b.data.pinned) return -1;
		if (!a.data.pinned && b.data.pinned) return 1;

		// 如果置顶状态相同，则按发布日期排序
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

export async function getSortedPosts(query: ContentQuery = {}) {
	const sorted = await getRawSortedPosts(query);

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].id;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].id;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}
export type PostForList = {
	id: string;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(
	query: ContentQuery = {},
): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts(query);

	// delete post.body
	const sortedPostsList = sortedFullPosts.map((post) => ({
		id: post.id,
		data: post.data,
	}));

	return sortedPostsList;
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(
	group?: PostGroup,
): Promise<Category[] | GroupedCategory[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const filteredPosts = allBlogPosts.filter((post) => {
		if (post.data.postType === "note") return false;
		if (group) return post.data.group === group;
		return true;
	});

	if (group) {
		const count: { [key: string]: number } = {};
		filteredPosts.forEach((post: { data: { category: string | null } }) => {
			if (!post.data.category) {
				const ucKey = i18n(I18nKey.uncategorized);
				count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
				return;
			}

			const categoryName =
				typeof post.data.category === "string"
					? post.data.category.trim()
					: String(post.data.category).trim();

			count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
		});

		const lst = Object.keys(count).sort((a, b) => {
			return (
				count[b] - count[a] || a.toLowerCase().localeCompare(b.toLowerCase())
			);
		});

		return lst.map((c) => ({
			name: c,
			count: count[c],
			url: getGroupedCategoryUrl(group, c),
		}));
	}

	const count: Record<PostGroup, { [key: string]: number }> = {
		thoughts: {},
		tech: {},
	};
	filteredPosts.forEach((post) => {
		const postGroup = normalizeGroup(post.data.group) || "tech";
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[postGroup][ucKey] = count[postGroup][ucKey]
				? count[postGroup][ucKey] + 1
				: 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[postGroup][categoryName] = count[postGroup][categoryName]
			? count[postGroup][categoryName] + 1
			: 1;
	});

	const ret: GroupedCategory[] = [];
	(["thoughts", "tech"] as PostGroup[]).forEach((postGroup) => {
		const lst = Object.keys(count[postGroup]).sort((a, b) => {
			return (
				count[postGroup][b] - count[postGroup][a] ||
				a.toLowerCase().localeCompare(b.toLowerCase())
			);
		});

		lst.forEach((c) => {
			ret.push({
				name: c,
				count: count[postGroup][c],
				group: postGroup,
				groupName: getGroupName(postGroup),
				url: getGroupedCategoryUrl(postGroup, c),
			});
		});
	});

	return ret;
}

export async function getGroupList(): Promise<GroupInfo[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const counts: Record<PostGroup, number> = {
		thoughts: 0,
		tech: 0,
	};

	allBlogPosts.forEach((post) => {
		if (post.data.postType === "note") return;
		const group = normalizeGroup(post.data.group) || "tech";
		counts[group] += 1;
	});

	return (["thoughts", "tech"] as PostGroup[]).map((group) => ({
		key: group,
		name: getGroupName(group),
		count: counts[group],
		url: `/archive/?group=${group}`,
	}));
}

export async function getNotesList(): Promise<CollectionEntry<"posts">[]> {
	return getRawSortedPosts({ includeNotes: true }).then((posts) =>
		posts.filter((post) => post.data.postType === "note"),
	);
}

function formatNoteDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatNoteDateLabel(date: Date): string {
	return new Intl.DateTimeFormat("zh-CN", {
		year: "numeric",
		month: "long",
		day: "numeric",
		weekday: "long",
	}).format(date);
}

export async function getGroupedNotesByDate(): Promise<NoteDateGroup[]> {
	const notes = await getNotesList();
	const grouped = new Map<string, CollectionEntry<"posts">[]>();

	for (const note of notes) {
		const key = formatNoteDateKey(note.data.published);
		const bucket = grouped.get(key) || [];
		bucket.push(note);
		grouped.set(key, bucket);
	}

	return Array.from(grouped.entries()).map(([dateKey, items]) => ({
		dateKey,
		date: items[0].data.published,
		label: formatNoteDateLabel(items[0].data.published),
		items,
	}));
}

export async function getAdjacentNotes(
	currentId: string,
): Promise<NoteAdjacentPosts> {
	const notes = await getNotesList();
	const currentIndex = notes.findIndex((note) => note.id === currentId);

	if (currentIndex === -1) {
		return { prev: null, next: null };
	}

	return {
		prev: currentIndex < notes.length - 1 ? notes[currentIndex + 1] : null,
		next: currentIndex > 0 ? notes[currentIndex - 1] : null,
	};
}

/**
 * 对标题进行分词，支持中英文混合
 * 使用 Intl.Segmenter 对中文分词，英文按空格分词
 * 过滤标点和空白，英文统一小写
 */
function tokenizeTitle(title: string): Set<string> {
	const tokens = new Set<string>();
	const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
	for (const { segment, isWordLike } of segmenter.segment(title)) {
		if (!isWordLike) continue;
		tokens.add(segment.toLowerCase());
	}
	return tokens;
}

/**
 * 计算两个集合的 Jaccard 相似度
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 0;
	let intersection = 0;
	for (const item of a) {
		if (b.has(item)) intersection++;
	}
	const union = a.size + b.size - intersection;
	return union === 0 ? 0 : intersection / union;
}

/**
 * 获取相关文章推荐
 * 评分公式: totalScore = tagMatchScore + titleSimilarityScore + timeFreshnessScore + categoryBonus
 * - tagMatchScore (0-100): 标签 Jaccard 相似度 × 100
 * - titleSimilarityScore (0-100): 标题分词 Jaccard 相似度 × 100
 * - timeFreshnessScore (0-30): 6 个月半衰期指数衰减
 * - categoryBonus (0 or 10): 同分类加 10 分
 */
export async function getRelatedPosts(
	currentPost: CollectionEntry<"posts">,
	maxCount = 5,
): Promise<PostForList[]> {
	const allPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	// 排除自身和加密文章
	const candidates = allPosts.filter(
		(p) =>
			p.id !== currentPost.id &&
			!p.data.password &&
			p.data.postType !== "note",
	);

	const currentTags = new Set(currentPost.data.tags || []);
	const currentTokens = tokenizeTitle(currentPost.data.title);
	const currentCategory = currentPost.data.category || "";
	const now = Date.now();

	const scored = candidates.map((post) => {
		const postTags = new Set(post.data.tags || []);

		// tagMatchScore (0-100)
		const tagMatchScore = jaccardSimilarity(currentTags, postTags) * 100;

		// titleSimilarityScore (0-100)
		const postTokens = tokenizeTitle(post.data.title);
		const titleSimilarityScore =
			jaccardSimilarity(currentTokens, postTokens) * 100;

		// timeFreshnessScore (0-30): 6 个月半衰期
		const daysSincePublished =
			(now - new Date(post.data.published).getTime()) / (1000 * 60 * 60 * 24);
		const timeFreshnessScore =
			30 * Math.exp((-Math.LN2 * daysSincePublished) / 180);

		// categoryBonus (0 or 10)
		const postCategory = post.data.category || "";
		const categoryBonus =
			currentCategory && postCategory && currentCategory === postCategory
				? 10
				: 0;

		const totalScore =
			tagMatchScore + titleSimilarityScore + timeFreshnessScore + categoryBonus;

		return {
			post,
			totalScore,
			tagMatchScore,
			timeFreshnessScore,
			categoryBonus,
		};
	});

	// 按总分降序排列
	scored.sort((a, b) => b.totalScore - a.totalScore);

	// 优先取有标签匹配的
	const withTagMatch = scored.filter((s) => s.tagMatchScore > 0);
	const withoutTagMatch = scored.filter((s) => s.tagMatchScore === 0);

	const result: PostForList[] = [];

	for (const s of withTagMatch) {
		if (result.length >= maxCount) break;
		result.push({ id: s.post.id, data: s.post.data });
	}

	// 不足时从剩余候选中按 timeFreshnessScore + categoryBonus 降序补充
	if (result.length < maxCount) {
		withoutTagMatch.sort(
			(a, b) =>
				b.timeFreshnessScore +
				b.categoryBonus -
				(a.timeFreshnessScore + a.categoryBonus),
		);
		for (const s of withoutTagMatch) {
			if (result.length >= maxCount) break;
			result.push({ id: s.post.id, data: s.post.data });
		}
	}

	return result;
}
