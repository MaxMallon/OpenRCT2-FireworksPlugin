import { store } from "openrct2-flexui";
import { CometFanEffect } from "../../fireworks/structures/effects/burstEffects/cometFanEffect";
import { openEffectWindow, applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, createSequenceDropdownRowWithReverse, EffectSizePreset, ExplanationParagraph, normalizePatternSelection  } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: "A fan of comets is launched from a point.", height: 20 },
	{ term: "Number Comets", description: "Exact number of comets to make the fan", height: 14 },
	{ term: "Fan Angle", description: "The angle of the fan in a sense of how wide it is", height: 14 },
	{ term: "Fan Orientation", description: "The angle of the fan on the ground, which\nway it faces", height: 28 },
	{ term: "Extra Longevity", description: "Additional persistence in ticks", height: 14 },
	{ term: "Time Till Stall", description: "The number of ticks before the particles reach\ntheir max height. Affects life time of particles.", height: 28 },
	{ term: "Trail Density", description: "Controls the density of the comet trails", height: 14 },
	{ term: "Trail Width", description: "Controls the width of the comet trails", height: 14 },
	{ term: "Colour pattern", description: "Determines the sequence and arrangement\nof colours", height: 28 },
	{ term: "   solid", description: "Fan is one colour", height: 14 },
	{ term: "   2-col-alternating", description: "Comets alternate in colour for stripes", height: 14 },
	{ term: "   colour-sequence-trail", description: "A colour sequence is used for the trails.\nHead colour set seperate", height: 28 },
	{ term: "   colour-sequence-head", description: "A colour sequence is used for the heads\nTrail colour set seperate", height: 28 },
	{ term: "   colour-sequence", description: "A colour sequence is used the full comets", height: 14 },
	{ term: "Head", description: "Colour of the comets' heads", height: 14 },
	{ term: "Trail 1-2", description: "Colours of the comets' trails", height: 14 },
];


export function openCometFanEffectWindow(effect: CometFanEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const numberComets = store(effect?.numberComets ?? 5);
	const fanAngle = store(effect?.fanAngle ?? 45);
	const fanOrientation = store(effect?.fanOrientation ?? 0);
	const extraLongevity = store(effect?.extraLongevity ?? 0);
	const timeTillStall = store(effect?.timeTillStall ?? 50);
	const trailDensity = store(effect?.trailDensity ?? 0.5);
	const trailWidth = store(effect?.trailWidth ?? 3);
	const colours = createLoadColoursEditor(effect?.colours, ["head", "trail1", "trail2", "headA", "trail1A", "trail2A", "headB", "trail1B", "trail2B"]);
	const patternOptions = ["solid", "2-col-alternating", "colour-sequence-trail", "colour-sequence-head", "colour-sequence"];
	const pattern = normalizePatternSelection(colours.pattern, patternOptions);
	const usesSequence = pattern === "colour-sequence-trail" || pattern === "colour-sequence-head" || pattern === "colour-sequence";
	const colourRows = createNamedColourPickerRows(pattern, colours, [
		{ key: "head", label: "Head", visibleOn: ["solid", "colour-sequence-trail"] },
		{ key: "trail1", label: "Trail 1", visibleOn: ["solid", "colour-sequence-head"] },
		{ key: "trail2", label: "Trail 2", visibleOn: ["solid", "colour-sequence-head"] },
		{ key: "headA", label: "Head A", visibleOn: ["2-col-alternating"] },
		{ key: "trail1A", label: "Trail 1A", visibleOn: ["2-col-alternating"] },
		{ key: "trail2A", label: "Trail 2A", visibleOn: ["2-col-alternating"] },
		{ key: "headB", label: "Head B", visibleOn: ["2-col-alternating"] },
		{ key: "trail1B", label: "Trail 1B", visibleOn: ["2-col-alternating"] },
		{ key: "trail2B", label: "Trail 2B", visibleOn: ["2-col-alternating"] }
	]);
	let handle: { close: () => void } | undefined;
	let isReopening = false;

	// size=numberComets, physicalSize=timeTillStall, extraLongevity=extraLongevity, spikeLength=fanAngle
	const trailWidthByLabel: { [key: string]: number } = { "S": 2, "M": 3, "L": 3, "XL": 4 };
	const trailDensityByLabel: { [key: string]: number } = { "S": 0.3, "M": 0.5, "L": 0.6, "XL": 0.7 };
	const sizePresets: EffectSizePreset[] = [	
		{ label: "S",  size: 40,  physicalSize: 3, extraLongevity: 0,  spikeLength: 30 },
		{ label: "M",  size: 50, physicalSize: 5, extraLongevity: 0,  spikeLength: 45 },
		{ label: "L",  size: 60, physicalSize: 8, extraLongevity: 0,  spikeLength: 60 },
		{ label: "XL", size: 70, physicalSize: 10, extraLongevity: 0, spikeLength: 60 }
	];

	const reopenForPatternChange = (): void => {
		applyLoadColoursEditor(colours);
		isReopening = true;
		handle?.close();
		openCometFanEffectWindow(new CometFanEffect(numberComets.get(), fanAngle.get(), extraLongevity.get(), colours.colours, timeTillStall.get(), trailDensity.get(), trailWidth.get(), fanOrientation.get()), onSave, isEditing, onClose);
	};

	handle = openEffectWindow({
		title: "Comet Fan Effect",
		width: 340,
		height: 520,
		saveText: isEditing ? "Update Effect" : "Add Effect",
		explanation,
		onClose: () => {
			if (isReopening) {
				isReopening = false;
				return;
			}

			onClose?.();
		},
		content: [
			createEffectSizePresetRow(sizePresets, preset => {
				numberComets.set(preset.physicalSize);
				timeTillStall.set(preset.size);
				extraLongevity.set(preset.extraLongevity);
				fanAngle.set(preset.spikeLength ?? 45);
				trailDensity.set(trailDensityByLabel[preset.label] ?? 0.5);
				trailWidth.set(trailWidthByLabel[preset.label] ?? 3);
			}),
			createNumberRow("Number Comets", numberComets, 2, 20),
			createNumberRow("Fan Angle", fanAngle, 0, 150),
			createNumberRow("Fan Orientation", fanOrientation, 0, 90, 2),
			createNumberRow("Extra Longevity", extraLongevity, 0, 50),
			createNumberRow("Time Till Stall", timeTillStall, 0, 70),
			createNumberRow("Trail Density", trailDensity, 0, 1, 0.05),
			createNumberRow("Trail Width", trailWidth, 0, 10, 0.5),
			createPatternDropdownRow(colours.pattern, patternOptions, reopenForPatternChange),
			...(usesSequence ? [createSequenceDropdownRowWithReverse(colours.sequenceName, colours.reverseSequence)] : []),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new CometFanEffect(numberComets.get(), fanAngle.get(), extraLongevity.get(), colours.colours, timeTillStall.get(), trailDensity.get(), trailWidth.get(), fanOrientation.get()));
		}
	});
}
