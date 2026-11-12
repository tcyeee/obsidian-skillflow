import { Setting } from "obsidian";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

import { classNames } from "../../utils/classnames";

type SettingContextValue = {
	setting: Setting | null;
};

const SettingContext = createContext<SettingContextValue>({ setting: null });

type ObsidianSettingProps = {
	name?: string;
	desc?: string;
	heading?: boolean;
	className?: string;
	required?: boolean;
	children?: React.ReactNode;
};

// Wraps Obsidian's imperative `Setting` class so the field components below
// (ObsidianTextInput, etc.) can attach into it via `setting.addText(...)`
// instead of each reimplementing Obsidian's input styling. Same pattern as
// obsidian-yolo's ObsidianSetting (src/components/common/ObsidianSetting.tsx).
export function ObsidianSetting({
	name,
	desc,
	heading,
	className,
	required,
	children,
}: ObsidianSettingProps) {
	const [setting, setSetting] = useState<Setting | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		const newSetting = new Setting(containerRef.current);
		setSetting(newSetting);
		return () => {
			newSetting.clear();
		};
	}, []);

	useEffect(() => {
		if (!setting) return;
		setting.setName(name ?? "");
		setting.setDesc(desc ?? "");
		if (heading) setting.setHeading();
		setting.settingEl.className = classNames("setting-item", className);
		setting.nameEl.className = classNames(
			"setting-item-name",
			required && "skillflow-settings-required",
		);
	}, [name, desc, heading, className, setting, required]);

	return (
		<SettingContext.Provider value={{ setting }}>
			<div ref={containerRef}>{children}</div>
		</SettingContext.Provider>
	);
}

export const useObsidianSetting = () => useContext(SettingContext);
