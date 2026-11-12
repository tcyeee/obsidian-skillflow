import { LLMProvider } from "../../types/provider.types";

export type ChatMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

export type ChatCompletionRequest = {
	model: string;
	messages: ChatMessage[];
	temperature?: number;
	maxTokens?: number;
};

export type ChatCompletionResponse = {
	content: string;
	model: string;
};

// Mirrors obsidian-yolo's BaseLLMProvider (src/core/llm/base.ts), trimmed to a
// single non-streaming call since SkillFlow doesn't run an agent/tool loop yet.
export abstract class BaseLLMProvider {
	protected readonly provider: LLMProvider;

	constructor(provider: LLMProvider) {
		this.provider = provider;
	}

	abstract generateResponse(
		request: ChatCompletionRequest,
	): Promise<ChatCompletionResponse>;
}
