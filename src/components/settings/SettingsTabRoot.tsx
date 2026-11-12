import { App } from "obsidian";

import { SettingsProvider } from "../../contexts/settings-context";
import type SkillFlowPlugin from "../../main";

import { ProvidersSection } from "./ProvidersSection";

// Renders from `plugin.settings` directly rather than local React state:
// `plugin.setSettings` persists to disk and re-triggers the settings tab's
// `display()`, which remounts this root with the fresh data. Provider modals
// (opened outside this tree) call the same `plugin.setSettings`, so a save
// there refreshes this table too.
export function SettingsTabRoot({ app, plugin }: { app: App; plugin: SkillFlowPlugin }) {
	return (
		<SettingsProvider settings={plugin.settings} setSettings={(next) => plugin.setSettings(next)}>
			<ProvidersSection app={app} plugin={plugin} />
		</SettingsProvider>
	);
}
