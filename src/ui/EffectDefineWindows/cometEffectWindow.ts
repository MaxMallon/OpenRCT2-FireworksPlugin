import { store } from "openrct2-flexui";
import { CometEffect } from "../../fireworks/structures/effects/burstEffects/cometEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, EffectSizePreset } from "./shared";
import { openEffectWindow } from "./template";
import { Effect } from "../../fireworks/structures/Effect";

export function openCometEffectWindow(effect: CometEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const extraLongevity = store(effect?.extraLongevity ?? 0);
	const timeTillStall = store(effect?.timeTillStall ?? 0);
	const trailDensity = store(effect?.trailDensity ?? 0.5);
	const trailWidth = store(effect?.trailWidth ?? 3);
	const tilt = store(effect?.tilt ?? 0);
	const azimuth = store(effect?.azimuth ?? 0);
	const colours = createLoadColoursEditor(effect?.colours, ["head", "trail1", "trail2"]);
	const colourRows = createNamedColourPickerRows("solid", colours, [
		{ key: "head", label: "Head", visibleOn: ["solid"] },
		{ key: "trail1", label: "Trail 1", visibleOn: ["solid"] },
		{ key: "trail2", label: "Trail 2", visibleOn: ["solid"] }
	]);

	const trailWidthByLabel: { [key: string]: number } = { "S": 2, "M": 3, "L": 3, "XL": 4 };
	const trailDensityByLabel: { [key: string]: number } = { "S": 0.35, "M": 0.5, "L": 0.6, "XL": 0.7 };
	const sizePresets: EffectSizePreset[] = [
		{ label: "S",  size: 30, physicalSize: 0, extraLongevity: 0 },
		{ label: "M",  size: 45, physicalSize: 0, extraLongevity: 0 },
		{ label: "L",  size: 60, physicalSize: 0, extraLongevity: 0 },
		{ label: "XL", size: 75, physicalSize: 0, extraLongevity: 0 }
	];

	openEffectWindow({
		title: "Comet Mine Effect",
		width: 340,
		height: 390,
		saveText: isEditing ? "Update Effect" : "Add Effect",
		onClose,
		content: [
			createEffectSizePresetRow(sizePresets, preset => {
				timeTillStall.set(preset.size);
				extraLongevity.set(preset.extraLongevity);
				trailDensity.set(trailDensityByLabel[preset.label] ?? 0.5);
				trailWidth.set(trailWidthByLabel[preset.label] ?? 3);
			}),
			createNumberRow("Extra Longevity", extraLongevity, 0, 100),
			createNumberRow("Time Till Stall", timeTillStall, 0, 80),
			createNumberRow("Trail Density", trailDensity, 0, 1, 0.05),
			createNumberRow("Trail Width", trailWidth, 0, 10, 0.5),            
			createNumberRow("Tilt (0=up, 90=horiz)", tilt, 0, 180, 2),
			createNumberRow("Azimuth (0=Y, 90=X)", azimuth, -360, 360, 5),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new CometEffect(extraLongevity.get(), colours.colours, timeTillStall.get(), trailDensity.get(), trailWidth.get(), tilt.get(), azimuth.get()));
		}
	});
}
