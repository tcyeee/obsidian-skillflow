import { App, PluginSettingTab, Setting, SettingDefinitionItem } from "obsidian";
import { Root, createRoot } from "react-dom/client";

import { SettingsTabRoot } from "../components/settings/SettingsTabRoot";
import type { SettingsTabId } from "../components/settings/SettingsNav";
import type SkillFlowPlugin from "../main";

// Mirrors obsidian-yolo's SettingTab (src/settings/SettingTab.tsx): mounts a
// React root into the row the declarative settings API hands us, and
// remounts it whenever `update()` runs — triggered by `plugin.setSettings`
// after a save, so the tab always reflects the latest data. The whole panel
// is a single `render`-type definition because its content is one React
// tree with its own sub-tab nav, not a list of discrete Setting rows.
export class SkillFlowSettingTab extends PluginSettingTab {
	plugin: SkillFlowPlugin;
	private root: Root | null = null;
	// Consumed by the next render so callers (e.g. the status bar's "管理
	// Skills" action) can jump straight to a sub-tab; reset afterward so
	// later opens (clicking the gear icon, re-saving settings) fall back to
	// the default "providers" tab instead of getting stuck on it.
	private pendingInitialTab: SettingsTabId | null = null;

	constructor(app: App, plugin: SkillFlowPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Makes the next render open directly on the given sub-tab. */
	openToTab(tab: SettingsTabId): void {
		this.pendingInitialTab = tab;
		this.update();
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "SkillFlow",
				render: (setting: Setting) => {
					const containerEl = setting.settingEl;
					containerEl.empty();
					containerEl.removeClass("setting-item");
					containerEl.addClass("skillflow-settings-tab-root");

					this.root?.unmount();
					this.root = createRoot(containerEl);
					const initialTab = this.pendingInitialTab ?? undefined;
					this.pendingInitialTab = null;
					this.root.render(<SettingsTabRoot app={this.app} plugin={this.plugin} initialTab={initialTab} />);

					return () => {
						this.root?.unmount();
						this.root = null;
					};
				},
			},
		];
	}

	hide(): void {
		this.root?.unmount();
		this.root = null;
	}
}
