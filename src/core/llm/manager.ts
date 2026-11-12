import { LLMProvider } from "../../types/provider.types";

import { AnthropicProvider } from "./anthropicProvider";
import { BaseLLMProvider } from "./base";
import { OpenAICompatibleProvider } from "./openaiCompatibleProvider";

// Mirrors obsidian-yolo's provider manager (src/core/llm/manager.ts), trimmed
// to picking the right request implementation for a provider's apiType.
export function createLLMProvider(provider: LLMProvider): BaseLLMProvider {
	switch (provider.apiType) {
		case "anthropic":
			return new AnthropicProvider(provider);
		case "openai-compatible":
			return new OpenAICompatibleProvider(provider);
	}
}
