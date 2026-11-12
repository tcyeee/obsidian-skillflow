import { DropdownComponent } from "obsidian";
import { useEffect, useRef, useState } from "react";

import { useObsidianSetting } from "./ObsidianSetting";

type ObsidianDropdownProps = {
	value: string;
	options: Record<string, string>;
	onChange: (value: string) => void;
};

export function ObsidianDropdown({ value, options, onChange }: ObsidianDropdownProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const { setting } = useObsidianSetting();
	const [dropdownComponent, setDropdownComponent] = useState<DropdownComponent | null>(null);
	const onChangeRef = useRef(onChange);
	const isSyncingRef = useRef(false);

	useEffect(() => {
		if (setting) {
			let component: DropdownComponent | null = null;
			setting.addDropdown((c) => (component = c));
			setDropdownComponent(component);
			return () => component?.selectEl.remove();
		} else if (containerRef.current) {
			const component = new DropdownComponent(containerRef.current);
			setDropdownComponent(component);
			return () => component.selectEl.remove();
		}
	}, [setting]);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		if (!dropdownComponent) return;
		dropdownComponent.onChange((v) => {
			if (isSyncingRef.current) return;
			onChangeRef.current(v);
		});
	}, [dropdownComponent]);

	useEffect(() => {
		if (!dropdownComponent) return;
		isSyncingRef.current = true;
		dropdownComponent.selectEl.empty();
		dropdownComponent.addOptions(options);
		dropdownComponent.setValue(value);
		queueMicrotask(() => {
			isSyncingRef.current = false;
		});
	}, [dropdownComponent, options, value]);

	return <div ref={containerRef} />;
}
