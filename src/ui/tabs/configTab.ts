import { getLanguage, setLanguage, t } from "../../localization";
import { colourPicker, compute, dropdown, flexible, groupbox, label, LayoutDirection, listview, store, textbox, Colour } from "openrct2-flexui";
import type { OpenWindow } from "openrct2-flexui";
import { numberInputSpinner } from "../numberInputSpinner";
import { ColourSequence, maxColourSequenceLength } from "../../fireworks/structures/ColourStructures";
import { colourSequences, setColourSequences, resetPersistentStateToDefaults } from "../../fireworks/persistent";
import { findColourSequenceUsages, removeColourSequenceUsages } from "../../fireworks/usageChecker";
import { openUsageWarningWindow } from "../usageWarningWindow";
import { getMainWindowPosition } from "../windowState";
import { openPopupWindow } from "../popupWindows";
import { openExportWindow, openImportWindow, DATA_WINDOW_GROUP } from "../importExportWindow";
import { openTutorialWindow } from "../tutorialWindow";
import { colouredButton } from "../ColouredButton";
import { SerializedColourSequenceEditorState } from "../../fireworks/parkStorage";
import { confirmDiscardChanges } from "../discardChangesWindow";

const DEFAULT_COLOUR_SEQUENCE_EDITOR = {
	name: "",
	length: 1,
	colour: Colour.Invisible,
	selectedIndex: undefined as number | undefined
};

const selectedColourSequenceIndex = store<number | undefined>(DEFAULT_COLOUR_SEQUENCE_EDITOR.selectedIndex);
const selectedLanguageIndex = store(getLanguage() === "ko-KR" ? 1 : 0);
const colourSequenceName = store(DEFAULT_COLOUR_SEQUENCE_EDITOR.name);
const colourSequenceLength = store(DEFAULT_COLOUR_SEQUENCE_EDITOR.length);
const colourSequenceColourStores = [
	store(DEFAULT_COLOUR_SEQUENCE_EDITOR.colour),
	store(DEFAULT_COLOUR_SEQUENCE_EDITOR.colour),
	store(DEFAULT_COLOUR_SEQUENCE_EDITOR.colour),
	store(DEFAULT_COLOUR_SEQUENCE_EDITOR.colour),
	store(DEFAULT_COLOUR_SEQUENCE_EDITOR.colour),
	store(DEFAULT_COLOUR_SEQUENCE_EDITOR.colour),
	store(DEFAULT_COLOUR_SEQUENCE_EDITOR.colour),
	store(DEFAULT_COLOUR_SEQUENCE_EDITOR.colour),
	store(DEFAULT_COLOUR_SEQUENCE_EDITOR.colour),
	store(DEFAULT_COLOUR_SEQUENCE_EDITOR.colour)
];

function getFallbackColourSequenceName(): string
{
	return `Sequence ${colourSequences.get().length + 1}`;
}

export function getColourSequenceEditorState(): SerializedColourSequenceEditorState {
	return {
		colourSequence: new ColourSequence(
			colourSequenceName.get(),
			colourSequenceColourStores.slice(0, colourSequenceLength.get()).map(s => s.get())
		).toParkData()
	};
}

export function restoreColourSequenceEditorState(state?: SerializedColourSequenceEditorState): void {
	if (!state || !state.colourSequence) {
		resetColourSequenceEditor();
		return;
	}
	const sequence = ColourSequence.fromParkData(state.colourSequence);
	selectedColourSequenceIndex.set(DEFAULT_COLOUR_SEQUENCE_EDITOR.selectedIndex);
	colourSequenceName.set(sequence.name);
	const len = Math.max(1, Math.min(maxColourSequenceLength, sequence.colours.length > 0 ? sequence.colours.length : DEFAULT_COLOUR_SEQUENCE_EDITOR.length));
	colourSequenceLength.set(len);
	for (let i = 0; i < maxColourSequenceLength; i++) {
		colourSequenceColourStores[i].set(typeof sequence.colours[i] === "number" ? sequence.colours[i] : DEFAULT_COLOUR_SEQUENCE_EDITOR.colour);
	}
}

export function resetColourSequenceEditor()
{
	selectedColourSequenceIndex.set(DEFAULT_COLOUR_SEQUENCE_EDITOR.selectedIndex);
	colourSequenceName.set(DEFAULT_COLOUR_SEQUENCE_EDITOR.name);
	colourSequenceLength.set(DEFAULT_COLOUR_SEQUENCE_EDITOR.length);
	for (const colourStore of colourSequenceColourStores)
	{
		colourStore.set(DEFAULT_COLOUR_SEQUENCE_EDITOR.colour);
	}
}

export function isColourSequenceEditorDirty(): boolean {
	const currentName = colourSequenceName.get().trim();
	const currentLength = colourSequenceLength.get();
	const currentColours = colourSequenceColourStores.slice(0, currentLength).map(s => s.get());

	if (!currentName) {
		if (currentLength !== DEFAULT_COLOUR_SEQUENCE_EDITOR.length) return true;
		return colourSequenceColourStores.some(s => s.get() !== DEFAULT_COLOUR_SEQUENCE_EDITOR.colour);
	}

	const saved = colourSequences.get().find(s => s.name === currentName);
	if (!saved) {
		return true;
	}

	if (saved.colours.length !== currentLength) {
		return true;
	}

	for (let i = 0; i < currentLength; i++) {
		if (saved.colours[i] !== currentColours[i]) {
			return true;
		}
	}

	return false;
}

function loadColourSequence(index: number)
{
	const sequence = colourSequences.get()[index];
	if (!sequence)
	{
		return;
	}

	colourSequenceName.set(sequence.name);
	colourSequenceLength.set(Math.max(1, Math.min(maxColourSequenceLength, sequence.colours.length || 1)));
	for (let i = 0; i < maxColourSequenceLength; i++)
	{
		colourSequenceColourStores[i].set(sequence.colours[i] ?? Colour.Invisible);
	}
	selectedColourSequenceIndex.set(index);
}

function getEditedColourSequence()
{
	const name = colourSequenceName.get().trim() || getFallbackColourSequenceName();
	const colourCount = Math.max(1, Math.min(maxColourSequenceLength, colourSequenceLength.get()));
	const colours = [];
	for (let index = 0; index < colourCount; index++)
	{
		colours.push(colourSequenceColourStores[index].get());
	}
	return new ColourSequence(name, colours);
}

function addOrUpdateColourSequence()
{
	const sequence = getEditedColourSequence();
	const updated = [...colourSequences.get()];
	let existingIndex = -1;
	for (let index = 0; index < updated.length; index++)
	{
		if (updated[index].name === sequence.name)
		{
			existingIndex = index;
			break;
		}
	}

	if (existingIndex >= 0)
	{
		updated[existingIndex] = sequence;
		setColourSequences(updated);
		selectedColourSequenceIndex.set(existingIndex);
		loadColourSequence(existingIndex);
		return;
	}

	updated.push(sequence);
	setColourSequences(updated);
	selectedColourSequenceIndex.set(updated.length - 1);
	loadColourSequence(updated.length - 1);
}

function deleteSelectedColourSequence()
{
	const selectedIndex = selectedColourSequenceIndex.get();
	if (typeof selectedIndex !== "number")
	{
		return;
	}

	const sequence = colourSequences.get()[selectedIndex];
	if (!sequence) return;

	const usages = findColourSequenceUsages(sequence.name);
	if (usages.length > 0)
	{
		openUsageWarningWindow(
			`Colour sequence "${sequence.name}"`,
			usages,
			// Delete only – remove the sequence, leave load references as-is
			() => {
				setColourSequences(colourSequences.get().filter((_, index) => index !== selectedIndex));
				selectedColourSequenceIndex.set(undefined);
				resetColourSequenceEditor();
			},
			// Remove from all – clear sequence references in all loads, then delete
			() => {
				removeColourSequenceUsages(sequence.name);
				setColourSequences(colourSequences.get().filter((_, index) => index !== selectedIndex));
				selectedColourSequenceIndex.set(undefined);
				resetColourSequenceEditor();
			}
		);
		return;
	}

	setColourSequences(colourSequences.get().filter((_, index) => index !== selectedIndex));
	selectedColourSequenceIndex.set(undefined);
	resetColourSequenceEditor();
}

function createColourPickerRow()
{
	return flexible({
		direction: LayoutDirection.Horizontal,
		content: colourSequenceColourStores.map(colourStore => colourPicker({
			colour: colourStore,
			width: 21,
			height: 21,
			onChange: colour => {
				colourStore.set(colour);
			}
		}))
	});
}

function openDeleteAllDataConfirmWindow(onConfirm: () => void): void
{
	if (typeof ui === "undefined")
	{
		onConfirm();
		return;
	}

	let handle: OpenWindow | undefined;

	const mainPos = getMainWindowPosition();
	const position = mainPos
		? { x: mainPos.x + 40, y: mainPos.y + 40 }
		: "center" as const;

	handle = openPopupWindow("config-delete-all-data", {
		title: t("Delete All Data"),
		width: 300,
		height: 100,
		padding: 8,
		position,
		colours: [Colour.BordeauxRedDark, Colour.Grey],
		direction: LayoutDirection.Vertical,
		content: [
			label({ text: t("{WHITE}Are you sure?") }),
			label({ text: t("{WHITE}This will permanently delete all fireworks data.") }),
			flexible({
				direction: LayoutDirection.Horizontal,
				content: [
					label({ text: "", width: "1w" }),
					colouredButton({
						text: t("Cancel"),
						width: 80,
						height: 22,
						colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
						onClick: () => handle?.close()
					}),
					label({ text: "", width: "1w" }),
					colouredButton({
						text: t("{RED}Yes"),
						width: 80,
						height: 22,
						colour: Colour.Black, colourDark: Colour.Void, colourLight: Colour.Grey,
						onClick: () => {
							handle?.close();
							onConfirm();
						}
					}),
					label({ text: "", width: "1w" }),

				]
			})
		]
	}, DATA_WINDOW_GROUP);
}

export function createConfigTab()
{
	return [
		flexible({
			direction: LayoutDirection.Horizontal,
			content: [
				groupbox({
					text: t("Other Settings"),
					width: "1w",
					height: "1w",
					direction: LayoutDirection.Horizontal,
					content: [
						groupbox({
					text: t("Colour Sequence Editor"),
					width: "1w",
					height: 290,
					content: [
								listview({
									items: compute(colourSequences, sequences => sequences.map(sequence => [sequence.name, `${sequence.colours.length}`])),
									columns: [
										{ header: t("Name"), width: "2w" },
										{ header: t("Length"), width: "1w" }
									],
									width: 260,
									height: 120,
									canSelect: true,
									selectedCell: compute(selectedColourSequenceIndex, index => index === undefined ? null : { row: index, column: 0 }),
									onClick: row => confirmDiscardChanges(isColourSequenceEditorDirty, () => loadColourSequence(row))
								}),
								flexible({
									direction: LayoutDirection.Horizontal,
									content: [
										colouredButton({
											text: t("{WHITE}Add / Update"),
											width: 80,
											height: 30,
											colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen,
											onClick: addOrUpdateColourSequence
										}),
										colouredButton({
											text: t("{WHITE}New"),
											width: 80,
											height: 30,
											colour: Colour.LightBlue, colourDark: Colour.DarkBlue, colourLight: Colour.IcyBlue,
											onClick: () => confirmDiscardChanges(isColourSequenceEditorDirty, resetColourSequenceEditor)
										}),
										colouredButton({
											text: t("{WHITE}Delete"),
											width: 80,
											height: 30,
											colour: Colour.SaturatedRed, colourDark: Colour.BordeauxRedDark, colourLight: Colour.BrightRed,
											onClick: deleteSelectedColourSequence
										})
									]
								}),
								label({ text: t("Selected sequence") }),
								textbox({
									text: colourSequenceName,
									onChange: value => {
										colourSequenceName.set(value);
									},
									width: 260,
									maxLength: 64
								}),
								flexible({
									direction: LayoutDirection.Horizontal,
									content: [
										numberInputSpinner({
											labelText: t("Colours"),
											labelWidth: 70,
											valueStore: colourSequenceLength,
											onChange: value => {
												colourSequenceLength.set(value);
											},
											width: 70,
											step: 1,
											minimum: 1,
											maximum: maxColourSequenceLength
										}),
										label({ text: `/ ${maxColourSequenceLength}` })
									]
								}),
								groupbox({
									text: compute(colourSequenceLength, length => `Colour line (${length}/${maxColourSequenceLength})`),
									content: [
										createColourPickerRow()
									]
								})
							]
				}),
				groupbox({
					text: t("Settings"),
					width: "1w",
					height: 290,
					content: [
						flexible({
							direction: LayoutDirection.Horizontal,
							height: 20,
							content: [
								label({ text: t("Language"), width: 80 }),
								dropdown({
									items: ["English", "한국어"],
									selectedIndex: selectedLanguageIndex,
									width: 190,
									onChange: index => {
										selectedLanguageIndex.set(index);
										setLanguage(index === 1 ? "ko-KR" : "en-GB");
									}
								})
							]
						}),
						label({ text: t("Restart OpenRCT2 to apply the language."), height: 14 }),
						colouredButton({
							width: 290,
							height: 52,
							colour: Colour.SaturatedRed, colourDark: Colour.BordeauxRedDark, colourLight: Colour.BrightRed,
							text: t("{WHITE}Delete all data"),
							onClick: () => openDeleteAllDataConfirmWindow(() => {
								resetPersistentStateToDefaults();
							})
						}),
						colouredButton({
							width: 290,
							height: 52,
							colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
							text: t("Export Data"),
							onClick: openExportWindow
						}),
						colouredButton({
							width: 290,
							height: 52,
							colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
							text: t("Import Data"),
							onClick: openImportWindow
						}),
						colouredButton({
							width: 290,
							height: 52,
							colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
							text: t("Open Tutorial"),
							onClick: openTutorialWindow
						})
					]
				})
					]
				})				
			]
		})
	];
}
