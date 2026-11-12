import { LLMProviderPresetType } from "../types/provider.types";

export type ProviderPresetInfo = {
	label: string;
	/** Suggested provider id when adding a new instance of this preset. */
	defaultProviderId: string;
	requireApiKey: boolean;
	requireBaseUrl: boolean;
};

export const PROVIDER_PRESET_INFO: Record<LLMProviderPresetType, ProviderPresetInfo> = {
	openai: {
		label: "OpenAI",
		defaultProviderId: "openai",
		requireApiKey: true,
		requireBaseUrl: false,
	},
	anthropic: {
		label: "Anthropic",
		defaultProviderId: "anthropic",
		requireApiKey: true,
		requireBaseUrl: false,
	},
	deepseek: {
		label: "DeepSeek",
		defaultProviderId: "deepseek",
		requireApiKey: true,
		requireBaseUrl: false,
	},
	openrouter: {
		label: "OpenRouter",
		defaultProviderId: "openrouter",
		requireApiKey: true,
		requireBaseUrl: false,
	},
	ollama: {
		label: "Ollama",
		defaultProviderId: "ollama",
		requireApiKey: false,
		requireBaseUrl: false,
	},
	"openai-compatible": {
		label: "OpenAI compatible (custom)",
		defaultProviderId: "",
		requireApiKey: false,
		requireBaseUrl: true,
	},
};
