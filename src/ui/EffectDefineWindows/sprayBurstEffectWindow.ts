import { store } from "openrct2-flexui";
import { SprayBurstEffect } from "../../fireworks/structures/effects/burstEffects/palmEffect";
import { openEffectWindow , applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNumberRow, createSequenceDropdownRowWithReverse, ExplanationParagraph, normalizePatternSelection} from "./effectWindowTemplate";
import { Effect } from "../../fireworks/structures/Effect";

const explanation: ExplanationParagraph[] = [
	{ text: "Sprays of various colours are launced outwards from a central point.\n", height: 20 },
	{ term: "Density", description: "Affects number of comets", height: 14 },
	{ term: "Size", description: "Physical size of effect, affects duration\nof the effect", height: 28 },
	{ term: "Extra Longevity", description: "Additional persistence in ticks", height: 14 },
	{ term: "Colour Sequence", description: "The colours of sprays to use in random order", height: 14 },
];

export function openSprayBurstEffectWindow(effect: SprayBurstEffect | undefined, onSave: (effect: Effect) => void, isEditing: boolean = effect !== undefined, onClose?: () => void): void
{
	const size = store(effect?.size ?? 80);
	const physicalSize = store(effect?.physicalSize ?? 3);
	const extraLongevity = store(effect?.extraLongevity ?? 0);
	const sizePresets = [
		{ label: "S", size: 60, physicalSize: 2, extraLongevity: 0 },
		{ label: "M", size: 80, physicalSize: 3, extraLongevity: 20 },
		{ label: "L", size: 100, physicalSize: 4, extraLongevity: 30 },
		{ label: "XL", size: 130, physicalSize: 5.5, extraLongevity: 40 }
	];
	const colours = createLoadColoursEditor(effect?.colours, ["head", "trail1", "trail2", "crackle", "headA", "trail1A", "trail2A", "crackleA", "headB", "trail1B", "trail2B", "crackleB"]);
	const patternOptions = ["sprays-mixed"];
	normalizePatternSelection(colours.pattern, patternOptions);
	let isReopening = false;

	openEffectWindow({
		title: "Spray Burst Effect",
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
			...[createSequenceDropdownRowWithReverse(colours.sequenceName, colours.reverseSequence)],
		],
		onSave: () => {
			applyLoadColoursEditor(colours);
			onSave(new SprayBurstEffect(size.get(), physicalSize.get(), extraLongevity.get(), colours.colours));
		}
	});
}
