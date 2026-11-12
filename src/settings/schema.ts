import { GithubPublishConfig } from "../types/github.types";
import { LLMProvider } from "../types/provider.types";

export type SkillFlowSettings = {
	providers: LLMProvider[];
	github?: GithubPublishConfig;
};

export const DEFAULT_SETTINGS: SkillFlowSettings = {
	providers: [],
};
