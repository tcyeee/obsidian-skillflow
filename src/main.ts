import { addIcon, App, Menu, Plugin, setIcon } from "obsidian";
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
		setIcon(statusBarItem, SKILLFLOW_ICON_ID);
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
			item.setTitle("笔记拼写纠错");
		});
		menu.addItem((item) => {
			item.setTitle("自动整理 Properties");
		});
		menu.addSeparator();
		menu.addItem((item) => {
			item.setTitle("新建 Skills");
		});
		menu.addItem((item) => {
			item.setTitle("管理 Skills").onClick(() => this.openSettings());
		});

		menu.showAtMouseEvent(evt);
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
