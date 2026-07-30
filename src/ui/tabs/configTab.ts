import { button, colourPicker, compute, flexible, groupbox, label, LayoutDirection, listview, spinner, store, textbox, Colour, window } from "openrct2-flexui";
import type { OpenWindow } from "openrct2-flexui";
import { ColourSequence, maxColourSequenceLength } from "../../fireworks/structures/ColourStructures";
import { colourSequences, setColourSequences, resetPersistentStateToDefaults, saveParkState } from "../../fireworks/persistent";
import { findColourSequenceUsages, removeColourSequenceUsages } from "../../fireworks/usageChecker";
import { openUsageWarningWindow } from "../usageWarningWindow";
import { getMainWindowPosition } from "../windowState";
import { openExportWindow, openImportWindow } from "../importExportWindow";
import { openTutorialWindow } from "../tutorialWindow";

const selectedColourSequenceIndex = store<number | undefined>(undefined);
const colourSequenceName = store("");
const colourSequenceLength = store(1);
const colourSequenceColourStores = [
	store(Colour.Invisible),
	store(Colour.Invisible),
	store(Colour.Invisible),
	store(Colour.Invisible),
	store(Colour.Invisible),
	store(Colour.Invisible),
	store(Colour.Invisible),
	store(Colour.Invisible),
	store(Colour.Invisible),
	store(Colour.Invisible)
];

function getFallbackColourSequenceName(): string
{
	return `Sequence ${colourSequences.get().length + 1}`;
}

function resetColourSequenceEditor()
{
	colourSequenceName.set("");
	colourSequenceLength.set(1);
	for (const colourStore of colourSequenceColourStores)
	{
		colourStore.set(Colour.Invisible);
	}
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

	const popup = window({
		title: "Delete All Data",
		width: 300,
		height: 100,
		padding: 8,
		position,
		colours: [Colour.BordeauxRedDark, Colour.Grey],
		direction: LayoutDirection.Vertical,
		content: [
			label({ text: "{WHITE}Are you sure?" }),
			label({ text: "{WHITE}This will permanently delete all fireworks data." }),
			flexible({
				direction: LayoutDirection.Horizontal,
				content: [
					button({
						text: "Yes",
						width: 80,
						height: 22,
						onClick: () => {
							handle?.close();
							onConfirm();
						}
					}),
					button({
						text: "Cancel",
						width: 80,
						height: 22,
						onClick: () => handle?.close()
					})
				]
			})
		]
	});

	handle = popup.open();
}

export function createConfigTab()
{
	return [
		flexible({
			direction: LayoutDirection.Horizontal,
			content: [
				groupbox({
					text: "Other Settings",
					width: "1w",
					height: "1w",
					direction: LayoutDirection.Horizontal,
					content: [
						groupbox({
					text: "Colour Sequence Editor",
					width: "1w",
					height: 290,
					content: [
								listview({
									items: compute(colourSequences, sequences => sequences.map(sequence => [sequence.name, `${sequence.colours.length}`])),
									columns: [
										{ header: "Name", width: "2w" },
										{ header: "Length", width: "1w" }
									],
									width: 260,
									height: 120,
									canSelect: true,
									selectedCell: compute(selectedColourSequenceIndex, index => index === undefined ? null : { row: index, column: 0 }),
									onClick: row => loadColourSequence(row)
								}),
								flexible({
									direction: LayoutDirection.Horizontal,
									content: [
										button({
											text: "Add / Update",
											width: 80,
											onClick: addOrUpdateColourSequence
										}),
										button({
											text: "Delete",
											width: 80,
											onClick: deleteSelectedColourSequence
										})
									]
								}),
								label({ text: "Selected sequence" }),
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
										label({ text: "Colours", width: 70 }),
										spinner({
											value: colourSequenceLength,
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
					text: "Settings",
					width: "1w",
					height: 290,
					content: [
						button({
							text: "{RED}Delete all data",
							onClick: () => openDeleteAllDataConfirmWindow(() => {
								resetPersistentStateToDefaults();
								saveParkState();
							})
						}),
						button({
							text: "Export Data",
							onClick: openExportWindow
						}),
						button({
							text: "Import Data",
							onClick: openImportWindow
						}),
						button({
							text: "Open Tutorial",
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