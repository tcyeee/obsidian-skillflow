import { App, Notice } from "obsidian";
import { useState } from "react";

import { PROVIDER_CATALOG } from "../../constants/provider-catalog";
import { PROVIDER_PRESET_INFO } from "../../constants/provider-presets";
import type SkillFlowPlugin from "../../main";
import {
	LLMProvider,
	LLMProviderPresetType,
	getDefaultApiTypeForPresetType,
	llmProviderSchema,
} from "../../types/provider.types";
import { getDefaultBaseUrlForPreset, resolveProviderPrimaryRequestUrl } from "../../utils/llm/provider-base-url";
import { ObsidianButton } from "../common/ObsidianButton";
import { ObsidianDropdown } from "../common/ObsidianDropdown";
import { ObsidianSetting } from "../common/ObsidianSetting";
import { ObsidianTextInput } from "../common/ObsidianTextInput";
import { ReactModal } from "../common/ReactModal";

type ProviderFormProps = {
	plugin: SkillFlowPlugin;
	provider: LLMProvider | null; // null when adding
	initialPresetType?: LLMProviderPresetType;
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
	constructor(app: App, plugin: SkillFlowPlugin, initialPresetType?: LLMProviderPresetType) {
		super({
			app,
			Component: ProviderFormComponent,
			props: { plugin, provider: null, initialPresetType },
			title: "Add provider",
		});
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
						setFormData((prev) => {
							const idIsSuggested = !provider && prev.id === suggestProviderId(plugin, prev.presetType);
							return {
								...prev,
								...(idIsSuggested ? { id: suggestProviderId(plugin, nextPreset) } : {}),
								presetType: nextPreset,
								apiType: getDefaultApiTypeForPresetType(nextPreset),
								baseUrl: getDefaultBaseUrlForPreset(nextPreset) ?? "",
							};
						});
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

			<ObsidianSetting
				name="Base URL"
				desc={`Request URL preview: ${primaryRequestUrlPreview ?? "—"}`}
				required={presetInfo.requireBaseUrl}
			>
				<ObsidianTextInput
					value={formData.baseUrl ?? ""}
					placeholder={getDefaultBaseUrlForPreset(formData.presetType) ?? "https://..."}
					onChange={(value) => setFormData((prev) => ({ ...prev, baseUrl: value }))}
				/>
			</ObsidianSetting>

			<ObsidianSetting name="Default model" desc="The model ID Skills will use when calling this provider.">
				<ObsidianTextInput
					value={formData.model ?? ""}
					placeholder="gpt-4o-mini"
					onChange={(value) => setFormData((prev) => ({ ...prev, model: value }))}
				/>
			</ObsidianSetting>

			<ObsidianSetting>
				<ObsidianButton text={provider ? "Save" : "Add"} onClick={handleSubmit} cta />
				<ObsidianButton text="Cancel" onClick={onClose} />
			</ObsidianSetting>
		</div>
	);
}
