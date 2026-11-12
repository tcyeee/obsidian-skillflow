import { App, Menu, Notice, TFile } from "obsidian";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import { PERMISSION_LEVEL_INFO, computePermissionLevel } from "../../constants/skill-tools";
import { useSettings } from "../../contexts/settings-context";
import { BUILTIN_SKILLS } from "../../core/skills/builtins";
import { deleteSkill, duplicateSkill, listSkills } from "../../core/skills/registry";
import type SkillFlowPlugin from "../../main";
import { Skill } from "../../types/skill.types";
import { isProviderReady } from "../../utils/llm/provider-ready";
import { ObsidianIcon } from "../common/ObsidianIcon";

import { CreateSkillModal } from "./CreateSkillModal";

type SkillsSectionProps = {
	app: App;
	plugin: SkillFlowPlugin;
	onRequestProvidersTab: () => void;
};

async function openSkillFile(app: App, skill: Skill): Promise<void> {
	const file = app.vault.getAbstractFileByPath(skill.filePath);
	if (!(file instanceof TFile)) {
		new Notice("找不到该 Skill 的文件，可能已被移动或删除。");
		return;
	}
	(app as App & { setting: { close: () => void } }).setting?.close();
	await app.workspace.getLeaf(false).openFile(file);
}

// Mirrors ProvidersSection's identity-list + "+" action pattern, but the list
// comes from the file-based skill registry (TODO.md §9.1), not plugin.settings
// — skills are files, not plugin data.
export function SkillsSection({ app, plugin, onRequestProvidersTab }: SkillsSectionProps) {
	const { settings } = useSettings();
	const [skills, setSkills] = useState<Skill[] | null>(null);

	const refresh = useCallback(() => {
		void listSkills(app).then(setSkills);
	}, [app]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const hasReadyProvider = settings.providers.some(isProviderReady);

	const handleDelete = (skill: Skill) => {
		void (async () => {
			await deleteSkill(app, skill);
			new Notice(`已删除 "${skill.name}"`);
			refresh();
		})();
	};

	const handleDuplicate = (skill: Skill) => {
		void (async () => {
			if (!skills) return;
			await duplicateSkill(app, skill, skills);
			new Notice(`已复制 "${skill.name}"`);
			refresh();
		})();
	};

	const openRowMenu = (event: MouseEvent, skill: Skill) => {
		event.stopPropagation();
		const menu = new Menu();
		menu.addItem((item) =>
			item.setTitle("编辑 Markdown").setIcon("pencil").onClick(() => void openSkillFile(app, skill)),
		);
		menu.addItem((item) =>
			item.setTitle("复制").setIcon("copy").onClick(() => handleDuplicate(skill)),
		);
		menu.addSeparator();
		menu.addItem((item) =>
			item.setTitle("删除").setIcon("trash-2").setWarning(true).onClick(() => handleDelete(skill)),
		);
		menu.showAtMouseEvent(event.nativeEvent);
	};

	const openCreateModal = () => {
		if (!hasReadyProvider) return;
		new CreateSkillModal(app, plugin, skills ?? [], refresh).open();
	};

	return (
		<div className="skillflow-skills">
			<div className="skillflow-skills__header">
				<div>
					<div className="skillflow-skills__title">Skills</div>
					<div className="skillflow-skills__desc">
						用一句话描述需求，AI 帮你生成可一键执行的 Skill。
					</div>
				</div>
				<button
					type="button"
					className="mod-cta skillflow-skills__add"
					disabled={!hasReadyProvider}
					onClick={openCreateModal}
				>
					<ObsidianIcon icon="plus" />
					新建 Skill
				</button>
			</div>

			{!hasReadyProvider && (
				<div className="skillflow-skills__nudge">
					<ObsidianIcon icon="plug-zap" />
					<span>创建 Skill 需要先配置一个可用的模型 Provider。</span>
					<button type="button" className="skillflow-skills__nudge-action" onClick={onRequestProvidersTab}>
						去添加 Provider
					</button>
				</div>
			)}

			{skills === null ? (
				<div className="skillflow-skills__empty">加载中…</div>
			) : (
				<ul className="skillflow-skill-list">
					{BUILTIN_SKILLS.map((builtin) => (
						<li key={builtin.id} className="skillflow-skill-row skillflow-skill-row--locked">
							<ObsidianIcon icon="lock" className="skillflow-skill-row__lock" />
							<div className="skillflow-skill-row__icon">
								<ObsidianIcon icon={builtin.icon} className="skillflow-skill-row__icon-svg" />
							</div>
							<div className="skillflow-skill-row__main">
								<div className="skillflow-skill-row__name">{builtin.name}</div>
								<div className="skillflow-skill-row__desc">{builtin.description}</div>
							</div>
							<div
								className="skillflow-permission-badge"
								data-level="L0"
								title={PERMISSION_LEVEL_INFO.L0.desc}
							>
								{PERMISSION_LEVEL_INFO.L0.label}
							</div>
						</li>
					))}
					{skills.length === 0 && (
						<li className="skillflow-skill-row skillflow-skill-row--empty">
							<div className="skillflow-skill-row__main">
								<div className="skillflow-skill-row__desc">
									还没有自定义 Skill，点击"新建 Skill"，用一句话描述你想要的自动化操作。
								</div>
							</div>
						</li>
					)}
					{skills.map((skill) => {
						const level = computePermissionLevel(skill.tools, skill.output.mode);
						return (
							<li key={skill.id} className="skillflow-skill-row" onClick={() => void openSkillFile(app, skill)}>
								<div className="skillflow-skill-row__icon">
									<ObsidianIcon icon={skill.icon} className="skillflow-skill-row__icon-svg" />
								</div>
								<div className="skillflow-skill-row__main">
									<div className="skillflow-skill-row__name">{skill.name}</div>
									<div className="skillflow-skill-row__desc">{skill.description}</div>
								</div>
								<div
									className="skillflow-permission-badge"
									data-level={level}
									title={PERMISSION_LEVEL_INFO[level].desc}
								>
									{PERMISSION_LEVEL_INFO[level].label}
								</div>
								<button
									type="button"
									className="clickable-icon skillflow-skill-row__menu"
									aria-label="Skill actions"
									onClick={(event) => openRowMenu(event, skill)}
								>
									<ObsidianIcon icon="more-vertical" />
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
