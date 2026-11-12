import { App, PluginSettingTab } from "obsidian";
import { Root, createRoot } from "react-dom/client";

import { SettingsTabRoot } from "../components/settings/SettingsTabRoot";
import type SkillFlowPlugin from "../main";

// Mirrors obsidian-yolo's SettingTab (src/settings/SettingTab.tsx): mounts a
// React root into Obsidian's settings container and remounts it on every
// `display()` call, which `plugin.setSettings` triggers after a save so the
// tab always reflects the latest data.
export class SkillFlowSettingTab extends PluginSettingTab {
	plugin: SkillFlowPlugin;
	private root: Root | null = null;

	constructor(app: App, plugin: SkillFlowPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
		containerEl.empty();
		this.root = createRoot(containerEl);
		this.root.render(<SettingsTabRoot app={this.app} plugin={this.plugin} />);
	}

	hide(): void {
		this.root?.unmount();
		this.root = null;
	}
}
