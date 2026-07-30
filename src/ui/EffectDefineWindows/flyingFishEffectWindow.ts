import { store } from "openrct2-flexui";
import { FlyingFishEffect } from "../../fireworks/structures/effects/burstEffects/flyingFishEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, createSequenceDropdownRowWithReverse, normalizePatternSelection } from "./shared";
import { openEffectWindow } from "./template";
import { Effect } from "../../fireworks/structures/Effect";

export function openFlyingFishEffectWindow(effect: FlyingFishEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const size = store(Math.min(100, Math.max(1, effect?.size ?? 20)));
	const physicalSize = store(Math.min(6, Math.max(0.5, effect?.physicalSize ?? 2)));
	const extraLongevity = store(Math.min(100, Math.max(0, effect?.extraLongevity ?? 0)));
	const colours = createLoadColoursEditor(effect?.colours, ["colour1", "colour2", "colour3", "trailColour"]);
	const patternOptions = ["one-colour", "two-colours", "three-colours", "colour-sequence"];
	const sizePresets = [
		{ label: "S", size: 20, physicalSize: 3, extraLongevity: 0 },
		{ label: "M", size: 30, physicalSize: 3.8, extraLongevity: 10 },
		{ label: "L", size: 40, physicalSize: 4.4, extraLongevity: 20 },
		{ label: "XL", size: 50, physicalSize: 5.2, extraLongevity: 30 }
	];
	const pattern = normalizePatternSelection(colours.pattern, patternOptions);
	const usesSequence = pattern === "colour-sequence";
	const colourRows = createNamedColourPickerRows(pattern, colours, [
		{ key: "colour1", label: "Colour 1", visibleOn: ["one-colour", "two-colours", "three-colours"] },
		{ key: "colour2", label: "Colour 2", visibleOn: ["two-colours", "three-colours"] },
		{ key: "colour3", label: "Colour 3", visibleOn: ["three-colours"] },
		{ key: "trailColour", label: "Trail Colour", visibleOn: ["one-colour", "two-colours", "three-colours", "colour-sequence"] }
	]);
	let handle: { close: () => void } | undefined;
	let isReopening = false;

	const reopenForPatternChange = (): void => {
		applyLoadColoursEditor(colours);
		isReopening = true;
		handle?.close();
		openFlyingFishEffectWindow(new FlyingFishEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours), onSave, isEditing, onClose);
	};

	handle = openEffectWindow({
		title: "Flying Fish Effect",
		width: 320,
		height: 490,
		saveText: isEditing ? "Update Effect" : "Add Effect",
		onClose: () => {
			if (isReopening) {
				isReopening = false;
				return;
			}

			onClose?.();
		},
		content: [
			createNumberRow("Density", size, 20, 60),
			createNumberRow("Size", physicalSize, 3, 6, 0.1),
			createNumberRow("Extra Longevity", extraLongevity, 0, 100),
			createEffectSizePresetRow(sizePresets, preset => {
				size.set(preset.size);
				physicalSize.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
			}),
			createPatternDropdownRow(colours.pattern, patternOptions, reopenForPatternChange, "Colour Pattern"),
			...(usesSequence ? [createSequenceDropdownRowWithReverse(colours.sequenceName, colours.reverseSequence)] : []),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new FlyingFishEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours));
		}
	});
}
