// OSS 相册同步的核心纯函数：URL 拼接、图片过滤、urls.txt 内容生成、相册发现与元数据解析。
// 不依赖网络与 OSS SDK，便于单元测试。

export const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
	".jpg",
	".jpeg",
	".png",
	".webp",
	".avif",
	".gif",
]);

/** 相册元数据文件名，存放在每个相册目录内。 */
export const META_FILE_NAME: string = "meta.json";

export interface OssObject {
	key: string;
}

/** 自动发现相册的元数据；字段与 GalleryAlbum 对齐，但 id 由目录名决定，不在此处。 */
export interface OssAlbumMeta {
	name: string;
	description?: string;
	date?: string;
	location?: string;
	tags?: string[];
	cover?: string;
	password?: string;
	passwordHint?: string;
}

/**
 * 将 OSS 对象 key 拼接为完整 URL。优先使用自定义域名（CDN），否则回退 bucket 域名。
 * region 形如 oss-cn-hangzhou（与 OSS_REGION 一致）。
 * key 是 OSS 原始 key（可能含中文/空格），按路径段逐段编码，已有的 %XX 转义保持原样。
 */
export function toObjectUrl(
	domain: string,
	region: string,
	bucket: string,
	key: string,
): string {
	const normalizedKey = key.startsWith("/") ? key.slice(1) : key;
	const encodedKey = normalizedKey
		.split("/")
		.map((seg) => encodeSegment(seg))
		.join("/");
	const base = domain
		? `https://${domain}`
		: `https://${bucket}.${region}.aliyuncs.com`;
	return `${base}/${encodedKey}`;
}

/** 对单个路径段编码，已存在的 %XX 转义序列保持原样，避免双重编码。 */
function encodeSegment(segment: string): string {
	return segment.replace(/[^%]|%(?![0-9A-Fa-f]{2})/g, (ch) =>
		ch === "%" ? "%25" : encodeURIComponent(ch),
	);
}

/** 只保留图片扩展名的对象，大小写不敏感。 */
export function filterImageObjects(objects: OssObject[]): OssObject[] {
	return objects.filter((obj) => {
		const ext = obj.key.slice(obj.key.lastIndexOf(".")).toLowerCase();
		return IMAGE_EXTENSIONS.has(ext);
	});
}

/** 生成 urls.txt 的内容：注释头部 + 每行一个 URL。 */
export function toUrlsFileContent(urls: string[]): string {
	const header = [
		"# 该文件由 scripts/sync-oss-gallery.ts 自动生成，请勿手动编辑",
		"# 每行一个图片 URL，支持 jpg/png/webp/avif/gif 后缀",
		"# 重新同步：pnpm sync-oss",
		"",
	];
	return [...header, ...urls, ""].join("\n");
}

/**
 * 从子目录前缀列表中提取自动发现相册的 id。
 * 只认相册根的直接子目录（更深层级不计），结果去重并按名称排序。
 */
export function discoverAlbumIds(
	rootPrefix: string,
	folderPrefixes: string[],
): string[] {
	const root = rootPrefix.endsWith("/") ? rootPrefix : `${rootPrefix}/`;
	const names = folderPrefixes
		.filter((p) => p.startsWith(root))
		.map((p) => p.slice(root.length).replace(/\/+$/, ""))
		.filter((name) => name !== "" && !name.includes("/"));
	return [...new Set(names)].sort();
}

/**
 * 从相册根下一张图片的文件名里提取相册 id。
 * 约定：相册 id 是文件名开头的连续小写字母（遇到数字/大写/下划线/连字符即停止），
 * 例如 "anime20260921122149911.png" → "anime"、"anime-ZOSYzq….png" → "anime"。
 * 没有小写字母前缀（数字或大写开头）时返回 null，归不进任何相册。
 */
export function albumIdFromFileName(key: string): string | null {
	const fileName = key.slice(key.lastIndexOf("/") + 1);
	const dot = fileName.lastIndexOf(".");
	const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
	const match = /^[a-z]+/.exec(stem);
	return match ? match[0] : null;
}

/**
 * 从相册根下的对象清单中提取自动发现相册的 id。
 * 相册 = 根下图片文件名的公共前缀（见 albumIdFromFileName），子目录层级不再参与。
 */
export function discoverAlbumIdsFromKeys(
	rootPrefix: string,
	keys: string[],
): string[] {
	const root = rootPrefix.endsWith("/") ? rootPrefix : `${rootPrefix}/`;
	const ids = keys
		.filter((key) => key.startsWith(root) && !key.slice(root.length).includes("/"))
		.map((key) => albumIdFromFileName(key))
		.filter((id): id is string => id !== null);
	return [...new Set(ids)].sort();
}

/**
 * 解析相册元数据文件内容。缺失、非法 JSON 或字段类型不符时回退。
 * id 由目录名决定，元数据里的 id 字段一律忽略。
 */
export function parseAlbumMeta(
	raw: string | null,
	fallbackName: string,
): OssAlbumMeta {
	if (!raw) return { name: fallbackName };

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { name: fallbackName };
	}
	if (typeof parsed !== "object" || parsed === null) {
		return { name: fallbackName };
	}

	const source = parsed as Record<string, unknown>;
	const meta: OssAlbumMeta = {
		name:
			typeof source.name === "string" && source.name
				? source.name
				: fallbackName,
	};
	for (const field of [
		"description",
		"date",
		"location",
		"cover",
		"password",
		"passwordHint",
	] as const) {
		const value = source[field];
		if (typeof value === "string" && value) meta[field] = value;
	}
	if (Array.isArray(source.tags)) {
		const tags = source.tags.filter(
			(t): t is string => typeof t === "string" && t !== "",
		);
		if (tags.length > 0) meta.tags = tags;
	}
	return meta;
}

/**
 * 把 meta.json 里的 cover 解析为可用的图片 URL。
 * 已是 http(s) 的完整地址原样返回；否则视为相册目录下的文件名，拼到相册前缀上。
 */
export function resolveMetaCover(
	cover: string | undefined,
	albumPrefix: string,
	toUrl: (key: string) => string,
): string | undefined {
	if (!cover) return undefined;
	if (/^https?:\/\//i.test(cover)) return cover;
	const prefix = albumPrefix.endsWith("/") ? albumPrefix : `${albumPrefix}/`;
	return toUrl(`${prefix}${cover.replace(/^\.?\//, "")}`);
}

/**
 * 剔除与手写相册同 id 的自动发现相册（手写优先）。
 * 只应拿「手写相册 id」来比对，不能拿合并后的全量清单，否则会把上次生成的结果也当成手写而全部剔除。
 */
export function excludeManualConflicts<T extends { id: string }>(
	discovered: readonly T[],
	manualIds: readonly string[],
): { kept: T[]; conflicts: string[] } {
	const manual = new Set(manualIds);
	const kept: T[] = [];
	const conflicts: string[] = [];
	for (const album of discovered) {
		if (manual.has(album.id)) conflicts.push(album.id);
		else kept.push(album);
	}
	return { kept, conflicts };
}

/** 生成自动发现相册的 TS 文件内容；JSON 是合法 TS 表达式，故直接序列化。 */
export function buildGeneratedAlbumsFile(albums: readonly unknown[]): string {
	const body = JSON.stringify(albums, null, "\t");
	return [
		"// 本文件由 scripts/sync-oss-gallery.ts --discover 自动生成，请勿手动编辑",
		"// 重新生成：pnpm sync-oss --discover",
		'import type { GalleryAlbum } from "@/types/config";',
		"",
		`export const galleryOssAlbums: GalleryAlbum[] = ${body};`,
		"",
	].join("\n");
}
