import { App } from "obsidian";

import { GithubPublishConfig } from "../../types/github.types";
import { ReactModal } from "../common/ReactModal";

type ConfirmPublishProps = {
	config: GithubPublishConfig;
	path: string;
	content: string;
	onConfirm: () => void;
};

function ConfirmPublishBody({ config, path, content, onConfirm, onClose }: ConfirmPublishProps & { onClose: () => void }) {
	return (
		<div className="skillflow-confirm-diff">
			<div className="skillflow-confirm-diff__hint">
				确认后将在 <code>{config.owner}/{config.repo}</code> 新建一个基于{" "}
				<code>{config.baseBranch}</code> 的分支，写入 <code>{path}</code>，并开一个 Pull Request。
			</div>
			<pre className="skillflow-diff">{content}</pre>
			<div className="skillflow-confirm-diff__actions">
				<button type="button" onClick={onClose}>
					取消
				</button>
				<button
					type="button"
					className="mod-cta"
					onClick={() => {
						onConfirm();
						onClose();
					}}
				>
					确认发布到 GitHub
				</button>
			</div>
		</div>
	);
}

// L3 (发布到外部仓库)'s per-run gate: unlike the diff confirm for L2 writes,
// this mode's `confirm` field is never honored as "none" — every run shows
// exactly which repo/branch/path/content is about to leave the vault.
export class ConfirmPublishModal extends ReactModal<ConfirmPublishProps> {
	constructor(app: App, skillName: string, config: GithubPublishConfig, path: string, content: string, onConfirm: () => void) {
		super({
			app,
			Component: ConfirmPublishBody,
			props: { config, path, content, onConfirm },
			title: `${skillName} · 发布到 GitHub`,
		});
	}
}
