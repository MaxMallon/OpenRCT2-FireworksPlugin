import { store } from "openrct2-flexui";
import { SprayBurstEffect } from "../../fireworks/structures/effects/burstEffects/palmEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNumberRow, createSequenceDropdownRowWithReverse, normalizePatternSelection } from "./shared";
import { openEffectWindow } from "./template";
import { Effect } from "../../fireworks/structures/Effect";

export function openSprayBurstEffectWindow(effect: SprayBurstEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const size = store(effect?.size ?? 20);
	const physicalSize = store(effect?.physicalSize ?? 3);
	const extraLongevity = store(effect?.extraLongevity ?? 0);
	const sizePresets = [
		{ label: "S", size: 60, physicalSize: 2, extraLongevity: 0 },
		{ label: "M", size: 80, physicalSize: 3, extraLongevity: 20 },
		{ label: "L", size: 100, physicalSize: 4, extraLongevity: 30 },
		{ label: "XL", size: 130, physicalSize: 5.5, extraLongevity: 40 }
	];
	const colours = createLoadColoursEditor(effect?.colours, ["head", "trail1", "trail2", "crackle", "headA", "trail1A", "trail2A", "crackleA", "headB", "trail1B", "trail2B", "crackleB"]);
	const patternOptions = ["sprays-mixed"];
	normalizePatternSelection(colours.pattern, patternOptions);
	let isReopening = false;

	openEffectWindow({
		title: "Spray Burst Effect",
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
			createNumberRow("Density", size, 50, 150),
			createNumberRow("Size", physicalSize, 1, 6, 0.1),
			createNumberRow("Extra Longevity", extraLongevity, 0, 100),
			createEffectSizePresetRow(sizePresets, preset => {
				size.set(preset.size);
				physicalSize.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
			}),			
			...[createSequenceDropdownRowWithReverse(colours.sequenceName, colours.reverseSequence)],
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new SprayBurstEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours));
		}
	});
}
