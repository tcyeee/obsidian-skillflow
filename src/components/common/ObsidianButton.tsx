import { ButtonComponent } from "obsidian";
import { useEffect, useRef, useState } from "react";

import { useObsidianSetting } from "./ObsidianSetting";

type ObsidianButtonProps = {
	text: string;
	onClick: () => void;
	cta?: boolean;
	warning?: boolean;
};

export function ObsidianButton({ text, onClick, cta, warning }: ObsidianButtonProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const { setting } = useObsidianSetting();
	const [buttonComponent, setButtonComponent] = useState<ButtonComponent | null>(null);
	const onClickRef = useRef(onClick);

	useEffect(() => {
		if (setting) {
			let component: ButtonComponent | null = null;
			setting.addButton((c) => (component = c));
			setButtonComponent(component);
			return () => component?.buttonEl.remove();
		} else if (containerRef.current) {
			const component = new ButtonComponent(containerRef.current);
			setButtonComponent(component);
			return () => component.buttonEl.remove();
		}
	}, [setting]);

	useEffect(() => {
		onClickRef.current = onClick;
	}, [onClick]);

	useEffect(() => {
		if (!buttonComponent) return;
		buttonComponent.onClick(() => onClickRef.current());
	}, [buttonComponent]);

	useEffect(() => {
		if (!buttonComponent) return;
		buttonComponent.setButtonText(text);
		if (cta) buttonComponent.setCta();
		else buttonComponent.buttonEl.removeClass("mod-cta");
		if (warning) buttonComponent.setDestructive();
		else buttonComponent.removeDestructive();
	}, [buttonComponent, text, cta, warning]);

	return <div ref={containerRef} />;
}
