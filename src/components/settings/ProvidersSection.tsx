import { App } from "obsidian";

import { PROVIDER_PRESET_INFO } from "../../constants/provider-presets";
import { useSettings } from "../../contexts/settings-context";
import type SkillFlowPlugin from "../../main";
import { LLMProvider } from "../../types/provider.types";

import { EditProviderModal } from "./ProviderFormModal";
import { ProviderPickerModal } from "./ProviderPickerModal";

type ProvidersSectionProps = {
	app: App;
	plugin: SkillFlowPlugin;
};

// Mirrors obsidian-yolo's ProvidersSection (src/components/settings/sections/ProvidersSection.tsx):
// a table of configured providers plus an "Add provider" action that opens
// the picker, trimmed down to the fields SkillFlow actually uses.
export function ProvidersSection({ app, plugin }: ProvidersSectionProps) {
	const { settings, setSettings } = useSettings();

	const handleDelete = (provider: LLMProvider) => {
		void setSettings({
			...settings,
			providers: settings.providers.filter((p) => p.id !== provider.id),
		});
	};

	return (
		<div className="skillflow-settings-section">
			<div className="skillflow-settings-header">Model providers</div>
			<div className="skillflow-settings-desc">
				Connect SkillFlow to the AI models your Skills run on.
			</div>

			<div className="skillflow-settings-table-container">
				<table className="skillflow-settings-table">
					<thead>
						<tr>
							<th>ID</th>
							<th>Type</th>
							<th>Model</th>
							<th>API Key</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{settings.providers.map((provider) => (
							<tr key={provider.id}>
								<td>{provider.id}</td>
								<td>{PROVIDER_PRESET_INFO[provider.presetType].label}</td>
								<td>{provider.model || "—"}</td>
								<td>
									<button
										type="button"
										className="clickable-icon"
										onClick={() => new EditProviderModal(app, plugin, provider).open()}
									>
										{provider.apiKey ? "••••••••" : "Set API key"}
									</button>
								</td>
								<td>
									<div className="skillflow-settings-actions">
										<button
											type="button"
											className="clickable-icon"
											onClick={() => new EditProviderModal(app, plugin, provider).open()}
										>
											Edit
										</button>
										<button
											type="button"
											className="clickable-icon skillflow-settings-danger"
											onClick={() => handleDelete(provider)}
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						))}
						{settings.providers.length === 0 && (
							<tr>
								<td colSpan={5} className="skillflow-settings-empty">
									No providers configured yet.
								</td>
							</tr>
						)}
					</tbody>
				</table>
				<button
					type="button"
					className="mod-cta skillflow-settings-add-provider"
					onClick={() => new ProviderPickerModal(app, plugin).open()}
				>
					Add provider
				</button>
			</div>
		</div>
	);
}
