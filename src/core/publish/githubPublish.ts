import { requestUrl } from "obsidian";

import { GithubPublishConfig } from "../../types/github.types";

export type PublishRequest = {
	path: string;
	content: string;
	prTitle: string;
	prBody: string;
};

export type PublishResult = {
	branch: string;
	prUrl: string;
};

type GithubRefBody = { object: { sha: string } };
type GithubPullBody = { html_url: string };

// Follows the same `requestUrl({ throw: false })` + manual status check
// convention as the LLM providers (src/core/llm/openaiCompatibleProvider.ts)
// instead of raw `fetch`. The four calls are fixed and in this order — a
// Skill only ever supplies `path`/`content`/`prTitle`/`prBody`, never the
// owner/repo/branch/token, which come solely from `GithubPublishConfig`.
export async function publishNoteAsPr(
	config: GithubPublishConfig,
	request: PublishRequest,
): Promise<PublishResult> {
	const { owner, repo, baseBranch, token } = config;
	const headers: Record<string, string> = {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"Content-Type": "application/json",
	};
	const api = (p: string) => `https://api.github.com/repos/${owner}/${repo}${p}`;

	const check = (response: { status: number; text: string }, action: string): void => {
		if (response.status < 200 || response.status >= 300) {
			throw new Error(`GitHub ${action} failed (${response.status}): ${response.text}`);
		}
	};

	const baseRef = await requestUrl({
		url: api(`/git/ref/heads/${baseBranch}`),
		method: "GET",
		headers,
		throw: false,
	});
	check(baseRef, "读取目标分支");
	const baseSha = (baseRef.json as GithubRefBody).object.sha;

	const branch = `skillflow/${request.path.replace(/[^\w.-]+/g, "-")}-${Date.now()}`;
	const createRef = await requestUrl({
		url: api("/git/refs"),
		method: "POST",
		headers,
		body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
		throw: false,
	});
	check(createRef, "创建分支");

	const putFile = await requestUrl({
		url: api(`/contents/${request.path}`),
		method: "PUT",
		headers,
		body: JSON.stringify({
			message: request.prTitle,
			content: base64Encode(request.content),
			branch,
		}),
		throw: false,
	});
	check(putFile, "写入文件");

	const createPr = await requestUrl({
		url: api("/pulls"),
		method: "POST",
		headers,
		body: JSON.stringify({
			title: request.prTitle,
			body: request.prBody,
			head: branch,
			base: baseBranch,
		}),
		throw: false,
	});
	check(createPr, "创建 PR");

	return { branch, prUrl: (createPr.json as GithubPullBody).html_url };
}

function base64Encode(content: string): string {
	return btoa(unescape(encodeURIComponent(content)));
}
