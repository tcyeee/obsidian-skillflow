import { PROVIDER_PRESET_INFO } from "../../constants/provider-presets";
import { LLMProvider } from "../../types/provider.types";

/** Whether a provider has everything it needs to receive a request (API key if its preset requires one). */
export function isProviderReady(provider: LLMProvider): boolean {
	const requiresKey = PROVIDER_PRESET_INFO[provider.presetType].requireApiKey;
	return !requiresKey || !!provider.apiKey;
}
