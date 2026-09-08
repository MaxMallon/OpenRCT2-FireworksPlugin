import { Colour, store } from "openrct2-flexui";
import { TourbillionRisingWispEffect } from "../../fireworks/structures/effects/EmitterEffects/tourbillionRisingWispEffect";
import { createColourPickerRow, createNumberRow , ExplanationParagraph, openEffectWindow } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: "A wisp-like effect rises slowly from the ground, leaving a short cone of particles.\nThe wisp flies up and slows down repeatedly as it wanders away.", height: 28 },
	{ term: "Colour", description: "Colour of the particles", height: 14 },
	{ term: "Randomness", description: "Percentage for how much the wisp will\nstray off going up perfectly vertical.", height: 28 },
];

export function openTourbillionRisingWispEffectWindow(effect: TourbillionRisingWispEffect | undefined, onSave: (effect: Effect) => void, onClose?: () => void): void
{
	const colour = store(effect?.colour ?? Colour.BrightYellow);
	const randomness = store(Math.min(100, Math.max(0, effect?.randomness ?? 80)));

	openEffectWindow({
		title: "Tourbillion Rising Wisp",
		width: 320,
		height: 200,
		saveText: effect ? "Update Effect" : "Add Effect",
		onClose,
		explanation,
		content: [
			createColourPickerRow("Colour", colour),
			createNumberRow("Randomness", randomness, 0, 100),
		],
		onSave: () => {
			onSave(new TourbillionRisingWispEffect(colour.get(), randomness.get()));
		}
	});
}
