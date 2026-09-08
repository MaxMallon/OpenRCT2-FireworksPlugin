import { store } from "openrct2-flexui";
import { StarEffect } from "../../fireworks/structures/effects/burstEffects/starEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, createSequenceDropdownRowWithReverse, ExplanationParagraph, normalizePatternSelection, openEffectWindow } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: "A symmetrical star with spikes of particles coming from a middle point.\n", height: 40 },
	{ term: "Density", description: "Affects number of particles", height: 14 },
	{ term: "Size", description: "Physical size of effect, affects duration\nof the effect", height: 28 },
	{ term: "Extra Longevity", description: "Additional persistence in ticks", height: 14 },
	{ term: "Spike Length", description: "Number of particles per spike", height: 14 },
	{ term: "Colour pattern", description: "Determines the sequence and arrangement\nof colours", height: 28 },
	{ term: "   one-pair", description: "Star made of a single type of particle", height: 14 },
	{ term: "   2-halves", description: "Two halve stars of different colours", height: 14 },
	{ term: "   2-mixed", description: "Two colours mixed randomly", height: 14 },
	{ term: "   3-mixed", description: "Three colours mixed randomly", height: 14 },
	{ term: "   random", description: "Using a colour sequence in random order", height: 14 },
	{ term: "   2-layer-gumball", description: "A star with an innard of one colour\nand an outer layer of another colour", height: 28 },
	{ term: "   3-layer-gumball", description: "A star with three inside-outside\nlayers of colours, like a gumball", height: 28 },
	{ term: "   colour-sequence-gumball", description: "A star with colours arranged in a gumball\npattern according to the sequence", height: 28 },
	{ term: "   colour-sequence-layered", description: "A star with colours arranged in layers\n according to the sequence", height: 28 },
];

export function openStarEffectWindow(effect: StarEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const size = store(effect?.size ?? 60);
	const physicalSize = store(effect?.physicalSize ?? 2.5);
	const extraLongevity = store(effect?.extraLongevity ?? 10);
	const spikeLength = store(effect?.spikeLength ?? 10);
	const colours = createLoadColoursEditor(effect?.colours, ["colour1", "colour2", "colour1A", "colour2A", "colour1B", "colour2B", "colour1C", "colour2C", "baseColour", "colour3", "colour4", "colour5", "colour6"]);
	const patternOptions = ["one-pair", "2-halves", "2-mixed", "3-mixed", "random", "2-layer-gumball", "3-layer-gumball", "colour-sequence-gumball", "colour-sequence-layered"];
	const sizePresets = [
		{ label: "S", size: 40, physicalSize: 1.5, extraLongevity: 0, spikeLength: 8 },
		{ label: "M", size: 60, physicalSize: 2.5, extraLongevity: 10, spikeLength: 10 },
		{ label: "L", size: 80, physicalSize: 4, extraLongevity: 20, spikeLength: 12 },
		{ label: "XL", size: 100, physicalSize: 5, extraLongevity: 30, spikeLength: 14 }
	];
	const pattern = normalizePatternSelection(colours.pattern, patternOptions);
	const usesSequence = pattern === "random" || pattern === "colour-sequence-gumball" || pattern === "colour-sequence-layered";
	const colourRows = createNamedColourPickerRows(pattern, colours, [
		{ key: "baseColour", label: "Base Colour", visibleOn: [] },
		{ key: "colour1", label: "Colour 1", visibleOn: ["one-pair"] },
		{ key: "colour2", label: "Colour 2", visibleOn: ["one-pair"] },
		{ key: "colour3", label: "Colour 3", visibleOn: [] },
		{ key: "colour4", label: "Colour 4", visibleOn: [] },
		{ key: "colour5", label: "Colour 5", visibleOn: [] },
		{ key: "colour6", label: "Colour 6", visibleOn: [] },
		{ key: "colour1A", label: "Colour 1A", visibleOn: ["2-halves", "2-mixed", "3-mixed", "2-layer-gumball", "3-layer-gumball"] },
		{ key: "colour2A", label: "Colour 2A", visibleOn: ["2-halves", "2-mixed", "3-mixed", "2-layer-gumball", "3-layer-gumball"] },
		{ key: "colour1B", label: "Colour 1B", visibleOn: ["2-halves", "2-mixed", "3-mixed", "2-layer-gumball", "3-layer-gumball"] },
		{ key: "colour2B", label: "Colour 2B", visibleOn: ["2-halves", "2-mixed", "3-mixed", "2-layer-gumball", "3-layer-gumball"] },
		{ key: "colour1C", label: "Colour 1C", visibleOn: ["3-mixed", "3-layer-gumball"] },
		{ key: "colour2C", label: "Colour 2C", visibleOn: ["3-mixed", "3-layer-gumball"] }
	]);
	let handle: { close: () => void } | undefined;
	let isReopening = false;

	const reopenForPatternChange = (): void => {
		applyLoadColoursEditor(colours);
		isReopening = true;
		handle?.close();
		openStarEffectWindow(new StarEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours, spikeLength.get()), onSave, isEditing, onClose);
	};

	handle = openEffectWindow({
		title: "Star Effect",
		width: 320,
		height: 610,
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
			createNumberRow("Spike Length", spikeLength, 1, 20),
			createEffectSizePresetRow(sizePresets, preset => {
				size.set(preset.size);
				physicalSize.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
				if (typeof preset.spikeLength === "number") {
					spikeLength.set(preset.spikeLength);
				}
			}),
			createPatternDropdownRow(colours.pattern, patternOptions, reopenForPatternChange),
			...(usesSequence ? [createSequenceDropdownRowWithReverse(colours.sequenceName, colours.reverseSequence)] : []),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new StarEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours, spikeLength.get()));
		}
	});
}
