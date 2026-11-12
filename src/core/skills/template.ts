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
			return value === undefined ? "" : String(value);
		}
		return match;
	});
}
