import { t } from "../../localization";
import { checkbox, store } from "openrct2-flexui";
import { RingEffect } from "../../fireworks/structures/effects/burstEffects/ringEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, createSequenceDropdownRowWithReverse, ExplanationParagraph, normalizePatternSelection , openEffectWindow } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: t("A ring of clumps of particles, possibly with a trail, and possibly bursting at the end.\n"), height: 40 },
	{ term: t("Density"), description: t("Affects number of particles"), height: 14 },
	{ term: t("Size"), description: t("Physical size of effect, affects duration\nof the effect"), height: 28 },
	{ term: t("Extra Longevity"), description: t("Additional persistence in ticks"), height: 14 },
	{ term: t("Azimuth"), description: t("Orientation of the ring in the horizontal plane"), height: 14 },
	{ term: t("Tilt"), description: t("Orientation of the ring in the vertical plane"), height: 14 },
	{ term: t("Random Angle"), description: t("Ignores azimuth and tilt, using a random\norientation each time the ring fires"), height: 28 },
	{ term: t("Comet Trail"), description: t("Gives each particle in the ring a trailing streak"), height: 14 },
	{ term: t("Comet Trail Density"), description: t("Controls the density of the comet trails"), height: 14 },
	{ term: t("Comet Trail Width"), description: t("Controls the width of the comet trails"), height: 14 },
	{ term: t("Comets Burst At End"), description: t("Lets the comets pop into a small burst\nat the end"), height: 28 },
	{ term: t("Colour pattern"), description: t("Determines the sequence and arrangement\nof colours"), height: 28 },
	{ term: "   solid", description: t("A ring of one colour"), height: 14 },
	{ term: "   solid-transition", description: t("A ring of one colour that changes colour\nhalfway through"), height: 28 },
	{ term: "   2-col", description: t("A ring of alternating two colours"), height: 14 },
	{ term: "   2-col-transition", description: t("A ring of alternating two colours that\nchange halfway through"), height: 28 },
	{ term: "   colour-sequence", description: t("A ring of colours arranged according to a\nsequence"), height: 28 },
	{ term: t("Trail 1"), description: t("Colour one of the trail"), height: 14 },
	{ term: t("Trail 2"), description: t("Colour two of the trail"), height: 14 },
];

export function openRingEffectWindow(effect: RingEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const size = store(effect?.size ?? 45);
	const physicalSize = store(effect?.physicalSize ?? 3);
	const extraLongevity = store(effect?.extraLongevity ?? 20);
	const trail = store(effect?.trail ?? false);
	const microburst = store(effect?.microburst ?? false);
	const azimuth = store(effect?.azimuth ?? 0);
	const tilt = store(effect?.tilt ?? 0);
	const randomAngle = store(effect?.randomAngle ?? false);
	const trailDensity = store(effect?.trailDensity ?? 0.5);
	const trailWidth = store(effect?.trailWidth ?? 3);
	const colours = createLoadColoursEditor(effect?.colours, ["head", "trail1", "trail2", "head1", "head2", "head1A", "head2A", "head1B", "head2B"]);
	const patternOptions = ["solid", "solid-transition", "2-col", "2-col-transition", "colour-sequence"];
	const sizePresets = [
		{ label: "S", size: 30, physicalSize: 2, extraLongevity: 0 },
		{ label: "M", size: 45, physicalSize: 3, extraLongevity: 20 },
		{ label: "L", size: 60, physicalSize: 4, extraLongevity: 30 },
		{ label: "XL", size: 80, physicalSize: 5, extraLongevity: 50 }
	];
	const pattern = normalizePatternSelection(colours.pattern, patternOptions);
	const usesSequence = pattern === "colour-sequence";
	const allPatterns = [...patternOptions];
	const colourRows = createNamedColourPickerRows(pattern, colours, [
		{ key: "head", label: t("Colour"), visibleOn: ["solid"] },
		{ key: "trail1", label: t("Trail 1"), visibleOn: allPatterns },
		{ key: "trail2", label: t("Trail 2"), visibleOn: allPatterns },
		{ key: "head1", label: t("Colour 1"), visibleOn: ["solid-transition", "2-col"] },
		{ key: "head2", label: t("Colour 2"), visibleOn: ["solid-transition", "2-col"] },
		{ key: "head1A", label: t("Colour 1A"), visibleOn: ["2-col-transition"] },
		{ key: "head2A", label: t("Colour 2A"), visibleOn: ["2-col-transition"] },
		{ key: "head1B", label: t("Colour 1B"), visibleOn: ["2-col-transition"] },
		{ key: "head2B", label: t("Colour 2B"), visibleOn: ["2-col-transition"] }
	]);
	let handle: { close: () => void } | undefined;
	let isReopening = false;

	const reopenForPatternChange = (): void => {
		applyLoadColoursEditor(colours);
		isReopening = true;
		handle?.close();
		openRingEffectWindow(new RingEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours, azimuth.get(), tilt.get(), trail.get(), microburst.get(), trailDensity.get(), trailWidth.get(), randomAngle.get()), onSave, isEditing, onClose);
	};

	handle = openEffectWindow({
		title: t("Ring Effect"),
		width: 340,
		height: 440,
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
			createNumberRow(t("Density"), size, 1, 100),
			createNumberRow(t("Size"), physicalSize, 1, 6, 0.1),
			createNumberRow(t("Extra Longevity"), extraLongevity, 0, 100),
			createEffectSizePresetRow(sizePresets, preset => {
				size.set(preset.size);
				physicalSize.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
			}),
			createNumberRow(t("Azimuth"), azimuth, 0, 360),
			createNumberRow(t("Tilt"), tilt, 0, 360),
			checkbox({ text: t("Random Angle"), isChecked: randomAngle, onChange: value => randomAngle.set(value) }),
			checkbox({ text: t("Comet Trail"), isChecked: trail, onChange: value => trail.set(value) }),
			createNumberRow(t("Comet Trail Density"), trailDensity, 0, 1, 0.1),
			createNumberRow(t("Comet Trail Width"), trailWidth, 0, 5, 0.5),
			checkbox({ text: t("Comets Burst At End"), isChecked: microburst, onChange: value => microburst.set(value) }),
			
			createPatternDropdownRow(colours.pattern, patternOptions, reopenForPatternChange),
			...(usesSequence ? [createSequenceDropdownRowWithReverse(colours.sequenceName, colours.reverseSequence)] : []),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new RingEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours, azimuth.get(), tilt.get(), trail.get(), microburst.get(), trailDensity.get(), trailWidth.get(), randomAngle.get()));
		}
	});
}
