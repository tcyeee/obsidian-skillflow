import { ProviderBrandIcon } from "../../constants/provider-catalog";

type ProviderIconProps = {
	icon?: ProviderBrandIcon;
	monogram: string;
	className?: string;
};

// Renders a provider's real Simple Icons brand mark when the catalog has
// one, falling back to its monogram tile otherwise (e.g. OpenAI, which
// Simple Icons no longer ships, and custom openai-compatible providers).
export function ProviderIcon({ icon, monogram, className }: ProviderIconProps) {
	if (icon) {
		return (
			<svg viewBox="0 0 24 24" fill={icon.color} className={className} aria-hidden="true">
				<path d={icon.path} />
			</svg>
		);
	}
	return <>{monogram}</>;
}
