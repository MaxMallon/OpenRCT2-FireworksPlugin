import { t } from "../../localization";
import { store } from "openrct2-flexui";
import { PictEffect } from "../../fireworks/structures/effects/burstEffects/pictEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNumberRow, ExplanationParagraph, openEffectWindow } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: t("A simple burst of particles from the burst point, without any of\nthe colour pattern or shaping options found on the more elaborate\nburst effects.\n"), height: 40 },
	{ text: t("Useful as a lightweight placeholder shape, or when you just want a\nplain coloured pop without extra configuration."), height: 30 }
];

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
		title: t("Pict Effect"),
		width: 320,
		height: 330,
		saveText: effect ? t("Update Effect") : t("Add Effect"),
		onClose,
		explanation,
		content: [
			createNumberRow(t("Size"), size, 0, 9999),
			createNumberRow(t("Physical Size"), physicalSize, 0, 9999),
			createNumberRow(t("Extra Longevity"), extraLongevity, 0, 9999),
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
