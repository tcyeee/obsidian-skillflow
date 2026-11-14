import { Menu } from "obsidian";
import type { MouseEvent } from "react";

import { OUTPUT_MODE_LABELS, PERMISSION_LEVEL_INFO, TOOL_INFO, computePermissionLevel } from "../../constants/skill-tools";
import { ContextKind, Skill } from "../../types/skill.types";
import { ObsidianIcon } from "../common/ObsidianIcon";

const CONTEXT_KIND_LABELS: Record<ContextKind, string> = {
	note: "当前笔记",
	selection: "选中内容",
	frontmatter: "Frontmatter",
	links: "链接笔记",
};

type SkillDetailSectionProps = {
	skill: Skill;
	onBack: () => void;
	onEdit: (skill: Skill) => void;
	onDuplicate: (skill: Skill) => void;
	onDelete: (skill: Skill) => void;
};

// The destination of SkillsSection's row click — a read-only view of
// everything a SKILL.md carries, mirroring CreateSkillModal's DraftCard but
// for a saved skill rather than an in-progress draft. Editing still happens
// in the Markdown file itself (via "编辑 Markdown"); this page is for
// reviewing what a skill does before running it or handing it to someone
// else, not a second form to keep in sync with the file.
export function SkillDetailSection({ skill, onBack, onEdit, onDuplicate, onDelete }: SkillDetailSectionProps) {
	const level = computePermissionLevel(skill.tools);

	const openMenu = (event: MouseEvent) => {
		const menu = new Menu();
		menu.addItem((item) =>
			item.setTitle("编辑 Markdown").setIcon("pencil").onClick(() => onEdit(skill)),
		);
		menu.addItem((item) =>
			item.setTitle("复制").setIcon("copy").onClick(() => onDuplicate(skill)),
		);
		menu.addSeparator();
		menu.addItem((item) =>
			item.setTitle("删除").setIcon("trash-2").setWarning(true).onClick(() => onDelete(skill)),
		);
		menu.showAtMouseEvent(event.nativeEvent);
	};

	return (
		<div className="skillflow-skill-detail">
			<div className="skillflow-skill-detail__header">
				<button
					type="button"
					className="clickable-icon skillflow-skill-detail__back"
					aria-label="返回"
					onClick={onBack}
				>
					<ObsidianIcon icon="arrow-left" />
				</button>
				<div className="skillflow-skill-detail__header-title">{skill.name}</div>
				<button
					type="button"
					className="clickable-icon skillflow-skill-detail__menu"
					aria-label="Skill actions"
					onClick={openMenu}
				>
					<ObsidianIcon icon="more-vertical" />
				</button>
			</div>

			<div className="skillflow-draft-card skillflow-skill-detail__card">
				<div className="skillflow-draft-card__head">
					<div className="skillflow-draft-card__icon">
						<ObsidianIcon icon={skill.icon} />
					</div>
					<div className="skillflow-draft-card__title">
						<div className="skillflow-draft-card__name">{skill.name}</div>
						<div className="skillflow-draft-card__desc">{skill.description}</div>
					</div>
				</div>

				<div className="skillflow-draft-card__badges">
					<span className="skillflow-chip">{OUTPUT_MODE_LABELS[skill.output.mode]}</span>
					<span className="skillflow-chip">{skill.output.confirm === "diff" ? "写入前需确认 diff" : "直接写入"}</span>
					{skill.category && <span className="skillflow-chip">{skill.category}</span>}
					{skill.context.map((kind) => (
						<span key={kind} className="skillflow-chip">
							{CONTEXT_KIND_LABELS[kind]}
						</span>
					))}
					<span
						className="skillflow-permission-badge"
						data-level={level}
						title={
							skill.tools.length
								? skill.tools.map((tool) => TOOL_INFO[tool].label).join("、")
								: PERMISSION_LEVEL_INFO[level].desc
						}
					>
						{PERMISSION_LEVEL_INFO[level].label}
					</span>
				</div>

				{!!skill.riskNotes?.length && (
					<div className="skillflow-draft-card__risk">
						<ObsidianIcon icon="shield-alert" className="skillflow-draft-card__risk-icon" />
						<ul>
							{skill.riskNotes.map((note, i) => (
								<li key={i}>{note}</li>
							))}
						</ul>
					</div>
				)}

				<div>
					<div className="skillflow-draft-card__section-label">Instructions</div>
					<pre>{skill.instructions}</pre>
				</div>

				{skill.outputNote && (
					<div>
						<div className="skillflow-draft-card__section-label">Output</div>
						<pre>{skill.outputNote}</pre>
					</div>
				)}

				{skill.examples && (
					<div>
						<div className="skillflow-draft-card__section-label">Examples</div>
						<pre>{skill.examples}</pre>
					</div>
				)}

				<div className="skillflow-draft-card__meta">
					id: {skill.id} · v{skill.version} · {skill.filePath}
				</div>
			</div>
		</div>
	);
}
