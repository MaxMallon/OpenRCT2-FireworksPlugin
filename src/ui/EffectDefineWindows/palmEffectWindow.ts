import { checkbox, store } from "openrct2-flexui";
import { PalmEffect } from "../../fireworks/structures/effects/burstEffects/palmEffect";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, ExplanationParagraph, normalizePatternSelection, openEffectWindow } from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: "A cluster of comets fired outward, arcing down like the\ndrooping leaves of a palm tree.\n", height: 40 },
	{ term: "Density", description: "Affects number of comets", height: 14 },
	{ term: "Size", description: "Physical size of effect, affects duration\nof the effect", height: 28 },
	{ term: "Extra Longevity", description: "Additional persistence in ticks", height: 14 },
	{ term: "Comets Burst Crackle", description: "Each comet ends in a crackle", height: 14 },
	{ term: "Comet Head Big", description: "Gives the comets a larger cluster head\ninstead of a single particle", height: 28 },
	{ term: "Comet Trail Density", description: "Controls the density of the comet trails", height: 14 },
	{ term: "Comet Trail Width", description: "Controls the width of the comet trails", height: 14 },
	{ term: "Colour pattern", description: "Determines the sequence and arrangement\nof colours", height: 28 },
	{ term: "   comets-one-type", description: "One set of colours for the comets", height: 14 },
	{ term: "   comets-two-halves", description: "One set of colours for comets fired up,\nand one for the ones down", height: 28 },
	{ term: "   comets-mixed", description: "Two sets of colours, to be mixed randomly", height: 14 },
];

export function openPalmEffectWindow(effect: PalmEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const size = store(effect?.size ?? 80);
	const physicalSize = store(effect?.physicalSize ?? 3);
	const extraLongevity = store(effect?.extraLongevity ?? 20);
	const crackle = store(effect?.crackle ?? false);
	const bigHead = store(effect?.bigHead ?? true);
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
		{ key: "head", label: "Head", visibleOn: ["comets-one-type"] },
		{ key: "trail1", label: "Trail 1", visibleOn: ["comets-one-type"] },
		{ key: "trail2", label: "Trail 2", visibleOn: ["comets-one-type"] },
		{ key: "crackle", label: "Crackle", visibleOn: ["comets-one-type"] },
		{ key: "headA", label: "Head A", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail1A", label: "Trail 1A", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail2A", label: "Trail 2A", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "crackleA", label: "Crackle A", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "headB", label: "Head B", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail1B", label: "Trail 1B", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "trail2B", label: "Trail 2B", visibleOn: ["comets-2-halves", "comets-mixed"] },
		{ key: "crackleB", label: "Crackle B", visibleOn: ["comets-2-halves", "comets-mixed"] }
	]);
	let handle: { close: () => void } | undefined;
	let isReopening = false;

	const reopenForPatternChange = (): void => {
		applyLoadColoursEditor(colours);
		isReopening = true;
		handle?.close();
		openPalmEffectWindow(new PalmEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours, crackle.get(), bigHead.get(), trailDensity.get(), trailWidth.get()), onSave, isEditing, onClose);
	};

	handle = openEffectWindow({
		title: "Palm Effect",
		width: 320,
		height: 550,
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
			createNumberRow("Density", size, 50, 150),
			createNumberRow("Size", physicalSize, 1, 6, 0.1),
			createNumberRow("Extra Longevity", extraLongevity, 0, 100),
			createEffectSizePresetRow(sizePresets, preset => {
				size.set(preset.size);
				physicalSize.set(preset.physicalSize);
				extraLongevity.set(preset.extraLongevity);
			}),
			checkbox({
				text: "Comet Bursts Crackle",
				isChecked: crackle,
				onChange: value => crackle.set(value)
			}),
			checkbox({
				text: "Comet Head Big",
				isChecked: bigHead,
				onChange: value => bigHead.set(value)
			}),
			createNumberRow("Comet Trail Density", trailDensity, 0, 1, 0.1),
			createNumberRow("Comet Trail Width", trailWidth, 0, 5, 0.5),			
			createPatternDropdownRow(colours.pattern, patternOptions, reopenForPatternChange),
			...colourRows
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new PalmEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours, crackle.get(), bigHead.get(), trailDensity.get(), trailWidth.get()));
		}
	});
}
