import { addIcon, Menu, Plugin } from "obsidian";
import { SKILLFLOW_ICON_ID, SKILLFLOW_ICON_SVG } from "./icon";
import { SkillFlowSettingTab } from "./settings/SettingTab";
import { DEFAULT_SETTINGS, SkillFlowSettings } from "./settings/schema";

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
		statusBarItem.setText("SkillFlow");
		statusBarItem.addEventListener("click", (evt: MouseEvent) =>
			this.showSkillsMenu(evt),
		);

		this.addRibbonIcon(SKILLFLOW_ICON_ID, "SkillFlow", (evt: MouseEvent) =>
			this.showSkillsMenu(evt),
		);
	}

	onunload() {}

	/** Persists settings and refreshes the settings tab if it's mounted. */
	async setSettings(newSettings: SkillFlowSettings): Promise<void> {
		this.settings = newSettings;
		await this.saveData(this.settings);
		this.settingTab?.display();
	}

	private showSkillsMenu(evt: MouseEvent) {
		const menu = new Menu();

		menu.addItem((item) => {
			item.setTitle("Skills").setIsLabel(true);
		});
		menu.addSeparator();
		menu.addItem((item) => {
			item.setTitle("No skills yet").setDisabled(true);
		});

		menu.showAtMouseEvent(evt);
	}
}
