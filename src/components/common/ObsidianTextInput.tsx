import { TextComponent } from "obsidian";
import { useEffect, useRef, useState } from "react";

import { useObsidianSetting } from "./ObsidianSetting";

type ObsidianTextInputProps = {
	value: string;
	placeholder?: string;
	type?: "text" | "password";
	onChange: (value: string) => void;
};

export function ObsidianTextInput({
	value,
	placeholder,
	type,
	onChange,
}: ObsidianTextInputProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const { setting } = useObsidianSetting();
	const [textComponent, setTextComponent] = useState<TextComponent | null>(null);
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		if (setting) {
			let component: TextComponent | null = null;
			setting.addText((c) => (component = c));
			setTextComponent(component);
			return () => component?.inputEl.remove();
		} else if (containerRef.current) {
			const component = new TextComponent(containerRef.current);
			setTextComponent(component);
			return () => component.inputEl.remove();
		}
	}, [setting]);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		if (!textComponent) return;
		textComponent.onChange((v) => onChangeRef.current(v));
	}, [textComponent]);

	useEffect(() => {
		if (!textComponent) return;
		textComponent.setValue(value);
		if (placeholder) textComponent.setPlaceholder(placeholder);
		if (type) textComponent.inputEl.type = type;
	}, [textComponent, value, placeholder, type]);

	return <div ref={containerRef} />;
}
