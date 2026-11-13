import { LLMProvider } from "../types/provider.types";

export type SkillFlowSettings = {
	providers: LLMProvider[];
};

export const DEFAULT_SETTINGS: SkillFlowSettings = {
	providers: [],
};
