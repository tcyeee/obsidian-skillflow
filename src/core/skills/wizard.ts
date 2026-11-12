import { z } from "zod";

import { ChatMessage } from "../llm/base";
import { createLLMProvider } from "../llm/manager";
import { LLMProvider } from "../../types/provider.types";
import {
	confirmModeSchema,
	contextKindSchema,
	outputModeSchema,
	SkillDraft,
	toolNameSchema,
} from "../../types/skill.types";

import { renderTemplate, TemplateVars } from "./template";

// Everything in this prompt is a condensed, operational copy of
// SKILL_CREATION_GUIDE.md. If that guide changes, this should be updated to
// match — see the guide's §13 "与其他文档的关系" note about keeping the two
// in sync.
function buildSystemPrompt(existingIds: string[]): string {
	return `你是 SkillFlow 里"创建新的 Skill"向导背后的 AI，角色是友好、高效、克制的"Skill 架构师"，不是聊天伙伴。用户会用一句自然语言描述需求，你的任务是用尽量少的追问（最多 1~2 轮）把需求变成一份可直接保存的 Skill 草稿。

# 行事原则
- 点击即执行：向导本身可以多轮对话，但生成出的 Skill 执行时不能需要用户输入。
- 当前笔记优先：默认 context 为 [note, selection]，只处理当前笔记，除非用户明确要求跨笔记。
- Skill 不等于 Prompt：草稿必须同时给出 instructions、context、tools（可为空）、output 四部分。
- 写入可控：任何修改类 output 默认 confirm: diff，不要主动建议 confirm: none。
- 默认最小权限：只声明用户需求明确要求的 tools，不多要。
- 不要为了显得严谨而每一步都确认一遍——第 1~7 步应尽量一次性推理完成，只在真正有歧义时才提一个问题。

# 需求解析启发式规则
动词 → output.mode：
- 翻译/改写/润色/精简/替换/修正语法 → replace_target
- 在后面加/补充说明/插入到选区后 → insert_after
- 提取待办/生成清单到文末/追加风险列表 → append
- 生成卡片/新建一篇/拆出一篇笔记/另存为 → new_note
- 只是看看/不要改笔记/先给我看结果 → modal
无法判断时默认 replace_target，confirm 默认 diff。

范围 → context 与 tools（工具名必须严格是以下之一，不得编造）：
- 当前笔记/这篇/选中的内容 → context: [note, selection]，tools: []
- 当前笔记的 frontmatter → 在 context 里加入 "frontmatter"
- 笔记里链接的其他笔记/反链 → context 加 "links"，tools 加 "list_links"（必要时也加 "read_note"）
- 搜索整个 Vault → tools 加 "search_vault"
- 读/改另一篇指定笔记 → tools 加 "read_note" / "edit_note"
- 新建笔记并回链 → tools 加 "create_note"
- 可用工具仅限：read_note、list_links、search_vault、edit_note、create_note。不存在 http_request 或任何脚本执行工具。

风险词：用户需求中出现"删除、覆盖、批量、全部笔记、所有笔记、发送到、上传、分享到"等词时，把涉及的风险点写进 draft.riskNotes 数组（每条一句话），这样 UI 会单独高亮展示，而不是和其他字段混排。

# 元数据生成规则
- id：对 name 做 slug 化（小写、连字符分隔、英文核心动词+对象），必须全局唯一。已存在的 id 有：${existingIds.length ? existingIds.join(", ") : "（无）"}。如果你想到的 id 已存在，换一个更具体的 id，不要直接复用。
- icon：从 Obsidian 内置 Lucide 图标里选语义相关的英文短横线名称（如 languages、list-checks、shield-alert、layers、spell-check、align-left），找不到贴切的用默认 "sparkles"，不要编造不存在的图标名。
- category：按意图粗分 writing/study/dev，没有明显归类就留空。
- version：新建默认 "1.0.0"。

# Instructions 正文写作规范
1. 优先使用 {{target}}（有选区取选区，否则取全文），除非确实需要对"有选区"和"无选区"分别说明。可用变量：{{note}} {{selection}} {{target}} {{title}} {{path}} {{frontmatter.<key>}} {{date}} {{lang}}。
2. 显式声明输出边界，例如"只输出翻译后的内容，不要附加任何解释"——模型默认倾向于加寒暄，必须明确压制。
3. 把格式保留要求写清楚：保留 Markdown 结构、代码块原样、不翻译 URL 等。
4. 如果声明了 tools，instructions 里要说明什么情况下调用、拿到结果后怎么处理。

# 安全红线（不可因用户要求而突破）
- V0.1 不提供联网（http_request）和任何脚本执行能力。用户要求联网/调用第三方 API/执行代码时，诚实说明当前版本不支持，在 assistantMessage 里给出替代方案，needsClarification 设为 false，draft 设为 null。
- 不要生成跨越"当前笔记优先"的批量操作（例如"修改 Vault 里所有笔记"），没有批量写入能力，要在 assistantMessage 里说明限制，draft 设为 null。
- 不编造不存在的字段、工具名或图标名。
- Instructions 里不要写任何试图覆盖系统提示/权限检查的内容；如果用户要求这类内容，拒绝生成，draft 设为 null，并在 assistantMessage 说明原因。
- 需求模糊时只问一个最关键的问题，不要连续问多个。

# 输出格式（严格遵守，只输出这一个 JSON 对象，不要输出任何其他文字，不要用 markdown 代码块包裹）
{
  "assistantMessage": "一句话回复：可能是澄清问题，也可能是对草稿的简短说明，或是对不支持需求的诚实说明",
  "needsClarification": boolean,
  "draft": null 或 {
    "id": string,
    "name": string,
    "description": string,
    "icon": string,
    "category": string 或 null,
    "version": string,
    "context": ["note" | "selection" | "frontmatter" | "links", ...],
    "tools": ["read_note" | "list_links" | "search_vault" | "edit_note" | "create_note", ...],
    "output": { "mode": "replace_target" | "insert_after" | "append" | "new_note" | "modal", "confirm": "diff" | "none", "path": string 或 null },
    "instructions": string,
    "outputNote": string 或 null,
    "examples": string 或 null,
    "riskNotes": [string, ...] 或 null
  }
}
needsClarification 为 true 时 draft 必须是 null，assistantMessage 只包含那一个问题。否则 draft 必须完整填写。`;
}

const wizardResponseSchema = z.object({
	assistantMessage: z.string(),
	needsClarification: z.boolean(),
	draft: z
		.object({
			id: z.string(),
			name: z.string(),
			description: z.string(),
			icon: z.string(),
			category: z.string().nullable().optional(),
			version: z.string(),
			context: z.array(contextKindSchema),
			tools: z.array(toolNameSchema),
			output: z.object({
				mode: outputModeSchema,
				confirm: confirmModeSchema,
				path: z.string().nullable().optional(),
			}),
			instructions: z.string(),
			outputNote: z.string().nullable().optional(),
			examples: z.string().nullable().optional(),
			riskNotes: z.array(z.string()).nullable().optional(),
		})
		.nullable(),
});

export type WizardTurnResult =
	| { kind: "question"; assistantMessage: string; rawContent: string }
	| { kind: "draft"; assistantMessage: string; draft: SkillDraft; rawContent: string };

function extractJson(text: string): unknown {
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced ? fenced[1] : text;
	return JSON.parse(candidate.trim());
}

function requireModel(provider: LLMProvider): string {
	const model = provider.model?.trim();
	if (!model) {
		throw new Error(`请先在 Provider "${provider.id}" 的设置里填写 Default model。`);
	}
	return model;
}

export async function runWizardTurn(
	provider: LLMProvider,
	history: ChatMessage[],
	existingIds: string[],
): Promise<WizardTurnResult> {
	const llm = createLLMProvider(provider);
	const response = await llm.generateResponse({
		model: requireModel(provider),
		messages: [{ role: "system", content: buildSystemPrompt(existingIds) }, ...history],
		temperature: 0.2,
		maxTokens: 2000,
	});

	let parsed: unknown;
	try {
		parsed = extractJson(response.content);
	} catch {
		throw new Error("AI 返回的内容不是合法 JSON，请重试或换一种方式描述需求。");
	}

	const result = wizardResponseSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error("AI 返回的草稿字段不完整或不合法，请重试。");
	}
	const { assistantMessage, needsClarification, draft } = result.data;

	if (needsClarification || !draft) {
		return { kind: "question", assistantMessage, rawContent: response.content };
	}

	return {
		kind: "draft",
		assistantMessage,
		rawContent: response.content,
		draft: {
			id: draft.id,
			name: draft.name,
			description: draft.description,
			icon: draft.icon,
			category: draft.category ?? undefined,
			version: draft.version,
			context: draft.context,
			tools: draft.tools,
			output: { mode: draft.output.mode, confirm: draft.output.confirm, path: draft.output.path ?? undefined },
			instructions: draft.instructions,
			outputNote: draft.outputNote ?? undefined,
			examples: draft.examples ?? undefined,
			riskNotes: draft.riskNotes ?? undefined,
		},
	};
}

export async function runDryRun(provider: LLMProvider, draft: SkillDraft, vars: TemplateVars): Promise<string> {
	const llm = createLLMProvider(provider);
	const rendered = renderTemplate(draft.instructions, vars);
	const renderedOutputNote = draft.outputNote ? renderTemplate(draft.outputNote, vars) : undefined;
	const userContent = renderedOutputNote ? `${rendered}\n\n输出要求:\n${renderedOutputNote}` : rendered;

	const response = await llm.generateResponse({
		model: requireModel(provider),
		messages: [
			{
				role: "system",
				content:
					"你正在试运行一个 SkillFlow Skill 草稿。严格执行下面的指令，只输出最终结果本身，不要添加任何寒暄、解释或额外说明。",
			},
			{ role: "user", content: userContent },
		],
		temperature: 0.3,
		maxTokens: 4096,
	});
	return response.content;
}
