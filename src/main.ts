import { addIcon, App, Menu, Notice, Plugin, setIcon } from "obsidian";
import { CreateSkillModal } from "./components/settings/CreateSkillModal";
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

	async onload() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };

		addIcon(SKILLFLOW_ICON_ID, SKILLFLOW_ICON_SVG);

		this.settingTab = new SkillFlowSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);

		const statusBarItem = this.addStatusBarItem();
		statusBarItem.addClass("mod-clickable");
		setIcon(statusBarItem, SKILLFLOW_ICON_ID);
		statusBarItem.addEventListener("click", (evt: MouseEvent) =>
			void this.showSkillsMenu(evt),
		);

		this.addRibbonIcon(SKILLFLOW_ICON_ID, "SkillFlow", (evt: MouseEvent) =>
			void this.showSkillsMenu(evt),
		);
	}

	onunload() {}

	/** Persists settings and refreshes the settings tab if it's mounted. */
	async setSettings(newSettings: SkillFlowSettings): Promise<void> {
		this.settings = newSettings;
		await this.saveData(this.settings);
		this.settingTab?.display();
	}

	private async showSkillsMenu(evt: MouseEvent) {
		const menu = new Menu();

		menu.addItem((item) =>
			item
				.setTitle(BUILTIN_FIX_SPELLING.name)
				.setIcon(BUILTIN_FIX_SPELLING.icon)
				.onClick(() => this.runWithReadyProvider((provider) => void executeSkill(this.app, provider, BUILTIN_FIX_SPELLING))),
		);
		menu.addItem((item) =>
			item
				.setTitle(BUILTIN_ORGANIZE_TAGS_META.name)
				.setIcon(BUILTIN_ORGANIZE_TAGS_META.icon)
				.onClick(() => this.runWithReadyProvider((provider) => void runOrganizeTagsSkill(this.app, provider))),
		);

		// F-204 (TODO.md §7.2): every saved user Skill shows up here automatically,
		// no restart or manual "pin" step needed.
		const userSkills = await listSkills(this.app);
		if (userSkills.length) {
			menu.addSeparator();
			for (const skill of userSkills) {
				menu.addItem((item) =>
					item
						.setTitle(skill.name)
						.setIcon(skill.icon)
						.onClick(() => this.runWithReadyProvider((provider) => void executeSkill(this.app, provider, skill))),
				);
			}
		}

		menu.addSeparator();
		menu.addItem((item) =>
			item
				.setTitle("新建 Skills")
				.setIcon("plus")
				.onClick(() => new CreateSkillModal(this.app, this, userSkills, () => {}).open()),
		);
		menu.addItem((item) =>
			item
				.setTitle("管理 Skills")
				.setIcon("settings")
				.onClick(() => this.openSettings()),
		);

		menu.showAtMouseEvent(evt);
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

	/** Opens Obsidian's settings window to this plugin's tab. */
	private openSettings(): void {
		const setting = (
			this.app as App & {
				setting: { open: () => void; openTabById: (id: string) => void };
			}
		).setting;
		setting.open();
		setting.openTabById(this.manifest.id);
	}
}
