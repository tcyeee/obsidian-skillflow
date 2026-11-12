import { requestUrl } from "obsidian";

import { LLMProvider } from "../../types/provider.types";
import { resolveProviderModelsListUrl } from "./provider-base-url";

const ANTHROPIC_API_VERSION = "2023-06-01";

type ModelsListResponseBody = {
	data?: Array<{ id?: string }>;
};

/** Live model IDs the provider currently serves, for the "Default model" picker. */
export async function fetchProviderModels(provider: LLMProvider): Promise<string[]> {
	const url = resolveProviderModelsListUrl(provider);
	if (!url) {
		throw new Error(`Provider "${provider.id}" has no base URL configured.`);
	}

	const headers: Record<string, string> =
		provider.apiType === "anthropic"
			? { "x-api-key": provider.apiKey ?? "", "anthropic-version": ANTHROPIC_API_VERSION }
			: provider.apiKey
				? { Authorization: `Bearer ${provider.apiKey}` }
				: {};

	const response = await requestUrl({ url, method: "GET", headers, throw: false });
	if (response.status < 200 || response.status >= 300) {
		throw new Error(`Request failed (${response.status}): ${response.text}`);
	}

	const body = response.json as ModelsListResponseBody;
	const ids = (body.data ?? [])
		.map((entry) => entry.id)
		.filter((id): id is string => typeof id === "string" && id.length > 0);
	if (ids.length === 0) {
		throw new Error(`Provider "${provider.id}" returned no models.`);
	}

	return Array.from(new Set(ids)).sort();
}
