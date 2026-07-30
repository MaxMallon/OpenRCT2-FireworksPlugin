import { Colour, store } from "openrct2-flexui";
import { SprayEffectFromGround } from "../../fireworks/structures/effects/burstEffects/sprayEffect";
import { createColourPickerRow, createEffectSizePresetRow, createNumberRow, EffectSizePreset } from "./shared";
import { openEffectWindow } from "./template";
import { Effect } from "../../fireworks/structures/Effect";

export function openSprayEffectWindow(effect: SprayEffectFromGround | undefined, onSave: (effect: Effect) => void, onClose?: () => void): void
{
	const amount = store(effect?.amount ?? 20);
	const extraLongevity = store(effect?.extraLongevity ?? 0);
	const colour = store(effect?.colour ?? Colour.BrightYellow);
	const azimuthBase = store(effect?.azimuthBase ?? 0);
	const tiltBase = store(effect?.tiltBase ?? 0);
	const timeTillStall = store(effect?.timeTillStall ?? 50);
	const verticalSpread = store(effect?.verticalSpread ?? 0.8);

	// size=amount, physicalSize=timeTillStall, extraLongevity=extraLongevity, spikeLength=verticalSpread*100
	const sizePresets: EffectSizePreset[] = [
		{ label: "S",  size: 10, physicalSize: 35,  extraLongevity: 0,  spikeLength: 70 },
		{ label: "M",  size: 20, physicalSize: 45,  extraLongevity: 0,  spikeLength: 80 },
		{ label: "L",  size: 35, physicalSize: 55,  extraLongevity: 20, spikeLength: 85 },
		{ label: "XL", size: 55, physicalSize: 65, extraLongevity: 50, spikeLength: 90 }
	];

	openEffectWindow({
		title: "Spray Mine Effect",
		width: 360,
		height: 260,
		saveText: effect ? "Update Effect" : "Add Effect",
		onClose,
		content: [
			createEffectSizePresetRow(sizePresets, preset => {
				amount.set(preset.size);
				timeTillStall.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
				verticalSpread.set((preset.spikeLength ?? 80) / 100);
			}),
			createNumberRow("Amount", amount, 1, 100),
			createNumberRow("Extra Longevity", extraLongevity, 0, 50),
			createColourPickerRow("Colour", colour),
			createNumberRow("Tilt (0=up, 90=horiz)", tiltBase, 0, 180, 2),
			createNumberRow("Azimuth (0=Y, 90=X)", azimuthBase, -360, 360, 5),
			createNumberRow("Time Till Stall", timeTillStall, 25, 65),
			createNumberRow("Vertical Spread", verticalSpread, 0, 1, 0.01)
		],
		onSave: () => {
			onSave(new SprayEffectFromGround(amount.get(), azimuthBase.get(), tiltBase.get(), timeTillStall.get(), verticalSpread.get(), extraLongevity.get(), colour.get()));
		}
	});
}
