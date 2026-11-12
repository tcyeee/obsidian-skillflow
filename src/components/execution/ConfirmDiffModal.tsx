import { App } from "obsidian";

import { diffLines } from "../../utils/diff";
import { ReactModal } from "../common/ReactModal";

type ConfirmDiffProps = {
	before: string;
	after: string;
	onConfirm: () => void;
};

function DiffView({ before, after }: { before: string; after: string }) {
	const lines = diffLines(before, after);
	return (
		<div className="skillflow-diff">
			{lines.map((line, i) => (
				<div key={i} className="skillflow-diff__line" data-op={line.op}>
					<span className="skillflow-diff__marker">
						{line.op === "add" ? "+" : line.op === "remove" ? "-" : " "}
					</span>
					<span className="skillflow-diff__text">{line.text || " "}</span>
				</div>
			))}
		</div>
	);
}

function ConfirmDiffBody({ before, after, onConfirm, onClose }: ConfirmDiffProps & { onClose: () => void }) {
	return (
		<div className="skillflow-confirm-diff">
			<div className="skillflow-confirm-diff__hint">确认后将把下面的改动写入笔记。</div>
			<DiffView before={before} after={after} />
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
					确认写入
				</button>
			</div>
		</div>
	);
}

// Backs F-110 (TODO.md §7.1): a modify-class Skill result is previewed as a
// diff against the current content and only written on explicit confirm.
export class ConfirmDiffModal extends ReactModal<ConfirmDiffProps> {
	constructor(app: App, title: string, before: string, after: string, onConfirm: () => void) {
		super({
			app,
			Component: ConfirmDiffBody,
			props: { before, after, onConfirm },
			title: `${title} · 预览改动`,
		});
	}
}
