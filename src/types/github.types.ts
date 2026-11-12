import { z } from "zod";

// The single publish target a Skill's `github_pr` output mode pushes to.
// Deliberately one global config, not a per-Skill or per-repo list: the
// destination repo and token must be fixed by the user in Settings, never
// something a Skill (or the AI drafting it) gets to choose.
export const githubPublishConfigSchema = z.object({
	owner: z.string().min(1, "Owner is required"),
	repo: z.string().min(1, "Repo is required"),
	baseBranch: z.string().min(1, "Base branch is required").default("main"),
	token: z.string().min(1, "Token is required"),
});

export type GithubPublishConfig = z.infer<typeof githubPublishConfigSchema>;
