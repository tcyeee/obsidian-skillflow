import { addIcon, App, Notice, Plugin, setIcon } from "obsidian";
import { StatusBarMenuManager, StatusBarMenuRow } from "./components/common/StatusBarMenu";
import { CreateSkillModal } from "./components/settings/CreateSkillModal";
import type { SettingsTabId } from "./components/settings/SettingsNav";
import { BUILTIN_FIX_SPELLING, BUILTIN_ORGANIZE_TAGS_META } from "./core/skills/builtins";
import { listSkills } from "./core/skills/registry";
import { executeSkill } from "./core/skills/runtime";
import { runOrganizeTagsSkill } from "./core/skills/tagsSkill";
import { SKILLFLOW_ICON_ID, SKILLFLOW_ICON_SVG } from "./icon";
import { SkillFlowSettingTab } from "./settings/SettingTab";
import { DEFAULT_SETTINGS, SkillFlowSettings } from "./settings/schema";
import { LLMProvider } from "./types/provider.types";
import { isProviderReady } from "./utils/llm/provider-ready";

export default class SkillFlowPlugin extends Plugin {
	settings: SkillFlowSettings = DEFAULT_SETTINGS;
	private settingTab: SkillFlowSettingTab | null = null;
	private readonly statusBarMenu = new StatusBarMenuManager();

	async onload() {
		this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<SkillFlowSettings>) };

		addIcon(SKILLFLOW_ICON_ID, SKILLFLOW_ICON_SVG);

		this.settingTab = new SkillFlowSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);

		const statusBarItem = this.addStatusBarItem();
		statusBarItem.addClass("mod-clickable");
		// Stable hook a host plugin can target in CSS to hide this icon after folding
		// `getStatusBarMenuGroups()` into its own menu (see minimalism-ui's styles.css).
		// A CSS rule survives this item being torn down and recreated on reload/toggle,
		// unlike a one-time imperative hide call.
		statusBarItem.addClass("skillflow-status-bar-icon");
		setIcon(statusBarItem, SKILLFLOW_ICON_ID);
		statusBarItem.addEventListener("click", (evt: MouseEvent) =>
			void this.showSkillsMenu(evt.currentTarget as HTMLElement),
		);

		this.addRibbonIcon(SKILLFLOW_ICON_ID, "SkillFlow", (evt: MouseEvent) =>
			void this.showSkillsMenu(evt.currentTarget as HTMLElement),
		);
	}

	onunload() {
		this.statusBarMenu.close();
	}

	/** Persists settings and refreshes the settings tab if it's mounted. */
	async setSettings(newSettings: SkillFlowSettings): Promise<void> {
		this.settings = newSettings;
		await this.saveData(this.settings);
		this.settingTab?.update();
	}

	private async showSkillsMenu(triggerEl: HTMLElement) {
		const groups = await this.getStatusBarMenuGroups();
		this.statusBarMenu.toggle(triggerEl, groups);
	}

	/**
	 * Builds the same three row groups shown in this plugin's own status-bar
	 * popover (builtin skills / user skills / manage actions). Exposed so a
	 * host plugin (e.g. minimalism-ui) can fold these into its own menu
	 * instead of — not in addition to — this plugin's status-bar icon; see
	 * `hideStatusBarIcon()`.
	 */
	async getStatusBarMenuGroups(): Promise<StatusBarMenuRow[][]> {
		const builtinRows: StatusBarMenuRow[] = [
			{
				label: BUILTIN_FIX_SPELLING.name,
				icon: BUILTIN_FIX_SPELLING.icon,
				onClick: () => this.runWithReadyProvider((provider) => void executeSkill(this.app, provider, BUILTIN_FIX_SPELLING)),
			},
			{
				label: BUILTIN_ORGANIZE_TAGS_META.name,
				icon: BUILTIN_ORGANIZE_TAGS_META.icon,
				onClick: () => this.runWithReadyProvider((provider) => void runOrganizeTagsSkill(this.app, provider)),
			},
		];

		// F-204 (TODO.md §7.2): every saved user Skill shows up here automatically,
		// no restart or manual "pin" step needed.
		const userSkills = await listSkills(this.app);
		const userSkillRows: StatusBarMenuRow[] = userSkills.map((skill) => ({
			label: skill.name,
			icon: skill.icon,
			onClick: () => this.runWithReadyProvider((provider) => void executeSkill(this.app, provider, skill)),
		}));

		const manageRows: StatusBarMenuRow[] = [
			{
				label: "新建 Skills",
				icon: "plus",
				onClick: () => new CreateSkillModal(this.app, this, userSkills, () => {}).open(),
			},
			{
				label: "管理 Skills",
				icon: "settings",
				onClick: () => this.openSettings("skills"),
			},
		];

		return [builtinRows, userSkillRows, manageRows];
	}

	/** Shared guard for every menu action that needs to call an LLM. */
	private runWithReadyProvider(run: (provider: LLMProvider) => void): void {
		const provider = this.settings.providers.find(isProviderReady);
		if (!provider) {
			new Notice("请先在设置里添加并配置一个模型 Provider。");
			return;
		}
		run(provider);
	}

	/** Opens Obsidian's settings window to this plugin's tab, optionally to a specific sub-tab. */
	private openSettings(tab?: SettingsTabId): void {
		if (tab) this.settingTab?.openToTab(tab);
		const setting = (
			this.app as App & {
				setting: { open: () => void; openTabById: (id: string) => void };
			}
		).setting;
		setting.open();
		setting.openTabById(this.manifest.id);
	}
}
