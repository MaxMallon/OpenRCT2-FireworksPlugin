import { t } from "../../localization";
import { store } from "openrct2-flexui";
import { FlyingFishEffect } from "../../fireworks/structures/effects/burstEffects/flyingFishEffect";
import { openEffectWindow, applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, createSequenceDropdownRowWithReverse, ExplanationParagraph, normalizePatternSelection } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: t("A burst of headless comets that starts of much like a palm,\nuntil the heads suddenly light up, and the comets proppel themselves\nin random directions, like a school of fish darting off."), height: 40 },
	{ term: t("Density"), description: t("Affects number of particles"), height: 14 },
	{ term: t("Size"), description: t("Physical size of effect, affects duration\nof the effect"), height: 28 },
	{ term: t("Extra Longevity"), description: t("Additional persistence in ticks"), height: 14 },
	{ term: t("Colour pattern"), description: t("Determines the sequence and arrangement\nof colours"), height: 28 },
	{ term: "   one-colour", description: t("One colour for the fish"), height: 14 },
	{ term: "   two-colours", description: t("Two colours for the fish"), height: 14 },
	{ term: "   three-colours", description: t("Three colours for the fish"), height: 14 },
	{ term: "   colour-sequence", description: t("Using a colour sequence in random order\nfor the fish"), height: 28 },
	{ term: t("Trail Colour"), description: t("Colour of the trails the fish leave behind"), height: 14 },
];

export function openFlyingFishEffectWindow(effect: FlyingFishEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const size = store(Math.min(100, Math.max(1, effect?.size ?? 30)));
	const physicalSize = store(Math.min(6, Math.max(0.5, effect?.physicalSize ?? 3.8)));
	const extraLongevity = store(Math.min(100, Math.max(0, effect?.extraLongevity ?? 10)));
	const colours = createLoadColoursEditor(effect?.colours, ["colour1", "colour2", "colour3", "trailColour"]);
	const patternOptions = ["one-colour", "two-colours", "three-colours", "colour-sequence"];
	const sizePresets = [
		{ label: "S", size: 20, physicalSize: 3, extraLongevity: 0 },
		{ label: "M", size: 30, physicalSize: 3.8, extraLongevity: 10 },
		{ label: "L", size: 40, physicalSize: 4.4, extraLongevity: 20 },
		{ label: "XL", size: 50, physicalSize: 5.2, extraLongevity: 30 }
	];
	const pattern = normalizePatternSelection(colours.pattern, patternOptions);
	const usesSequence = pattern === "colour-sequence";
	const colourRows = createNamedColourPickerRows(pattern, colours, [
		{ key: "colour1", label: t("Colour 1"), visibleOn: ["one-colour", "two-colours", "three-colours"] },
		{ key: "colour2", label: t("Colour 2"), visibleOn: ["two-colours", "three-colours"] },
		{ key: "colour3", label: t("Colour 3"), visibleOn: ["three-colours"] },
		{ key: "trailColour", label: t("Trail Colour"), visibleOn: ["one-colour", "two-colours", "three-colours", "colour-sequence"] }
	]);
	let handle: { close: () => void } | undefined;
	let isReopening = false;

	const reopenForPatternChange = (): void => {
		applyLoadColoursEditor(colours);
		isReopening = true;
		handle?.close();
		openFlyingFishEffectWindow(new FlyingFishEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours), onSave, isEditing, onClose);
	};

	handle = openEffectWindow({
		title: t("Flying Fish Effect"),
		width: 320,
		height: 500,
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
			createNumberRow(t("Density"), size, 20, 60),
			createNumberRow(t("Size"), physicalSize, 3, 6, 0.1),
			createNumberRow(t("Extra Longevity"), extraLongevity, 0, 100),
			createEffectSizePresetRow(sizePresets, preset => {
				size.set(preset.size);
				physicalSize.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
			}),
			createPatternDropdownRow(colours.pattern, patternOptions, reopenForPatternChange),
			...(usesSequence ? [createSequenceDropdownRowWithReverse(colours.sequenceName, colours.reverseSequence)] : []),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new FlyingFishEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours));
		}
	});
}
