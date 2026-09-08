import { store } from "openrct2-flexui";
import { CometEffect } from "../../fireworks/structures/effects/burstEffects/cometEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, EffectSizePreset , ExplanationParagraph, openEffectWindow } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: "A single comet is launched from a point.", height: 20 },
	{ term: "Extra Longevity", description: "Additional persistence in ticks", height: 14 },
	{ term: "Time Till Stall", description: "The number of ticks before the particles reach\ntheir max height. Affects life time of particles.", height: 28 },
	{ term: "Trail Density", description: "Controls the density of the comet trails", height: 14 },
	{ term: "Trail Width", description: "Controls the width of the comet trails", height: 14 },
	{ term: "Tilt", description: "The angle in the vertical plane of where\nthe particles are shot towards.\n0 = up, 90 = horizontal, 180 = down", height: 36 },
	{ term: "Azimuth", description: "The angle in the horizontal plane of where\nthe particles are shot towards.", height: 28 },
	{ term: "Head", description: "Colour of the comet's head", height: 14 },
	{ term: "Trail 1-2", description: "Colours of the comet's trail", height: 14 },
];

export function openCometEffectWindow(effect: CometEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const extraLongevity = store(effect?.extraLongevity ?? 0);
	const timeTillStall = store(effect?.timeTillStall ?? 45);
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
		height: 400,
		saveText: isEditing ? "Update Effect" : "Add Effect",
		onClose,
		explanation,
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
