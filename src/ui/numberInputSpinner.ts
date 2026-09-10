import { flexible, label, LayoutDirection, read, spinner, store, twoway } from "openrct2-flexui";
import type { Bindable } from "openrct2-flexui";

export interface NumberInputSpinnerOptions {
	labelText?: string;
	labelWidth?: number;
	valueStore?: ReturnType<typeof store<number>>;
	value?: ReturnType<typeof store<number>>;
	onChange?: (value: number) => void;
	minimum?: Bindable<number>;
	maximum?: Bindable<number>;
	step?: number;
	width?: number;
	key?: string;
	disabled?: Bindable<boolean>;
	visibility?: Bindable<"visible" | "none">;
}

/**
 * Opens OpenRCT2's native text prompt dialog to manually type a numeric value for a spinner field.
 */
export function openNumberInputWindow(
	labelText: string,
	valueStore: ReturnType<typeof store<number>>,
	minimum?: Bindable<number>,
	maximum?: Bindable<number>,
	step: number = 1,
	onChange?: (value: number) => void
): void {
	if (typeof ui === "undefined") {
		return;
	}

	const minVal = minimum !== undefined ? (read(minimum) ?? -2147483648) : -2147483648;
	const maxVal = maximum !== undefined ? (read(maximum) ?? 2147483647) : 2147483647;
	const titleText = labelText.trim() ? labelText : "Value";
	const stepText = `${step}`;
	const decimalPointIndex = stepText.indexOf(".");
	const precision = decimalPointIndex >= 0 ? stepText.length - decimalPointIndex - 1 : 0;
	const precisionScale = Math.pow(10, precision);

	const normalizeValue = (val: number): number => {
		if (precision === 0) {
			return Math.round(val);
		}
		return Math.round(val * precisionScale) / precisionScale;
	};

	const clampValue = (val: number): number => {
		let v = normalizeValue(val);
		if (v < minVal) v = minVal;
		if (v > maxVal) v = maxVal;
		return v;
	};

	const currentValue = valueStore ? valueStore.get() : 0;
	const initialValue = precision > 0 ? currentValue.toFixed(precision) : `${currentValue}`;

	ui.showTextInput({
		title: titleText,
		description: `Enter a value (${minVal} - ${maxVal}):`,
		initialValue,
		callback: (text) => {
			const parsed = parseFloat(text.trim());
			if (!isNaN(parsed)) {
				const clamped = clampValue(parsed);
				if (valueStore) {
					valueStore.set(clamped);
				}
				onChange?.(clamped);
			}
		}
	});
}

/**
 * Creates a native spinner widget with an onClick handler on the text area to open the input prompt.
 */
export function numberInputSpinner(options: NumberInputSpinnerOptions) {
	const {
		labelText,
		labelWidth = 140,
		minimum,
		maximum,
		step = 1,
		width = 90,
		onChange,
		disabled,
		visibility
	} = options;

	const valStore = options.valueStore ?? options.value;
	if (!valStore) {
		throw new Error("numberInputSpinner requires either valueStore or value.");
	}

	const stepText = `${step}`;
	const decimalPointIndex = stepText.indexOf(".");
	const precision = decimalPointIndex >= 0 ? stepText.length - decimalPointIndex - 1 : 0;

	const format = (val: number): string => {
		return precision > 0 ? val.toFixed(precision) : `${val}`;
	};

	const spinnerCreator = spinner({
		value: twoway(valStore),
		minimum,
		maximum,
		step,
		width,
		format,
		disabled,
		visibility,
		onChange
	} as any);

	const originalCreate = spinnerCreator.create;
	spinnerCreator.create = (builder: any) => {
		const control = originalCreate(builder);
		(control as any).onClick = () => {
			openNumberInputWindow(
				labelText ?? "",
				valStore,
				minimum,
				maximum,
				step,
				onChange
			);
		};
		return control;
	};

	if (labelText !== undefined) {
		return flexible({
			direction: LayoutDirection.Horizontal,
			height: 14,
			content: [
				label({ text: labelText, width: labelWidth, visibility }),
				spinnerCreator
			]
		});
	}

	return spinnerCreator;
}
