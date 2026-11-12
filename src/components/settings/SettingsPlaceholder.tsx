import { ObsidianIcon } from "../common/ObsidianIcon";

type SettingsPlaceholderProps = {
	icon: string;
	title: string;
	description: string;
};

// Stand-in for a settings page that doesn't have content yet. Distinct from
// ProvidersSection's empty state (which offers a CTA because there's an
// action to take); this one has nothing to do yet, so it says so plainly.
export function SettingsPlaceholder({ icon, title, description }: SettingsPlaceholderProps) {
	return (
		<div className="skillflow-placeholder">
			<ObsidianIcon icon={icon} className="skillflow-placeholder__icon" />
			<div className="skillflow-placeholder__title">{title}</div>
			<div className="skillflow-placeholder__desc">{description}</div>
		</div>
	);
}
