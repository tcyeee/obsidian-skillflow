import { App, Notice } from "obsidian";
import { useEffect, useState } from "react";

import { PROVIDER_CATALOG } from "../../constants/provider-catalog";
import { FALLBACK_MODELS_BY_PRESET } from "../../constants/provider-models";
import { PROVIDER_PRESET_INFO } from "../../constants/provider-presets";
import type SkillFlowPlugin from "../../main";
import {
	LLMProvider,
	LLMProviderPresetType,
	getDefaultApiTypeForPresetType,
	llmProviderSchema,
} from "../../types/provider.types";
import { getDefaultBaseUrlForPreset, resolveProviderPrimaryRequestUrl } from "../../utils/llm/provider-base-url";
import { fetchProviderModels } from "../../utils/llm/fetch-models";
import { ObsidianButton } from "../common/ObsidianButton";
import { ObsidianDropdown } from "../common/ObsidianDropdown";
import { ObsidianSetting } from "../common/ObsidianSetting";
import { ObsidianTextInput } from "../common/ObsidianTextInput";
import { ReactModal } from "../common/ReactModal";

// Sentinel option in the model dropdown for "type it in myself" (models the
// live list and the fallback list both miss).
const CUSTOM_MODEL_OPTION = "__custom__";

type ProviderFormProps = {
	plugin: SkillFlowPlugin;
	provider: LLMProvider | null; // null when adding
	initialPresetType?: LLMProviderPresetType;
	onSaved?: () => void;
};

const PRESET_OPTIONS = Object.fromEntries(
	Object.entries(PROVIDER_PRESET_INFO).map(([key, info]) => [key, info.label]),
);

function suggestProviderId(plugin: SkillFlowPlugin, presetType: LLMProviderPresetType): string {
	const base = PROVIDER_PRESET_INFO[presetType].defaultProviderId;
	if (!base) return "";
	const taken = new Set(plugin.settings.providers.map((p) => p.id));
	if (!taken.has(base)) return base;
	let suffix = 2;
	while (taken.has(`${base}-${suffix}`)) suffix += 1;
	return `${base}-${suffix}`;
}

// Mirrors obsidian-yolo's ProviderFormModal (src/components/settings/modals/ProviderFormModal.tsx):
// one form for both adding and editing a provider, trimmed to id / preset /
// API key / base URL / default model — no custom headers, transport-mode,
// or prompt-caching toggles.
export class AddProviderModal extends ReactModal<ProviderFormProps> {
	private saved = false;
	private readonly onDismiss?: () => void;

	constructor(
		app: App,
		plugin: SkillFlowPlugin,
		initialPresetType?: LLMProviderPresetType,
		onDismiss?: () => void,
	) {
		super({
			app,
			Component: ProviderFormComponent,
			props: {
				plugin,
				provider: null,
				initialPresetType,
				onSaved: () => {
					this.saved = true;
				},
			},
			title: "Add provider",
		});
		this.onDismiss = onDismiss;
	}

	onClose() {
		super.onClose();
		if (!this.saved) this.onDismiss?.();
	}
}

export class EditProviderModal extends ReactModal<ProviderFormProps> {
	constructor(app: App, plugin: SkillFlowPlugin, provider: LLMProvider) {
		super({
			app,
			Component: ProviderFormComponent,
			props: { plugin, provider },
			title: `Edit provider: ${provider.id}`,
		});
	}
}

function ProviderFormComponent({
	plugin,
	provider,
	initialPresetType,
	onSaved,
	onClose,
}: ProviderFormProps & { onClose: () => void }) {
	const [formData, setFormData] = useState<LLMProvider>(
		provider ?? {
			id: suggestProviderId(plugin, initialPresetType ?? "openai-compatible"),
			presetType: initialPresetType ?? "openai-compatible",
			apiType: getDefaultApiTypeForPresetType(initialPresetType ?? "openai-compatible"),
			apiKey: "",
			baseUrl: getDefaultBaseUrlForPreset(initialPresetType ?? "openai-compatible") ?? "",
			model: "",
		},
	);

	const presetInfo = PROVIDER_PRESET_INFO[formData.presetType];
	const apiKeyUrl =
		formData.presetType === "openai-compatible" ? undefined : PROVIDER_CATALOG[formData.presetType].apiKeyUrl;
	const primaryRequestUrlPreview = resolveProviderPrimaryRequestUrl(formData);

	const [liveModels, setLiveModels] = useState<string[]>([]);
	const [modelsLoading, setModelsLoading] = useState(false);
	const [modelsError, setModelsError] = useState<string | null>(null);

	const loadModels = (target: LLMProvider) => {
		setModelsLoading(true);
		setModelsError(null);
		void fetchProviderModels(target)
			.then((models) => setLiveModels(models))
			.catch((error: unknown) => {
				setLiveModels([]);
				setModelsError(error instanceof Error ? error.message : "Failed to load models.");
			})
			.finally(() => setModelsLoading(false));
	};

	// Try once on open, using whatever base URL / API key the form already has
	// (e.g. an existing provider being edited). The refresh button re-runs this
	// with the form's current values after the user tweaks them.
	useEffect(() => {
		loadModels(formData);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once on mount only; loadModels is re-invoked explicitly by the refresh button instead
	}, []);

	const fallbackModels = FALLBACK_MODELS_BY_PRESET[formData.presetType] ?? [];
	const curatedModels = liveModels.length > 0 ? liveModels : fallbackModels;
	const currentModel = formData.model ?? "";
	const modelDropdownOptions: Record<string, string> = {
		...Object.fromEntries(curatedModels.map((model) => [model, model])),
		...(currentModel && !curatedModels.includes(currentModel) ? { [currentModel]: currentModel } : {}),
		[CUSTOM_MODEL_OPTION]: "Custom model ID…",
	};
	const isCustomModel = !curatedModels.includes(currentModel);

	const handleSubmit = () => {
		const isDuplicateId = plugin.settings.providers.some(
			(p) => p.id === formData.id && p.id !== provider?.id,
		);
		if (isDuplicateId) {
			new Notice("A provider with this ID already exists. Try a different ID.");
			return;
		}

		const result = llmProviderSchema.safeParse(formData);
		if (!result.success) {
			new Notice(result.error.issues.map((issue) => issue.message).join("\n"));
			return;
		}
		const validated = result.data;

		void (async () => {
			const providers = provider
				? plugin.settings.providers.map((p) => (p.id === provider.id ? validated : p))
				: [...plugin.settings.providers, validated];
			await plugin.setSettings({ ...plugin.settings, providers });
			onSaved?.();
			onClose();
		})();
	};

	return (
		<div className="skillflow-provider-form">
			<ObsidianSetting name="ID" desc="Used to identify this provider in your settings." required>
				<ObsidianTextInput
					value={formData.id}
					placeholder="my-provider"
					onChange={(value) => setFormData((prev) => ({ ...prev, id: value }))}
				/>
			</ObsidianSetting>

			<ObsidianSetting name="Provider preset" required>
				<ObsidianDropdown
					value={formData.presetType}
					options={PRESET_OPTIONS}
					onChange={(value) => {
						const nextPreset = value as LLMProviderPresetType;
						const idIsSuggested = !provider && formData.id === suggestProviderId(plugin, formData.presetType);
						const next: LLMProvider = {
							...formData,
							...(idIsSuggested ? { id: suggestProviderId(plugin, nextPreset) } : {}),
							presetType: nextPreset,
							apiType: getDefaultApiTypeForPresetType(nextPreset),
							baseUrl: getDefaultBaseUrlForPreset(nextPreset) ?? "",
						};
						setFormData(next);
						setLiveModels([]);
						loadModels(next);
					}}
				/>
			</ObsidianSetting>

			<ObsidianSetting
				name="API key"
				desc={presetInfo.requireApiKey ? "Required for this provider." : "Leave empty if not required."}
			>
				<ObsidianTextInput
					type="password"
					value={formData.apiKey ?? ""}
					placeholder="sk-..."
					onChange={(value) => setFormData((prev) => ({ ...prev, apiKey: value }))}
				/>
			</ObsidianSetting>
			{apiKeyUrl && (
				<div className="skillflow-provider-form__hint">
					<a href={apiKeyUrl} target="_blank" rel="noopener noreferrer">
						Get an API key
					</a>
				</div>
			)}

			<ObsidianSetting name="Base URL" required={presetInfo.requireBaseUrl}>
				<ObsidianTextInput
					value={formData.baseUrl ?? ""}
					placeholder={getDefaultBaseUrlForPreset(formData.presetType) ?? "https://..."}
					onChange={(value) => setFormData((prev) => ({ ...prev, baseUrl: value }))}
				/>
			</ObsidianSetting>
			{primaryRequestUrlPreview && (
				<div className="skillflow-provider-form__hint skillflow-provider-form__url-preview">
					Requests go to <code>{primaryRequestUrlPreview}</code>
				</div>
			)}

			<ObsidianSetting
				name="Default model"
				desc={
					modelsLoading
						? "Loading available models…"
						: modelsError
							? liveModels.length === 0 && fallbackModels.length > 0
								? `Couldn't reach the provider, showing common defaults (${modelsError}).`
								: `Couldn't load the model list (${modelsError}). Pick "Custom model ID…" to type one in.`
							: "The model Skills will use when calling this provider."
				}
			>
				<ObsidianDropdown
					value={isCustomModel ? CUSTOM_MODEL_OPTION : currentModel}
					options={modelDropdownOptions}
					onChange={(value) =>
						setFormData((prev) => ({ ...prev, model: value === CUSTOM_MODEL_OPTION ? "" : value }))
					}
				/>
				<ObsidianButton text={modelsLoading ? "Loading…" : "Refresh"} onClick={() => loadModels(formData)} />
			</ObsidianSetting>
			{isCustomModel && (
				<ObsidianSetting name="Custom model ID">
					<ObsidianTextInput
						value={currentModel}
						placeholder="gpt-4o-mini"
						onChange={(value) => setFormData((prev) => ({ ...prev, model: value }))}
					/>
				</ObsidianSetting>
			)}

			<ObsidianSetting>
				<ObsidianButton text={provider ? "Save" : "Add"} onClick={handleSubmit} cta />
				<ObsidianButton text="Cancel" onClick={onClose} />
			</ObsidianSetting>
		</div>
	);
}
