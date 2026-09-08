import { colourPicker, compute, dropdown, flexible, store, textbox , horizontal, label, LayoutDirection, type FlexibleLayoutContainer, type OpenWindow, window, Colour } from "openrct2-flexui";
import { getMainWindowPosition } from "../windowState";
import { makePopupGroupSwitchable, openPopupCustom, openPopupWindow } from "../popupWindows";
import { colouredButton } from "../ColouredButton";
import { numberInputSpinner } from "../numberInputSpinner";
import { LoadColours } from "../../fireworks/structures/ColourStructures";
import { cloneLoadColours } from "../../fireworks/cloneHelpers";
import { colourSequences } from "../../fireworks/persistent";

/** Popup group shared by all effect definition windows: only one may be open at a time. */
export const EFFECT_WINDOW_GROUP = "effect-window";
/** Popup group shared by sub-selection windows opened from inside an effect window. */
export const EFFECT_SUB_WINDOW_GROUP = "effect-sub-window";
/** Popup group for the effect info popup: opening a new one replaces the previously open one. */
export const EFFECT_EXPLANATION_GROUP = "effect-explanation-window";
makePopupGroupSwitchable(EFFECT_EXPLANATION_GROUP);

/** A single paragraph of explanation text, paired with the label height needed to fit it. */
export interface ExplanationParagraph
{
	/** Full-width paragraph text. Omit when using `term`/`description` instead. */
	text?: string;
	height: number;
	/** When set alongside `description`, rendered as an indented "term: description" row. */
	term?: string;
	description?: string;
}

const defaultExplanation: ExplanationParagraph[] = [
	{ text: "No additional information is available for this effect yet.", height: 26 }
];

/** Opens (or replaces) the small context-aware info popup describing the current effect. */
export function openEffectExplanationWindow(title: string, paragraphs: ExplanationParagraph[]): void
{
	const mainPos = getMainWindowPosition();
	const position = mainPos ? { x: mainPos.x + 40, y: mainPos.y + 40 } : "center" as const;
	let handle: OpenWindow | undefined;

	handle = openPopupWindow(`effect-explanation-${title}`, {
		title: `${title} Info`,
		width: 460,
		height: "auto",
		padding: 8,
		position,
		direction: LayoutDirection.Vertical,
		content: [
			...paragraphs.map(paragraph => paragraph.term !== undefined
				? flexible({
					direction: LayoutDirection.Horizontal,
					height: paragraph.height,
					content: [
						label({ text: "", width: 10 }),
						label({ text: paragraph.term, width: 180, height: paragraph.height }),
						label({ text: paragraph.description ?? "", width: "1w", height: paragraph.height })
					]
				})
				: label({ text: paragraph.text ?? "", height: paragraph.height, width: "1w" })
			),
			horizontal({
				height: 22,
				content: [
					label({ text: "", width: "1w", height: 8 }),
					colouredButton({
						text: "Close",
						width: 70,
						height: 22,
						colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
						onClick: () => handle?.close()
					}),
					label({ text: "", width: "1w", height: 8 }),
				]
			})
		]
	}, EFFECT_EXPLANATION_GROUP);
}

export interface EffectWindowTemplateOptions
{
	title: string;
	width: number;
	height: number;
	content: FlexibleLayoutContainer;
	saveText: string;
	onSave: () => void;
	onClose?: () => void;	
	popupKey?: string;
	explanation?: ExplanationParagraph[];//For help window
}

export function openEffectWindow(options: EffectWindowTemplateOptions): OpenWindow | undefined
{
	const mainPos = getMainWindowPosition();
	const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;
	let handle: OpenWindow | undefined;

	return openPopupCustom(options.popupKey ?? EFFECT_WINDOW_GROUP, onClose =>
	{
		const template = window({
		title: options.title,
		width: options.width,
		height: "auto",
		padding: 8,
		position,
		onClose: () => { onClose(); options.onClose?.(); },
		direction: LayoutDirection.Vertical,
		content: [
			...options.content,
			horizontal({
				height: 14,
				content: [
					label({ text: "", width: "1w" }),
					colouredButton({//sprite5529, 5528 (sprite IDs for ? sprite, maybe one day)
						text: "?",
						width: 22,
						height: 22,
						colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
						onClick: () => openEffectExplanationWindow(options.title, options.explanation ?? defaultExplanation)
					}),
					label({ text: "", width: "1w" }),
					colouredButton({
						text: "Cancel",
						width: 70,
						height: 22,
						colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
						onClick: () => handle?.close()
					}),
					label({ text: "", width: "1w" }),
					colouredButton({
						text: `{WHITE}${options.saveText}`,
						width: 110,
						height: 22,
						colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen,
						onClick: () => {
							options.onSave();
							handle?.close();
						}
					}),
					label({ text: "", width: "1w" }),
				]
			}),
			label({ text: "", width: "1w", height: 6 })
		]
		});

		handle = template.open();
		return handle;
	});
}



//Load colour sequence once to colour sprite preview
export interface LoadColoursEditorModel {
	colours: LoadColours;
	sequenceName: ReturnType<typeof store<string>>;
	reverseSequence: ReturnType<typeof store<boolean>>;
	pattern: ReturnType<typeof store<string>>;
	namedColours: Record<string, ReturnType<typeof store<Colour>>>;
}

export interface ColourFieldOption {
	key: string;
	label: string;
	visibleOn: string[];
}

export interface EffectSizePreset {
	label: string;
	size: number;
	physicalSize: number;
	extraLongevity: number;
	spikeLength?: number;
}

export function createLoadColoursEditor(source?: LoadColours, namedColourKeys: string[] = []): LoadColoursEditorModel
{
	const colours = cloneLoadColours(source);
	const namedColours: Record<string, ReturnType<typeof store<Colour>>> = {};
	for (let index = 0; index < namedColourKeys.length; index++)
	{
		const key = namedColourKeys[index];
		namedColours[key] = store(source?.namedColours?.[key] ?? source?.colourList?.[index] ?? Colour.Invisible);
	}
	return {
		colours,
		sequenceName: store(colours.sequenceName),
		reverseSequence: store(colours.reverseSequence),
		pattern: store(colours.pattern),
		namedColours
	};
}

export function createLoadColoursEditorWithDefaultPattern(source: LoadColours | undefined, namedColourKeys: string[], defaultPattern: string): LoadColoursEditorModel
{
	const model = createLoadColoursEditor(source, namedColourKeys);
	if (!model.pattern.get().trim())
	{
		model.pattern.set(defaultPattern);
	}

	return model;
}

export function applyLoadColoursEditor(model: LoadColoursEditorModel): void
{
	model.colours.sequenceName = model.sequenceName.get().trim();
	model.colours.reverseSequence = model.reverseSequence.get();
	model.colours.pattern = model.pattern.get().trim();
	const namedColours: { [key: string]: Colour } = {};
	for (const key in model.namedColours)
	{
		namedColours[key] = model.namedColours[key].get();
	}
	model.colours.namedColours = namedColours;
}

function resolveDropdownIndex(value: string, options: string[]): number
{
	const normalizedValue = value.trim();
	if (!normalizedValue)
	{
		return 0;
	}

	for (let index = 0; index < options.length; index++)
	{
		if (options[index] === normalizedValue)
		{
			return index;
		}
	}

	return 0;
}

export function normalizePatternSelection(patternName: ReturnType<typeof store<string>>, options: string[]): string
{
	if (options.length === 0)
	{
		const trimmed = patternName.get().trim();
		if (patternName.get() !== trimmed)
		{
			patternName.set(trimmed);
		}

		return trimmed;
	}

	const selectedIndex = resolveDropdownIndex(patternName.get(), options);
	const resolvedPattern = options[selectedIndex] ?? options[0] ?? "";
	if (patternName.get().trim() !== resolvedPattern)
	{
		patternName.set(resolvedPattern);
	}

	return resolvedPattern;
}

function isPatternVisible(pattern: string, visibleOn: string[]): boolean
{
	for (let index = 0; index < visibleOn.length; index++)
	{
		if (visibleOn[index] === pattern)
		{
			return true;
		}
	}

	return false;
}

export function createPatternVisibilityStore(patternName: ReturnType<typeof store<string>>, visibleOn: string[])
{
	return compute(patternName, pattern => isPatternVisible(pattern, visibleOn));
}

export function createSequenceDropdownRow(sequenceName: ReturnType<typeof store<string>>)
{
	const reverseSequence = store(false);
	return createSequenceDropdownRowWithReverse(sequenceName, reverseSequence);
}

export function createSequenceDropdownRowWithReverse(sequenceName: ReturnType<typeof store<string>>, reverseSequence: ReturnType<typeof store<boolean>>)
{
	const sequenceNames = compute(colourSequences, sequences => sequences.map(sequence => sequence.name));
	const initialSequenceNames = sequenceNames.get();
	let selectedIndexValue = 0;
	const sequenceNameValue = sequenceName.get().trim();
	if (sequenceNameValue)
	{
		for (let index = 0; index < initialSequenceNames.length; index++)
		{
			if (initialSequenceNames[index] === sequenceNameValue)
			{
				selectedIndexValue = index + 1;
				break;
			}
		}
	}
	const selectedIndex = store(selectedIndexValue);
	const items = compute(sequenceNames, names => ["No sequence", ...names]);

	return flexible({
		direction: LayoutDirection.Horizontal,
		height: 14,
		content: [
			label({ text: "Colour Sequence", width: 140, height: 14 }),
			dropdown({
				items,
				selectedIndex,
				onChange: index => {
					const names = sequenceNames.get();
					sequenceName.set(index === 0 ? "" : names[index - 1] ?? "");
				},
				width: 124,
				height: 14
			}),
			colouredButton({
				text: compute(reverseSequence, value => value ? "<<<" : ">>>"),
				width: 36,
				height: 14,
				colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
				onClick: () => reverseSequence.set(!reverseSequence.get())
			})
		]
	});
}

export function createPatternDropdownRow(patternName: ReturnType<typeof store<string>>, options: string[], onPatternChange?: () => void, labelText: string = "Colour Pattern")
{
	const initialPattern = normalizePatternSelection(patternName, options);
	const selectedIndex = store(resolveDropdownIndex(initialPattern, options));

	return flexible({
		direction: LayoutDirection.Horizontal,
		height: 14,
		content: [
			label({ text: labelText, width: 140, height: 14 }),
			dropdown({
				items: options,
				selectedIndex,
				onChange: index => {
					patternName.set(options[index] ?? options[0] ?? "");
					onPatternChange?.();
				},
				width: 160,
				height: 14
			})
		]
	});
}

export function createTextRow(labelText: string, valueStore: ReturnType<typeof store<string>>, width: number = 260)
{
	return flexible({
		direction: LayoutDirection.Horizontal,
		height: 14,
		content: [
			label({ text: labelText, width: 90 }),
			textbox({
				text: valueStore,
				onChange: value => valueStore.set(value),
				width,
				maxLength: 64
			})
		]
	});
}

export function createNumberRow(labelText: string, valueStore: ReturnType<typeof store<number>>, minimum: number, maximum: number, step: number = 1, width: number = 90)
{
	return numberInputSpinner({
		labelText,
		valueStore,
		minimum,
		maximum,
		step,
		width
	});
}

export function createEffectSizePresetRow<T extends { label: string }>(presets: T[], onApplyPreset: (preset: T) => void, labelText: string = "Preset")
{
	return flexible({
		direction: LayoutDirection.Horizontal,
		height: 14,
		content: [
			label({ text: labelText, width: 140, height: 18 }),
			...presets.map(preset => colouredButton({
				text: preset.label,
				width: 28,
				height: 14,
				colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
				onClick: () => onApplyPreset(preset)
			}))
		]
	});
}

export function createColourPickerRow(labelText: string | ReturnType<typeof store<string>>, valueStore: ReturnType<typeof store<Colour>>)
{
	return flexible({
		direction: LayoutDirection.Horizontal,
		height: 21,
		content: [
			label({ text: labelText, width: 140, height: 21 }),
			colourPicker({
				colour: valueStore,
				width: 21,
				height: 21,
				onChange: colour => valueStore.set(colour)
			})
		]
	});
}

export function createNamedColourPickerRows(pattern: string, model: LoadColoursEditorModel, fields: ColourFieldOption[])
{
	return fields
		.filter(field => isPatternVisible(pattern, field.visibleOn))
		.map(field => createColourPickerRow(field.label, model.namedColours[field.key]));
}
