import { App, TFolder } from "obsidian";

import { Skill, SkillDraft } from "../../types/skill.types";

import { parseSkillFile, serializeSkill } from "./skillFile";

// TODO.md §9.1: user skills live at `<Vault>/SkillFlow/skills/<id>/SKILL.md`,
// one folder per skill so it can later carry attachments. This registry only
// does what the create wizard and the management list need (list / save /
// duplicate / delete); watching the vault for external edits (F-101's hot
// reload) is separate, future work.
//
// Deliberately NOT a dot-prefixed folder (the original `.skillflow/skills`):
// Obsidian's Vault API (getAbstractFileByPath, TFolder.children, vault.create,
// fileManager.trashFile) does not index paths under a dot-prefixed folder —
// same reason core needs a dedicated `vault.configDir` getter instead of just
// looking up ".obsidian". Skills saved there wrote fine via the adapter but
// never showed up in this list, and couldn't be opened as a note. A visible
// top-level folder keeps everything (list refresh, open-in-editor, trash)
// working through the normal Vault API.
const SKILLS_ROOT = "SkillFlow/skills";

function skillFolderPath(id: string): string {
	return `${SKILLS_ROOT}/${id}`;
}

function skillFilePath(id: string): string {
	return `${skillFolderPath(id)}/SKILL.md`;
}

async function ensureFolder(app: App, path: string): Promise<void> {
	if (app.vault.getAbstractFileByPath(path)) return;
	const segments = path.split("/");
	let current = "";
	for (const segment of segments) {
		current = current ? `${current}/${segment}` : segment;
		if (!app.vault.getAbstractFileByPath(current)) {
			await app.vault.createFolder(current);
		}
	}
}

export async function listSkills(app: App): Promise<Skill[]> {
	const root = app.vault.getAbstractFileByPath(SKILLS_ROOT);
	if (!(root instanceof TFolder)) return [];

	const skills: Skill[] = [];
	for (const child of root.children) {
		if (!(child instanceof TFolder)) continue;
		const filePath = `${child.path}/SKILL.md`;
		const file = app.vault.getAbstractFileByPath(filePath);
		if (!file) continue;
		try {
			const raw = await app.vault.adapter.read(filePath);
			const draft = parseSkillFile(raw);
			if (!draft) {
				console.warn(`SkillFlow: failed to parse ${filePath}, skipping.`);
				continue;
			}
			skills.push({ ...draft, filePath, folderPath: child.path });
		} catch (error) {
			console.warn(`SkillFlow: failed to read ${filePath}`, error);
		}
	}
	return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function skillIdExists(skills: Skill[], id: string): boolean {
	return skills.some((skill) => skill.id === id);
}

/** Writes a new skill to disk. Caller must ensure `draft.id` doesn't already exist. */
export async function saveNewSkill(app: App, draft: SkillDraft): Promise<Skill> {
	const folderPath = skillFolderPath(draft.id);
	const filePath = skillFilePath(draft.id);
	await ensureFolder(app, folderPath);
	await app.vault.create(filePath, serializeSkill(draft));
	return { ...draft, filePath, folderPath };
}

/** Overwrites an existing skill's file in place (id unchanged). */
export async function updateSkill(app: App, skill: Skill, draft: SkillDraft): Promise<Skill> {
	const file = app.vault.getAbstractFileByPath(skill.filePath);
	if (!file) throw new Error(`SkillFlow: ${skill.filePath} no longer exists.`);
	await app.vault.adapter.write(skill.filePath, serializeSkill(draft));
	return { ...draft, filePath: skill.filePath, folderPath: skill.folderPath };
}

export async function deleteSkill(app: App, skill: Skill): Promise<void> {
	const folder = app.vault.getAbstractFileByPath(skill.folderPath);
	if (folder) await app.fileManager.trashFile(folder);
}

/** Clones a skill under a fresh id/name so the user can tweak a copy without touching the original. */
export async function duplicateSkill(app: App, skill: Skill, existingSkills: Skill[]): Promise<Skill> {
	let suffix = 2;
	let newId = `${skill.id}-copy`;
	while (skillIdExists(existingSkills, newId)) {
		newId = `${skill.id}-copy-${suffix}`;
		suffix += 1;
	}
	const draft: SkillDraft = { ...skill, id: newId, name: `${skill.name} (副本)` };
	return saveNewSkill(app, draft);
}
