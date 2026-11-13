import { App, MarkdownView, Notice } from "obsidian";

import { LLMProvider } from "../../types/provider.types";
import { Skill } from "../../types/skill.types";

import { ConfirmDiffModal } from "../../components/execution/ConfirmDiffModal";
import { ResultModal } from "../../components/execution/ResultModal";
import { ensureFolder } from "./registry";
import { buildTemplateVars, TemplateVars } from "./template";
import { runDryRun } from "./wizard";

// Implements TODO.md §8.4's execution flow for the modes that don't need the
// (not-yet-built) agentic Tool Executor: a single LLM call against the
// current note's context, then — for modify-class outputs — a diff preview
// gated on skill.output.confirm before anything is written.
export async function executeSkill(app: App, provider: LLMProvider, skill: Skill): Promise<void> {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view || !view.file) {
		new Notice("请先打开一篇笔记。");
		return;
	}

	const vars = buildTemplateVars(view);
	const notice = new Notice(`正在执行 "${skill.name}"…`, 0);
	let result: string;
	try {
		result = await runDryRun(provider, skill, vars);
	} catch (error) {
		notice.hide();
		new Notice(`执行 "${skill.name}" 失败: ${error instanceof Error ? error.message : String(error)}`);
		return;
	}
	notice.hide();

	switch (skill.output.mode) {
		case "modal":
			new ResultModal(app, skill.name, result).open();
			return;
		case "new_note":
			await createResultNote(app, skill, vars, result);
			return;
		case "replace_target":
		case "insert_after":
		case "append":
			applyModifyOutput(app, view, skill, skill.output.mode, vars, result);
			return;
	}
}

function applyModifyOutput(
	app: App,
	view: MarkdownView,
	skill: Skill,
	mode: "replace_target" | "insert_after" | "append",
	vars: TemplateVars,
	result: string,
): void {
	const hasSelection = !!vars.selection;
	const { before, after } = diffPreviewFor(mode, vars, result);

	const write = () => writeModifyOutput(view, mode, hasSelection, result);

	if (skill.output.confirm === "none") {
		write();
		new Notice(`"${skill.name}" 已执行完成。`);
		return;
	}
	new ConfirmDiffModal(app, skill.name, before, after, () => {
		write();
		new Notice(`"${skill.name}" 已写入笔记。`);
	}).open();
}

function diffPreviewFor(
	mode: "replace_target" | "insert_after" | "append",
	vars: TemplateVars,
	result: string,
): { before: string; after: string } {
	const target = vars.selection || vars.note;
	if (mode === "replace_target") return { before: target, after: result };
	if (mode === "insert_after") return { before: target, after: `${target}\n\n${result}` };
	return { before: vars.note, after: `${vars.note}\n\n${result}` };
}

function writeModifyOutput(
	view: MarkdownView,
	mode: "replace_target" | "insert_after" | "append",
	hasSelection: boolean,
	result: string,
): void {
	const editor = view.editor;

	if (mode === "replace_target") {
		if (hasSelection) {
			editor.replaceSelection(result);
		} else {
			const lastLine = editor.lastLine();
			editor.replaceRange(result, { line: 0, ch: 0 }, { line: lastLine, ch: editor.getLine(lastLine).length });
		}
		return;
	}

	if (mode === "insert_after" && hasSelection) {
		editor.replaceRange(`\n\n${result}`, editor.getCursor("to"));
		return;
	}

	// "append", or "insert_after" with no selection (nothing to insert after but the whole note).
	const lastLine = editor.lastLine();
	editor.replaceRange(`\n\n${result}`, { line: lastLine, ch: editor.getLine(lastLine).length });
}

async function createResultNote(app: App, skill: Skill, vars: TemplateVars, result: string): Promise<void> {
	const folder = skill.output.path?.trim().replace(/\/+$/, "");
	const baseName = `${vars.title || "Untitled"} - ${skill.name}`;

	if (folder) await ensureFolder(app, folder);

	let path = `${folder ? `${folder}/` : ""}${baseName}.md`;
	let suffix = 2;
	while (app.vault.getAbstractFileByPath(path)) {
		path = `${folder ? `${folder}/` : ""}${baseName} ${suffix}.md`;
		suffix += 1;
	}

	const file = await app.vault.create(path, result);
	new Notice(`已创建新笔记 "${file.basename}"。`);
	await app.workspace.getLeaf(false).openFile(file);
}
