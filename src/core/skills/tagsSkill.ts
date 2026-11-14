import { App, MarkdownView, Notice } from "obsidian";

import { LLMProvider } from "../../types/provider.types";

import { ConfirmDiffModal } from "../../components/execution/ConfirmDiffModal";
import { createLLMProvider } from "../llm/manager";
import { requireModel } from "./wizard";
import { BUILTIN_ORGANIZE_TAGS_META } from "./builtins";

function normalizeTag(tag: string): string {
	return tag.trim().replace(/^#/, "").replace(/\s+/g, "-");
}

function parseTagsField(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String);
	if (typeof value === "string") {
		return value
			.split(/[,，\n]/)
			.map((tag) => tag.trim())
			.filter(Boolean);
	}
	return [];
}

function extractTagList(text: string): string[] {
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = (fenced ? fenced[1] : text).trim();
	try {
		const parsed = JSON.parse(candidate);
		if (Array.isArray(parsed)) return parsed.map(String);
	} catch {
		// Not JSON — fall back to treating the response as a plain delimited list.
	}
	return candidate
		.split(/[,，\n]/)
		.map((tag) => tag.trim())
		.filter(Boolean);
}

/** Case-insensitive de-dupe that keeps each tag's first-seen casing. */
function mergeTags(existing: string[], suggested: string[]): string[] {
	const seen = new Map<string, string>();
	for (const tag of [...existing, ...suggested]) {
		const key = tag.toLowerCase();
		if (!seen.has(key)) seen.set(key, tag);
	}
	return [...seen.values()];
}

// Specialized because its output is frontmatter.tags, not note body text —
// the generic replace_target/insert_after/append modes in ./runtime.ts don't
// apply, and merging needs real dedupe logic rather than a free-form LLM
// text replacement.
export async function runOrganizeTagsSkill(app: App, provider: LLMProvider): Promise<void> {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view || !view.file) {
		new Notice("请先打开一篇笔记。");
		return;
	}
	const file = view.file;
	const note = view.editor.getValue();
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
	const existingTags = parseTagsField(frontmatter.tags).map(normalizeTag);

	const notice = new Notice("正在分析笔记内容生成标签…", 0);
	let suggested: string[];
	try {
		const llm = createLLMProvider(provider);
		const response = await llm.generateResponse({
			model: requireModel(provider),
			messages: [
				{
					role: "system",
					content:
						"你负责为 Obsidian 笔记生成标签。只输出一个 JSON 字符串数组，不要输出任何其他文字或解释，不要用 markdown 代码块包裹。标签要简短（1-4 个词或字），能概括笔记主题，3 到 8 个，不要重复，不要包含 # 前缀。标签必须使用笔记正文所使用的语言（笔记是中文就用中文标签，是英文就用英文标签，是其他语言就用那种语言），不要擅自翻译成别的语言；已有标签仅供参考主题，其语言不应覆盖笔记正文的语言判断。",
				},
				{
					role: "user",
					content: `笔记标题: ${file.basename}\n已有标签: ${existingTags.join(", ") || "无"}\n\n笔记内容:\n${note}`,
				},
			],
			temperature: 0.2,
			maxTokens: 500,
		});
		suggested = extractTagList(response.content).map(normalizeTag).filter(Boolean);
	} catch (error) {
		notice.hide();
		new Notice(`生成标签失败: ${error instanceof Error ? error.message : String(error)}`);
		return;
	}
	notice.hide();

	const merged = mergeTags(existingTags, suggested);
	const unchanged =
		merged.length === existingTags.length && merged.every((tag, i) => tag === existingTags[i]);
	if (unchanged) {
		new Notice("没有发现新的标签，笔记保持不变。");
		return;
	}

	new ConfirmDiffModal(
		app,
		BUILTIN_ORGANIZE_TAGS_META.name,
		existingTags.join(", ") || "(无)",
		merged.join(", "),
		() => {
			void app.fileManager
				.processFrontMatter(file, (fm) => {
					fm.tags = merged;
				})
				.then(() => new Notice("已更新标签。"));
		},
	).open();
}
