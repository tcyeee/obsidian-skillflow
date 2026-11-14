import { App, PluginSettingTab } from "obsidian";
import { Root, createRoot } from "react-dom/client";

import { SettingsTabRoot } from "../components/settings/SettingsTabRoot";
import type { SettingsTabId } from "../components/settings/SettingsNav";
import type SkillFlowPlugin from "../main";

// The declarative settings API (getSettingDefinitions) always wraps a
// definition in Obsidian's own .setting-group > .setting-items > .setting-item
// scaffold, meant for discrete one-line settings rows. This panel is a whole
// React tree with its own sub-tab nav, not a row, so instead we opt out
// (getSettingDefinitions returns []) and fall back to the legacy imperative
// display(), which hands us the tab's containerEl directly — no ancestor
// wrapper to fight. The tradeoff: this tab won't appear in Obsidian's
// built-in settings search.
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

	getSettingDefinitions() {
		return [];
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("skillflow-settings-tab-root");

		this.root?.unmount();
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
