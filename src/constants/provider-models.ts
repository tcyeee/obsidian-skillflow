import { LLMProviderPresetType } from "../types/provider.types";

/**
 * Shown in the "Default model" picker when we can't reach the provider's
 * live models list (no API key yet, offline, request failed). Not defined
 * for ollama/openai-compatible: those are arbitrary user deployments, so a
 * guessed list would just be misleading there.
 */
export const FALLBACK_MODELS_BY_PRESET: Partial<Record<LLMProviderPresetType, string[]>> = {
	openai: ["gpt-5.1", "gpt-5.1-mini", "gpt-4.1", "gpt-4.1-mini", "o3", "o3-mini"],
	anthropic: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"],
	deepseek: ["deepseek-chat", "deepseek-reasoner"],
	openrouter: [
		"anthropic/claude-sonnet-5-5",
		"openai/gpt-5.1",
		"meta-llama/llama-3.3-70b-instruct",
	],
};
