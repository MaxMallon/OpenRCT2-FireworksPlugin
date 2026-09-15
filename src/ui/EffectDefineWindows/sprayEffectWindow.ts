import { t } from "../../localization";
import { Colour, store } from "openrct2-flexui";
import { SprayEffectFromGround } from "../../fireworks/structures/effects/burstEffects/sprayEffect";
import { createColourPickerRow, createEffectSizePresetRow, createNumberRow, EffectSizePreset, ExplanationParagraph, openEffectWindow } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: t("A burst of particles is shot from a point."), height: 40 },
	{ term: t("Amount"), description: t("Exact number of particles"), height: 14 },
	{ term: t("Extra Longevity"), description: t("Additional persistence in ticks"), height: 14 },
	{ term: t("Colour"), description: t("Colour of the particles"), height: 14 },
	{ term: t("Tilt"), description: t("The angle in the vertical plane of where\nthe particles are shot towards.\n0 = up, 90 = horizontal, 180 = down"), height: 36 },
	{ term: t("Azimuth"), description: t("The angle in the horizontal plane of where\nthe particles are shot towards."), height: 28 },
	{ term: t("Time Till Stall"), description: t("The number of ticks before the particles reach\ntheir max height. Affects life time of particles."), height: 28 },
	{ term: t("Vertical Spread"), description: t("How densely clustered the spray is\nlongitudinally."), height: 28 },
];

export function openSprayEffectWindow(effect: SprayEffectFromGround | undefined, onSave: (effect: Effect) => void, onClose?: () => void): void
{
	const amount = store(effect?.amount ?? 20);
	const extraLongevity = store(effect?.extraLongevity ?? 0);
	const colour = store(effect?.colour ?? Colour.BrightYellow);
	const azimuthBase = store(effect?.azimuthBase ?? 0);
	const tiltBase = store(effect?.tiltBase ?? 0);
	const timeTillStall = store(effect?.timeTillStall ?? 45);
	const verticalSpread = store(effect?.verticalSpread ?? 0.8);

	// size=amount, physicalSize=timeTillStall, extraLongevity=extraLongevity, spikeLength=verticalSpread
	const sizePresets: EffectSizePreset[] = [
		{ label: "S",  size: 10, physicalSize: 35,  extraLongevity: 0,  spikeLength: 0.7 },
		{ label: "M",  size: 20, physicalSize: 45,  extraLongevity: 0,  spikeLength: 0.8 },
		{ label: "L",  size: 35, physicalSize: 55,  extraLongevity: 20, spikeLength: 0.85 },
		{ label: "XL", size: 55, physicalSize: 65, extraLongevity: 50, spikeLength: 0.9 }
	];

	openEffectWindow({
		title: t("Spray Mine Effect"),
		width: 360,
		height: 270,
		saveText: effect ? t("Update Effect") : t("Add Effect"),
		onClose,
		explanation,
		content: [
			createEffectSizePresetRow(sizePresets, preset => {
				amount.set(preset.size);
				timeTillStall.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
				verticalSpread.set(preset.spikeLength ?? 0.8);
			}),
			createNumberRow(t("Amount"), amount, 1, 100),
			createNumberRow(t("Extra Longevity"), extraLongevity, 0, 50),
			createColourPickerRow(t("Colour"), colour),
			createNumberRow(t("Tilt (0=up, 90=horiz)"), tiltBase, 0, 180, 2),
			createNumberRow(t("Azimuth (0=Y, 90=X)"), azimuthBase, -360, 360, 5),
			createNumberRow(t("Time Till Stall"), timeTillStall, 25, 65),
			createNumberRow(t("Vertical Spread"), verticalSpread, 0, 1, 0.01)
		],
		onSave: () => {
			onSave(new SprayEffectFromGround(amount.get(), azimuthBase.get(), tiltBase.get(), timeTillStall.get(), verticalSpread.get(), extraLongevity.get(), colour.get()));
		}
	});
}
