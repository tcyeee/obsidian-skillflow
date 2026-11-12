import { App } from "obsidian";
import { useMemo, useState } from "react";

import { ReactModal } from "../common/ReactModal";
import {
	PROVIDER_CATALOG,
	PROVIDER_PICKER_CATEGORIES,
	PROVIDER_PICKER_ORDER,
	ProviderPickerCategory,
} from "../../constants/provider-catalog";
import { PROVIDER_PRESET_INFO } from "../../constants/provider-presets";
import type SkillFlowPlugin from "../../main";
import { LLMProviderPresetType } from "../../types/provider.types";

import { AddProviderModal } from "./ProviderFormModal";

type ProviderPickerProps = {
	app: App;
	plugin: SkillFlowPlugin;
};

type CategoryId = "all" | ProviderPickerCategory;

// Mirrors obsidian-yolo's ProviderPickerModal (src/components/settings/modals/ProviderPickerModal.tsx):
// a searchable grid of presets, plus a dedicated "custom" tile for any other
// OpenAI-compatible endpoint, each opening the provider form pre-filled.
export class ProviderPickerModal extends ReactModal<ProviderPickerProps> {
	constructor(app: App, plugin: SkillFlowPlugin) {
		super({ app, Component: ProviderPickerComponent, props: { app, plugin }, title: "Add provider" });
	}
}

function ProviderPickerComponent({
	app,
	plugin,
	onClose,
}: ProviderPickerProps & { onClose: () => void }) {
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState<CategoryId>("all");

	const filtered = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		return PROVIDER_PICKER_ORDER.filter((presetType) => {
			const catalog = PROVIDER_CATALOG[presetType];
			if (category !== "all" && catalog.category !== category) return false;
			if (!normalized) return true;
			const info = PROVIDER_PRESET_INFO[presetType];
			return [info.label, presetType, catalog.monogram].join(" ").toLowerCase().includes(normalized);
		});
	}, [query, category]);

	const openProvider = (presetType: LLMProviderPresetType) => {
		onClose();
		new AddProviderModal(app, plugin, presetType).open();
	};

	return (
		<div className="skillflow-provider-picker">
			<input
				type="text"
				autoFocus
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				placeholder="Search providers"
				className="skillflow-provider-picker__search"
			/>

			<div className="skillflow-provider-picker__chips">
				{PROVIDER_PICKER_CATEGORIES.map((c) => (
					<button
						key={c.id}
						type="button"
						className={`skillflow-provider-picker__chip${category === c.id ? " skillflow-provider-picker__chip--on" : ""}`}
						onClick={() => setCategory(c.id)}
					>
						{c.label}
					</button>
				))}
			</div>

			<div className="skillflow-provider-picker__grid">
				<button
					type="button"
					className="skillflow-provider-picker__tile skillflow-provider-picker__tile--custom"
					onClick={() => openProvider("openai-compatible")}
				>
					<div className="skillflow-provider-picker__tile-icon">+</div>
					<div className="skillflow-provider-picker__tile-name">Custom provider</div>
					<div className="skillflow-provider-picker__tile-sub">Base URL + API key</div>
				</button>

				{filtered.map((presetType) => {
					const catalog = PROVIDER_CATALOG[presetType];
					const info = PROVIDER_PRESET_INFO[presetType];
					return (
						<button
							key={presetType}
							type="button"
							className="skillflow-provider-picker__tile"
							onClick={() => openProvider(presetType)}
						>
							<div
								className="skillflow-provider-picker__tile-icon"
								data-tint={catalog.tint}
							>
								{catalog.monogram}
							</div>
							<div className="skillflow-provider-picker__tile-name">{info.label}</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
