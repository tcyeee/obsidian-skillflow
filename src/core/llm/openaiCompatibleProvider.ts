import { requestUrl } from "obsidian";

import { resolveProviderPrimaryRequestUrl } from "../../utils/llm/provider-base-url";

import { BaseLLMProvider, ChatCompletionRequest, ChatCompletionResponse } from "./base";

type OpenAICompatibleResponseBody = {
	model?: string;
	choices?: { message?: { content?: string } }[];
};

// Mirrors obsidian-yolo's OpenAICompatibleProvider (src/core/llm/openaiCompatibleProvider.ts),
// trimmed to a single /chat/completions call: no streaming, tool calls, or the
// `openai` SDK dependency.
export class OpenAICompatibleProvider extends BaseLLMProvider {
	async generateResponse(
		request: ChatCompletionRequest,
	): Promise<ChatCompletionResponse> {
		const url = resolveProviderPrimaryRequestUrl(this.provider);
		if (!url) {
			throw new Error(`Provider "${this.provider.id}" has no base URL configured.`);
		}

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (this.provider.apiKey) {
			headers.Authorization = `Bearer ${this.provider.apiKey}`;
		}

		const response = await requestUrl({
			url,
			method: "POST",
			headers,
			body: JSON.stringify({
				model: request.model,
				messages: request.messages,
				...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
				...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
			}),
			throw: false,
		});

		if (response.status < 200 || response.status >= 300) {
			throw new Error(
				`Provider "${this.provider.id}" request failed (${response.status}): ${response.text}`,
			);
		}

		const body = response.json as OpenAICompatibleResponseBody;
		const content = body.choices?.[0]?.message?.content;
		if (content === undefined) {
			throw new Error(`Provider "${this.provider.id}" returned no message content.`);
		}

		return { content, model: body.model ?? request.model };
	}
}
