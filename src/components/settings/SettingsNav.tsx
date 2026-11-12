import { ObsidianIcon } from "../common/ObsidianIcon";

export type SettingsTabId = "providers" | "skills" | "github" | "other";

const TABS: { id: SettingsTabId; label: string; icon: string }[] = [
	{ id: "providers", label: "Add model", icon: "bot" },
	{ id: "skills", label: "Manage skills", icon: "sparkles" },
	{ id: "github", label: "GitHub 发布", icon: "github" },
	{ id: "other", label: "Other settings", icon: "sliders-horizontal" },
];

type SettingsNavProps = {
	active: SettingsTabId;
	onChange: (tab: SettingsTabId) => void;
};

// A lightweight tab strip for sub-navigating the plugin's single
// PluginSettingTab panel. Obsidian doesn't give a plugin more than one
// registered tab, so this plays that role inside it: underline indicator on
// the active tab, same hover/focus affordances as the rest of the panel.
export function SettingsNav({ active, onChange }: SettingsNavProps) {
	return (
		<div className="skillflow-nav" role="tablist">
			{TABS.map((tab) => (
				<button
					key={tab.id}
					type="button"
					role="tab"
					aria-selected={tab.id === active}
					className="skillflow-nav__tab"
					data-active={tab.id === active}
					onClick={() => onChange(tab.id)}
				>
					<ObsidianIcon icon={tab.icon} className="skillflow-nav__tab-icon" />
					{tab.label}
				</button>
			))}
		</div>
	);
}
