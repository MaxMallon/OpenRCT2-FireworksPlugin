import { button, Colour, colourPicker, compute, dropdown, flexible, label, LayoutDirection, spinner, store, textbox } from "openrct2-flexui";
import { LoadColours } from "../../fireworks/structures/ColourStructures";
import { colourSequences } from "../../fireworks/persistent";

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

export function cloneLoadColours(colours?: LoadColours): LoadColours
{
	if (!colours)
	{
		return new LoadColours([], "", false, "", {});
	}

	return new LoadColours([...(colours.colourList ?? [])], colours.sequenceName, colours.reverseSequence, colours.pattern, { ...(colours.namedColours ?? {}) });
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
			button({
				text: compute(reverseSequence, value => value ? "Reversed" : "Forward"),
				width: 36,
				onClick: () => reverseSequence.set(!reverseSequence.get())
			})
		]
	});
}

export function createPatternDropdownRow(patternName: ReturnType<typeof store<string>>, options: string[], onPatternChange?: () => void, labelText: string = "Pattern")
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
	const stepText = `${step}`;
	const decimalPointIndex = stepText.indexOf(".");
	const precision = decimalPointIndex >= 0 ? stepText.length - decimalPointIndex - 1 : 0;
	const precisionScale = Math.pow(10, precision);
	const normalizeValue = (value: number): number => {
		if (precision === 0)
		{
			return value;
		}

		return Math.round(value * precisionScale) / precisionScale;
	};

	return flexible({
		direction: LayoutDirection.Horizontal,
		height: 14,
		content: [
			label({ text: labelText, width: 140 }),
			spinner({
				value: valueStore,
				onChange: value => valueStore.set(normalizeValue(value)),
				width,
				step,
				minimum,
				maximum
			})
		]
	});
}

export function createEffectSizePresetRow(presets: EffectSizePreset[], onApplyPreset: (preset: EffectSizePreset) => void, labelText: string = "Preset")
{
	return flexible({
		direction: LayoutDirection.Horizontal,
		height: 14,
		content: [
			label({ text: labelText, width: 140, height: 14 }),
			...presets.map(preset => button({
				text: preset.label,
				width: 28,
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
