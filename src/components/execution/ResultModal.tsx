import { App } from "obsidian";

import { ReactModal } from "../common/ReactModal";

type ResultProps = { result: string };

function ResultBody({ result }: ResultProps) {
	return (
		<div className="skillflow-result">
			<pre>{result}</pre>
		</div>
	);
}

/** Output mode "modal": shows the Skill's result without touching the note. */
export class ResultModal extends ReactModal<ResultProps> {
	constructor(app: App, title: string, result: string) {
		super({
			app,
			Component: ResultBody,
			props: { result },
			title,
		});
	}
}
