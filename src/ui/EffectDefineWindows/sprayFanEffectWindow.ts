import { store } from "openrct2-flexui";
import { SprayFanEffect } from "../../fireworks/structures/effects/burstEffects/sprayFanEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, createSequenceDropdownRowWithReverse, EffectSizePreset, normalizePatternSelection } from "./shared";
import { openEffectWindow } from "./template";
import { Effect } from "../../fireworks/structures/Effect";

export function openSprayFanEffectWindow(effect: SprayFanEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const amount = store(effect?.amount ?? 20);
	const numberSprays = store(effect?.numberSprays ?? 3);
	const fanAngle = store(effect?.fanAngle ?? 45);
	const fanOrientation = store(effect?.fanOrientation ?? 0);
	const extraLongevity = store(effect?.extraLongevity ?? 0);
	const timeTillStall = store(effect?.timeTillStall ?? 0);
	const colours = createLoadColoursEditor(effect?.colours, ["colour1", "colour2"]);
	const patternOptions = ["solid", "2-col-alternating", "colour-sequence-layered", "colour-sequence"];
	const pattern = normalizePatternSelection(colours.pattern, patternOptions);
	const usesSequence = pattern === "colour-sequence-layered" || pattern === "colour-sequence";
	const colourRows = createNamedColourPickerRows(pattern, colours, [
		{ key: "colour1", label: "Colour 1", visibleOn: ["solid", "2-col-alternating"] },
		{ key: "colour2", label: "Colour 2", visibleOn: ["2-col-alternating"] }
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
		title: "Spray Fan Effect",
		width: 340,
		height: 360,
		saveText: isEditing ? "Update Effect" : "Add Effect",
		onClose: () => {
			if (isReopening) {
				isReopening = false;
				return;
			}

			onClose?.();
		},
		content: [
			createPatternDropdownRow(colours.pattern, patternOptions, reopenForPatternChange),
			createEffectSizePresetRow(sizePresets, preset => {
				amount.set(preset.size);
				numberSprays.set(preset.physicalSize);
				timeTillStall.set(preset.extraLongevity);
				fanAngle.set(preset.spikeLength ?? 45);
				extraLongevity.set(0);
			}),
			createNumberRow("Amount", amount, 10, 50),
			createNumberRow("Number Sprays", numberSprays, 2, 20),
			createNumberRow("Fan Angle", fanAngle, 10, 150),
			createNumberRow("Fan Orientation", fanOrientation, 0, 90, 2),
			createNumberRow("Extra Longevity", extraLongevity, 0, 50),
			createNumberRow("Time Till Stall", timeTillStall, 20, 50),
			...(usesSequence ? [createSequenceDropdownRowWithReverse(colours.sequenceName, colours.reverseSequence)] : []),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new SprayFanEffect(amount.get(), numberSprays.get(), fanAngle.get(), extraLongevity.get(), timeTillStall.get(), colours.colours, fanOrientation.get()));
		}
	});
}
