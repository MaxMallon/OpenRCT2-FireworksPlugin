import { box, button, Colour, compute, dropdown, flexible, groupbox, label, LayoutDirection, listview, store, textbox } from "openrct2-flexui";
import { cloneEffect } from "../../fireworks/loadHelpers";
import { openEffectEditorWindowForEffect, openEffectEditorWindowForType } from "../EffectDefineWindows/registry";
import { Play, explodeLoad } from "../../fireworks/fireworksEffectsPlayer";
import { ResetCounts } from "../../fireworks/particleSpawner";
import { getGroundEffectList, getGroundEffectToEdit, setGroundEffectList, setGroundEffectToEdit, launchSites, launchSitesRevision, definedGroundEffects } from "../../fireworks/persistent";
import { resolveLaunchSitePosition } from "../../fireworks/helpers";
import { openDebuggerWindow } from "../debuggerWindow";
import { buildValidationContext, findGroundEffectUsages, formatValidationIssues, removeItemFromSequences, ValidationIssue } from "../../fireworks/usageChecker";
import { openUsageWarningWindow } from "../usageWarningWindow";
import { Effect, EffectType, EmitterEffect } from "../../fireworks/structures/Effect";
import { GroundEffect } from "../../fireworks/structures/Firework";
import { Load } from "../../fireworks/structures/Load";
import { SequenceItemType } from "../../fireworks/structures/Sequence";
import { GetColouredEffectSprite, sprite } from "../../img/images";

const selectedGroundEffectIndex = store<number | undefined>(undefined);
const selectedEffectIndex = store<number | undefined>(undefined);
const editedName = store("");
const editedEffects = store<Effect[]>([]);
const selectedLaunchSiteName = store("");
const addEffectTypeIndex = store(0);
const isEffectDeleteMode = store(false);
const isEffectEditorOpen = store(false);

const groundEffectsSearch = store("");
const filteredGroundEffects = compute(groundEffectsSearch, definedGroundEffects, () => {
	const q = groundEffectsSearch.get().trim().toLowerCase();
	const all = definedGroundEffects.get();
	if (!q) return all;
	return all.filter(e => e.name.trim().toLowerCase().indexOf(q) === 0);
});

let addEffectTypeLabels: string[] | undefined;
function getAddEffectTypeLabels(): string[] {
	if (!addEffectTypeLabels) {
		addEffectTypeLabels = [
			"Add Effect",
			sprite(GetColouredEffectSprite("effectSprayMine", Colour.BrightRed)) + " Spray Mine",
			sprite(GetColouredEffectSprite("effectSprayFan", Colour.LightBlue)) + " Spray Fan",
			sprite(GetColouredEffectSprite("effectCometMine", Colour.LightPurple)) + " Comet Mine",
			sprite(GetColouredEffectSprite("effectCometFan", Colour.BrightGreen)) + " Comet Fan",
			sprite(GetColouredEffectSprite("effectFountain", Colour.LightOrange)) + " Fountain",
			sprite(GetColouredEffectSprite("effectWisp", Colour.White)) + " Tourbillion Rising Wisp",
		];
	}
	return addEffectTypeLabels;
}

const addEffectTypes: EffectType[] = [
	EffectType.Spray,
	EffectType.SprayFan,
	EffectType.Comet,
	EffectType.CometFan,
	EffectType.Fountain,
	EffectType.TourbillionRisingWisp,
];

function getTileHeightAt(worldX: number, worldY: number): number | undefined
{
	if (typeof map === "undefined")
	{
		return undefined;
	}

	const tile = map.getTile(Math.floor(worldX / 32), Math.floor(worldY / 32));
	for (const element of tile.elements)
	{
		if (element.type === "surface")
		{
			return element.baseHeight * 8;
		}
	}

	return undefined;
}

function onTestGroundEffectButtonClick(): void
{
	if (editedEffects.get().length === 0)
	{
		if (typeof ui !== "undefined" && typeof ui.showError === "function")
		{
			ui.showError("Invalid ground effect", "A ground effect must have at least one effect before it can be tested.");
		}
		return;
	}

	// Validate launch site reference
	const currentEdit = getGroundEffectToEdit();
	if (currentEdit) {
		const ctx = buildValidationContext();
		const issues: ValidationIssue[] = [];
		if (!currentEdit.isValid(ctx, issues, `Ground effect "${currentEdit.name}"`)) {
			if (typeof ui !== "undefined" && typeof ui.showError === "function") {
				ui.showError("Cannot test \u2013 validation failed", formatValidationIssues(issues));
			}
			return;
		}
	}

	let testPos: CoordsXYZ | undefined;

	const launchSiteName = selectedLaunchSiteName.get().trim();
	if (launchSiteName)
	{
		testPos = resolveLaunchSitePosition(launchSiteName);
	}

	if (!testPos)
	{
		if (typeof ui === "undefined" || !ui.mainViewport)
		{
			console.log("Warning: Unable to test ground effect because the main viewport is unavailable.");
			return;
		}

		const viewport = ui.mainViewport as {
			getCentrePosition?: () => CoordsXY;
			getCenterPosition?: () => CoordsXY;
			left?: number;
			right?: number;
			top?: number;
			bottom?: number;
		};

		let viewportCentre: CoordsXY | undefined;
		if (typeof viewport.getCentrePosition === "function")
		{
			viewportCentre = viewport.getCentrePosition();
		}
		else if (typeof viewport.getCenterPosition === "function")
		{
			viewportCentre = viewport.getCenterPosition();
		}
		else if (
			typeof viewport.left === "number"
			&& typeof viewport.right === "number"
			&& typeof viewport.top === "number"
			&& typeof viewport.bottom === "number"
		)
		{
			viewportCentre = {
				x: Math.floor((viewport.left + viewport.right) / 2),
				y: Math.floor((viewport.top + viewport.bottom) / 2)
			};
		}

		if (!viewportCentre)
		{
			console.log("Warning: Unable to resolve main viewport centre position.");
			return;
		}

		const groundZ = getTileHeightAt(viewportCentre.x, viewportCentre.y);
		testPos = {
			x: viewportCentre.x,
			y: viewportCentre.y,
			z: groundZ !== undefined ? groundZ : 0
		};
	}

	ResetCounts();
	Play(true);
	const effectsForTest = editedEffects.get().map(effect => {
		const cloned = cloneEffect(effect);
		if (cloned instanceof EmitterEffect && launchSiteName)
		{
			cloned.position = launchSiteName;
		}
		return cloned;
	});
	explodeLoad(new Load(effectsForTest), testPos, { x: 0, y: 0, z: 0 });
}

function getFallbackName(): string
{
	return `G.E. ${definedGroundEffects.get().length + 1}`;
}

function cloneGroundEffect(source: GroundEffect): GroundEffect
{
	return new GroundEffect(source.effects.map(cloneEffect), source.name, source.position);
}

function syncEditorToEdit(): void
{
	setGroundEffectToEdit(new GroundEffect(editedEffects.get().map(cloneEffect), editedName.get().trim(), selectedLaunchSiteName.get().trim()));
}

function showEmptyEffectWarning(): void
{
	if (typeof ui !== "undefined" && typeof ui.showError === "function")
	{
		ui.showError("Invalid ground effect", "A ground effect must have at least one effect before it can be saved.");
		return;
	}

	console.log("Warning: Tried to save a ground effect with zero effects.");
}

function resetEditor(): void
{
	editedName.set("");
	editedEffects.set([]);
	selectedLaunchSiteName.set("");
	selectedGroundEffectIndex.set(undefined);
	selectedEffectIndex.set(undefined);
	isEffectDeleteMode.set(false);
	setGroundEffectToEdit(undefined);
	isEffectEditorOpen.set(false);
}

function loadSelectedGroundEffect(index: number): void
{
	const entry = definedGroundEffects.get()[index];
	if (!entry)
	{
		return;
	}

	selectedGroundEffectIndex.set(index);
	selectedEffectIndex.set(undefined);
	editedName.set(entry.name);
	editedEffects.set(entry.effects.map(cloneEffect));
	selectedLaunchSiteName.set(entry.position);
	setGroundEffectToEdit(cloneGroundEffect(entry));
}

function addOrUpdateGroundEffect(): void
{
	if (editedEffects.get().length === 0)
	{
		showEmptyEffectWarning();
		return;
	}

	if (!selectedLaunchSiteName.get().trim())
	{
		if (typeof ui !== "undefined" && typeof ui.showError === "function")
		{
			ui.showError("Invalid ground effect", "A ground effect must have a selected launch site.");
		}
		return;
	}

	const trimmedName = editedName.get().trim();
	const nextName = trimmedName || getFallbackName();
	const positionName = selectedLaunchSiteName.get().trim();
	const nextEffects = editedEffects.get().map(effect => {
		const cloned = cloneEffect(effect);
		if (cloned instanceof EmitterEffect)
		{
			cloned.position = positionName;
		}
		return cloned;
	});
	const nextEntry = new GroundEffect(nextEffects, nextName, positionName);
	const updated = [...getGroundEffectList()];
	let existingIndex = -1;
	for (let index = 0; index < updated.length; index++)
	{
		if (updated[index].name === nextName)
		{
			existingIndex = index;
			break;
		}
	}

	if (existingIndex >= 0)
	{
		updated[existingIndex] = nextEntry;
		selectedGroundEffectIndex.set(existingIndex);
	}
	else
	{
		updated.push(nextEntry);
		selectedGroundEffectIndex.set(updated.length - 1);
	}

	setGroundEffectList(updated.map(cloneGroundEffect));
	setGroundEffectToEdit(cloneGroundEffect(nextEntry));
	editedName.set(nextName);
}

function updateEditedEffects(nextEffects: Effect[]): void
{
	editedEffects.set(nextEffects);
	syncEditorToEdit();
}

function upsertEditedEffect(effect: Effect): void
{
	const selectedIndex = selectedEffectIndex.get();
	if (typeof selectedIndex === "number")
	{
		const nextEffects = [...editedEffects.get()];
		nextEffects[selectedIndex] = effect;
		updateEditedEffects(nextEffects);
		return;
	}

	const nextEffects = [...editedEffects.get(), effect];
	updateEditedEffects(nextEffects);
	selectedEffectIndex.set(nextEffects.length - 1);
}

function markEffectEditorClosed(): void
{
	isEffectEditorOpen.set(false);
}

function tryOpenEffectEditor(openEditor: (onClose: () => void) => void): boolean
{
	if (isEffectEditorOpen.get())
	{
		return false;
	}

	isEffectEditorOpen.set(true);
	openEditor(markEffectEditorClosed);
	return true;
}

function openEffectEditorForSelection(effect: Effect, index: number): void
{
	if (isEffectEditorOpen.get())
	{
		return;
	}

	selectedEffectIndex.set(index);
	tryOpenEffectEditor(onClose => openEffectEditorWindowForEffect(effect, updatedEffect => {
		const nextEffects = [...editedEffects.get()];
		nextEffects[index] = updatedEffect;
		updateEditedEffects(nextEffects);
	}, onClose));
}

function onAddEffectTypeChange(index: number): void
{
	if (index === 0)
	{
		return;
	}

	addEffectTypeIndex.set(index);
	const effectType = addEffectTypes[index - 1];
	if (!effectType)
	{
		addEffectTypeIndex.set(0);
		return;
	}

	if (isEffectEditorOpen.get())
	{
		addEffectTypeIndex.set(0);
		return;
	}

	selectedEffectIndex.set(undefined);
	tryOpenEffectEditor(onClose => openEffectEditorWindowForType(effectType, newEffect => {
		upsertEditedEffect(newEffect);
	}, onClose));
	addEffectTypeIndex.set(0);
}

function deleteSelectedGroundEffect(): void
{
	const selectedIndex = selectedGroundEffectIndex.get();
	if (typeof selectedIndex !== "number")
	{
		return;
	}

	const ge = definedGroundEffects.get()[selectedIndex];
	if (!ge) return;

	const usages = findGroundEffectUsages(ge.name);

	const doDelete = () => {
		const updated = definedGroundEffects.get().filter((_, index) => index !== selectedIndex);
		setGroundEffectList(updated.map(cloneGroundEffect));
		resetEditor();
	};

	if (usages.length > 0) {
		openUsageWarningWindow(
			`Ground effect "${ge.name}"`,
			usages,
			doDelete,
			() => {
				removeItemFromSequences(ge.name, SequenceItemType.GroundEffect);
				doDelete();
			}
		);
		return;
	}

	doDelete();
}

function onDeleteEffectClick(): void
{
	isEffectDeleteMode.set(!isEffectDeleteMode.get());
}

function deleteEditedEffectAt(index: number): void
{
	updateEditedEffects(editedEffects.get().filter((_, effectIndex) => effectIndex !== index));
	selectedEffectIndex.set(undefined);
}

export function createGroundEffectsTab()
{
	const currentEdit = getGroundEffectToEdit();
	if (currentEdit)
	{
		editedName.set(currentEdit.name);
		editedEffects.set(currentEdit.effects.map(cloneEffect));
		selectedLaunchSiteName.set(currentEdit.position);
	}

	return [
		flexible({
			direction: LayoutDirection.Horizontal,
			content: [
				groupbox({
					text: "Ground Effects Editor",
					content: [
						flexible({
							direction: LayoutDirection.Horizontal,
							content: [
								box({
									width: 350,
									height: 290,
									padding: 6,
									text: "Current Ground Effect",
									content: flexible({
										direction: LayoutDirection.Vertical,
										content: [
											label({ text: "Name" }),
											textbox({
												text: editedName,
												onChange: value => {
													editedName.set(value);
													syncEditorToEdit();
												},
												width: 260,
												maxLength: 64
											}),
											label({ text: "Launch Site" }),
											dropdown({
												items: compute(launchSitesRevision, () => {
													const names = launchSites.map(site => site.name);
													return ["[None]", ...names];
												}),
												selectedIndex: compute(launchSitesRevision, selectedLaunchSiteName, () => {
													const names = launchSites.map(site => site.name);
													const index = names.indexOf(selectedLaunchSiteName.get());
													return index >= 0 ? index + 1 : 0;
												}),
												onChange: index => {
													if (index <= 0)
													{
														selectedLaunchSiteName.set("");
													}
													else
													{
														const site = launchSites[index - 1];
														selectedLaunchSiteName.set(site ? site.name : "");
													}

													syncEditorToEdit();
												},
												autoDisable: "never"
											}),
											label({ text: "Effects" }),
											label({ text: "Add Effect" }),
											dropdown({
												items: getAddEffectTypeLabels(),
												selectedIndex: addEffectTypeIndex,
												onChange: index => onAddEffectTypeChange(index),
												autoDisable: "never"
											}),
											listview({
												items: compute(editedEffects, isEffectDeleteMode, (effects, deleteMode) => effects.map((effect, index) => {
													const indexText = `${index + 1}`;
													const typeText = effect.type;
													if (!deleteMode)
													{
														return [indexText, typeText, effect.GetSpriteString()];
													}

													return [`{RED}${indexText}`, `{RED}${typeText}`];
												})),
												columns: [
													{ header: "#", width: "1w" },
													{ header: "Effect", width: "2w" },
													{ header: "Icon", width: "2w" }
												],
												width: "1w",
												height: 90,
												canSelect: true,
												selectedCell: compute(selectedEffectIndex, index => index === undefined ? null : { row: index, column: 0 }),
												onClick: row => {
													const effect = editedEffects.get()[row];
													if (!effect)
													{
														return;
													}

													if (isEffectDeleteMode.get())
													{
														deleteEditedEffectAt(row);
														return;
													}

													openEffectEditorForSelection(effect, row);
												}
											}),
											flexible({
												direction: LayoutDirection.Horizontal,
												content: [
													button({
														text: compute(isEffectDeleteMode, enabled => enabled ? "Delete Mode: {RED}ON" : "Delete Mode: OFF"),
														width: 115,
														onClick: onDeleteEffectClick
													}),
													label({ text: "", width: "1w" }),
													button({
														text: "Test",
														width: 50,
														onClick: onTestGroundEffectButtonClick
													})
												]
											}),
											flexible({
												direction: LayoutDirection.Horizontal,
												content: [
													button({
														text: "Add Ground Effect",
														width: 110,
														onClick: addOrUpdateGroundEffect
													}),
													button({
														text: "New",
														width: 50,
														onClick: resetEditor
													}),
													button({
														text: "Delete",
														width: 80,
														onClick: deleteSelectedGroundEffect
													}),
													label({ text: "", width: "1w" }),
													button({ text: "Debugger", width: 70, onClick: openDebuggerWindow })
												]
											})
										]
									})
								}),
								box({
									width: "1w",
									height: "1w",
									padding: 6,
									text: "Defined Ground Effects",
									content: flexible({
										direction: LayoutDirection.Vertical,
										content: [
											textbox({
												text: groundEffectsSearch,
												onChange: value => groundEffectsSearch.set(value),
												width: "1w",
												maxLength: 64
											}),
											listview({
												items: compute(filteredGroundEffects, effects => effects.map(e => [e.name, e.GetSpriteString()])),
												columns: [
													{ header: "Name", width: "3w" },													
													{ header: "Icons", width: "2w" }
											],
												width: "1w",
												height: "1w",
												canSelect: true,
												selectedCell: compute(selectedGroundEffectIndex, filteredGroundEffects, () => {
													const idx = selectedGroundEffectIndex.get();
													if (idx === undefined) return null;
													const name = definedGroundEffects.get()[idx]?.name;
													if (!name) return null;
													const row = filteredGroundEffects.get().findIndex(e => e.name === name);
													return row >= 0 ? { row, column: 0 } : null;
												}),
												onClick: row => {
													const effect = filteredGroundEffects.get()[row];
													if (!effect) return;
													const fullIndex = definedGroundEffects.get().findIndex(e => e.name === effect.name);
													if (fullIndex >= 0) loadSelectedGroundEffect(fullIndex);
												}
											})
										]
									})
								})
							]
						})
					]
				})
			]
		})
	];
}