import { Notice } from "obsidian";
import { useState } from "react";

import { useSettings } from "../../contexts/settings-context";
import { GithubPublishConfig, githubPublishConfigSchema } from "../../types/github.types";
import { ObsidianButton } from "../common/ObsidianButton";
import { ObsidianSetting } from "../common/ObsidianSetting";
import { ObsidianTextInput } from "../common/ObsidianTextInput";

const EMPTY_CONFIG: GithubPublishConfig = { owner: "", repo: "", baseBranch: "main", token: "" };

// Unlike ProvidersSection, this is a single global config, not a list: a
// Skill's `github_pr` output mode always publishes here. The repo and token
// live only in Settings so a Skill (or the AI drafting it) never gets to
// pick the destination — see SKILL_CREATION_GUIDE.md §9's L3 carve-out.
export function GithubSection() {
	const { settings, setSettings } = useSettings();
	const [formData, setFormData] = useState<GithubPublishConfig>(settings.github ?? EMPTY_CONFIG);
	const [saving, setSaving] = useState(false);

	const handleSave = () => {
		const result = githubPublishConfigSchema.safeParse(formData);
		if (!result.success) {
			new Notice(result.error.issues.map((issue) => issue.message).join("\n"));
			return;
		}
		setSaving(true);
		void setSettings({ ...settings, github: result.data })
			.then(() => new Notice("已保存 GitHub 发布设置。"))
			.finally(() => setSaving(false));
	};

	const handleClear = () => {
		setFormData(EMPTY_CONFIG);
		void setSettings({ ...settings, github: undefined });
	};

	return (
		<div className="skillflow-providers">
			<div className="skillflow-providers__header">
				<div>
					<div className="skillflow-providers__title">GitHub 发布</div>
					<div className="skillflow-providers__desc">
						配置后，Skill 才能使用"发布到 GitHub (PR)"输出模式。目标仓库和 Token 对所有 Skill
						统一生效，Skill 本身不能指定发到别的仓库。
					</div>
				</div>
			</div>

			<ObsidianSetting name="Owner" desc="仓库所有者（用户名或组织名）" required>
				<ObsidianTextInput
					value={formData.owner}
					placeholder="octocat"
					onChange={(value) => setFormData((prev) => ({ ...prev, owner: value }))}
				/>
			</ObsidianSetting>

			<ObsidianSetting name="Repo" desc="仓库名" required>
				<ObsidianTextInput
					value={formData.repo}
					placeholder="my-blog"
					onChange={(value) => setFormData((prev) => ({ ...prev, repo: value }))}
				/>
			</ObsidianSetting>

			<ObsidianSetting name="Base branch" desc="PR 的目标分支">
				<ObsidianTextInput
					value={formData.baseBranch}
					placeholder="main"
					onChange={(value) => setFormData((prev) => ({ ...prev, baseBranch: value }))}
				/>
			</ObsidianSetting>

			<ObsidianSetting
				name="Token"
				desc="建议使用只授予该仓库 Contents + Pull requests 写权限的 fine-grained PAT。"
				required
			>
				<ObsidianTextInput
					type="password"
					value={formData.token}
					placeholder="github_pat_..."
					onChange={(value) => setFormData((prev) => ({ ...prev, token: value }))}
				/>
			</ObsidianSetting>

			<ObsidianSetting>
				<ObsidianButton text={saving ? "保存中…" : "保存"} onClick={handleSave} cta />
				{settings.github && <ObsidianButton text="清除配置" onClick={handleClear} warning />}
			</ObsidianSetting>
		</div>
	);
}
