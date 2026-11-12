import { z } from "zod";

// Design mirrors obsidian-yolo's provider model (src/types/provider.types.ts),
// scoped down to the handful of presets SkillFlow ships with today.
export const providerPresetTypeSchema = z.enum([
	"openai",
	"anthropic",
	"deepseek",
	"openrouter",
	"ollama",
	"openai-compatible",
]);

export const providerApiTypeSchema = z.enum(["openai-compatible", "anthropic"]);

export type LLMProviderPresetType = z.infer<typeof providerPresetTypeSchema>;
export type LLMProviderApiType = z.infer<typeof providerApiTypeSchema>;

const DEFAULT_API_TYPE_BY_PRESET: Record<LLMProviderPresetType, LLMProviderApiType> = {
	openai: "openai-compatible",
	anthropic: "anthropic",
	deepseek: "openai-compatible",
	openrouter: "openai-compatible",
	ollama: "openai-compatible",
	"openai-compatible": "openai-compatible",
};

export function getDefaultApiTypeForPresetType(
	presetType: LLMProviderPresetType,
): LLMProviderApiType {
	return DEFAULT_API_TYPE_BY_PRESET[presetType];
}

const KNOWN_PRESET_TYPES = new Set<string>(providerPresetTypeSchema.options);

function normalizePresetType(raw: unknown): LLMProviderPresetType {
	if (typeof raw !== "string" || !KNOWN_PRESET_TYPES.has(raw)) {
		return "openai-compatible";
	}
	return raw as LLMProviderPresetType;
}

// Lenient on input (unknown/legacy preset values fall back to "openai-compatible"
// instead of dropping the whole provider) but strict on output, same trade-off
// obsidian-yolo makes for cross-version data.
const llmProviderInputSchema = z.object({
	id: z.string().min(1, "id is required"),
	presetType: z.string().optional(),
	baseUrl: z.string().optional(),
	apiKey: z.string().optional(),
	model: z.string().optional(),
});

const normalizedLlmProviderSchema = z.object({
	id: z.string().min(1, "id is required"),
	presetType: providerPresetTypeSchema,
	apiType: providerApiTypeSchema,
	baseUrl: z.string().optional(),
	apiKey: z.string().optional(),
	model: z.string().optional(),
});

export const llmProviderSchema = llmProviderInputSchema
	.transform((value) => {
		const presetType = normalizePresetType(value.presetType);
		return {
			id: value.id,
			presetType,
			apiType: getDefaultApiTypeForPresetType(presetType),
			...(value.baseUrl !== undefined ? { baseUrl: value.baseUrl } : {}),
			...(value.apiKey !== undefined ? { apiKey: value.apiKey } : {}),
			...(value.model !== undefined ? { model: value.model } : {}),
		};
	})
	.pipe(normalizedLlmProviderSchema);

export type LLMProvider = z.infer<typeof llmProviderSchema>;
