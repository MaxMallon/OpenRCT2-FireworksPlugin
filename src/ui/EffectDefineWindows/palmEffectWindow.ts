import { t } from "../../localization";
import { checkbox, store } from "openrct2-flexui";
import { PalmEffect } from "../../fireworks/structures/effects/burstEffects/palmEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, ExplanationParagraph, normalizePatternSelection, openEffectWindow } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: t("A cluster of comets fired outward, arcing down like the\ndrooping leaves of a palm tree.\n"), height: 40 },
	{ term: t("Density"), description: t("Affects number of comets"), height: 14 },
	{ term: t("Size"), description: t("Physical size of effect, affects duration\nof the effect"), height: 28 },
	{ term: t("Extra Longevity"), description: t("Additional persistence in ticks"), height: 14 },
	{ term: t("Comets Burst Crackle"), description: t("Each comet ends in a crackle"), height: 14 },
	{ term: t("Comet Head Big"), description: t("Gives the comets a larger cluster head\ninstead of a single particle"), height: 28 },
	{ term: t("Azimuth"), description: t("Orientation of the effect in the horizontal plane"), height: 14 },
	{ term: t("Tilt"), description: t("Orientation of the effect in the vertical plane"), height: 14 },
	{ term: t("Random Angle"), description: t("Ignores azimuth and tilt, using a random\norientation each time the effect fires"), height: 28 },
	{ term: t("Comet Trail Density"), description: t("Controls the density of the comet trails"), height: 14 },
	{ term: t("Comet Trail Width"), description: t("Controls the width of the comet trails"), height: 14 },
	{ term: t("Colour pattern"), description: t("Determines the sequence and arrangement\nof colours"), height: 28 },
	{ term: "   comets-one-type", description: t("One set of colours for the comets"), height: 14 },
	{ term: "   comets-two-halves", description: t("One set of colours for comets fired up,\nand one for the ones down"), height: 28 },
	{ term: "   comets-mixed", description: t("Two sets of colours, to be mixed randomly"), height: 14 },
];

export function openPalmEffectWindow(effect: PalmEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const size = store(effect?.size ?? 80);
	const physicalSize = store(effect?.physicalSize ?? 3);
	const extraLongevity = store(effect?.extraLongevity ?? 20);
	const crackle = store(effect?.crackle ?? false);
	const bigHead = store(effect?.bigHead ?? true);
	const azimuth = store(effect?.azimuth ?? 0);
	const tilt = store(effect?.tilt ?? 0);
	const randomAngle = store(effect?.randomAngle ?? false);
	const trailDensity = store(effect?.trailDensity ?? 0.5);
	const trailWidth = store(effect?.trailWidth ?? 3);
	const sizePresets = [
		{ label: "S", size: 60, physicalSize: 2, extraLongevity: 0 },
		{ label: "M", size: 80, physicalSize: 3, extraLongevity: 20 },
		{ label: "L", size: 100, physicalSize: 4, extraLongevity: 30 },
		{ label: "XL", size: 130, physicalSize: 5.5, extraLongevity: 40 }
	];
	const colours = createLoadColoursEditor(effect?.colours, ["head", "trail1", "trail2", "crackle", "headA", "trail1A", "trail2A", "crackleA", "headB", "trail1B", "trail2B", "crackleB"]);
	const patternOptions = ["comets-one-type", "comets-2-halves", "comets-mixed"];
	const pattern = normalizePatternSelection(colours.pattern, patternOptions);
	const colourRows = createNamedColourPickerRows(pattern, colours, [
		{ key: "head", label: t("Head"), visibleOn: ["comets-one-type"] },
		{ key: "trail1", label: t("Trail 1"), visibleOn: ["comets-one-type"] },
		{ key: "trail2", label: t("Trail 2"), visibleOn: ["comets-one-type"] },
		{ key: "crackle", label: t("Crackle"), visibleOn: ["comets-one-type"] },
		{ key: "headA", label: t("Head A"), visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail1A", label: t("Trail 1A"), visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail2A", label: t("Trail 2A"), visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "crackleA", label: t("Crackle A"), visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "headB", label: t("Head B"), visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail1B", label: t("Trail 1B"), visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail2B", label: t("Trail 2B"), visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "crackleB", label: t("Crackle B"), visibleOn: ["comets-2-halves", "comets-mixed"] }
	]);
	let handle: { close: () => void } | undefined;
	let isReopening = false;

	const reopenForPatternChange = (): void => {
		applyLoadColoursEditor(colours);
		isReopening = true;
		handle?.close();
		openPalmEffectWindow(new PalmEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours, crackle.get(), bigHead.get(), trailDensity.get(), trailWidth.get(), azimuth.get(), tilt.get(), randomAngle.get()), onSave, isEditing, onClose);
	};

	handle = openEffectWindow({
		title: t("Palm Effect"),
		width: 320,
		height: 620,
		saveText: isEditing ? t("Update Effect") : t("Add Effect"),
		explanation,
		onClose: () => {
			if (isReopening) {
				isReopening = false;
				return;
			}

			onClose?.();
		},
		content: [
			createNumberRow(t("Density"), size, 50, 150),
			createNumberRow(t("Size"), physicalSize, 1, 6, 0.1),
			createNumberRow(t("Extra Longevity"), extraLongevity, 0, 100),
			createEffectSizePresetRow(sizePresets, preset => {
				size.set(preset.size);
				physicalSize.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
			}),
			checkbox({
				text: t("Comet Bursts Crackle"),
				isChecked: crackle,
				onChange: value => crackle.set(value)
			}),
			checkbox({
				text: t("Comet Head Big"),
				isChecked: bigHead,
				onChange: value => bigHead.set(value)
			}),
			createNumberRow(t("Azimuth"), azimuth, 0, 360),
			createNumberRow(t("Tilt"), tilt, 0, 360),
			checkbox({ text: t("Random Angle"), isChecked: randomAngle, onChange: value => randomAngle.set(value) }),
			createNumberRow(t("Comet Trail Density"), trailDensity, 0, 1, 0.1),
			createNumberRow(t("Comet Trail Width"), trailWidth, 0, 5, 0.5),
			createPatternDropdownRow(colours.pattern, patternOptions, reopenForPatternChange),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new PalmEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours, crackle.get(), bigHead.get(), trailDensity.get(), trailWidth.get(), azimuth.get(), tilt.get(), randomAngle.get()));
		}
	});
}
