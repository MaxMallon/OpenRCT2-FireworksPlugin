import { box, button, compute, dropdown, flexible, groupbox, label, LayoutDirection, listview, store, textbox } from "openrct2-flexui";
import { collectBigBouqetReferencedLoadNames, cloneEffect, cloneLoad, resolveLoadContentsToLatest } from "../../fireworks/loadHelpers";
import { openEffectEditorWindowForEffect, openEffectEditorWindowForType } from "../EffectDefineWindows/registry";
import { Play, explodeLoad } from "../../fireworks/fireworksEffectsPlayer";
import { ResetCounts } from "../../fireworks/particleSpawner";
import { getEditLoad, getLoadList, setEditLoad, setLoadList, definedLoads } from "../../fireworks/persistent";
import { openDebuggerWindow } from "../debuggerWindow";
import { buildValidationContext, findLoadUsages, formatValidationIssues, removeLoadUsages, ValidationIssue } from "../../fireworks/usageChecker";
import { openUsageWarningWindow } from "../usageWarningWindow";
import { Effect, EffectType } from "../../fireworks/structures/Effect";
import { Load } from "../../fireworks/structures/Load";
import { GetColouredEffectSprite, sprite } from "../../img/images";
import { Colour } from "openrct2-flexui";
import { GetFireworkTestLocation, isEditorWindowObscuringCenter } from "../../fireworks/helpers";


const selectedLoadIndex = store<number | undefined>(undefined);
const selectedEffectIndex = store<number | undefined>(undefined);
const editedLoadName = store("");
const editedLoadEffects = store<Effect[]>([]);
const addEffectTypeIndex = store(0);
const isEffectDeleteMode = store(false);
const isEffectEditorOpen = store(false);

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
	explodeLoad(resolveLoadContentsToLatest(loadToTest), { x: pos.x, y: pos.y, z: height + 100 }, { x: 0, y: 0, z: 0 });
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

function resetLoadEditor(): void {
	editedLoadName.set("");
	editedLoadEffects.set([]);
	selectedLoadIndex.set(undefined);
	selectedEffectIndex.set(undefined);
	isEffectDeleteMode.set(false);
	setEditLoad(undefined);
	isEffectEditorOpen.set(false);
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

function markEffectEditorClosed(): void {
	isEffectEditorOpen.set(false);
}

function tryOpenEffectEditor(openEditor: (onClose: () => void) => void): boolean {
	if (isEffectEditorOpen.get()) {
		return false;
	}

	isEffectEditorOpen.set(true);
	openEditor(markEffectEditorClosed);
	return true;
}

function openEffectEditorForSelection(effect: Effect, index: number): void {
	if (isEffectEditorOpen.get()) {
		return;
	}

	selectedEffectIndex.set(index);
	tryOpenEffectEditor(onClose => openEffectEditorWindowForEffect(effect, updatedEffect => {
		const nextEffects = [...editedLoadEffects.get()];
		nextEffects[index] = updatedEffect;
		updateEditedEffects(nextEffects);
	}, onClose));
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
	if (isEffectEditorOpen.get()) {
		addEffectTypeIndex.set(0);
		return;
	}

	if (effectType === EffectType.ShellOfShells) {
		const selectedLoad = selectedLoadIndex.get() === undefined ? undefined : definedLoads.get()[selectedLoadIndex.get()!];
		const currentLoadName = editedLoadName.get().trim() || selectedLoad?.name.trim() || "";
		const referencedNames = collectBigBouqetReferencedLoadNames(getLoadList());
		if (currentLoadName && referencedNames.indexOf(currentLoadName) >= 0) {
			if (typeof ui !== "undefined" && typeof ui.showError === "function") {
				ui.showError("Invalid effect", "This load is already used in a Shell of Shells, so another Shell of Shells cannot be added here.");
			}
			addEffectTypeIndex.set(0);
			return;
		}
	}

	selectedEffectIndex.set(undefined);
	tryOpenEffectEditor(onClose => openEffectEditorWindowForType(effectType, newEffect => {
		upsertEditedEffect(newEffect);
	}, onClose));
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
													button({
														text: compute(isEffectDeleteMode, enabled => enabled ? "Delete Mode: {RED}ON" : "Delete Mode: OFF"),
														width: 115,													isPressed: isEffectDeleteMode,														onClick: onDeleteEffectClick
													}),
													label({ text: "", width: "1w" }),
													button({
														text: "Test Load",
														width: 90,
														onClick: onTestLoadsButtonClick
													})
												]
											}),
											flexible({
												direction: LayoutDirection.Horizontal,
												content: [
													button({
														text: "Add Load",
														width: 110,
														onClick: addOrUpdateLoad
													}),
													button({
														text: "New",
														width: 50,
														onClick: resetLoadEditor
													}),
													button({
														text: "Delete Load",
														width: 80,
														onClick: deleteSelectedLoad
													}),
													label({ text: "", width: "1w" }),
													button({ text: "Debugger", width: 70, onClick: openDebuggerWindow })
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
													if (fullIndex >= 0) loadSelectedLoad(fullIndex);
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