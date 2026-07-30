import { store } from "openrct2-flexui";
import { MicroBurstEffect } from "../../fireworks/structures/effects/burstEffects/microBurstEffect";
import { applyLoadColoursEditor, createLoadColoursEditorWithDefaultPattern, createNamedColourPickerRows, createNumberRow } from "./shared";
import { openEffectWindow } from "./template";
import { Effect } from "../../fireworks/structures/Effect";

export function openMicroBurstEffectWindow(effect: MicroBurstEffect | undefined, onSave: (effect: Effect) => void, onClose?: () => void): void
{
	const speedMultiplier = store(effect?.speedMultiplier ?? 1);
	const colours = createLoadColoursEditorWithDefaultPattern(effect?.colours, ["colour1", "colour2", "colour3"], "default");
	const colourRows = createNamedColourPickerRows(colours.pattern.get(), colours, [
		{ key: "colour1", label: "Colour 1", visibleOn: ["default"] },
		{ key: "colour2", label: "Colour 2", visibleOn: ["default"] },
		{ key: "colour3", label: "Colour 3", visibleOn: ["default"] }
	]);

	openEffectWindow({
		title: "Micro Burst Effect",
		width: 340,
		height: 280,
		saveText: effect ? "Update Effect" : "Add Effect",
		onClose,
		content: [
			createNumberRow("Speed Multiplier", speedMultiplier, 0.5, 4, 0.1),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new MicroBurstEffect(colours.colours, speedMultiplier.get()));
		}
	});
}
