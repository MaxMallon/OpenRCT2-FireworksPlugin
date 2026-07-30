import { Colour, store } from "openrct2-flexui";
import { TourbillionRisingWispEffect } from "../../fireworks/structures/effects/EmitterEffects/tourbillionRisingWispEffect";
import { createColourPickerRow, createNumberRow } from "./shared";
import { openEffectWindow } from "./template";
import { Effect } from "../../fireworks/structures/Effect";

export function openTourbillionRisingWispEffectWindow(effect: TourbillionRisingWispEffect | undefined, onSave: (effect: Effect) => void, onClose?: () => void): void
{
	const colour = store(effect?.colour ?? Colour.BrightYellow);
	const randomness = store(Math.min(100, Math.max(0, effect?.randomness ?? 80)));

	openEffectWindow({
		title: "Tourbillion Rising Wisp",
		width: 320,
		height: 190,
		saveText: effect ? "Update Effect" : "Add Effect",
		onClose,
		content: [
			createColourPickerRow("Colour", colour),
			createNumberRow("Randomness", randomness, 0, 100),
		],
		onSave: () => {
			onSave(new TourbillionRisingWispEffect(colour.get(), randomness.get()));
		}
	});
}
