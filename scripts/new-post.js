/**
 * 创建新文章的 Markdown 文件，自动生成 frontmatter
 *
 * 用法：
 *   pnpm new-post 文章名.md                     → 默认创建技术记录
 *   pnpm new-post 文章名.md --group thoughts     → 创建感想记录（生活文章）
 *   pnpm new-post 文章名.md --group tech          → 创建技术记录
 */

import fs from "fs"
import path from "path"

function getDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const args = process.argv.slice(2)

if (args.length === 0) {
console.error(`错误：未提供文件名参数
用法：pnpm new-post <文件名> [选项]

选项：
  --group thoughts | tech  内容分组，默认 tech`)
  process.exit(1)
}

let group = undefined

const positionalArgs = []
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === "--group" && i + 1 < args.length) {
    const val = args[i + 1]
    if (val === "thoughts" || val === "tech") {
      group = val
      i++
    } else {
      console.error(`错误：--group 必须是 "thoughts" 或 "tech"，收到 "${val}"`)
      process.exit(1)
    }
  } else {
    positionalArgs.push(arg)
  }
}

if (positionalArgs.length === 0) {
  console.error(`错误：未提供文件名参数`)
  process.exit(1)
}

let fileName = positionalArgs[0]

// Add .md extension if not present
const fileExtensionRegex = /\.(md|mdx)$/i
if (!fileExtensionRegex.test(fileName)) {
  fileName += ".md"
}

const targetDir = "./src/content/posts/"
const fullPath = path.join(targetDir, fileName)

if (fs.existsSync(fullPath)) {
  console.error(`错误：文件 ${fullPath} 已存在`)
  process.exit(1)
}

// recursive mode creates multi-level directories
const dirPath = path.dirname(fullPath)
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
}

// 未指定 group 时默认 tech
const finalGroup = group || "tech"

// 构建 frontmatter
const frontmatter = [
  `title: ${positionalArgs[0]}`,
  `published: ${getDate()}`,
  `description: ''`,
  `image: ''`,
  `tags: []`,
  `category: ''`,
  `group: ${finalGroup}`,
  `draft: false`,
  `lang: ''`,
].filter(Boolean).join("\n")

const content = `---\n${frontmatter}\n---\n`

fs.writeFileSync(path.join(targetDir, fileName), content)

const groupLabel = finalGroup === "thoughts" ? "感想记录" : "技术记录"
console.log(`✅ 已创建文章（${groupLabel}）：${fullPath}`)
