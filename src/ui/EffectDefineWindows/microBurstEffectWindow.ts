import { t } from "../../localization";
import { store } from "openrct2-flexui";
import { MicroBurstEffect } from "../../fireworks/structures/effects/burstEffects/microBurstEffect";
import { applyLoadColoursEditor, createLoadColoursEditorWithDefaultPattern, createNamedColourPickerRows, createNumberRow, ExplanationParagraph } from "./effectWindowTemplate";
import { openEffectWindow } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: t("A tiny burst of a handfull of particles suitable as secondary 'pop',\nor for small scale fireworks."), height: 40 },
	{ term: t("Speed Multiplier"), description: t("Affects the speed at which the parciles\nfly off, and inversely affects their lifetime."), height: 28 },
	{ term: t("Colour 1-3"), description: t("Colours of the particles"), height: 14 },
	
];

export function openMicroBurstEffectWindow(effect: MicroBurstEffect | undefined, onSave: (effect: Effect) => void, onClose?: () => void): void
{
	const speedMultiplier = store(effect?.speedMultiplier ?? 1);
	const colours = createLoadColoursEditorWithDefaultPattern(effect?.colours, ["colour1", "colour2", "colour3"], "default");
	const colourRows = createNamedColourPickerRows(colours.pattern.get(), colours, [
		{ key: "colour1", label: t("Colour 1"), visibleOn: ["default"] },
		{ key: "colour2", label: t("Colour 2"), visibleOn: ["default"] },
		{ key: "colour3", label: t("Colour 3"), visibleOn: ["default"] }
	]);

	openEffectWindow({
		title: t("Micro Burst Effect"),
		width: 340,
		height: 290,
		saveText: effect ? t("Update Effect") : t("Add Effect"),
		onClose,
		explanation,
		content: [
			createNumberRow(t("Speed Multiplier"), speedMultiplier, 0.5, 4, 0.1),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new MicroBurstEffect(colours.colours, speedMultiplier.get()));
		}
	});
}
