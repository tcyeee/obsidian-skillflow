import React, { useContext } from "react";

import { SkillFlowSettings } from "../settings/schema";

type SettingsContextValue = {
	settings: SkillFlowSettings;
	setSettings: (newSettings: SkillFlowSettings) => Promise<void>;
};

const SettingsContext = React.createContext<SettingsContextValue | undefined>(undefined);

// Mirrors obsidian-yolo's settings-context (src/contexts/settings-context.tsx):
// the settings tab provides the current settings + a setter, and every
// section/modal reads/writes through this instead of threading props.
export function SettingsProvider({
	children,
	settings,
	setSettings,
}: {
	children: React.ReactNode;
	settings: SkillFlowSettings;
	setSettings: (newSettings: SkillFlowSettings) => Promise<void>;
}) {
	const value = React.useMemo(() => ({ settings, setSettings }), [settings, setSettings]);
	return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
	const context = useContext(SettingsContext);
	if (!context) {
		throw new Error("useSettings must be used within a SettingsProvider");
	}
	return context;
}
