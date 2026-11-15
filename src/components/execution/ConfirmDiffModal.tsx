import { App } from "obsidian";
import { Fragment, useMemo } from "react";

import { CharSegment, diffSideBySide, SideCell } from "../../utils/diff";
import { ReactModal } from "../common/ReactModal";

type ConfirmDiffProps = {
	before: string;
	after: string;
	onConfirm: () => void;
};

function DiffCell({ cell }: { cell: SideCell }) {
	return (
		<div className="skillflow-diff__line" data-op={cell.op}>
			<span className="skillflow-diff__text">
				{cell.segments ? cell.segments.map((seg, i) => <DiffSegment key={i} segment={seg} />) : cell.text || " "}
			</span>
		</div>
	);
}

function DiffSegment({ segment }: { segment: CharSegment }) {
	return (
		<span className="skillflow-diff__seg" data-op={segment.op}>
			{segment.text}
		</span>
	);
}

function DiffView({ before, after }: { before: string; after: string }) {
	const rows = useMemo(() => diffSideBySide(before, after), [before, after]);
	return (
		<div className="skillflow-diff">
			<div className="skillflow-diff__header">
				<span>修改前</span>
				<span>修改后</span>
			</div>
			<div className="skillflow-diff__body">
				{rows.map((row, i) => (
					<Fragment key={i}>
						<DiffCell cell={row.left} />
						<DiffCell cell={row.right} />
					</Fragment>
				))}
			</div>
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
