import { LLMProvider, LLMProviderPresetType } from "../../types/provider.types";

/**
 * Default base URL each preset uses when the user leaves the field empty.
 * This is the URL the user would naturally type into the form (i.e. without
 * the `/v1` suffix the OpenAI-compatible request layer appends for ollama).
 */
const DEFAULT_BASE_URL_BY_PRESET: Partial<Record<LLMProviderPresetType, string>> = {
	openai: "https://api.openai.com/v1",
	anthropic: "https://api.anthropic.com",
	deepseek: "https://api.deepseek.com",
	openrouter: "https://openrouter.ai/api/v1",
	ollama: "http://127.0.0.1:11434",
};

export function getDefaultBaseUrlForPreset(
	presetType: LLMProviderPresetType,
): string | undefined {
	return DEFAULT_BASE_URL_BY_PRESET[presetType];
}

export function resolveProviderBaseUrl(
	provider: Pick<LLMProvider, "presetType" | "baseUrl">,
): string | undefined {
	const customBaseUrl = provider.baseUrl?.trim();
	if (customBaseUrl) {
		return customBaseUrl.replace(/\/+$/, "");
	}
	return DEFAULT_BASE_URL_BY_PRESET[provider.presetType];
}

function joinEndpoint(baseUrl: string, endpoint: string): string {
	return `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;
}

function resolveOpenAICompatibleRequestBaseUrl(
	provider: Pick<LLMProvider, "presetType" | "baseUrl">,
): string | undefined {
	const baseUrl = resolveProviderBaseUrl(provider);
	if (!baseUrl) return undefined;
	// Ollama serves its OpenAI-compatible surface under /v1.
	if (provider.presetType === "ollama") {
		return joinEndpoint(baseUrl, "v1");
	}
	return baseUrl;
}

/** Preview URL shown next to the base-url field in the provider form. */
export function resolveProviderPrimaryRequestUrl(
	provider: Pick<LLMProvider, "presetType" | "apiType" | "baseUrl">,
): string | undefined {
	switch (provider.apiType) {
		case "openai-compatible": {
			const baseUrl = resolveOpenAICompatibleRequestBaseUrl(provider);
			return baseUrl ? joinEndpoint(baseUrl, "chat/completions") : undefined;
		}
		case "anthropic": {
			const baseUrl = resolveProviderBaseUrl(provider) ?? "https://api.anthropic.com";
			return joinEndpoint(baseUrl, "v1/messages");
		}
	}
}
