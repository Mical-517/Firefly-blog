// OSS 相册同步的核心纯函数：URL 拼接、图片过滤、urls.txt 内容生成。
// 不依赖网络与 OSS SDK，便于单元测试。

export const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
	".jpg",
	".jpeg",
	".png",
	".webp",
	".avif",
	".gif",
]);

export interface OssObject {
	key: string;
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
