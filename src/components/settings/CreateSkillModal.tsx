import { App, MarkdownView, Notice } from "obsidian";
import { useEffect, useRef, useState } from "react";

import { OUTPUT_MODE_LABELS, PERMISSION_LEVEL_INFO, TOOL_INFO, computePermissionLevel } from "../../constants/skill-tools";
import { ChatMessage } from "../../core/llm/base";
import { parseSkillFile, serializeSkill } from "../../core/skills/skillFile";
import { buildTemplateVars } from "../../core/skills/template";
import { runDryRun, runWizardTurn } from "../../core/skills/wizard";
import { saveNewSkill, skillIdExists } from "../../core/skills/registry";
import type SkillFlowPlugin from "../../main";
import { Skill, SkillDraft } from "../../types/skill.types";
import { isProviderReady } from "../../utils/llm/provider-ready";
import { ObsidianIcon } from "../common/ObsidianIcon";
import { ReactModal } from "../common/ReactModal";

type CreateSkillProps = {
	app: App;
	plugin: SkillFlowPlugin;
	existingSkills: Skill[];
	onSaved: () => void;
};

// The interaction this implements: a single chat input drives the whole
// draft (SKILL_CREATION_GUIDE.md §2) instead of a multi-step field-by-field
// form — the guide explicitly asks the AI to resolve most fields in one pass
// and only ask one clarifying question when genuinely ambiguous, so a classic
// "Next / Back" wizard would just re-impose the busywork the AI already
// absorbed. Revisions happen by sending another message, not by reopening a
// form; a raw-Markdown fallback exists for when the model gets a field wrong.
export class CreateSkillModal extends ReactModal<CreateSkillProps> {
	constructor(app: App, plugin: SkillFlowPlugin, existingSkills: Skill[], onSaved: () => void) {
		super({
			app,
			Component: CreateSkillWizard,
			props: { app, plugin, existingSkills, onSaved },
			title: "新建 Skill",
		});
	}
}

type DisplayMessage = { role: "user" | "assistant"; text: string };

// Concrete starting points rather than an inline "例如" sentence — clicking
// one fills the composer so the empty state doubles as a quick-start action,
// not just inert example copy.
const EXAMPLE_PROMPTS = ["一键把笔记翻译成英文", "把选中文字改写得更简洁", "根据笔记内容生成待办清单"];

function autoGrowTextarea(el: HTMLTextAreaElement | null): void {
	if (!el) return;
	el.setCssStyles({ height: "auto" });
	el.setCssStyles({ height: `${el.scrollHeight}px` });
}

function DraftCard({ draft }: { draft: SkillDraft }) {
	const level = computePermissionLevel(draft.tools, draft.output.mode);
	return (
		<div className="skillflow-draft-card">
			<div className="skillflow-draft-card__head">
				<div className="skillflow-draft-card__icon">
					<ObsidianIcon icon={draft.icon} />
				</div>
				<div className="skillflow-draft-card__title">
					<div className="skillflow-draft-card__name">{draft.name}</div>
					<div className="skillflow-draft-card__desc">{draft.description}</div>
				</div>
			</div>

			<div className="skillflow-draft-card__badges">
				<span className="skillflow-chip">{OUTPUT_MODE_LABELS[draft.output.mode]}</span>
				<span className="skillflow-chip">{draft.output.confirm === "diff" ? "写入前需确认 diff" : "直接写入"}</span>
				{draft.category && <span className="skillflow-chip">{draft.category}</span>}
				<span
					className="skillflow-permission-badge"
					data-level={level}
					title={
						draft.tools.length
							? draft.tools.map((tool) => TOOL_INFO[tool].label).join("、")
							: PERMISSION_LEVEL_INFO[level].desc
					}
				>
					{PERMISSION_LEVEL_INFO[level].label}
				</span>
			</div>

			{!!draft.riskNotes?.length && (
				<div className="skillflow-draft-card__risk">
					<ObsidianIcon icon="shield-alert" className="skillflow-draft-card__risk-icon" />
					<ul>
						{draft.riskNotes.map((note, i) => (
							<li key={i}>{note}</li>
						))}
					</ul>
				</div>
			)}

			<details className="skillflow-draft-card__instructions">
				<summary>查看 Instructions</summary>
				<pre>{draft.instructions}</pre>
				{draft.outputNote && (
					<>
						<div className="skillflow-draft-card__section-label">Output</div>
						<pre>{draft.outputNote}</pre>
					</>
				)}
			</details>

			<div className="skillflow-draft-card__meta">
				id: {draft.id} · v{draft.version}
			</div>
		</div>
	);
}

function CreateSkillWizard({ app, plugin, existingSkills, onSaved, onClose }: CreateSkillProps & { onClose: () => void }) {
	const provider = plugin.settings.providers.find(isProviderReady) ?? null;

	const [apiHistory, setApiHistory] = useState<ChatMessage[]>([]);
	const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
	const [draft, setDraft] = useState<SkillDraft | null>(null);
	const [input, setInput] = useState("");
	const [busy, setBusy] = useState(false);
	const [wizardError, setWizardError] = useState<string | null>(null);

	const [rawEditing, setRawEditing] = useState(false);
	const [rawText, setRawText] = useState("");

	const [dryRunBusy, setDryRunBusy] = useState(false);
	const [dryRunResult, setDryRunResult] = useState<string | null>(null);
	const [dryRunError, setDryRunError] = useState<string | null>(null);

	const [saveError, setSaveError] = useState<string | null>(null);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	useEffect(() => autoGrowTextarea(textareaRef.current), [input]);

	const existingIds = existingSkills.map((skill) => skill.id);

	const send = async (history: ChatMessage[]) => {
		if (!provider) return;
		setBusy(true);
		setWizardError(null);
		try {
			const result = await runWizardTurn(provider, history, existingIds, !!plugin.settings.github);
			setApiHistory([...history, { role: "assistant", content: result.rawContent }]);
			setDisplayMessages((prev) => [...prev, { role: "assistant", text: result.assistantMessage }]);
			if (result.kind === "draft") {
				setDraft(result.draft);
				setRawEditing(false);
				setDryRunResult(null);
				setDryRunError(null);
			}
		} catch (error) {
			setWizardError(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	};

	const handleSend = () => {
		const text = input.trim();
		if (!text || busy) return;
		const history: ChatMessage[] = [...apiHistory, { role: "user", content: text }];
		setApiHistory(history);
		setDisplayMessages((prev) => [...prev, { role: "user", text }]);
		setInput("");
		void send(history);
	};

	const handleRetry = () => void send(apiHistory);

	const handleDryRun = () => {
		if (!draft || !provider) return;
		const view = app.workspace.getActiveViewOfType(MarkdownView);
		if (!view || !view.file) {
			setDryRunError("请先打开一篇笔记再试运行。");
			setDryRunResult(null);
			return;
		}
		setDryRunBusy(true);
		setDryRunError(null);
		void runDryRun(provider, draft, buildTemplateVars(view))
			.then((result) => setDryRunResult(result))
			.catch((error) => setDryRunError(error instanceof Error ? error.message : String(error)))
			.finally(() => setDryRunBusy(false));
	};

	const toggleRawEditing = () => {
		if (!draft) return;
		if (!rawEditing) setRawText(serializeSkill(draft));
		setRawEditing((prev) => !prev);
	};

	const applyRawEdits = () => {
		const parsed = parseSkillFile(rawText);
		if (!parsed) {
			new Notice("解析失败：请检查 frontmatter 和 # Instructions 段落的格式。");
			return;
		}
		setDraft(parsed);
		setRawEditing(false);
	};

	const handleSave = () => {
		if (!draft) return;
		if (skillIdExists(existingSkills, draft.id)) {
			setSaveError(`已存在同名 Skill "${draft.id}"，请在对话里要求换一个 id。`);
			return;
		}
		void saveNewSkill(app, draft)
			.then((saved) => {
				new Notice(`已保存 "${saved.name}"，菜单中已可使用。`);
				onSaved();
				onClose();
			})
			.catch((error) => setSaveError(error instanceof Error ? error.message : String(error)));
	};

	if (!provider) {
		return <div className="skillflow-wizard__empty">请先在设置里添加并配置一个模型 Provider。</div>;
	}

	return (
		<div className="skillflow-wizard">
			<div className="skillflow-wizard__scroll">
				<div className="skillflow-wizard__thread">
					{displayMessages.length === 0 && (
						<>
							<div className="skillflow-wizard__message" data-role="assistant">
								告诉我你想要的 Skill，我会帮你生成草稿。
							</div>
							<div className="skillflow-wizard__suggestions">
								{EXAMPLE_PROMPTS.map((example) => (
									<button
										key={example}
										type="button"
										className="skillflow-wizard__suggestion"
										onClick={() => {
											setInput(example);
											textareaRef.current?.focus();
										}}
									>
										{example}
									</button>
								))}
							</div>
						</>
					)}
					{displayMessages.map((message, i) => (
						<div key={i} className="skillflow-wizard__message" data-role={message.role}>
							{message.text}
						</div>
					))}
					{busy && <div className="skillflow-wizard__message skillflow-wizard__message--pending">AI 正在生成草稿…</div>}
					{wizardError && (
						<div className="skillflow-wizard__error">
							{wizardError}
							<button type="button" onClick={handleRetry}>
								重试
							</button>
						</div>
					)}
				</div>

				{draft && !rawEditing && <DraftCard draft={draft} />}

				{rawEditing && (
					<div className="skillflow-wizard__raw">
						<textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={16} />
						<div className="skillflow-wizard__raw-actions">
							<button type="button" className="mod-cta" onClick={applyRawEdits}>
								应用修改
							</button>
							<button type="button" onClick={() => setRawEditing(false)}>
								取消
							</button>
						</div>
					</div>
				)}

				{(dryRunResult || dryRunError) && !rawEditing && (
					<div className="skillflow-wizard__dryrun">
						<div className="skillflow-wizard__dryrun-head">
							试运行结果（未写入笔记）
							<button
								type="button"
								className="clickable-icon"
								onClick={() => {
									setDryRunResult(null);
									setDryRunError(null);
								}}
							>
								<ObsidianIcon icon="x" />
							</button>
						</div>
						{dryRunError ? (
							<div className="skillflow-wizard__error">{dryRunError}</div>
						) : (
							<pre>{dryRunResult}</pre>
						)}
					</div>
				)}
			</div>

			<div className="skillflow-wizard__bottom">
				<div className="skillflow-wizard__composer">
					<div className="skillflow-wizard__input">
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSend();
								}
							}}
							placeholder={draft ? "继续用自然语言调整这份草稿…" : "描述你想要的 Skill…"}
							rows={1}
							disabled={busy}
						/>
						<button
							type="button"
							className="skillflow-wizard__send"
							onClick={handleSend}
							disabled={busy || !input.trim()}
							aria-label="发送"
							title="发送"
						>
							<ObsidianIcon icon="arrow-up" />
						</button>
					</div>
				</div>

				{saveError && <div className="skillflow-wizard__error">{saveError}</div>}

				<div className="skillflow-wizard__actions">
					<button type="button" onClick={onClose}>
						取消
					</button>
					<div className="skillflow-wizard__actions-right">
						{draft && (
							<button type="button" onClick={toggleRawEditing}>
								{rawEditing ? "取消编辑" : "编辑原始 Markdown"}
							</button>
						)}
						{draft && !rawEditing && (
							<button type="button" onClick={handleDryRun} disabled={dryRunBusy}>
								{dryRunBusy ? "试运行中…" : "试运行"}
							</button>
						)}
						<button type="button" className="mod-cta" onClick={handleSave} disabled={!draft || rawEditing}>
							保存
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
