import { box, compute, dropdown, flexible, groupbox, label, LayoutDirection, listview, store, textbox } from "openrct2-flexui";
import { cloneEffect, cloneLoad } from "../../fireworks/cloneHelpers";
import { openEffectEditorWindowForEffect, openEffectEditorWindowForType } from "../EffectDefineWindows/registry";
import { Play, explodeLoad } from "../../fireworks/fireworksEffectsPlayer";
import { ResetCounts } from "../../fireworks/particleSpawner";
import { getEditLoad, getLoadList, getLoadMap, setEditLoad, setLoadList, definedLoads } from "../../fireworks/persistent";
import { openDebuggerWindow } from "../debuggerWindow";
import { buildValidationContext, collectShellOfShellsReferencedLoadNames, findLoadUsages, formatValidationIssues, removeLoadUsages, ValidationIssue } from "../../fireworks/usageChecker";
import { openUsageWarningWindow } from "../usageWarningWindow";
import { Effect, EffectType } from "../../fireworks/structures/Effect";
import { Load } from "../../fireworks/structures/Load";
import { GetColouredEffectSprite, sprite } from "../../img/images";
import { Colour } from "openrct2-flexui";
import { GetFireworkTestLocation, isEditorWindowObscuringCenter } from "../../fireworks/helpers";
import { colouredButton } from "../ColouredButton";
import { beginPaletteTest } from "../../fireworks/testPaletteMode";
import { SerializedLoadEditorState } from "../../fireworks/parkStorage";
import { confirmDiscardChanges } from "../discardChangesWindow";

const DEFAULT_LOAD_EDITOR = {
	name: "",
	effects: [] as Effect[],
	selectedIndex: undefined as number | undefined,
	selectedEffectIndex: undefined as number | undefined,
	addEffectTypeIndex: 0,
	isEffectDeleteMode: false
};

const selectedLoadIndex = store<number | undefined>(DEFAULT_LOAD_EDITOR.selectedIndex);
const selectedEffectIndex = store<number | undefined>(DEFAULT_LOAD_EDITOR.selectedEffectIndex);
const editedLoadName = store(DEFAULT_LOAD_EDITOR.name);
const editedLoadEffects = store<Effect[]>(DEFAULT_LOAD_EDITOR.effects);
const addEffectTypeIndex = store(DEFAULT_LOAD_EDITOR.addEffectTypeIndex);
const isEffectDeleteMode = store(DEFAULT_LOAD_EDITOR.isEffectDeleteMode);

const loadsSearch = store("");
const filteredLoads = compute(loadsSearch, definedLoads, () => {
	const q = loadsSearch.get().trim().toLowerCase();
	const all = definedLoads.get();
	if (!q) return all;
	return all.filter(l => l.name.trim().toLowerCase().indexOf(q) === 0);
});

let addEffectTypeLabels: string[] | undefined;
function getAddEffectTypeLabels(): string[] {
	if (!addEffectTypeLabels) {
		addEffectTypeLabels = [
			"Add Effect",
			sprite(GetColouredEffectSprite("effectSphere", 7)) + " Sphere",
			sprite(GetColouredEffectSprite("effectStar", 17)) + " Star",
			sprite(GetColouredEffectSprite("effectRing", 41)) + " Ring",
			sprite(GetColouredEffectSprite("effectPalm", Colour.LightOrange)) + " Palm",
			sprite(GetColouredEffectSprite("effectSprayBurst", Colour.SaturatedGreenLight)) + " Spray Burst",
			sprite(GetColouredEffectSprite("effectShellOfShells", Colour.BrightRed)) + " Shell of Shells",
			sprite(GetColouredEffectSprite("effectMicroBurst", Colour.BrightRed)) + " Micro Burst",
			sprite(GetColouredEffectSprite("effectCrackle", Colour.BrightYellow)) + " Crackle",
			sprite(GetColouredEffectSprite("effectFlyingFish", 9)) + " Flying Fish",
		];
	}
	return addEffectTypeLabels;
}

const addEffectTypes: EffectType[] = [
	EffectType.Sphere,
	EffectType.Star,
	EffectType.Ring,
	EffectType.Palm,
	EffectType.SprayBurst,
	EffectType.ShellOfShells,
	EffectType.MicroBurst,
	EffectType.Crackle,
	EffectType.FlyingFish,
];

function onTestLoadsButtonClick() {
	if (!validateLoadEditor()) return;

	const loadToTest = getEditLoad();
	if (!loadToTest) {
		return;
	}

	// Validate all named references before testing
	const ctx = buildValidationContext();	
	const issues: ValidationIssue[] = [];
	if (!loadToTest.isValid(ctx, issues, `Load "${loadToTest.name}"`)) {
		if (typeof ui !== "undefined" && typeof ui.showError === "function") {
			ui.showError("Invalid load", formatValidationIssues(issues));
		}
		return;
	}
	ResetCounts();
	if (isEditorWindowObscuringCenter()) {
		ui.showError("Window Warning", "The editor window is roughly in the centre of the screen and may obscure the effect. Consider moving it to the side.");
	}
	Play(true);
	let height = 8 * 100;
	let pos = GetFireworkTestLocation(height);
	const resolvedLoad = cloneLoad(loadToTest);
	explodeLoad(resolvedLoad, { x: pos.x, y: pos.y, z: height + 100 }, { x: 0, y: 0, z: 0 });
	beginPaletteTest(resolvedLoad.getDuration());
}

function getFallbackLoadName(): string {
	return `Load ${definedLoads.get().length + 1}`;
}

function syncEditLoadFromEditor(): void {
	setEditLoad(new Load(editedLoadEffects.get().map(cloneEffect), editedLoadName.get().trim()));
}

function validateLoadEditor(): boolean {
	if (editedLoadEffects.get().length === 0) {
		if (typeof ui !== "undefined" && typeof ui.showError === "function")
			ui.showError("Invalid load", "A load must have at least one effect.");
		return false;
	}
	return true;
}

export function getLoadEditorState(): SerializedLoadEditorState {
	return {
		load: new Load(editedLoadEffects.get(), editedLoadName.get().trim()).toParkData(),
		isEffectDeleteMode: isEffectDeleteMode.get()
	};
}

export function restoreLoadEditorState(state: SerializedLoadEditorState | undefined, decodeEffectFn: (data: any) => Effect): void {
	if (!state || !state.load) {
		resetLoadEditor();
		return;
	}
	const load = Load.fromParkData(state.load, decodeEffectFn);
	editedLoadName.set(load.name);
	editedLoadEffects.set(load.effects);
	selectedLoadIndex.set(DEFAULT_LOAD_EDITOR.selectedIndex);
	selectedEffectIndex.set(DEFAULT_LOAD_EDITOR.selectedEffectIndex);
	addEffectTypeIndex.set(DEFAULT_LOAD_EDITOR.addEffectTypeIndex);
	isEffectDeleteMode.set(typeof state.isEffectDeleteMode === "boolean" ? state.isEffectDeleteMode : DEFAULT_LOAD_EDITOR.isEffectDeleteMode);
	if (load.name || load.effects.length > 0) {
		setEditLoad(new Load(load.effects.map(cloneEffect), load.name.trim()));
	} else {
		setEditLoad(undefined);
	}
}

export function resetLoadEditor(): void {
	editedLoadName.set(DEFAULT_LOAD_EDITOR.name);
	editedLoadEffects.set([]);
	selectedLoadIndex.set(DEFAULT_LOAD_EDITOR.selectedIndex);
	selectedEffectIndex.set(DEFAULT_LOAD_EDITOR.selectedEffectIndex);
	addEffectTypeIndex.set(DEFAULT_LOAD_EDITOR.addEffectTypeIndex);
	isEffectDeleteMode.set(DEFAULT_LOAD_EDITOR.isEffectDeleteMode);
	setEditLoad(undefined);
}

export function isLoadEditorDirty(): boolean {
	const currentName = editedLoadName.get().trim();
	const currentEffects = editedLoadEffects.get();

	if (!currentName) {
		return currentEffects.length > DEFAULT_LOAD_EDITOR.effects.length;
	}

	const saved = getLoadMap().get(currentName);
	if (!saved) {
		return true;
	}

	const currentData = currentEffects.map(e => e.toParkData());
	const savedData = saved.effects.map(e => e.toParkData());
	return JSON.stringify(currentData) !== JSON.stringify(savedData);
}

function loadSelectedLoad(index: number): void {
	const entry = definedLoads.get()[index];
	if (!entry) {
		return;
	}

	selectedLoadIndex.set(index);
	selectedEffectIndex.set(undefined);
	editedLoadName.set(entry.name);
	editedLoadEffects.set(cloneLoad(entry).effects);
	setEditLoad(cloneLoad(entry));
}

function addOrUpdateLoad(): void {
	if (!validateLoadEditor()) return;

	const trimmedName = editedLoadName.get().trim();
	const nextName = trimmedName || getFallbackLoadName();
	const nextEntry: Load = new Load(editedLoadEffects.get().map(cloneEffect), nextName);
	const updated = [...getLoadList()];
	let existingIndex = -1;
	for (let index = 0; index < updated.length; index++) {
		if (updated[index].name === nextName) {
			existingIndex = index;
			break;
		}
	}

	if (existingIndex >= 0) {
		updated[existingIndex] = nextEntry;
		selectedLoadIndex.set(existingIndex);
	}
	else {
		updated.push(nextEntry);
		selectedLoadIndex.set(updated.length - 1);
	}

	setLoadList(updated.map(cloneLoad));
	setEditLoad(cloneLoad(nextEntry));
	editedLoadName.set(nextName);
}

function updateEditedEffects(nextEffects: Effect[]): void {
	editedLoadEffects.set(nextEffects);
	syncEditLoadFromEditor();
}

function upsertEditedEffect(effect: Effect): void {
	const selectedIndex = selectedEffectIndex.get();
	if (typeof selectedIndex === "number") {
		const nextEffects = [...editedLoadEffects.get()];
		nextEffects[selectedIndex] = effect;
		updateEditedEffects(nextEffects);
		return;
	}

	const nextEffects = [...editedLoadEffects.get(), effect];
	updateEditedEffects(nextEffects);
	selectedEffectIndex.set(nextEffects.length - 1);
}

function openEffectEditorForSelection(effect: Effect, index: number): void {
	selectedEffectIndex.set(index);
	openEffectEditorWindowForEffect(effect, updatedEffect => {
		const nextEffects = [...editedLoadEffects.get()];
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

	if (effectType === EffectType.ShellOfShells) {
		const selectedLoad = selectedLoadIndex.get() === undefined ? undefined : definedLoads.get()[selectedLoadIndex.get()!];
		const currentLoadName = editedLoadName.get().trim() || selectedLoad?.name.trim() || "";
		const referencedNames = collectShellOfShellsReferencedLoadNames(getLoadList());
		if (currentLoadName && referencedNames.indexOf(currentLoadName) >= 0) {
			if (typeof ui !== "undefined" && typeof ui.showError === "function") {
				ui.showError("Invalid effect", "This load is already used in a Shell of Shells, so another Shell of Shells cannot be added here.");
			}
			addEffectTypeIndex.set(0);
			return;
		}
	}

	selectedEffectIndex.set(undefined);
	openEffectEditorWindowForType(effectType, newEffect => {
		upsertEditedEffect(newEffect);
	});
	addEffectTypeIndex.set(0);
}

function deleteSelectedLoad(): void {
	const selectedIndex = selectedLoadIndex.get();
	if (typeof selectedIndex !== "number") {
		return;
	}

	const load = definedLoads.get()[selectedIndex];
	if (!load) return;

	const usages = findLoadUsages(load.name);

	const doDelete = () => {
		const updated = definedLoads.get().filter((_, index) => index !== selectedIndex);
		setLoadList(updated.map(cloneLoad));
		resetLoadEditor();
	};

	if (usages.length > 0) {
		openUsageWarningWindow(
			`Load "${load.name}"`,
			usages,
			doDelete,
			() => {
				removeLoadUsages(load.name);
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
	updateEditedEffects(editedLoadEffects.get().filter((_, effectIndex) => effectIndex !== index));
	selectedEffectIndex.set(undefined);
}

export function createLoadsTab() {
	const currentEditLoad = getEditLoad();
	if (currentEditLoad) {
		editedLoadName.set(currentEditLoad.name);
		editedLoadEffects.set(currentEditLoad.effects.map(cloneEffect));
	}

	return [
		flexible({
			direction: LayoutDirection.Horizontal,
			content: [
				groupbox({
					text: "Load Editor",
					height: "1w",
					content: [
						flexible({
							direction: LayoutDirection.Horizontal,
							content: [
								box({
									width: "1w",
									height: 290,
									padding: 6, text: "Current Load",
									content: flexible({
										direction: LayoutDirection.Vertical,
										content: [
											label({ text: "Name" }),
											textbox({
												text: editedLoadName,
												onChange: value => {
													editedLoadName.set(value);
													syncEditLoadFromEditor();
												},
												width: 260,
												maxLength: 64
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
												items: compute(editedLoadEffects, isEffectDeleteMode, (effects, deleteMode) => effects.map((effect, index) => {
													const indexText = `${index + 1}`;
													const typeText = effect.type;
													if (!deleteMode) {
														return [indexText, typeText, effect.GetSpriteString()];
													}

													return [`{RED}${indexText}`, `{RED}${typeText}`];
												})),
												columns: [
													{ header: "#", width: "1w" },
													{ header: "Effect", width: "2w" },
													{ header: "Icon", width: "2w" }
												],
												width: 360,
												height: 120,
												canSelect: true,
												selectedCell: compute(selectedEffectIndex, index => index === undefined ? null : { row: index, column: 0 }),
												onClick: row => {
													const effect = editedLoadEffects.get()[row];
													if (!effect) {
														return;
													}

													if (isEffectDeleteMode.get()) {
														deleteEditedEffectAt(row);
														return;
													}

													if (effect) {
														openEffectEditorForSelection(effect, row);
													}
												}
											}),
											flexible({
												direction: LayoutDirection.Horizontal,
												content: [
													colouredButton({
														text: compute(isEffectDeleteMode, enabled => enabled ? "Delete Mode: {RED}ON" : "Delete Mode: OFF"),
														width: 115,
														height: 22,
														colour: Colour.LightBrown, colourDark: Colour.SaturatedBrown, colourLight: Colour.SaturatedBrownLight,
														pressed: isEffectDeleteMode,
														onClick: onDeleteEffectClick
													}),
													label({ text: "", width: "1w" }),
													colouredButton({
														text: "{WHITE}Test Load",
														width: 90,
														height: 22,
														colour: Colour.LightOrange, colourDark: Colour.DarkOrange, colourLight: Colour.OrangeLight,
														onClick: onTestLoadsButtonClick
													})
												]
											}),
											flexible({
												direction: LayoutDirection.Horizontal,
												content: [
													colouredButton({
														text: "{WHITE}Add Load",
														width: 110,height: 22,
                                                        colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen,
														onClick: addOrUpdateLoad
													}),
													colouredButton({
														text: "{WHITE}New",
														width: 50,height: 22,
                                                        colour: Colour.LightBlue, colourDark: Colour.DarkBlue, colourLight: Colour.IcyBlue,
														onClick: () => confirmDiscardChanges(isLoadEditorDirty, resetLoadEditor)
													}),
													colouredButton({
														text: "{WHITE}Delete Load",
														width: 80,height: 22,
                                                        colour: Colour.SaturatedRed, colourDark: Colour.BordeauxRedDark, colourLight: Colour.BrightRed,
														onClick: deleteSelectedLoad
													}),
													label({ text: "", width: "1w" }),
													colouredButton({ text: "{BLACK}Debugger", width: 70,height: 22,
                                                        colour: Colour.Yellow, colourDark: Colour.DarkYellow, colourLight: Colour.BrightYellow, onClick: openDebuggerWindow })
												]
											})
										]
									})
								}),
								box({
									width: 180,
									height: "1w",
									padding: 6,
									text: "Defined Loads",
									content: flexible({
										direction: LayoutDirection.Vertical,
										content: [
											textbox({
												text: loadsSearch,
												onChange: value => loadsSearch.set(value),
												width: 160,
												maxLength: 64
											}),
											listview({
												items: compute(filteredLoads, loads => loads.map(load => [load.name,load.GetSpriteString()])),
												columns: [
													{ header: "Name", width: "1w" },													
													{ header: "Icons", width: "1w" }
											],
												width: 160,
												height: "1w",
												canSelect: true,
												selectedCell: compute(selectedLoadIndex, filteredLoads, () => {
													const idx = selectedLoadIndex.get();
													if (idx === undefined) return null;
													const name = definedLoads.get()[idx]?.name;
													if (!name) return null;
													const row = filteredLoads.get().findIndex(l => l.name === name);
													return row >= 0 ? { row, column: 0 } : null;
												}),
												onClick: row => {
													const load = filteredLoads.get()[row];
													if (!load) return;
													const fullIndex = definedLoads.get().findIndex(l => l.name === load.name);
													if (fullIndex >= 0) confirmDiscardChanges(isLoadEditorDirty, () => loadSelectedLoad(fullIndex));
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