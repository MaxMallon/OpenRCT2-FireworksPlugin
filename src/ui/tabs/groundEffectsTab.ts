import { t } from "../../localization";
import { box, Colour, compute, dropdown, flexible, groupbox, label, LayoutDirection, listview, store, textbox } from "openrct2-flexui";
import { cloneEffect, cloneGroundEffect } from "../../fireworks/cloneHelpers";
import { openEffectEditorWindowForEffect, openEffectEditorWindowForType } from "../EffectDefineWindows/registry";
import { Play, Stop, explodeLoad } from "../../fireworks/fireworksEffectsPlayer";
import { ResetCounts } from "../../fireworks/particleSpawner";
import { getGroundEffectList, getGroundEffectMap, getGroundEffectToEdit, setGroundEffectList, setGroundEffectToEdit, launchSites, launchSitesRevision, definedGroundEffects } from "../../fireworks/persistent";
import { resolveLaunchSitePosition } from "../../fireworks/persistent";
import { openDebuggerWindow } from "../debuggerWindow";
import { buildValidationContext, findGroundEffectUsages, formatValidationIssues, removeItemFromSequences, ValidationIssue } from "../../fireworks/usageChecker";
import { openUsageWarningWindow } from "../usageWarningWindow";
import { Effect, EffectType, EmitterEffect } from "../../fireworks/structures/Effect";
import { GroundEffect } from "../../fireworks/structures/Firework";
import { Load } from "../../fireworks/structures/Load";
import { SequenceItemType } from "../../fireworks/structures/Sequence";
import { GetColouredEffectSprite, sprite } from "../../img/images";
import { colouredButton } from "../ColouredButton";
import { beginPaletteTest } from "../../fireworks/testPaletteMode";
import { SerializedGroundEffectEditorState } from "../../fireworks/parkStorage";
import { confirmDiscardChanges } from "../discardChangesWindow";

const DEFAULT_GROUND_EFFECT_EDITOR = {
	name: "",
	effects: [] as Effect[],
	launchSiteName: "",
	selectedIndex: undefined as number | undefined,
	selectedEffectIndex: undefined as number | undefined,
	addEffectTypeIndex: 0,
	isEffectDeleteMode: false
};

const selectedGroundEffectIndex = store<number | undefined>(DEFAULT_GROUND_EFFECT_EDITOR.selectedIndex);
const selectedEffectIndex = store<number | undefined>(DEFAULT_GROUND_EFFECT_EDITOR.selectedEffectIndex);
const editedName = store(DEFAULT_GROUND_EFFECT_EDITOR.name);
const editedEffects = store<Effect[]>(DEFAULT_GROUND_EFFECT_EDITOR.effects);
const selectedLaunchSiteName = store(DEFAULT_GROUND_EFFECT_EDITOR.launchSiteName);
const addEffectTypeIndex = store(DEFAULT_GROUND_EFFECT_EDITOR.addEffectTypeIndex);
const isEffectDeleteMode = store(DEFAULT_GROUND_EFFECT_EDITOR.isEffectDeleteMode);

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
			t("Add Effect"),
			sprite(GetColouredEffectSprite("effectSprayMine", Colour.BrightRed)) + t(" Spray Mine"),
			sprite(GetColouredEffectSprite("effectSprayFan", Colour.LightBlue)) + t(" Spray Fan"),
			sprite(GetColouredEffectSprite("effectCometMine", Colour.LightPurple)) + t(" Comet Mine"),
			sprite(GetColouredEffectSprite("effectCometFan", Colour.BrightGreen)) + t(" Comet Fan"),
			sprite(GetColouredEffectSprite("effectFountain", Colour.LightOrange)) + t(" Fountain"),
			sprite(GetColouredEffectSprite("effectWisp", Colour.White)) + t(" Tourbillion Rising Wisp"),
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

function getTileHeightAt(worldX: number, worldY: number): number | undefined {
	if (typeof map === "undefined") {
		return undefined;
	}

	const tile = map.getTile(Math.floor(worldX / 32), Math.floor(worldY / 32));
	for (const element of tile.elements) {
		if (element.type === "surface") {
			return element.baseHeight * 8;
		}
	}

	return undefined;
}

function onTestGroundEffectButtonClick(): void {
	if (!validateGroundEffectEditor()) return;

	// Validate all named references before testing
	const currentEdit = getGroundEffectToEdit();
	if (currentEdit) {
		const ctx = buildValidationContext();
		const issues: ValidationIssue[] = [];
		if (!currentEdit.isValid(ctx, issues, `Ground effect "${currentEdit.name}"`)) {
			if (typeof ui !== "undefined" && typeof ui.showError === "function") {
				ui.showError(t("Invalid ground effect"), formatValidationIssues(issues));
			}
			return;
		}
	}

	let testPos: CoordsXYZ | undefined;

	const launchSiteName = selectedLaunchSiteName.get().trim();
	if (launchSiteName) {
		testPos = resolveLaunchSitePosition(launchSiteName);
	}

	if (!testPos) {
		const viewport = ui.mainViewport as {
			getCentrePosition?: () => CoordsXY;
			getCenterPosition?: () => CoordsXY;
			left?: number;
			right?: number;
			top?: number;
			bottom?: number;
		};

		let viewportCentre: CoordsXY | undefined;
		if (typeof viewport.getCentrePosition === "function") {
			viewportCentre = viewport.getCentrePosition();
		}
		else if (typeof viewport.getCenterPosition === "function") {
			viewportCentre = viewport.getCenterPosition();
		}
		else if (
			typeof viewport.left === "number"
			&& typeof viewport.right === "number"
			&& typeof viewport.top === "number"
			&& typeof viewport.bottom === "number"
		) {
			viewportCentre = {
				x: Math.floor((viewport.left + viewport.right) / 2),
				y: Math.floor((viewport.top + viewport.bottom) / 2)
			};
		}

		if (!viewportCentre) {
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
		if (cloned instanceof EmitterEffect && launchSiteName) {
			cloned.position = launchSiteName;
		}
		return cloned;
	});
	const testLoad = new Load(effectsForTest);
	explodeLoad(testLoad, testPos, { x: 0, y: 0, z: 0 });
	beginPaletteTest(testLoad.getDuration());
}

function onStopClick(): void {
	Stop();
}

function getFallbackName(): string {
	return `G.E. ${definedGroundEffects.get().length + 1}`;
}

function syncEditorToEdit(): void {
	setGroundEffectToEdit(new GroundEffect(editedEffects.get().map(cloneEffect), editedName.get().trim(), selectedLaunchSiteName.get().trim()));
}

function validateGroundEffectEditor(): boolean {
	if (editedEffects.get().length === 0) {
		if (typeof ui !== "undefined" && typeof ui.showError === "function")
			ui.showError(t("Invalid ground effect"), t("A ground effect must have at least one effect."));
		return false;
	}

	if (!selectedLaunchSiteName.get().trim()) {
		if (typeof ui !== "undefined" && typeof ui.showError === "function")
			ui.showError(t("Invalid ground effect"), t("A ground effect must have a selected launch site."));
		return false;
	}

	return true;
}

export function getGroundEffectEditorState(): SerializedGroundEffectEditorState {
	return {
		groundEffect: new GroundEffect(editedEffects.get(), editedName.get().trim(), selectedLaunchSiteName.get().trim()).toParkData(),
		isEffectDeleteMode: isEffectDeleteMode.get()
	};
}

export function restoreGroundEffectEditorState(state: SerializedGroundEffectEditorState | undefined, decodeEffectFn: (data: any) => Effect): void {
	if (!state || !state.groundEffect) {
		resetGroundEffectEditor();
		return;
	}
	const groundEffect = GroundEffect.fromParkData(state.groundEffect, decodeEffectFn);
	editedName.set(groundEffect.name);
	editedEffects.set(groundEffect.effects);
	selectedLaunchSiteName.set(groundEffect.position);
	selectedGroundEffectIndex.set(DEFAULT_GROUND_EFFECT_EDITOR.selectedIndex);
	selectedEffectIndex.set(DEFAULT_GROUND_EFFECT_EDITOR.selectedEffectIndex);
	addEffectTypeIndex.set(DEFAULT_GROUND_EFFECT_EDITOR.addEffectTypeIndex);
	isEffectDeleteMode.set(typeof state.isEffectDeleteMode === "boolean" ? state.isEffectDeleteMode : DEFAULT_GROUND_EFFECT_EDITOR.isEffectDeleteMode);
	if (groundEffect.name || groundEffect.effects.length > 0 || groundEffect.position) {
		setGroundEffectToEdit(new GroundEffect(groundEffect.effects.map(cloneEffect), groundEffect.name.trim(), groundEffect.position.trim()));
	} else {
		setGroundEffectToEdit(undefined);
	}
}

export function resetGroundEffectEditor(): void {
	editedName.set(DEFAULT_GROUND_EFFECT_EDITOR.name);
	editedEffects.set([]);
	selectedLaunchSiteName.set(DEFAULT_GROUND_EFFECT_EDITOR.launchSiteName);
	selectedGroundEffectIndex.set(DEFAULT_GROUND_EFFECT_EDITOR.selectedIndex);
	selectedEffectIndex.set(DEFAULT_GROUND_EFFECT_EDITOR.selectedEffectIndex);
	addEffectTypeIndex.set(DEFAULT_GROUND_EFFECT_EDITOR.addEffectTypeIndex);
	isEffectDeleteMode.set(DEFAULT_GROUND_EFFECT_EDITOR.isEffectDeleteMode);
	setGroundEffectToEdit(undefined);
}

export function isGroundEffectEditorDirty(): boolean {
	const currentName = editedName.get().trim();
	const currentEffects = editedEffects.get();
	const currentSite = selectedLaunchSiteName.get().trim();

	if (!currentName) {
		return currentEffects.length > DEFAULT_GROUND_EFFECT_EDITOR.effects.length || currentSite !== DEFAULT_GROUND_EFFECT_EDITOR.launchSiteName;
	}

	const saved = getGroundEffectMap().get(currentName);
	if (!saved) {
		return true;
	}

	if (saved.position !== currentSite) {
		return true;
	}

	const comparableData = (effect: Effect): any => {
		const data = effect.toParkData();
		if (data.className === "TourbillionRisingWispEffect") {
			delete data.posX;
			delete data.posY;
			delete data.posZ;
			delete data.velX;
			delete data.velY;
			delete data.velZ;
			delete data.randomSpeed;
			delete data.driftAngle;
			delete data.driftStrength;
			delete data.particle;
			delete data.particleId;
		}
		return data;
	};
	const currentData = currentEffects.map(comparableData);
	const savedData = saved.effects.map(comparableData);
	return JSON.stringify(currentData) !== JSON.stringify(savedData);
}

function resetEditor(): void {
	resetGroundEffectEditor();
}

function loadSelectedGroundEffect(index: number): void {
	const entry = definedGroundEffects.get()[index];
	if (!entry) {
		return;
	}

	selectedGroundEffectIndex.set(index);
	selectedEffectIndex.set(undefined);
	editedName.set(entry.name);
	editedEffects.set(entry.effects.map(cloneEffect));
	selectedLaunchSiteName.set(entry.position);
	setGroundEffectToEdit(cloneGroundEffect(entry));
}

function addOrUpdateGroundEffect(): void {
	if (!validateGroundEffectEditor()) return;

	const trimmedName = editedName.get().trim();
	const nextName = trimmedName || getFallbackName();
	const positionName = selectedLaunchSiteName.get().trim();
	const nextEffects = editedEffects.get().map(effect => {
		const cloned = cloneEffect(effect);
		if (cloned instanceof EmitterEffect) {
			cloned.position = positionName;
		}
		return cloned;
	});
	const nextEntry = new GroundEffect(nextEffects, nextName, positionName);
	const updated = [...getGroundEffectList()];
	let existingIndex = -1;
	for (let index = 0; index < updated.length; index++) {
		if (updated[index].name === nextName) {
			existingIndex = index;
			break;
		}
	}

	if (existingIndex >= 0) {
		updated[existingIndex] = nextEntry;
		selectedGroundEffectIndex.set(existingIndex);
	}
	else {
		updated.push(nextEntry);
		selectedGroundEffectIndex.set(updated.length - 1);
	}

	setGroundEffectList(updated.map(cloneGroundEffect));
	setGroundEffectToEdit(cloneGroundEffect(nextEntry));
	editedName.set(nextName);
}

function updateEditedEffects(nextEffects: Effect[]): void {
	editedEffects.set(nextEffects);
	syncEditorToEdit();
}

function upsertEditedEffect(effect: Effect): void {
	const selectedIndex = selectedEffectIndex.get();
	if (typeof selectedIndex === "number") {
		const nextEffects = [...editedEffects.get()];
		nextEffects[selectedIndex] = effect;
		updateEditedEffects(nextEffects);
		return;
	}

	const nextEffects = [...editedEffects.get(), effect];
	updateEditedEffects(nextEffects);
	selectedEffectIndex.set(nextEffects.length - 1);
}

function openEffectEditorForSelection(effect: Effect, index: number): void {
	selectedEffectIndex.set(index);
	openEffectEditorWindowForEffect(effect, updatedEffect => {
		const nextEffects = [...editedEffects.get()];
		nextEffects[index] = updatedEffect;
		updateEditedEffects(nextEffects);
	});
}

function onAddEffectTypeChange(index: number): void {
	if (index === 0) {
		return;
	}

	addEffectTypeIndex.set(index);
	const effectType = addEffectTypes[index - 1];
	if (!effectType) {
		addEffectTypeIndex.set(0);
		return;
	}

	selectedEffectIndex.set(undefined);
	openEffectEditorWindowForType(effectType, newEffect => {
		upsertEditedEffect(newEffect);
	});
	addEffectTypeIndex.set(0);
}

function deleteSelectedGroundEffect(): void {
	const selectedIndex = selectedGroundEffectIndex.get();
	if (typeof selectedIndex !== "number") {
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

function onDeleteEffectClick(): void {
	isEffectDeleteMode.set(!isEffectDeleteMode.get());
}

function deleteEditedEffectAt(index: number): void {
	updateEditedEffects(editedEffects.get().filter((_, effectIndex) => effectIndex !== index));
	selectedEffectIndex.set(undefined);
}

export function createGroundEffectsTab() {
	const currentEdit = getGroundEffectToEdit();
	if (currentEdit) {
		editedName.set(currentEdit.name);
		editedEffects.set(currentEdit.effects.map(cloneEffect));
		selectedLaunchSiteName.set(currentEdit.position);
	}

	return [
		flexible({
			direction: LayoutDirection.Horizontal,
			content: [
				groupbox({
					text: t("Ground Effects Editor"),
					content: [
						flexible({
							direction: LayoutDirection.Horizontal,
							content: [
								box({
									width: 350,
									height: 290,
									padding: 6,
									text: t("Current Ground Effect"),
									content: flexible({
										direction: LayoutDirection.Vertical,
										content: [
											label({ text: t("Name") }),
											textbox({
												text: editedName,
												onChange: value => {
													editedName.set(value);
													syncEditorToEdit();
												},
												width: 260,
												maxLength: 64
											}),
											label({ text: t("Launch Site") }),
											dropdown({
												items: compute(launchSitesRevision, () => {
													const names = launchSites.map(site => site.name);
													return [t("[None]"), ...names];
												}),
												selectedIndex: compute(launchSitesRevision, selectedLaunchSiteName, () => {
													const names = launchSites.map(site => site.name);
													const index = names.indexOf(selectedLaunchSiteName.get());
													return index >= 0 ? index + 1 : 0;
												}),
												onChange: index => {
													if (index <= 0) {
														selectedLaunchSiteName.set("");
													}
													else {
														const site = launchSites[index - 1];
														selectedLaunchSiteName.set(site ? site.name : "");
													}

													syncEditorToEdit();
												},
												autoDisable: "never"
											}),
											label({ text: t("Effects") }),
											label({ text: t("Add Effect") }),
											dropdown({
												items: getAddEffectTypeLabels(),
												selectedIndex: addEffectTypeIndex,
												onChange: index => onAddEffectTypeChange(index),
												autoDisable: "never"
											}),
											listview({
												items: compute(editedEffects, isEffectDeleteMode, (effects, deleteMode) => effects.map((effect, index) => {
													const indexText = `${index + 1}`;
											const typeText = t(effect.type);
													if (!deleteMode) {
														return [indexText, typeText, effect.GetSpriteString()];
													}

													return [`{RED}${indexText}`, `{RED}${typeText}`];
												})),
												columns: [
													{ header: "#", width: "1w" },
													{ header: t("Effect"), width: "2w" },
													{ header: t("Icon"), width: "2w" }
												],
												width: "1w",
												height: 90,
												canSelect: true,
												selectedCell: compute(selectedEffectIndex, index => index === undefined ? null : { row: index, column: 0 }),
												onClick: row => {
													const effect = editedEffects.get()[row];
													if (!effect) {
														return;
													}

													if (isEffectDeleteMode.get()) {
														deleteEditedEffectAt(row);
														return;
													}

													openEffectEditorForSelection(effect, row);
												}
											}),
											flexible({
												direction: LayoutDirection.Horizontal,
												content: [
													colouredButton({
														text: compute(isEffectDeleteMode, enabled => enabled ? t("Delete Mode: {RED}ON") : t("Delete Mode: OFF")),
														width: 115, height: 22,
														colour: Colour.LightBrown, colourDark: Colour.SaturatedBrown, colourLight: Colour.SaturatedBrownLight,
														pressed: isEffectDeleteMode, onClick: onDeleteEffectClick
													}),
													label({ text: "", width: "1w" }),
													colouredButton({
														text: t("{WHITE}Test Ground Effect"),
														width: 115, height: 22,
														colour: Colour.LightOrange, colourDark: Colour.DarkOrange, colourLight: Colour.OrangeLight,
														onClick: onTestGroundEffectButtonClick
															}),
															colouredButton({
																text: t("{RED}Stop"), width: 40, height: 22,
																colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White, onClick: onStopClick
													})
												]
											}),
											flexible({
												direction: LayoutDirection.Horizontal,
												content: [
													colouredButton({
														text: t("{WHITE}Add Ground Effect"),
														width: 110, height: 22,
														colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen,
														onClick: addOrUpdateGroundEffect
													}),
													colouredButton({
														text: t("{WHITE}New"),
														width: 50, height: 22,
														colour: Colour.LightBlue, colourDark: Colour.DarkBlue, colourLight: Colour.IcyBlue,
														onClick: () => confirmDiscardChanges(isGroundEffectEditorDirty, resetEditor)
													}),
													colouredButton({
														text: t("{WHITE}Delete G.E."),
														width: 90, height: 22,
														colour: Colour.SaturatedRed, colourDark: Colour.BordeauxRedDark, colourLight: Colour.BrightRed,
														onClick: deleteSelectedGroundEffect
													}),
													label({ text: "", width: "1w" }),
													colouredButton({
														text: t("{BLACK}Debugger"), width: 70, height: 22,
														colour: Colour.Yellow, colourDark: Colour.DarkYellow, colourLight: Colour.BrightYellow, onClick: openDebuggerWindow
													})
												]
											})
										]
									})
								}),
								box({
									width: "1w",
									height: "1w",
									padding: 6,
									text: t("Defined Ground Effects"),
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
													{ header: t("Name"), width: "3w" },
													{ header: t("Icons"), width: "2w" }
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
													if (fullIndex >= 0) confirmDiscardChanges(isGroundEffectEditorDirty, () => loadSelectedGroundEffect(fullIndex));
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
