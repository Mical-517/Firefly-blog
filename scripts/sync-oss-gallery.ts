// 同步阿里云 OSS 相册图片列表到 public/gallery/<album>/urls.txt
//
// 用法：
//   pnpm sync-oss --album <相册id> [--prefix <OSS文件夹前缀>] [--domain <自定义域名>]
//   pnpm sync-oss --all
//
// 凭据通过 .env 提供（示例见 .env.example）：
//   OSS_REGION=oss-cn-hangzhou
//   OSS_BUCKET=my-bucket
//   OSS_ACCESS_KEY_ID=xxx
//   OSS_ACCESS_KEY_SECRET=xxx
//   OSS_DOMAIN=images.example.com   # 可选，自定义 CDN 域名；不填则用 bucket 默认域名
//   OSS_ALBUM_PREFIX=albums          # 可选，OSS 文件夹前缀（相对于 bucket 根）
//
// 逻辑：ListObjects 列出指定前缀下所有对象 → 过滤图片扩展名 → 生成完整 URL → 写回 urls.txt。
// 生成的文件会被 src/utils/gallery-utils.ts 的 scanAlbumPhotos() 读取并合并到相册展示。

import OSS from "ali-oss";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	filterImageObjects,
	IMAGE_EXTENSIONS,
	toObjectUrl,
	toUrlsFileContent,
	type OssObject,
} from "./sync-oss-core.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const GALLERY_DIR = path.join(PROJECT_ROOT, "public", "gallery");

// ---------- 参数解析 ----------
interface CliOptions {
	albumId?: string;
	all: boolean;
	prefix?: string;
	domain?: string;
	help: boolean;
}

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = { all: false, help: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case "--album":
				options.albumId = argv[++i];
				break;
			case "--all":
				options.all = true;
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
同步阿里云 OSS 相册图片列表到 public/gallery/<album>/urls.txt

用法:
  pnpm sync-oss --album <相册id> [选项]
  pnpm sync-oss --all [选项]

选项:
  --album <id>      相册 id（对应 public/gallery/<id>/ 目录）
  --all             同步 galleryConfig.albums 里所有相册
  --prefix <key>    OSS 文件夹前缀（默认取 .env 的 OSS_ALBUM_PREFIX，再默认 'albums/<id>'）
  --domain <域名>   OSS 自定义 CDN 域名（默认取 .env 的 OSS_DOMAIN）
  -h, --help        显示帮助

环境变量（.env）:
  OSS_REGION, OSS_BUCKET, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET,
  OSS_DOMAIN（可选）, OSS_ALBUM_PREFIX（可选）
`);
}

// ---------- .env 加载 ----------
function loadEnvFile(): void {
	const envPath = path.join(PROJECT_ROOT, ".env");
	if (fs.existsSync(envPath)) {
		process.loadEnvFile(envPath);
	}
}

// ---------- OSS 分页列出 ----------
async function listAllObjects(
	client: OSS,
	prefix: string,
): Promise<OssObject[]> {
	const all: OssObject[] = [];
	let continuationToken: string | undefined;
	do {
		const result = await client.listV2(
			{
				prefix,
				"max-keys": 1000,
				...(continuationToken ? { "continuation-token": continuationToken } : {}),
			},
			{},
		);
		// OSS SDK 的对象 key 字段名为 name
		all.push(...(result.objects || []).map((obj) => ({ key: obj.name })));
		continuationToken = result.nextContinuationToken;
	} while (continuationToken);
	return all;
}

// ---------- 相册 id 解析 ----------
function readAlbumIds(): string[] {
	const configPath = path.join(PROJECT_ROOT, "src", "config", "galleryConfig.ts");
	const content = fs.readFileSync(configPath, "utf-8");
	// 定位 albums: [ ... ]，用方括号平衡计数找到真正的数组结束（忽略嵌套的 tags: [...]）
	const start = content.indexOf("albums:");
	if (start < 0) return [];
	const bracketStart = content.indexOf("[", start);
	let depth = 0;
	let end = -1;
	for (let i = bracketStart; i < content.length; i++) {
		if (content[i] === "[") depth++;
		else if (content[i] === "]") {
			depth--;
			if (depth === 0) {
				end = i;
				break;
			}
		}
	}
	if (end < 0) return [];
	const albumsBlock = content.slice(bracketStart, end);
	// 只匹配行首为 id: 的字段（排除 // 注释行），并去重
	const ids = [
		...albumsBlock.matchAll(/^\s*id\s*:\s*["']([^"']+)["']/gm),
	].map((m) => m[1]);
	return [...new Set(ids)];
}

// ---------- 主流程 ----------
async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));

	if (options.help) {
		printHelp();
		return;
	}

	loadEnvFile();

	const region = process.env.OSS_REGION;
	const bucket = process.env.OSS_BUCKET;
	const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
	const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;

	if (!region || !bucket || !accessKeyId || !accessKeySecret) {
		console.error(
			"缺少 OSS 凭据。请在 .env 中配置 OSS_REGION / OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET（参考 .env.example）。",
		);
		process.exitCode = 1;
		return;
	}

	const domain = options.domain || process.env.OSS_DOMAIN;
	const defaultPrefix = process.env.OSS_ALBUM_PREFIX || "albums";

	const albumIds = options.albumId
		? [options.albumId]
		: options.all
			? readAlbumIds()
			: [];

	if (albumIds.length === 0) {
		printHelp();
		process.exitCode = 1;
		return;
	}

	const client = new OSS({
		region: region.startsWith("oss-") ? region : `oss-${region}`,
		bucket,
		accessKeyId,
		accessKeySecret,
	});

	for (const albumId of albumIds) {
		const prefix = options.prefix ?? `${defaultPrefix}/${albumId}`;
		const albumDir = path.join(GALLERY_DIR, albumId);
		fs.mkdirSync(albumDir, { recursive: true });
		const urlsFile = path.join(albumDir, "urls.txt");

		console.log(`正在同步相册 [${albumId}] <- oss://${bucket}/${prefix}`);

		// 单个相册失败不中断整批同步
		try {
			const objects = await listAllObjects(client, prefix);
			const images = filterImageObjects(objects);

			if (images.length === 0) {
				console.warn(
					`  未在 oss://${bucket}/${prefix} 下找到图片（支持: ${[...IMAGE_EXTENSIONS].join(", ")}），跳过写入。`,
				);
				if (fs.existsSync(urlsFile)) {
					console.warn(
						`  注意：${urlsFile} 中的旧远程图片仍在展示，如需清空请手动删除该文件。`,
					);
				}
				continue;
			}

			const urls = images
				.map((obj) => toObjectUrl(domain || "", region, bucket, obj.key))
				.sort();
			fs.writeFileSync(urlsFile, toUrlsFileContent(urls), "utf-8");

			console.log(`  已写入 ${urls.length} 个图片 URL -> ${urlsFile}`);
		} catch (error) {
			console.error(`  相册 [${albumId}] 同步失败:`, error);
		}
	}

	console.log("同步完成。");
}

main().catch((error) => {
	console.error("同步失败:", error);
	process.exitCode = 1;
});
