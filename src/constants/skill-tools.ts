import { PermissionLevel, ToolName } from "../types/skill.types";

// Authoritative copy of TODO.md §10.3 trimmed to V0.1/V0.2 tools, paired with
// SKILL_CREATION_GUIDE.md §5's permission mapping so the UI and the wizard
// prompt stay in sync with a single source.
export const TOOL_INFO: Record<ToolName, { label: string; permissionLevel: PermissionLevel }> = {
	read_note: { label: "读取指定笔记", permissionLevel: "L1" },
	list_links: { label: "列出链接笔记", permissionLevel: "L1" },
	search_vault: { label: "搜索 Vault", permissionLevel: "L1" },
	edit_note: { label: "修改其他笔记", permissionLevel: "L2" },
	create_note: { label: "新建笔记", permissionLevel: "L2" },
};

export const PERMISSION_LEVEL_INFO: Record<PermissionLevel, { label: string; desc: string }> = {
	L0: { label: "L0 · 当前笔记", desc: "只读当前笔记/选区，仅弹窗展示或 diff 写回当前笔记，无需额外授权。" },
	L1: { label: "L1 · 扩展读取", desc: "读取链接笔记或搜索 Vault，首次执行需弹窗授权。" },
	L2: { label: "L2 · 创建与写入", desc: "新建笔记或修改其他笔记，首次执行需弹窗授权，每次写入仍需 diff 确认。" },
};

export function computePermissionLevel(tools: ToolName[]): PermissionLevel {
	let level: PermissionLevel = "L0";
	for (const tool of tools) {
		const toolLevel = TOOL_INFO[tool].permissionLevel;
		if (toolLevel === "L2") return "L2";
		if (toolLevel === "L1") level = "L1";
	}
	return level;
}

export const OUTPUT_MODE_LABELS: Record<string, string> = {
	replace_target: "替换选区/全文",
	insert_after: "插入到后面",
	append: "追加到文末",
	new_note: "新建笔记",
	modal: "仅弹窗展示",
};
