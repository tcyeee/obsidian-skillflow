import { LLMProviderPresetType } from "../types/provider.types";

// Picker categories. "custom" (openai-compatible) is rendered as a dedicated
// last tile, same as obsidian-yolo's picker, not as part of any category.
export type ProviderPickerCategory = "main" | "cn" | "gw" | "local";

export type ProviderTint =
	| "green"
	| "amber"
	| "blue"
	| "purple"
	| "slate";

export type ProviderCatalogEntry = {
	monogram: string;
	tint: ProviderTint;
	category: ProviderPickerCategory;
	/** Where the user gets an API key for this provider, shown in the form. */
	apiKeyUrl?: string;
};

export const PROVIDER_CATALOG: Record<
	Exclude<LLMProviderPresetType, "openai-compatible">,
	ProviderCatalogEntry
> = {
	openai: {
		monogram: "OA",
		tint: "green",
		category: "main",
		apiKeyUrl: "https://platform.openai.com/api-keys",
	},
	anthropic: {
		monogram: "An",
		tint: "amber",
		category: "main",
		apiKeyUrl: "https://console.anthropic.com/settings/keys",
	},
	deepseek: {
		monogram: "深度",
		tint: "blue",
		category: "cn",
		apiKeyUrl: "https://platform.deepseek.com/api_keys",
	},
	openrouter: {
		monogram: "OR",
		tint: "purple",
		category: "gw",
		apiKeyUrl: "https://openrouter.ai/keys",
	},
	ollama: {
		monogram: "Ol",
		tint: "slate",
		category: "local",
	},
};

export const PROVIDER_PICKER_ORDER: Exclude<LLMProviderPresetType, "openai-compatible">[] = [
	"openai",
	"anthropic",
	"openrouter",
	"deepseek",
	"ollama",
];

export const PROVIDER_PICKER_CATEGORIES: {
	id: "all" | ProviderPickerCategory;
	label: string;
}[] = [
	{ id: "all", label: "All" },
	{ id: "main", label: "International" },
	{ id: "cn", label: "China" },
	{ id: "gw", label: "Gateway" },
	{ id: "local", label: "Local" },
];
