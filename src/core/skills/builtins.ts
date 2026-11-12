import { Skill } from "../../types/skill.types";

// The two default status-bar menu entries (TODO.md §8.2's "固定的 Skills").
// Modeled as ordinary Skill values (not files) so the same execution runtime
// that runs user-created Skills can run this one unmodified.
export const BUILTIN_FIX_SPELLING: Skill = {
	id: "builtin-fix-spelling",
	name: "笔记拼接纠错",
	description: "检查并修正当前笔记（或选区）中的错别字、标点与语法问题",
	icon: "spell-check",
	version: "1.0.0",
	context: ["note", "selection"],
	tools: [],
	output: { mode: "replace_target", confirm: "diff" },
	instructions:
		"检查下面内容中的错别字、标点符号误用和语法问题，并直接修正：\n\n{{target}}\n\n要求：\n- 保留原有 Markdown 结构、代码块、链接和专有名词不变。\n- 不要改变原意或写作风格，只修正明显的错误。\n- 只输出修正后的完整内容，不要输出任何解释、总结或改动说明。",
	filePath: "",
	folderPath: "",
};

// 自动整理标签 doesn't fit the generic instructions->replace-body model (it
// edits frontmatter.tags, not the note body), so it only needs its menu
// metadata here — the actual run lives in ./tagsSkill.ts.
export const BUILTIN_ORGANIZE_TAGS_META = {
	id: "builtin-organize-tags",
	name: "自动整理标签",
	description: "阅读笔记内容，自动生成/补全标签，去重合并后写入 frontmatter 的 tags 字段",
	icon: "tags",
};

// Display metadata for the "Manage skills" list in SkillsSection — both
// builtins are fixed status-bar entries, not files, so they're listed
// read-only (locked icon, no edit/duplicate/delete menu) alongside
// user-created Skills rather than going through the file-backed registry.
export type BuiltinSkillMeta = {
	id: string;
	name: string;
	description: string;
	icon: string;
};

export const BUILTIN_SKILLS: BuiltinSkillMeta[] = [
	{
		id: BUILTIN_FIX_SPELLING.id,
		name: BUILTIN_FIX_SPELLING.name,
		description: BUILTIN_FIX_SPELLING.description,
		icon: BUILTIN_FIX_SPELLING.icon,
	},
	{
		id: BUILTIN_ORGANIZE_TAGS_META.id,
		name: BUILTIN_ORGANIZE_TAGS_META.name,
		description: BUILTIN_ORGANIZE_TAGS_META.description,
		icon: BUILTIN_ORGANIZE_TAGS_META.icon,
	},
];
