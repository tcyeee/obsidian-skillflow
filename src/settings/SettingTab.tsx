import { App, PluginSettingTab } from "obsidian";
import { Root, createRoot } from "react-dom/client";

import { SettingsTabRoot } from "../components/settings/SettingsTabRoot";
import type { SettingsTabId } from "../components/settings/SettingsNav";
import type SkillFlowPlugin from "../main";

// Mirrors obsidian-yolo's SettingTab (src/settings/SettingTab.tsx): mounts a
// React root into Obsidian's settings container and remounts it on every
// `display()` call, which `plugin.setSettings` triggers after a save so the
// tab always reflects the latest data.
export class SkillFlowSettingTab extends PluginSettingTab {
	plugin: SkillFlowPlugin;
	private root: Root | null = null;
	// Consumed by the next `display()` call so callers (e.g. the status bar's
	// "管理 Skills" action) can jump straight to a sub-tab; reset afterward so
	// later opens (clicking the gear icon, re-saving settings) fall back to
	// the default "providers" tab instead of getting stuck on it.
	private pendingInitialTab: SettingsTabId | null = null;

	constructor(app: App, plugin: SkillFlowPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Makes the next `display()` call open directly on the given sub-tab. */
	openToTab(tab: SettingsTabId): void {
		this.pendingInitialTab = tab;
	}

	display(): void {
		const { containerEl } = this;
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
		containerEl.empty();
		this.root = createRoot(containerEl);
		const initialTab = this.pendingInitialTab ?? undefined;
		this.pendingInitialTab = null;
		this.root.render(<SettingsTabRoot app={this.app} plugin={this.plugin} initialTab={initialTab} />);
	}

	hide(): void {
		this.root?.unmount();
		this.root = null;
	}
}
