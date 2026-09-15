import { t } from "../../localization";
import { store } from "openrct2-flexui";
import { SprayFanEffect } from "../../fireworks/structures/effects/burstEffects/sprayFanEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, createSequenceDropdownRowWithReverse, EffectSizePreset, ExplanationParagraph, normalizePatternSelection , openEffectWindow } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: t("Multiple Spray Mines combine to form a fan."), height: 40 },
	{ term: t("Amount"), description: t("Exact number of particles per spray"), height: 14 },
	{ term: t("Number Sprays"), description: t("Number of sprays to form the fan"), height: 14 },
	{ term: t("Fan Angle"), description: t("The angle of the fan in a sense of how wide it is"), height: 14 },
	{ term: t("Fan Orientation"), description: t("The angle of the fan on the ground, which\nway it faces"), height: 28 },
	{ term: t("Extra Longevity"), description: t("Additional persistence in ticks"), height: 14 },
	{ term: t("Time Till Stall"), description: t("The number of ticks before the particles reach\ntheir max height. Affects life time of particles."), height: 28 },
	{ term: t("Colour pattern"), description: t("Determines the sequence and arrangement\nof colours"), height: 28 },
	{ term: "   solid", description: t("Fan is one colour"), height: 14 },
	{ term: "   2-col-alternating", description: t("Sprays alternate in colour for stripes"), height: 14 },
	{ term: "   colour-sequence-layered", description: t("A colour sequence is used to create horizontal\nlayers,like a rainbow"), height: 28 },
	{ term: "   colour-sequence", description: t("A colour sequence is used to create vertical\nstripes, like the French flag"), height: 14 },
];

export function openSprayFanEffectWindow(effect: SprayFanEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const amount = store(effect?.amount ?? 15);
	const numberSprays = store(effect?.numberSprays ?? 5);
	const fanAngle = store(effect?.fanAngle ?? 45);
	const fanOrientation = store(effect?.fanOrientation ?? 0);
	const extraLongevity = store(effect?.extraLongevity ?? 0);
	const timeTillStall = store(effect?.timeTillStall ?? 38);
	const colours = createLoadColoursEditor(effect?.colours, ["colour1", "colour2"]);
	const patternOptions = ["solid", "2-col-alternating", "colour-sequence-layered", "colour-sequence"];
	const pattern = normalizePatternSelection(colours.pattern, patternOptions);
	const usesSequence = pattern === "colour-sequence-layered" || pattern === "colour-sequence";
	const colourRows = createNamedColourPickerRows(pattern, colours, [
		{ key: "colour1", label: t("Colour 1"), visibleOn: ["solid", "2-col-alternating"] },
		{ key: "colour2", label: t("Colour 2"), visibleOn: ["2-col-alternating"] }
	]);
	let handle: { close: () => void } | undefined;
	let isReopening = false;

	// size=amount, physicalSize=numberSprays, extraLongevity=timeTillStall, spikeLength=fanAngle
	const sizePresets: EffectSizePreset[] = [
		{ label: "S",  size: 8,  physicalSize: 3, extraLongevity: 30,  spikeLength: 30 },
		{ label: "M",  size: 15, physicalSize: 5, extraLongevity: 38,  spikeLength: 45 },
		{ label: "L",  size: 25, physicalSize: 8, extraLongevity: 43,  spikeLength: 60 },
		{ label: "XL", size: 40, physicalSize: 10, extraLongevity: 50, spikeLength: 60 }
	];

	const reopenForPatternChange = (): void => {
		applyLoadColoursEditor(colours);
		isReopening = true;
		handle?.close();
		openSprayFanEffectWindow(new SprayFanEffect(amount.get(), numberSprays.get(), fanAngle.get(), extraLongevity.get(), timeTillStall.get(), colours.colours, fanOrientation.get()), onSave, isEditing, onClose);
	};

	handle = openEffectWindow({
		title: t("Spray Fan Effect"),
		width: 340,
		height: 370,
		saveText: isEditing ? t("Update Effect") : t("Add Effect"),
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
				amount.set(preset.size);
				numberSprays.set(preset.physicalSize);
				timeTillStall.set(preset.extraLongevity);
				fanAngle.set(preset.spikeLength ?? 45);
				extraLongevity.set(0);
			}),
			createNumberRow(t("Amount"), amount, 10, 50),
			createNumberRow(t("Number Sprays"), numberSprays, 2, 20),
			createNumberRow(t("Fan Angle"), fanAngle, 10, 150),
			createNumberRow(t("Fan Orientation"), fanOrientation, 0, 90, 2),
			createNumberRow(t("Extra Longevity"), extraLongevity, 0, 50),
			createNumberRow(t("Time Till Stall"), timeTillStall, 20, 50),
			createPatternDropdownRow(colours.pattern, patternOptions, reopenForPatternChange),
			...(usesSequence ? [createSequenceDropdownRowWithReverse(colours.sequenceName, colours.reverseSequence)] : []),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new SprayFanEffect(amount.get(), numberSprays.get(), fanAngle.get(), extraLongevity.get(), timeTillStall.get(), colours.colours, fanOrientation.get()));
		}
	});
}
