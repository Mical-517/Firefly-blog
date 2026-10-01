import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const postsCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
group: z.enum(["thoughts", "tech"]).optional().default("tech"),
		lang: z.string().optional().default(""),
		pinned: z.boolean().optional().default(false),
		author: z.string().optional().default(""),
		sourceLink: z.string().optional().default(""),
		licenseName: z.string().optional().default(""),
		licenseUrl: z.string().optional().default(""),
		comment: z.boolean().optional().default(true),
		password: z.string().optional().default(""),
		passwordHint: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});

const specCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/spec" }),
	schema: z.object({}),
});

// 百大电影集合：站主的观影记录，每部电影一个条目
// cover: 封面图（建议使用 OSS 图床链接）
// tags: 电影标签，用于页面顶部按标签分类过滤
// post: 可选，关联的观影感受文章路径（如 /posts/肖申克的救赎观影感受/），填写后封面可点击跳转
// link: 可选，预留的外部链接（如百度网盘分享），未来需要时可跳转到网盘
// description: 电影简介，展示在卡片上
const moviesCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/movies" }),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		cover: z.string().default(""),
		tags: z.array(z.string()).optional().default([]),
		post: z.string().optional().default(""),
		link: z.string().optional().default(""),
		description: z.string().optional().default(""),
		draft: z.boolean().optional().default(false),
	}),
});

export const collections = {
	posts: postsCollection,
	spec: specCollection,
	movies: moviesCollection,
};
