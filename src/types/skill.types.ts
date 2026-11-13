import { z } from "zod";

// Field definitions mirror TODO.md §9.2 (frontmatter) and §10.3/§10.4 (tools,
// output modes), trimmed to what V0.1/V0.2 actually offers. `http_request`
// and script execution are intentionally absent — SKILL_CREATION_GUIDE.md §9
// forbids generating a draft that declares either before V0.3/V1.0.
export const contextKindSchema = z.enum(["note", "selection", "frontmatter", "links"]);
export type ContextKind = z.infer<typeof contextKindSchema>;

export const toolNameSchema = z.enum([
	"read_note",
	"list_links",
	"search_vault",
	"edit_note",
	"create_note",
]);
export type ToolName = z.infer<typeof toolNameSchema>;

export const permissionLevelSchema = z.enum(["L0", "L1", "L2"]);
export type PermissionLevel = z.infer<typeof permissionLevelSchema>;

export const outputModeSchema = z.enum([
	"replace_target",
	"insert_after",
	"append",
	"new_note",
	"modal",
]);
export type OutputMode = z.infer<typeof outputModeSchema>;

export const confirmModeSchema = z.enum(["diff", "none"]);
export type ConfirmMode = z.infer<typeof confirmModeSchema>;

export const skillOutputSchema = z.object({
	mode: outputModeSchema,
	confirm: confirmModeSchema,
	path: z.string().optional(),
});
export type SkillOutput = z.infer<typeof skillOutputSchema>;

// A draft is everything a saved SKILL.md needs except where it lives on disk.
export const skillDraftSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().min(1),
	icon: z.string().min(1),
	category: z.string().optional(),
	version: z.string().min(1),
	context: z.array(contextKindSchema).min(1),
	tools: z.array(toolNameSchema),
	output: skillOutputSchema,
	instructions: z.string().min(1),
	outputNote: z.string().optional(),
	examples: z.string().optional(),
	// Flagged by the drafting model per SKILL_CREATION_GUIDE.md §3.3 when the
	// request contains words like "delete"/"all notes"/"upload" — rendered as
	// a standalone warning block rather than folded into the normal metadata.
	riskNotes: z.array(z.string()).optional(),
});
export type SkillDraft = z.infer<typeof skillDraftSchema>;

export type Skill = SkillDraft & {
	/** Vault-relative path to the SKILL.md file, e.g. `SkillFlow/skills/translate-note/SKILL.md`. */
	filePath: string;
	/** Vault-relative path to the skill's folder. */
	folderPath: string;
};
