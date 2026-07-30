import { store } from "openrct2-flexui";
import { PictEffect } from "../../fireworks/structures/effects/burstEffects/pictEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNumberRow } from "./shared";
import { openEffectWindow } from "./template";
import { Effect } from "../../fireworks/structures/Effect";

export function openPictEffectWindow(effect: PictEffect | undefined, onSave: (effect: Effect) => void, onClose?: () => void): void
{
	const size = store(effect?.size ?? 20);
	const physicalSize = store(effect?.physicalSize ?? 3);
	const extraLongevity = store(effect?.extraLongevity ?? 0);
	const sizePresets = [
		{ label: "S", size: 20, physicalSize: 1.5, extraLongevity: 0 },
		{ label: "M", size: 40, physicalSize: 2.5, extraLongevity: 20 },
		{ label: "L", size: 70, physicalSize: 4, extraLongevity: 50 },
		{ label: "XL", size: 100, physicalSize: 6, extraLongevity: 100 }
	];
	const colours = createLoadColoursEditor(effect?.colours);

	openEffectWindow({
		title: "Pict Effect",
		width: 320,
		height: 320,
		saveText: effect ? "Update Effect" : "Add Effect",
		onClose,
		content: [
			createNumberRow("Size", size, 0, 9999),
			createNumberRow("Physical Size", physicalSize, 0, 9999),
			createNumberRow("Extra Longevity", extraLongevity, 0, 9999),
			createEffectSizePresetRow(sizePresets, preset => {
				size.set(preset.size);
				physicalSize.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
			})
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new PictEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours));
		}
	});
}
