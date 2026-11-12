import { parseYaml, stringifyYaml } from "obsidian";

import { SkillDraft, skillDraftSchema } from "../../types/skill.types";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

// Mirrors TODO.md §9.2/§9.3: frontmatter holds metadata, the body is
// `# Instructions` plus optional `# Output` / `# Examples` sections. No
// `permissions` block yet — there's no Permission Manager to consume it
// until the runtime (V0.1 F-110/F-208) exists, so persisting one now would
// just be a field nothing reads.
export function serializeSkill(draft: SkillDraft): string {
	const frontmatter: Record<string, unknown> = {
		id: draft.id,
		name: draft.name,
		description: draft.description,
		icon: draft.icon,
		version: draft.version,
	};
	if (draft.category) frontmatter.category = draft.category;
	frontmatter.context = draft.context;
	frontmatter.tools = draft.tools;
	frontmatter.output = draft.output;

	const sections = [`# Instructions\n\n${draft.instructions.trim()}`];
	if (draft.outputNote?.trim()) sections.push(`# Output\n\n${draft.outputNote.trim()}`);
	if (draft.examples?.trim()) sections.push(`# Examples\n\n${draft.examples.trim()}`);

	return `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\n\n${sections.join("\n\n")}\n`;
}

function extractSection(body: string, heading: string): string | undefined {
	const re = new RegExp(`^#\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n#\\s+\\w|$)`, "mi");
	const match = body.match(re);
	return match?.[1]?.trim() || undefined;
}

export function parseSkillFile(raw: string): SkillDraft | null {
	const match = raw.match(FRONTMATTER_RE);
	if (!match) return null;
	const [, frontmatterRaw, body] = match;

	let frontmatter: unknown;
	try {
		frontmatter = parseYaml(frontmatterRaw);
	} catch {
		return null;
	}
	if (typeof frontmatter !== "object" || frontmatter === null) return null;

	const instructions = extractSection(body, "Instructions");
	const outputNote = extractSection(body, "Output");
	const examples = extractSection(body, "Examples");

	const candidate = {
		...(frontmatter as Record<string, unknown>),
		context: (frontmatter as Record<string, unknown>).context ?? ["note", "selection"],
		tools: (frontmatter as Record<string, unknown>).tools ?? [],
		instructions,
		outputNote,
		examples,
	};

	const result = skillDraftSchema.safeParse(candidate);
	return result.success ? result.data : null;
}
