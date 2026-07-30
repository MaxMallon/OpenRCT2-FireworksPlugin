import { store } from "openrct2-flexui";
import { SphereEffect } from "../../fireworks/structures/effects/burstEffects/sphereEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, createSequenceDropdownRowWithReverse, normalizePatternSelection } from "./shared";
import { openEffectWindow } from "./template";
import { Effect } from "../../fireworks/structures/Effect";

export function openSphereEffectWindow(effect: SphereEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const size = store(Math.min(100, Math.max(1, effect?.size ?? 20)));
	const physicalSize = store(Math.min(6, Math.max(1, effect?.physicalSize ?? 3)));
	const extraLongevity = store(Math.min(100, Math.max(0, effect?.extraLongevity ?? 0)));
	const colours = createLoadColoursEditor(effect?.colours, ["colour1", "colour2", "colour1A", "colour2A", "colour1B", "colour2B", "colour1C", "colour2C", "baseColour", "colour3", "colour4", "colour5", "colour6"]);
	const patternOptions = ["one-pair", "2-halves", "2-mixed", "3-mixed", "random", "blinking-uniform-1zone", "blinking-uniform-2zones", "blinking-uniform-4zones", "blinking-uniform-6zones", "colour-sequence-layered"];
	const sizePresets = [
		{ label: "S", size: 20, physicalSize: 1.5, extraLongevity: 0 },
		{ label: "M", size: 40, physicalSize: 2.5, extraLongevity: 20 },
		{ label: "L", size: 60, physicalSize: 4, extraLongevity: 30 },
		{ label: "XL", size: 80, physicalSize: 5, extraLongevity: 50 }
	];
	const pattern = normalizePatternSelection(colours.pattern, patternOptions);
	const usesSequence = pattern === "random" || pattern === "colour-sequence-layered";
	const colourRows = createNamedColourPickerRows(pattern, colours, [
		{ key: "baseColour", label: "Base Colour", visibleOn: ["blinking-uniform-1zone", "blinking-uniform-2zones", "blinking-uniform-4zones", "blinking-uniform-6zones"] },
        { key: "colour1", label: "Colour 1", visibleOn: ["one-pair", "blinking-uniform-1zone", "blinking-uniform-2zones", "blinking-uniform-4zones", "blinking-uniform-6zones"] },
		{ key: "colour2", label: "Colour 2", visibleOn: ["one-pair", "blinking-uniform-2zones", "blinking-uniform-4zones", "blinking-uniform-6zones"] },
		{ key: "colour3", label: "Colour 3", visibleOn: ["blinking-uniform-4zones", "blinking-uniform-6zones"] },
		{ key: "colour4", label: "Colour 4", visibleOn: ["blinking-uniform-4zones", "blinking-uniform-6zones"] },
		{ key: "colour5", label: "Colour 5", visibleOn: ["blinking-uniform-6zones"] },
		{ key: "colour6", label: "Colour 6", visibleOn: ["blinking-uniform-6zones"] },
		{ key: "colour1A", label: "Colour 1A", visibleOn: ["2-halves", "2-mixed", "3-mixed"] },
		{ key: "colour2A", label: "Colour 2A", visibleOn: ["2-halves", "2-mixed", "3-mixed"] },
		{ key: "colour1B", label: "Colour 1B", visibleOn: ["2-halves", "2-mixed", "3-mixed"] },
		{ key: "colour2B", label: "Colour 2B", visibleOn: ["2-halves", "2-mixed", "3-mixed"] },
		{ key: "colour1C", label: "Colour 1C", visibleOn: ["3-mixed"] },
		{ key: "colour2C", label: "Colour 2C", visibleOn: ["3-mixed"] }
	]);
	let handle: { close: () => void } | undefined;
	let isReopening = false;

	const reopenForPatternChange = (): void => {
		applyLoadColoursEditor(colours);
		isReopening = true;
		handle?.close();
		openSphereEffectWindow(new SphereEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours), onSave, isEditing, onClose);
	};

	handle = openEffectWindow({
		title: "Sphere Effect",
		width: 320,
		height: 580,
		saveText: isEditing ? "Update Effect" : "Add Effect",
		onClose: () => {
			if (isReopening) {
				isReopening = false;
				return;
			}

			onClose?.();
		},
		content: [
			createNumberRow("Density", size, 1, 100),
			createNumberRow("Size", physicalSize, 1, 6, 0.1),
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
			onSave(new SphereEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours));
		}
	});
}
