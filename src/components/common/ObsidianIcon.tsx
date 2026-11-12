import { setIcon } from "obsidian";
import { useEffect, useRef } from "react";

type ObsidianIconProps = {
	icon: string;
	className?: string;
};

// Thin wrapper around Obsidian's `setIcon`, which draws from the same Lucide
// set the host app uses everywhere else — so icons here read as native chrome
// rather than a foreign icon font.
export function ObsidianIcon({ icon, className }: ObsidianIconProps) {
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (ref.current) setIcon(ref.current, icon);
	}, [icon]);

	return <span ref={ref} className={className} />;
}
