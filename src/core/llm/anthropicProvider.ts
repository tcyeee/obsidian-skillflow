import { requestUrl } from "obsidian";

import { resolveProviderPrimaryRequestUrl } from "../../utils/llm/provider-base-url";

import { BaseLLMProvider, ChatCompletionRequest, ChatCompletionResponse } from "./base";

const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_MAX_TOKENS = 4096;

type AnthropicResponseBody = {
	model?: string;
	content?: { type: string; text?: string }[];
};

// Mirrors obsidian-yolo's Anthropic provider (src/core/llm/anthropic.ts),
// trimmed to a single /v1/messages call: no prompt caching, web search, or
// OAuth session handling.
export class AnthropicProvider extends BaseLLMProvider {
	async generateResponse(
		request: ChatCompletionRequest,
	): Promise<ChatCompletionResponse> {
		const url = resolveProviderPrimaryRequestUrl(this.provider);
		if (!url) {
			throw new Error(`Provider "${this.provider.id}" has no base URL configured.`);
		}

		const systemPrompt = request.messages
			.filter((message) => message.role === "system")
			.map((message) => message.content)
			.join("\n\n");
		const conversationMessages = request.messages
			.filter((message) => message.role !== "system")
			.map((message) => ({ role: message.role, content: message.content }));

		const response = await requestUrl({
			url,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.provider.apiKey ?? "",
				"anthropic-version": ANTHROPIC_API_VERSION,
			},
			body: JSON.stringify({
				model: request.model,
				messages: conversationMessages,
				max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
				...(systemPrompt ? { system: systemPrompt } : {}),
				...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
			}),
			throw: false,
		});

		if (response.status < 200 || response.status >= 300) {
			throw new Error(
				`Provider "${this.provider.id}" request failed (${response.status}): ${response.text}`,
			);
		}

		const body = response.json as AnthropicResponseBody;
		const content = body.content?.find((block) => block.type === "text")?.text;
		if (content === undefined) {
			throw new Error(`Provider "${this.provider.id}" returned no text content.`);
		}

		return { content, model: body.model ?? request.model };
	}
}
