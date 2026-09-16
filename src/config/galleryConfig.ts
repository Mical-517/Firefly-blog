// 相册配置
//
// 相册来源有两处，合并后展示：
//   1. galleryOssAlbums —— 由 `pnpm sync-oss --discover` 自动发现（见 gallery-oss.generated.ts）
//   2. manualAlbums —— 在本文件下方手写，用于不在 OSS 里、或需要覆盖 OSS 元数据的相册
// 同 id 时手写条目优先。

import type { GalleryAlbum, GalleryConfig } from "@/types/config";
import { galleryOssAlbums } from "./gallery-oss.generated.ts";

// 手写相册列表
// 支持 jpg/png/webp/avif/gif 格式
// id: 相册唯一标识符（用于目录命名和URL路径），对应 public/gallery/<id>/ 目录
// cover: 手动指定封面图（可选，不填会把 cover.* 文件作为封面图，如果没有 cover.* 文件，则使用第一张图片作为封面图）
// description: 相册描述
// location: 相册拍摄地点
// date: 相册日期，格式为 YYYY-MM-DD，用于排序和显示
// tags: 相册标签，用于分类和过滤
// password: 访问密码，设置后需要输入密码才能查看相册内容（可选）
// passwordHint: 密码提示，设置后在输入密码错误时显示（可选，需配合 password 使用）
export const manualAlbums: GalleryAlbum[] = [];

const manualIds = new Set(manualAlbums.map((a) => a.id));

// 相册配置
export const galleryConfig: GalleryConfig = {
	albums: [
		...manualAlbums,
		...galleryOssAlbums.filter((a) => !manualIds.has(a.id)),
	],

	// 瀑布流最小列宽(px)，浏览器根据容器宽度自动计算列数，默认 240
	// 值越小列数越多，值越大列数越少
	columnWidth: 240,
};
