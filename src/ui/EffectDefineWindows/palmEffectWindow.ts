import { checkbox, store } from "openrct2-flexui";
import { PalmEffect } from "../../fireworks/structures/effects/burstEffects/palmEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, normalizePatternSelection } from "./shared";
import { openEffectWindow } from "./template";
import { Effect } from "../../fireworks/structures/Effect";

export function openPalmEffectWindow(effect: PalmEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const size = store(effect?.size ?? 20);
	const physicalSize = store(effect?.physicalSize ?? 3);
	const extraLongevity = store(effect?.extraLongevity ?? 0);
	const crackle = store(effect?.crackle ?? false);
	const bigHead = store(effect?.bigHead ?? true);
	const trailDensity = store(effect?.trailDensity ?? 0.5);
	const trailWidth = store(effect?.trailWidth ?? 3);
	const sizePresets = [
		{ label: "S", size: 60, physicalSize: 2, extraLongevity: 0 },
		{ label: "M", size: 80, physicalSize: 3, extraLongevity: 20 },
		{ label: "L", size: 100, physicalSize: 4, extraLongevity: 30 },
		{ label: "XL", size: 130, physicalSize: 5.5, extraLongevity: 40 }
	];
	const colours = createLoadColoursEditor(effect?.colours, ["head", "trail1", "trail2", "crackle", "headA", "trail1A", "trail2A", "crackleA", "headB", "trail1B", "trail2B", "crackleB"]);
	const patternOptions = ["comets-one-type", "comets-2-halves", "comets-mixed"];
	const pattern = normalizePatternSelection(colours.pattern, patternOptions);
	const colourRows = createNamedColourPickerRows(pattern, colours, [
		{ key: "head", label: "Head", visibleOn: ["comets-one-type"] },
		{ key: "trail1", label: "Trail 1", visibleOn: ["comets-one-type"] },
		{ key: "trail2", label: "Trail 2", visibleOn: ["comets-one-type"] },
		{ key: "crackle", label: "Crackle", visibleOn: ["comets-one-type"] },
		{ key: "headA", label: "Head A", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail1A", label: "Trail 1A", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail2A", label: "Trail 2A", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "crackleA", label: "Crackle A", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "headB", label: "Head B", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail1B", label: "Trail 1B", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail2B", label: "Trail 2B", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "crackleB", label: "Crackle B", visibleOn: ["comets-2-halves", "comets-mixed"] }
	]);
	let handle: { close: () => void } | undefined;
	let isReopening = false;

	const reopenForPatternChange = (): void => {
		applyLoadColoursEditor(colours);
		isReopening = true;
		handle?.close();
		openPalmEffectWindow(new PalmEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours, crackle.get(), bigHead.get(), trailDensity.get(), trailWidth.get()), onSave, isEditing, onClose);
	};

	handle = openEffectWindow({
		title: "Palm Effect",
		width: 320,
		height: 540,
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
			createNumberRow("Density", size, 50, 150),
			createNumberRow("Size", physicalSize, 1, 6, 0.1),
			createNumberRow("Extra Longevity", extraLongevity, 0, 100),
			createEffectSizePresetRow(sizePresets, preset => {
				size.set(preset.size);
				physicalSize.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
			}),
			checkbox({
				text: "Comet Bursts Crackle",
				isChecked: crackle,
				onChange: value => crackle.set(value)
			}),
			checkbox({
				text: "Comet Head Big",
				isChecked: bigHead,
				onChange: value => bigHead.set(value)
			}),
			createNumberRow("Comet Trail Density", trailDensity, 0, 1, 0.1),
			createNumberRow("Comet Trail Width", trailWidth, 0, 5, 0.5),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new PalmEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours, crackle.get(), bigHead.get(), trailDensity.get(), trailWidth.get()));
		}
	});
}
