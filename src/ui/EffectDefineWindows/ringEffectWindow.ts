import { checkbox, store } from "openrct2-flexui";
import { RingEffect } from "../../fireworks/structures/effects/burstEffects/ringEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, createSequenceDropdownRowWithReverse, ExplanationParagraph, normalizePatternSelection , openEffectWindow } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: "A ring of clumps of particles, possibly with a trail, and possibly bursting at the end.\n", height: 40 },
	{ term: "Density", description: "Affects number of particles", height: 14 },
	{ term: "Size", description: "Physical size of effect, affects duration\nof the effect", height: 28 },
	{ term: "Extra Longevity", description: "Additional persistence in ticks", height: 14 },
	{ term: "Azimuth", description: "Orientation of the ring in the horizontal plane", height: 14 },
	{ term: "Tilt", description: "Orientation of the ring in the vertical plane", height: 14 },
	{ term: "Random Angle", description: "Ignores azimuth and tilt, using a random\norientation each time the ring fires", height: 28 },
	{ term: "Comet Trail", description: "Gives each particle in the ring a trailing streak", height: 14 },
	{ term: "Comet Trail Density", description: "Controls the density of the comet trails", height: 14 },
	{ term: "Comet Trail Width", description: "Controls the width of the comet trails", height: 14 },
	{ term: "Comets Burst At End", description: "Lets the comets pop into a small burst\nat the end", height: 28 },
	{ term: "Colour pattern", description: "Determines the sequence and arrangement\nof colours", height: 28 },
	{ term: "   solid", description: "A ring of one colour", height: 14 },
	{ term: "   solid-transition", description: "A ring of one colour that changes colour\nhalfway through", height: 28 },
	{ term: "   2-col", description: "A ring of alternating two colours", height: 14 },
	{ term: "   2-col-transition", description: "A ring of alternating two colours that\nchange halfway through", height: 28 },
	{ term: "   colour-sequence", description: "A ring of colours arranged according to a\nsequence", height: 28 },
	{ term: "Trail 1", description: "Colour one of the trail", height: 14 },
	{ term: "Trail 2", description: "Colour two of the trail", height: 14 },
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
		{ key: "head", label: "Colour", visibleOn: ["solid"] },
		{ key: "trail1", label: "Trail 1", visibleOn: allPatterns },
		{ key: "trail2", label: "Trail 2", visibleOn: allPatterns },
		{ key: "head1", label: "Colour 1", visibleOn: ["solid-transition", "2-col"] },
		{ key: "head2", label: "Colour 2", visibleOn: ["solid-transition", "2-col"] },
		{ key: "head1A", label: "Colour 1A", visibleOn: ["2-col-transition"] },
		{ key: "head2A", label: "Colour 2A", visibleOn: ["2-col-transition"] },
		{ key: "head1B", label: "Colour 1B", visibleOn: ["2-col-transition"] },
		{ key: "head2B", label: "Colour 2B", visibleOn: ["2-col-transition"] }
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
		title: "Ring Effect",
		width: 340,
		height: 440,
		saveText: isEditing ? "Update Effect" : "Add Effect",
		explanation,
		onClose: () => {
			if (isReopening) {
				isReopening = false;
				return;
			}

			onClose?.();
		},
		content: [
			createNumberRow("Density", size, 1, 100),
			createNumberRow("Size", physicalSize, 1, 6, 0.1),
			createNumberRow("Extra Longevity", extraLongevity, 0, 100),
			createEffectSizePresetRow(sizePresets, preset => {
				size.set(preset.size);
				physicalSize.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
			}),
			createNumberRow("Azimuth", azimuth, 0, 360),
			createNumberRow("Tilt", tilt, 0, 360),
			checkbox({ text: "Random Angle", isChecked: randomAngle, onChange: value => randomAngle.set(value) }),
			checkbox({ text: "Comet Trail", isChecked: trail, onChange: value => trail.set(value) }),
			createNumberRow("Comet Trail Density", trailDensity, 0, 1, 0.1),
			createNumberRow("Comet Trail Width", trailWidth, 0, 5, 0.5),
			checkbox({ text: "Comets Burst At End", isChecked: microburst, onChange: value => microburst.set(value) }),
			
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
