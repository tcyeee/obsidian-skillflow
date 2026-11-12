import { App } from "obsidian";
import { useState } from "react";

import { SettingsProvider } from "../../contexts/settings-context";
import type SkillFlowPlugin from "../../main";

import { ProvidersSection } from "./ProvidersSection";
import { SettingsNav, SettingsTabId } from "./SettingsNav";
import { SettingsPlaceholder } from "./SettingsPlaceholder";

// Renders from `plugin.settings` directly rather than local React state:
// `plugin.setSettings` persists to disk and re-triggers the settings tab's
// `display()`, which remounts this root with the fresh data. Provider modals
// (opened outside this tree) call the same `plugin.setSettings`, so a save
// there refreshes this table too.
//
// The active sub-tab lives in local state rather than `plugin.settings`:
// it's view state, not data worth persisting to disk, and it's expected to
// reset to "Add model" each time the panel is reopened.
export function SettingsTabRoot({ app, plugin }: { app: App; plugin: SkillFlowPlugin }) {
	const [activeTab, setActiveTab] = useState<SettingsTabId>("providers");

	return (
		<SettingsProvider settings={plugin.settings} setSettings={(next) => plugin.setSettings(next)}>
			<SettingsNav active={activeTab} onChange={setActiveTab} />
			{activeTab === "providers" && <ProvidersSection app={app} plugin={plugin} />}
			{activeTab === "skills" && (
				<SettingsPlaceholder
					icon="sparkles"
					title="Manage skills"
					description="Skill management is coming soon. For now, skills run on whatever providers you've added."
				/>
			)}
			{activeTab === "other" && (
				<SettingsPlaceholder
					icon="sliders-horizontal"
					title="Other settings"
					description="There's nothing to configure here yet."
				/>
			)}
		</SettingsProvider>
	);
}
