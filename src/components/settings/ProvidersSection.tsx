import { App, Menu } from "obsidian";
import type { MouseEvent } from "react";

import { getProviderIdentity } from "../../constants/provider-catalog";
import { useSettings } from "../../contexts/settings-context";
import type SkillFlowPlugin from "../../main";
import { LLMProvider } from "../../types/provider.types";
import { isProviderReady } from "../../utils/llm/provider-ready";
import { ObsidianIcon } from "../common/ObsidianIcon";
import { ProviderIcon } from "../common/ProviderIcon";

import { EditProviderModal } from "./ProviderFormModal";
import { ProviderPickerModal } from "./ProviderPickerModal";

type ProvidersSectionProps = {
	app: App;
	plugin: SkillFlowPlugin;
};

// Mirrors obsidian-yolo's ProvidersSection (src/components/settings/sections/ProvidersSection.tsx):
// a list of configured providers plus an "Add provider" action that opens
// the picker, trimmed down to the fields SkillFlow actually uses.
//
// Rendered as an identity list rather than a data table: each row carries the
// same monogram + tint used in the picker grid, so a provider reads as "the
// same thing" whether you're choosing it or reviewing it.
export function ProvidersSection({ app, plugin }: ProvidersSectionProps) {
	const { settings, setSettings } = useSettings();

	const handleDelete = (provider: LLMProvider) => {
		void setSettings({
			...settings,
			providers: settings.providers.filter((p) => p.id !== provider.id),
		});
	};

	const openRowMenu = (event: MouseEvent, provider: LLMProvider) => {
		event.stopPropagation();
		const menu = new Menu();
		menu.addItem((item) =>
			item.setTitle("Edit").setIcon("pencil").onClick(() => new EditProviderModal(app, plugin, provider).open()),
		);
		menu.addSeparator();
		menu.addItem((item) =>
			item
				.setTitle("Delete")
				.setIcon("trash-2")
				.setWarning(true)
				.onClick(() => handleDelete(provider)),
		);
		menu.showAtMouseEvent(event.nativeEvent);
	};

	return (
		<div className="skillflow-providers">
			<div className="skillflow-providers__header">
				<div>
					<div className="skillflow-providers__title">Model providers</div>
					<div className="skillflow-providers__desc">
						Connect SkillFlow to the models your Skills run on.
					</div>
				</div>
				<button
					type="button"
					className="mod-cta skillflow-providers__add"
					onClick={() => new ProviderPickerModal(app, plugin).open()}
				>
					<ObsidianIcon icon="plus" />
					Add provider
				</button>
			</div>

			{settings.providers.length === 0 ? (
				<div className="skillflow-providers__empty">
					<ObsidianIcon icon="plug-zap" className="skillflow-providers__empty-icon" />
					<div className="skillflow-providers__empty-title">No providers yet</div>
					<div className="skillflow-providers__empty-desc">
						Skills need a model to run on. Add a provider to get started.
					</div>
					<button
						type="button"
						className="mod-cta"
						onClick={() => new ProviderPickerModal(app, plugin).open()}
					>
						Add provider
					</button>
				</div>
			) : (
				<ul className="skillflow-provider-list">
					{settings.providers.map((provider) => {
						const identity = getProviderIdentity(provider);
						const ready = isProviderReady(provider);
						return (
							<li
								key={provider.id}
								className="skillflow-provider-row"
								onClick={() => new EditProviderModal(app, plugin, provider).open()}
							>
								<div className="skillflow-provider-row__icon" data-tint={identity.tint}>
									<ProviderIcon
										icon={identity.icon}
										monogram={identity.monogram}
										className="skillflow-provider-row__icon-svg"
									/>
								</div>
								<div className="skillflow-provider-row__main">
									<div className="skillflow-provider-row__id">{provider.id}</div>
									<div className="skillflow-provider-row__model">
										{provider.model || "No default model set"}
									</div>
								</div>
								<div
									className="skillflow-provider-row__status"
									data-state={ready ? "ok" : "warn"}
								>
									<span className="skillflow-provider-row__dot" />
									{ready ? "Connected" : "Needs API key"}
								</div>
								<button
									type="button"
									className="clickable-icon skillflow-provider-row__menu"
									aria-label="Provider actions"
									onClick={(event) => openRowMenu(event, provider)}
								>
									<ObsidianIcon icon="more-vertical" />
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
