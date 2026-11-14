import { MarkdownView } from "obsidian";

// Template variables from TODO.md §9.4, used both to render a human-readable
// preview of what a dry run will send and to actually substitute them before
// calling the model.
export type TemplateVars = {
	note: string;
	selection: string;
	title: string;
	path: string;
	date: string;
	lang: string;
	frontmatter: Record<string, unknown>;
};

/** Builds TemplateVars from the active editor — shared by dry-run preview and real execution. */
export function buildTemplateVars(view: MarkdownView): TemplateVars {
	const file = view.file;
	const frontmatter = file ? view.app.metadataCache.getFileCache(file)?.frontmatter ?? {} : {};
	return {
		note: view.editor.getValue(),
		selection: view.editor.getSelection(),
		title: file?.basename ?? "",
		path: file?.path ?? "",
		date: new Date().toISOString().slice(0, 10),
		lang: "zh",
		frontmatter,
	};
}

export function renderTemplate(instructions: string, vars: TemplateVars): string {
	const target = vars.selection || vars.note;
	return instructions.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
		if (key === "target") return target;
		if (key === "note") return vars.note;
		if (key === "selection") return vars.selection;
		if (key === "title") return vars.title;
		if (key === "path") return vars.path;
		if (key === "date") return vars.date;
		if (key === "lang") return vars.lang;
		if (key.startsWith("frontmatter.")) {
			const field = key.slice("frontmatter.".length);
			const value = vars.frontmatter[field];
			if (value === undefined || value === null) return "";
			if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
				return String(value);
			}
			return JSON.stringify(value);
		}
		return match;
	});
}
