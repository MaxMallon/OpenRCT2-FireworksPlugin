import { Colour, store } from "openrct2-flexui";
import { CrackleEffect } from "../../fireworks/structures/effects/EmitterEffects/crackleEffect";
import { createColourPickerRow, createEffectSizePresetRow, createNumberRow } from "./shared";
import { openEffectWindow } from "./template";
import { Effect } from "../../fireworks/structures/Effect";

export function openCrackleEffectWindow(effect: CrackleEffect | undefined, onSave: (effect: Effect) => void, onClose?: () => void): void
{
	const size = store(effect?.size ?? 40);
	const physicalSize = store(effect?.physicalSize ?? 2.5);
	const delay = store(effect?.delay ?? 1);
	const colour = store(effect?.colour ?? Colour.BrightYellow);
	const extraLongevity = store(effect?.extraLongevity ?? 20);
	const sizePresets = [
		{ label: "S", size: 20, physicalSize: 1.5, extraLongevity: 0 },
		{ label: "M", size: 40, physicalSize: 2.5, extraLongevity: 20 },
		{ label: "L", size: 70, physicalSize: 4, extraLongevity: 50 },
		{ label: "XL", size: 100, physicalSize: 6, extraLongevity: 100 }
	];
	const duration = store(effect?.duration ?? (extraLongevity.get() + 8 * physicalSize.get()));
	const timeLeft = store(effect?.timeLeft ?? duration.get());
	const posX = store(effect?.posOri.x ?? 0);
	const posY = store(effect?.posOri.y ?? 0);
	const posZ = store(effect?.posOri.z ?? 0);

	openEffectWindow({
		title: "Crackle Effect",
		width: 340,
		height: 390,
		saveText: effect ? "Update Effect" : "Add Effect",
		onClose,
		content: [
			createNumberRow("Size", physicalSize, 0, 6, 0.1),
			createEffectSizePresetRow(sizePresets, preset => {
				size.set(preset.size);
				physicalSize.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
			}),
			createNumberRow("Delay", delay, 0, 60),
			createColourPickerRow("Colour", colour),
		],
		onSave: () => {
			onSave(new CrackleEffect(size.get(), physicalSize.get(), delay.get(), delay.get(), colour.get(), extraLongevity.get(), duration.get(), timeLeft.get(),{ x: posX.get(), y: posY.get(), z: posZ.get() }));
		}
	});
}
