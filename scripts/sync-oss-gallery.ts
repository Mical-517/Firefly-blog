// 同步阿里云 OSS 相册到站点。
//
// 两种模式：
//   1) 发现模式（推荐）：扫描相册根下的图片，文件名前缀 = 相册
//      （anime2026….png → anime 相册；历史子目录 anime/xxx.png 同样按前缀归属）
//      pnpm sync-oss --discover
//   2) 手动模式：指定相册 id 或同步全部，按 <前缀>/<id>/ 取图
//      pnpm sync-oss --album <id> [--prefix <前缀>]
//      pnpm sync-oss --all
//
// 凭据与配置通过 .env 提供（示例见 .env.example）：
//   OSS_REGION / OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET
//   OSS_DOMAIN        可选，自定义 CDN 域名；不填则用 bucket 默认域名
//   OSS_GALLERY_ROOT  可选，相册根前缀（发现模式的扫描起点），默认 picture/favorites
//   OSS_ALBUM_PREFIX  可选，手动模式的文件前缀，默认 albums
//
// 发现模式产出：
//   - public/gallery/<相册id>/urls.txt          每个相册的图片 URL 清单
//   - src/config/gallery-oss.generated.ts       自动发现相册的清单（供 galleryConfig 合并）
//
// 这些文件会被 src/utils/gallery-utils.ts 的 scanAlbumPhotos() 读取并合并到相册展示。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OSS from "ali-oss";
import { manualAlbums } from "../src/config/galleryConfig.ts";
import {
	buildGeneratedAlbumsFile,
	excludeManualConflicts,
	filterImageObjects,
	IMAGE_EXTENSIONS,
	META_FILE_NAME,
	type OssObject,
	parseAlbumMeta,
	albumIdFromFileName,
	toObjectUrl,
	toUrlsFileContent,
} from "./sync-oss-core.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const GALLERY_DIR = path.join(PROJECT_ROOT, "public", "gallery");
const GENERATED_FILE = path.join(
	PROJECT_ROOT,
	"src",
	"config",
	"gallery-oss.generated.ts",
);

/** 解析后的 OSS 连接上下文，避免各处重复读取与断言环境变量。 */
interface OssContext {
	client: OSS;
	region: string;
	bucket: string;
	domain: string;
}

// ---------- 参数解析 ----------
interface CliOptions {
	albumId?: string;
	all: boolean;
	discover: boolean;
	prefix?: string;
	domain?: string;
	help: boolean;
}

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {
		all: false,
		discover: false,
		help: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case "--album":
				options.albumId = argv[++i];
				break;
			case "--all":
				options.all = true;
				break;
			case "--discover":
				options.discover = true;
				break;
			case "--prefix":
				options.prefix = argv[++i];
				break;
			case "--domain":
				options.domain = argv[++i];
				break;
			case "--help":
			case "-h":
				options.help = true;
				break;
			default:
				throw new Error(`未知参数: ${arg}`);
		}
	}
	return options;
}

function printHelp(): void {
	console.log(`
同步阿里云 OSS 相册到站点

用法:
  pnpm sync-oss --discover [选项]              扫描相册根，文件名前缀 = 相册
  pnpm sync-oss --album <相册id> [选项]        同步指定相册
  pnpm sync-oss --all [选项]                   同步手写相册

选项:
  --discover        发现模式：扫描 OSS_GALLERY_ROOT 下所有图片，文件名前缀 = 相册
  --album <id>      相册 id（对应 public/gallery/<id>/ 目录）
  --all             同步手写相册（manualAlbums）里所有相册
  --prefix <key>    手动模式的 OSS 前缀（默认 '<OSS_ALBUM_PREFIX>/<id>'）
  --domain <域名>   OSS 自定义 CDN 域名（默认取 .env 的 OSS_DOMAIN）
  -h, --help        显示帮助

环境变量（.env）:
  OSS_REGION, OSS_BUCKET, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_DOMAIN,
  OSS_GALLERY_ROOT（发现模式，默认 picture/favorites）, OSS_ALBUM_PREFIX（手动模式，默认 albums）

相册约定:
  相册 = 相册根下图片文件名的公共前缀（anime2026….png → anime 相册）。
  建议图片直接放在相册根下；历史子目录（anime/xxx.png）也兼容，按文件名前缀归属。

相册元数据:
  在相册根放 <相册id>.meta.json 可自定义名称/描述/日期/标签等；缺失时用相册 id。
  兼容旧位置：<相册id>/${META_FILE_NAME}。
`);
}

// ---------- .env 加载 ----------
function loadEnvFile(): void {
	const envPath = path.join(PROJECT_ROOT, ".env");
	if (fs.existsSync(envPath)) {
		process.loadEnvFile(envPath);
	}
}

// ---------- OSS 辅助 ----------
function requireOssContext(domainOverride: string | undefined): OssContext {
	const region = process.env.OSS_REGION;
	const bucket = process.env.OSS_BUCKET;
	const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
	const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;

	if (!region || !bucket || !accessKeyId || !accessKeySecret) {
		throw new Error(
			"缺少 OSS 凭据。请在 .env 中配置 OSS_REGION / OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET（参考 .env.example）。",
		);
	}

	return {
		region,
		bucket,
		domain: domainOverride || process.env.OSS_DOMAIN || "",
		client: new OSS({
			region: region.startsWith("oss-") ? region : `oss-${region}`,
			bucket,
			accessKeyId,
			accessKeySecret,
		}),
	};
}

/** 列出前缀下当前层级的对象与子目录；recursive 为 false 时不进入更深层级。 */
async function listObjects(
	client: OSS,
	prefix: string,
	recursive: boolean,
): Promise<{ objects: OssObject[]; folders: string[] }> {
	const objects: OssObject[] = [];
	const folders: string[] = [];
	let continuationToken: string | undefined;
	do {
		const result = await client.listV2(
			{
				prefix,
				...(recursive ? {} : { delimiter: "/" }),
				"max-keys": 1000,
				...(continuationToken
					? { "continuation-token": continuationToken }
					: {}),
			},
			{},
		);
		// OSS SDK 的对象 key 字段名为 name；目录占位对象（以 / 结尾）不计入
		for (const obj of result.objects || []) {
			if (!obj.name.endsWith("/")) objects.push({ key: obj.name });
		}
		folders.push(...(result.prefixes || []));
		continuationToken = result.nextContinuationToken;
	} while (continuationToken);
	return { objects, folders };
}

/** 读取文本对象内容；不存在时返回 null。 */
async function readTextObject(
	client: OSS,
	key: string,
): Promise<string | null> {
	try {
		const result = await client.get(key);
		return result.content.toString("utf-8");
	} catch (error) {
		const code = (error as { code?: string }).code;
		if (code === "NoSuchKey" || code === "NoSuchObject") return null;
		throw error;
	}
}

/**
 * 把一组对象中的图片写成某相册的 urls.txt。
 * 返回写入的图片数量；为 0 时表示该目录无图片，不写文件。
 */
function writeAlbumFromObjects(
	ctx: OssContext,
	albumId: string,
	objects: OssObject[],
): number {
	const images = filterImageObjects(objects);
	if (images.length === 0) return 0;

	const urls = images
		.map((obj) => toObjectUrl(ctx.domain, ctx.region, ctx.bucket, obj.key))
		.sort();

	const albumDir = path.join(GALLERY_DIR, albumId);
	fs.mkdirSync(albumDir, { recursive: true });
	fs.writeFileSync(
		path.join(albumDir, "urls.txt"),
		toUrlsFileContent(urls),
		"utf-8",
	);
	return urls.length;
}

/**
 * 回收某相册的本地目录（其 OSS 目录已无图片）。
 * 只在目录里只剩自动生成的 urls.txt 时删除，避免误删用户放进来的本地图片。
 */
function removeAlbumDirIfGeneratedOnly(albumId: string): boolean {
	const albumDir = path.join(GALLERY_DIR, albumId);
	if (!fs.existsSync(albumDir)) return false;

	const entries = fs.readdirSync(albumDir);
	if (entries.length === 0 || entries.every((e) => e === "urls.txt")) {
		fs.rmSync(albumDir, { recursive: true, force: true });
		return true;
	}
	return false;
}

// ---------- 发现模式 ----------
// 相册约定：相册 = 相册根下图片文件名的公共前缀（如 anime2026….png → anime）。
// 相册根下的子目录不做特殊处理；子目录里的图片会被列出，但其文件名前缀决定归属
// （历史遗留的 anime/xxx.png 也会归入 anime 相册，实现平滑迁移）。
// 相册元数据放在相册根：<相册id>.meta.json（此前是 <相册id>/meta.json，仍兼容读取）。
async function runDiscover(ctx: OssContext, rootPrefix: string): Promise<void> {
	const root = rootPrefix.endsWith("/") ? rootPrefix : `${rootPrefix}/`;
	console.log(`发现模式：扫描相册根 oss://${ctx.bucket}/${root}`);

	// 递归列出相册根下全部对象（子目录视为普通前缀，不再单独成相册）
	const { objects: allObjects } = await listObjects(ctx.client, root, true);
	const images = filterImageObjects(allObjects);

	// 文件名前缀 → 相册 id；无法提取前缀（数字开头等）的图片归不入任何相册
	const byAlbum = new Map<string, OssObject[]>();
	let ungrouped = 0;
	for (const obj of images) {
		const albumId = albumIdFromFileName(obj.key);
		if (!albumId) {
			ungrouped++;
			continue;
		}
		const bucket = byAlbum.get(albumId);
		if (bucket) bucket.push(obj);
		else byAlbum.set(albumId, [obj]);
	}

	if (ungrouped > 0) {
		console.warn(
			`  提示：相册根下有 ${ungrouped} 张图片文件名无字母前缀，未归入任何相册（相册 = 文件名前缀，如 anime2026….png → anime）。`,
		);
	}

	if (byAlbum.size === 0) {
		console.warn("  相册根下没有可识别的图片，未发现任何相册。");
	}

	const discovered: Array<{ id: string } & ReturnType<typeof parseAlbumMeta>> =
		[];

	for (const [albumId, albumObjects] of byAlbum) {
		console.log(
			`  相册 [${albumId}] <- ${albumObjects.length} 张图片（文件名前缀匹配）`,
		);

		try {
			const count = writeAlbumFromObjects(ctx, albumId, albumObjects);
			console.log(`    已写入 ${count} 个图片 URL`);

			// 元数据：<相册id>.meta.json（新约定）；兼容旧位置 <相册id>/meta.json
			let metaRaw = await readTextObject(
				ctx.client,
				`${root}${albumId}.meta.json`,
			);
			if (metaRaw === null) {
				metaRaw = await readTextObject(
					ctx.client,
					`${root}${albumId}/${META_FILE_NAME}`,
				);
			}
			const meta = parseAlbumMeta(metaRaw, albumId);
			if (meta.cover) {
				// cover 已是完整 URL 原样保留；是文件名时视为相册根下的文件
				meta.cover = /^https?:\/\//i.test(meta.cover)
					? meta.cover
					: toObjectUrl(
							ctx.domain,
							ctx.region,
							ctx.bucket,
							`${root}${meta.cover.replace(/^\.?\//, "")}`,
						);
			}

			discovered.push({ id: albumId, ...meta });
		} catch (error) {
			console.error(`    相册 [${albumId}] 同步失败:`, error);
		}
	}

	// 手写相册优先：同 id 的自动发现相册被舍弃。
	// 注意只拿手写条目比对——生成清单里的 id 不算手写，否则重复运行会自我吞噬。
	const { kept, conflicts } = excludeManualConflicts(
		discovered,
		manualAlbums.map((a) => a.id),
	);
	for (const id of conflicts) {
		console.warn(
			`  相册 [${id}] 与手写相册同 id，保留手写条目，自动发现结果被忽略。`,
		);
	}

	fs.writeFileSync(GENERATED_FILE, buildGeneratedAlbumsFile(kept), "utf-8");
	console.log(`  已写入 ${kept.length} 个自动发现相册 -> ${GENERATED_FILE}`);
}

// ---------- 手动模式 ----------
async function runManual(
	ctx: OssContext,
	albumIds: string[],
	prefixOverride: string | undefined,
): Promise<void> {
	const defaultPrefix = process.env.OSS_ALBUM_PREFIX || "albums";

	for (const albumId of albumIds) {
		const prefix = prefixOverride ?? `${defaultPrefix}/${albumId}`;
		console.log(`正在同步相册 [${albumId}] <- oss://${ctx.bucket}/${prefix}`);

		// 单个相册失败不中断整批同步
		try {
			const { objects } = await listObjects(ctx.client, prefix, true);
			const count = writeAlbumFromObjects(ctx, albumId, objects);

			if (count === 0) {
				removeAlbumDirIfGeneratedOnly(albumId);
				console.warn(
					`  未在该前缀下找到图片（支持: ${[...IMAGE_EXTENSIONS].join(", ")}），跳过写入。`,
				);
				continue;
			}
			console.log(`  已写入 ${count} 个图片 URL`);
		} catch (error) {
			console.error(`  相册 [${albumId}] 同步失败:`, error);
		}
	}
}

// ---------- 主流程 ----------
async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));

	if (options.help) {
		printHelp();
		return;
	}

	if (options.discover && (options.albumId || options.all)) {
		throw new Error("--discover 不能与 --album / --all 同时使用。");
	}
	if (options.discover && options.prefix) {
		throw new Error(
			"--discover 不使用 --prefix；相册根请配置 OSS_GALLERY_ROOT。",
		);
	}

	loadEnvFile();
	const ctx = requireOssContext(options.domain);

	if (options.discover) {
		const rootPrefix = process.env.OSS_GALLERY_ROOT || "picture/favorites";
		await runDiscover(ctx, rootPrefix);
		console.log("同步完成。");
		return;
	}

	const albumIds = options.albumId
		? [options.albumId]
		: options.all
			? manualAlbums.map((a) => a.id)
			: [];

	if (albumIds.length === 0) {
		console.error(
			"请用 --discover 发现相册，或用 --album <id> / --all 手动同步。",
		);
		printHelp();
		process.exitCode = 1;
		return;
	}

	await runManual(ctx, albumIds, options.prefix);
	console.log("同步完成。");
}

main().catch((error) => {
	console.error("同步失败:", error);
	process.exitCode = 1;
});
