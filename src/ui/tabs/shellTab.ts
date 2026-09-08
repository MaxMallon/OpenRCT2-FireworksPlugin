import {    box,    checkbox,    colourPicker,    compute,    dropdown,    flexible,    groupbox,    label,    LayoutDirection,    listview,    store,    textbox,    OpenWindow,    Colour} from "openrct2-flexui";
import { numberInputSpinner } from "../numberInputSpinner";
import { ShellColours } from "../../fireworks/structures/ColourStructures";
import { cloneLoad, cloneShellBlueprint } from "../../fireworks/cloneHelpers";
import { getLoadList, getShellList, getShellMap, getShellToEdit, launchSites, launchSitesRevision, setShellList, setShellToEdit, definedShells } from "../../fireworks/persistent";
import * as persistent from "../../fireworks/persistent";
import { LoadFireworks, Play } from "../../fireworks/fireworksEffectsPlayer";
import { ResetCounts } from "../../fireworks/particleSpawner";
import { resizeFireworksWindow } from "../fireworksEditorWindow";
import { getMainWindowPosition } from "../windowState";
import { openPopupWindow } from "../popupWindows";
import { openDebuggerWindow } from "../debuggerWindow";
import { buildValidationContext, findShellUsages, formatValidationIssues, removeItemFromSequences, ValidationIssue } from "../../fireworks/usageChecker";
import { openUsageWarningWindow } from "../usageWarningWindow";
import { Shell, ShotHeadType } from "../../fireworks/structures/Firework";
import { ShellLoad } from "../../fireworks/structures/ShellLoad";
import { Load } from "../../fireworks/structures/Load";
import { SequenceItemType } from "../../fireworks/structures/Sequence";
import { colouredButton } from "../ColouredButton";
import { beginPaletteTest } from "../../fireworks/testPaletteMode";
import { decodeEffect, SerializedShellEditorState } from "../../fireworks/parkStorage";
import { confirmDiscardChanges } from "../discardChangesWindow";

const DEFAULT_SHELL_EDITOR = {
    name: "",
    loadName: "",
    launchSiteName: "",
    headColour: Colour.BrightYellow,
    trail1Colour: Colour.DarkOrange,
    trail2Colour: Colour.DarkOrange,
    isBigHead: false,
    trail: false,
    trailDensity: 0.5,
    trailWidth: 3,
    azimuth: 0,
    tilt: 0,
    timeTillStall: 70,
    delay: 70,
    randomness: 0,
    syncHeightAndDelay: true,
    ascendEffects: [] as ShellLoad[],
    selectedAscendEffectIndex: undefined as number | undefined,
    showAscendEffectsPanel: false,
    selectedIndex: undefined as number | undefined
};

const selectedShellIndex = store<number | undefined>(DEFAULT_SHELL_EDITOR.selectedIndex);
const editedShellName = store(DEFAULT_SHELL_EDITOR.name);
const selectedLoadName = store(DEFAULT_SHELL_EDITOR.loadName);
const selectedLaunchSiteName = store(DEFAULT_SHELL_EDITOR.launchSiteName);
const headColour = store<Colour>(DEFAULT_SHELL_EDITOR.headColour);
const trail1Colour = store<Colour>(DEFAULT_SHELL_EDITOR.trail1Colour);
const trail2Colour = store<Colour>(DEFAULT_SHELL_EDITOR.trail2Colour);
const isBigHead = store(DEFAULT_SHELL_EDITOR.isBigHead);
const trail = store(DEFAULT_SHELL_EDITOR.trail);
const trailDensity = store(DEFAULT_SHELL_EDITOR.trailDensity);
const trailWidth = store(DEFAULT_SHELL_EDITOR.trailWidth);
const azimuth = store(DEFAULT_SHELL_EDITOR.azimuth);
const tilt = store(DEFAULT_SHELL_EDITOR.tilt);
const timeTillStall = store(DEFAULT_SHELL_EDITOR.timeTillStall);
const delay = store(DEFAULT_SHELL_EDITOR.delay);
const randomness = store(DEFAULT_SHELL_EDITOR.randomness);
const syncHeightAndDelay = store(DEFAULT_SHELL_EDITOR.syncHeightAndDelay);
const ascendEffectsStore = store<ShellLoad[]>(DEFAULT_SHELL_EDITOR.ascendEffects);
const ascendEffectsRevision = store(0);
const selectedAscendEffectIndex = store<number | undefined>(DEFAULT_SHELL_EDITOR.selectedAscendEffectIndex);
const showAscendEffectsPanel = store(DEFAULT_SHELL_EDITOR.showAscendEffectsPanel);

const shellsSearch = store("");
const filteredShells = compute(shellsSearch, definedShells, () => {
    const q = shellsSearch.get().trim().toLowerCase();
    const all = definedShells.get();
    if (!q) return all;
    return all.filter(s => s.name.trim().toLowerCase().indexOf(q) === 0);
});

interface ShellSizePreset {
    label: string;
    height: number;
    delay: number;
    isBigHead: boolean;
    trail: boolean;
}

const shellSizePresets: ShellSizePreset[] = [
    { label: "S", height: 55, delay: 55, isBigHead: false, trail: false },
    { label: "M", height: 75, delay: 75, isBigHead: false, trail: true },
    { label: "L", height: 95, delay: 95, isBigHead: true, trail: true },
    { label: "XL", height: 115, delay: 115, isBigHead: true, trail: true }
];

function applyShellSizePreset(preset: ShellSizePreset): void {
    timeTillStall.set(preset.height);
    delay.set(preset.delay);
    isBigHead.set(preset.isBigHead);
    trail.set(preset.trail);
    syncShellToEditFromEditor();
}

function setHeightValue(value: number): void {
    timeTillStall.set(value);
    if (syncHeightAndDelay.get()) {
        delay.set(value);
    }

    syncShellToEditFromEditor();
}

function setDelayValue(value: number): void {
    delay.set(value);
    if (syncHeightAndDelay.get()) {
        timeTillStall.set(value);
    }

    syncShellToEditFromEditor();
}

function getFallbackShellName(): string {
    return `Shell ${definedShells.get().length + 1}`;
}

function createEmptyShell(name: string = ""): Shell {
    return Shell.fromGround(
        name,
        new ShellLoad("", ShellLoad.explodeAtEnd),
        [],
        DEFAULT_SHELL_EDITOR.isBigHead ? ShotHeadType.Big : ShotHeadType.Small,
        DEFAULT_SHELL_EDITOR.trail,
        DEFAULT_SHELL_EDITOR.trailDensity,
        DEFAULT_SHELL_EDITOR.trailWidth,
        DEFAULT_SHELL_EDITOR.launchSiteName,
        new ShellColours(DEFAULT_SHELL_EDITOR.headColour, DEFAULT_SHELL_EDITOR.trail1Colour, DEFAULT_SHELL_EDITOR.trail2Colour),
        DEFAULT_SHELL_EDITOR.timeTillStall,
        DEFAULT_SHELL_EDITOR.delay,
        DEFAULT_SHELL_EDITOR.azimuth,
        DEFAULT_SHELL_EDITOR.tilt,
        DEFAULT_SHELL_EDITOR.randomness
    );
}

function syncShellToEditFromEditor(): void {
    const currentName = editedShellName.get().trim();
    const currentLoadName = selectedLoadName.get().trim();

    const shell = createEmptyShell(currentName);
    shell.load = new ShellLoad(currentLoadName, ShellLoad.explodeAtEnd);
    shell.ascendEffects = ascendEffectsStore.get().map(e => new ShellLoad(e.loadName, e.timeTillExplode));
    shell.position = selectedLaunchSiteName.get().trim();
    shell.shellColours = new ShellColours(headColour.get(), trail1Colour.get(), trail2Colour.get());
    shell.headType = isBigHead.get() ? ShotHeadType.Big : ShotHeadType.Small;
    shell.trail = trail.get();
    shell.trailDensity = trailDensity.get();
    shell.trailWidth = trailWidth.get();
    shell.azimuth = azimuth.get();
    shell.tilt = tilt.get();
    shell.timeTillStall = timeTillStall.get();
    shell.delay = delay.get();
    shell.randomness = randomness.get();
    setShellToEdit(shell);
}

export function getShellEditorState(): SerializedShellEditorState {
    syncShellToEditFromEditor();
    return {
        shell: getShellToEdit()?.toParkData(),
        syncHeightAndDelay: syncHeightAndDelay.get()
    };
}

export function restoreShellEditorState(state?: SerializedShellEditorState): void {
    if (!state || !state.shell) {
        resetShellEditor();
        return;
    }
    applyShellToEditor(Shell.fromParkData(state.shell, decodeEffect));
    selectedShellIndex.set(DEFAULT_SHELL_EDITOR.selectedIndex);
    showAscendEffectsPanel.set(DEFAULT_SHELL_EDITOR.showAscendEffectsPanel);
    syncHeightAndDelay.set(typeof state.syncHeightAndDelay === "boolean" ? state.syncHeightAndDelay : DEFAULT_SHELL_EDITOR.syncHeightAndDelay);
}

export function resetShellEditor(): void {
    editedShellName.set(DEFAULT_SHELL_EDITOR.name);
    selectedLoadName.set(DEFAULT_SHELL_EDITOR.loadName);
    selectedLaunchSiteName.set(DEFAULT_SHELL_EDITOR.launchSiteName);
    headColour.set(DEFAULT_SHELL_EDITOR.headColour);
    trail1Colour.set(DEFAULT_SHELL_EDITOR.trail1Colour);
    trail2Colour.set(DEFAULT_SHELL_EDITOR.trail2Colour);
    isBigHead.set(DEFAULT_SHELL_EDITOR.isBigHead);
    trail.set(DEFAULT_SHELL_EDITOR.trail);
    trailDensity.set(DEFAULT_SHELL_EDITOR.trailDensity);
    trailWidth.set(DEFAULT_SHELL_EDITOR.trailWidth);
    azimuth.set(DEFAULT_SHELL_EDITOR.azimuth);
    tilt.set(DEFAULT_SHELL_EDITOR.tilt);
    timeTillStall.set(DEFAULT_SHELL_EDITOR.timeTillStall);
    delay.set(DEFAULT_SHELL_EDITOR.delay);
    randomness.set(DEFAULT_SHELL_EDITOR.randomness);
    syncHeightAndDelay.set(DEFAULT_SHELL_EDITOR.syncHeightAndDelay);
    ascendEffectsStore.set([]);
    ascendEffectsRevision.set(0);
    selectedAscendEffectIndex.set(DEFAULT_SHELL_EDITOR.selectedAscendEffectIndex);
    showAscendEffectsPanel.set(DEFAULT_SHELL_EDITOR.showAscendEffectsPanel);
    selectedShellIndex.set(DEFAULT_SHELL_EDITOR.selectedIndex);
    setShellToEdit(createEmptyShell());
}

export function isShellEditorDirty(): boolean {
    const currentName = editedShellName.get().trim();
    const currentLoad = selectedLoadName.get().trim();
    const currentSite = selectedLaunchSiteName.get().trim();
    const currentHeadColour = headColour.get();
    const currentTrail1Colour = trail1Colour.get();
    const currentTrail2Colour = trail2Colour.get();
    const currentIsBigHead = isBigHead.get();
    const currentTrail = trail.get();
    const currentTrailDensity = trailDensity.get();
    const currentTrailWidth = trailWidth.get();
    const currentAzimuth = azimuth.get();
    const currentTilt = tilt.get();
    const currentTimeTillStall = timeTillStall.get();
    const currentDelay = delay.get();
    const currentRandomness = randomness.get();
    const currentAscendEffects = ascendEffectsStore.get();

    if (!currentName) {
        return (
            currentLoad !== DEFAULT_SHELL_EDITOR.loadName ||
            currentSite !== DEFAULT_SHELL_EDITOR.launchSiteName ||
            currentHeadColour !== DEFAULT_SHELL_EDITOR.headColour ||
            currentTrail1Colour !== DEFAULT_SHELL_EDITOR.trail1Colour ||
            currentTrail2Colour !== DEFAULT_SHELL_EDITOR.trail2Colour ||
            currentIsBigHead !== DEFAULT_SHELL_EDITOR.isBigHead ||
            currentTrail !== DEFAULT_SHELL_EDITOR.trail ||
            currentTrailDensity !== DEFAULT_SHELL_EDITOR.trailDensity ||
            currentTrailWidth !== DEFAULT_SHELL_EDITOR.trailWidth ||
            currentAzimuth !== DEFAULT_SHELL_EDITOR.azimuth ||
            currentTilt !== DEFAULT_SHELL_EDITOR.tilt ||
            currentTimeTillStall !== DEFAULT_SHELL_EDITOR.timeTillStall ||
            currentDelay !== DEFAULT_SHELL_EDITOR.delay ||
            currentRandomness !== DEFAULT_SHELL_EDITOR.randomness ||
            currentAscendEffects.length !== DEFAULT_SHELL_EDITOR.ascendEffects.length
        );
    }

    const saved = getShellMap().get(currentName);
    if (!saved) {
        return true;
    }

    const savedSite = typeof saved.position === "string" ? saved.position : "";
    const savedIsBigHead = saved.headType === ShotHeadType.Big;

    if (
        saved.load.loadName !== currentLoad ||
        savedSite !== currentSite ||
        saved.shellColours.headColour !== currentHeadColour ||
        saved.shellColours.trail1Colour !== currentTrail1Colour ||
        saved.shellColours.trail2Colour !== currentTrail2Colour ||
        savedIsBigHead !== currentIsBigHead ||
        saved.trail !== currentTrail ||
        saved.trailDensity !== currentTrailDensity ||
        saved.trailWidth !== currentTrailWidth ||
        saved.azimuth !== currentAzimuth ||
        saved.tilt !== currentTilt ||
        saved.timeTillStall !== currentTimeTillStall ||
        saved.delay !== currentDelay ||
        saved.randomness !== currentRandomness ||
        saved.ascendEffects.length !== currentAscendEffects.length
    ) {
        return true;
    }

    for (let i = 0; i < saved.ascendEffects.length; i++) {
        if (
            saved.ascendEffects[i].loadName !== currentAscendEffects[i].loadName ||
            saved.ascendEffects[i].timeTillExplode !== currentAscendEffects[i].timeTillExplode
        ) {
            return true;
        }
    }

    return false;
}

function applyShellToEditor(shell: Shell): void {
    editedShellName.set(shell.name);
    selectedLoadName.set(shell.load.loadName);
    selectedLaunchSiteName.set(typeof shell.position === "string" ? shell.position : "");
    headColour.set(shell.shellColours.headColour);
    trail1Colour.set(shell.shellColours.trail1Colour);
    trail2Colour.set(shell.shellColours.trail2Colour);
    isBigHead.set(shell.headType === ShotHeadType.Big);
    trail.set(shell.trail);
    trailDensity.set(shell.trailDensity);
    trailWidth.set(shell.trailWidth);
    azimuth.set(shell.azimuth);
    tilt.set(shell.tilt);
    timeTillStall.set(shell.timeTillStall);
    delay.set(shell.delay);
    randomness.set(shell.randomness);
    ascendEffectsStore.set(shell.ascendEffects.map(e => new ShellLoad(e.loadName, e.timeTillExplode)));
    ascendEffectsRevision.set(ascendEffectsRevision.get() + 1);
    selectedAscendEffectIndex.set(undefined);
    setShellToEdit(cloneShellBlueprint(shell));
}

function loadSelectedShell(index: number): void {
    const shell = definedShells.get()[index];
    if (!shell) {
        return;
    }

    selectedShellIndex.set(index);
    applyShellToEditor(shell);
}

function validateShellEditor(): boolean {
    if (!selectedLoadName.get().trim()) {
        if (typeof ui !== "undefined" && typeof ui.showError === "function")
            ui.showError("Invalid shell", "A shell must have a selected load.");
        return false;
    }

    if (!selectedLaunchSiteName.get().trim()) {
        if (typeof ui !== "undefined" && typeof ui.showError === "function")
            ui.showError("Invalid shell", "A shell must have a selected launch site.");
        return false;
    }

    const currentDelay = delay.get();
    const invalidAscendEffect = ascendEffectsStore.get().find((e: ShellLoad) => e.timeTillExplode > currentDelay);
    if (invalidAscendEffect) {
        if (typeof ui !== "undefined" && typeof ui.showError === "function")
            ui.showError("Invalid shell", `Ascend load "${invalidAscendEffect.loadName}" fires at delay ${invalidAscendEffect.timeTillExplode}, which exceeds the shell delay of ${currentDelay}.`);
        return false;
    }

    return true;
}

function addOrUpdateShell(): void {
    if (!validateShellEditor()) return;

    const trimmedName = editedShellName.get().trim();
    const nextName = trimmedName || getFallbackShellName();
    const loadName = selectedLoadName.get().trim();

    if (!persistent.resolveLoad(loadName)) {
        if (typeof ui !== "undefined" && typeof ui.showError === "function") {
            ui.showError("Invalid shell", "Selected load no longer exists.");
        }
        return;
    }

    const nextShell = createEmptyShell(nextName);
    nextShell.load = new ShellLoad(loadName, ShellLoad.explodeAtEnd);
    nextShell.ascendEffects = ascendEffectsStore.get().map(e => new ShellLoad(e.loadName, e.timeTillExplode));
    nextShell.position = selectedLaunchSiteName.get().trim();
    nextShell.shellColours = new ShellColours(headColour.get(), trail1Colour.get(), trail2Colour.get());
    nextShell.headType = isBigHead.get() ? ShotHeadType.Big : ShotHeadType.Small;
    nextShell.trail = trail.get();
    nextShell.trailDensity = trailDensity.get();
    nextShell.trailWidth = trailWidth.get();
    nextShell.azimuth = azimuth.get();
    nextShell.tilt = tilt.get();
    nextShell.timeTillStall = timeTillStall.get();
    nextShell.delay = delay.get();
    nextShell.randomness = randomness.get();
    const updated = [...getShellList().map(cloneShellBlueprint)];
    let existingIndex = -1;
    for (let index = 0; index < updated.length; index++) {
        if (updated[index].name === nextName) {
            existingIndex = index;
            break;
        }
    }

    if (existingIndex >= 0) {
        updated[existingIndex] = nextShell;
        selectedShellIndex.set(existingIndex);
    }
    else {
        updated.push(nextShell);
        selectedShellIndex.set(updated.length - 1);
    }

    setShellList(updated.map(cloneShellBlueprint));
    editedShellName.set(nextName);
    setShellToEdit(cloneShellBlueprint(nextShell));
}

function deleteSelectedShell(): void {
    const selectedIndex = selectedShellIndex.get();
    if (typeof selectedIndex !== "number") {
        return;
    }

    const shell = definedShells.get()[selectedIndex];
    if (!shell) return;

    const usages = findShellUsages(shell.name);

    const doDelete = () => {
        const updated = getShellList().filter((_, index) => index !== selectedIndex).map(cloneShellBlueprint);
        setShellList(updated.map(cloneShellBlueprint));
        resetShellEditor();
    };

    if (usages.length > 0) {
        openUsageWarningWindow(
            `Shell "${shell.name}"`,
            usages,
            doDelete,
            () => {
                removeItemFromSequences(shell.name, SequenceItemType.Shell);
                doDelete();
            }
        );
        return;
    }

    doDelete();
}

function onTestShellsButtonClick(): void {
    const shell = getShellToEdit();
    if (!shell) {
        return;
    }
    if (!validateShellEditor()) return;

    // Validate all named references before testing
    const ctx = buildValidationContext();
    const issues: ValidationIssue[] = [];
    if (!shell.isValid(ctx, issues, `Shell "${shell.name}"`)) {
        if (typeof ui !== "undefined" && typeof ui.showError === "function") {
            ui.showError("Invalid shell", formatValidationIssues(issues));
        }
        return;
    }

    LoadFireworks(cloneShellBlueprint(shell));
    ResetCounts();
    Play(true);
    beginPaletteTest(shell.getDuration());
}

function deleteSelectedAscendEffect(): void {
    const index = selectedAscendEffectIndex.get();
    if (typeof index !== "number") {
        return;
    }

    const effects = [...ascendEffectsStore.get()];
    if (index < 0 || index >= effects.length) {
        selectedAscendEffectIndex.set(undefined);
        return;
    }

    effects.splice(index, 1);
    ascendEffectsStore.set(effects);
    selectedAscendEffectIndex.set(undefined);
    ascendEffectsRevision.set(ascendEffectsRevision.get() + 1);
    syncShellToEditFromEditor();
}

function openAddAscendEffectWindow(): void {
    const selectedAscendLoad = store<Load | undefined>(undefined);
    const prevEffects = ascendEffectsStore.get();
    const minDelay = prevEffects.length > 0 ? prevEffects[prevEffects.length - 1].timeTillExplode : 0;
    const ascendDelay = store(Math.max(10, minDelay));
    const search = store("");

    const filteredLoads = compute(search, query => {
        const norm = query.trim().toLowerCase();
        return getLoadList().filter(load => {
            const n = load.name.trim();
            return n && (!norm || n.toLowerCase().indexOf(norm) === 0);
        });
    });

    let handle: OpenWindow | undefined;
    const mainPos = getMainWindowPosition();
    const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;
    handle = openPopupWindow("shell-add-ascend-load", {
        title: "Add Ascend Load to Shell",
        width: 300,
        height: 266,
        padding: 8,
        position,
        direction: LayoutDirection.Vertical,
        content: [
            label({ text: "Search by prefix" }),
            textbox({
                text: search,
                onChange: value => search.set(value),
                width: 260,
                maxLength: 64
            }),
            listview({
                items: compute(filteredLoads, loads => loads.map(load => [load.name, load.GetSpriteString()])),
                columns: [{ header: "Load", width: "1w" },
                { header: "Icons", width: "1w" }],
                width: 260,
                height: 130,
                canSelect: true,
                onClick: row => {
                    const load = filteredLoads.get()[row];
                    if (load) {
                        selectedAscendLoad.set(cloneLoad(load));
                    }
                }
            }),
            label({ text: compute(selectedAscendLoad, l => l ? `Selected: ${l.name}` : "Selected: none") }),
            numberInputSpinner({
                labelText: "Delay",
                labelWidth: 50,
                valueStore: ascendDelay,
                onChange: value => ascendDelay.set(value),
                width: 100,
                step: 1,
                minimum: minDelay,
                maximum: compute(delay, t => t)
            }),
             label({ text: "", height: 4 }),
            flexible({
                direction: LayoutDirection.Horizontal,
                content: [
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
                        text: "{WHITE}Add",
                        width: 70,
                        height: 22,
                        colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen,
                        onClick: () => {
                            const load = selectedAscendLoad.get();
                            if (!load) {
                                return;
                            }

                            const effects = [...ascendEffectsStore.get()];
                            effects.push(new ShellLoad(load.name, ascendDelay.get()));
                            ascendEffectsStore.set(effects);
                            ascendEffectsRevision.set(ascendEffectsRevision.get() + 1);
                            syncShellToEditFromEditor();
                            handle?.close();
                        }
                    }),
                    label({ text: "", width: "1w" })
                ]
            })
        ]
    });
}

function openShellLoadSelectionWindow(onSelect: (load: Load) => void): void {
    const search = store("");
    const filteredLoads = compute(search, query => {
        const normalizedQuery = query.trim().toLowerCase();
        return getLoadList().filter(load => {
            const name = load.name.trim();
            if (!name) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            return name.toLowerCase().indexOf(normalizedQuery) === 0;
        });
    });

    let handle: OpenWindow | undefined;
    const mainPos = getMainWindowPosition();
    const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;
    handle = openPopupWindow("shell-select-load", {
        title: "Select Load For Shell",
        width: 300,
        height: 250,
        padding: 8,
        position,
        direction: LayoutDirection.Vertical,
        content: [
            label({ text: "Search by prefix" }),
            textbox({
                text: search,
                onChange: value => search.set(value),
                width: 260,
                maxLength: 64
            }),
            listview({
                items: compute(filteredLoads, loads => loads.map(load => [load.name, load.GetSpriteString()])),
                columns: [{ header: "Name", width: "1w" },
                { header: "Icons", width: "1w" }
                ],
                width: 260,
                height: 150,
                canSelect: true,
                onClick: row => {
                    const selected = filteredLoads.get()[row];
                    if (!selected) {
                        return;
                    }

                    onSelect(cloneLoad(selected));
                    handle?.close();
                }
            }),
            colouredButton({
                text: "Close",
                width: 70,
                height: 22,
                colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
                onClick: () => handle?.close()
            })
        ]
    });
}

export function expandAcsendEffectsPanel(): void {
    showAscendEffectsPanel.set(true);
    resizeFireworksWindow(640, 540);
}

export function collapseAscendEffectsPanel(): void {
    showAscendEffectsPanel.set(false);
    resizeFireworksWindow(640, 420);
}

export function createShellsTab() {
    const currentShell = getShellToEdit();
    if (currentShell) {
        applyShellToEditor(currentShell);
    }
    else {
        setShellToEdit(createEmptyShell());
    }

    return [
        groupbox({
            text: "Shell Editor",
            content: [
                flexible({
                    direction: LayoutDirection.Horizontal,
                    content: [
                        box({
                            width: 390,
                            height: compute(showAscendEffectsPanel, show => show ? 455 : 315),
                            padding: 6,
                            text: "Current Shell",
                            content: flexible({
                                direction: LayoutDirection.Vertical,
                                height: compute(showAscendEffectsPanel, show => show ? 425 : 295),
                                content: [
                                    label({ text: "Name" }),
                                    textbox({
                                        text: editedShellName,
                                        onChange: value => {
                                            editedShellName.set(value);
                                            syncShellToEditFromEditor();
                                        },
                                        width: 280,
                                        maxLength: 64
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            label({ text: compute(selectedLoadName, name => `Main Load: ${name.trim() + "   " + (persistent.GetLoadByName(name)?.GetSpriteString() || "[Empty]")}`), width: "1w" }),
                                            colouredButton({
                                                text: "Select Main Load",
                                                width: 120,
                                                height: 20,                                                
                                                colour: Colour.LightBrown, colourDark: Colour.SaturatedBrown, colourLight: Colour.SaturatedBrownLight,
                                                onClick: () => openShellLoadSelectionWindow(load => {
                                                    selectedLoadName.set(load.name);
                                                    syncShellToEditFromEditor();
                                                })
                                            })
                                        ]
                                    }),
                                    colouredButton({
                                        text: "Add Ascend Loads",
                                        width: 120,
                                        height: 20,
                                        colour: Colour.LightBrown, colourDark: Colour.SaturatedBrown, colourLight: Colour.SaturatedBrownLight,
                                        visibility: compute(showAscendEffectsPanel, show => show ? "none" : "visible"),
                                        onClick: () => expandAcsendEffectsPanel()
                                    }),
                                    groupbox({
                                        text: "Ascend Loads",
                                        visibility: compute(showAscendEffectsPanel, show => show ? "visible" : "none"),
                                        height: compute(showAscendEffectsPanel, show => show ? 155 : 0),
                                        content: [
                                            flexible({
                                                direction: LayoutDirection.Horizontal,
                                                content: [
                                                    colouredButton({
                                                        text: "Hide",
                                                        width: 50,
                                                        height: 18,
                                                        colour: Colour.LightBrown, colourDark: Colour.SaturatedBrown, colourLight: Colour.SaturatedBrownLight,
                                                        visibility: compute(showAscendEffectsPanel, show => show ? "visible" : "none"),
                                                        onClick: () => { collapseAscendEffectsPanel(); }
                                                    })
                                                ]
                                            }),
                                            listview({
                                                items: compute(ascendEffectsRevision, () => ascendEffectsStore.get().map(e => [e.loadName, `${e.timeTillExplode}`])),
                                                columns: [
                                                    { header: "Load", width: "2w" },
                                                    { header: "Delay", width: "1w" }
                                                ],
                                                width: 240,
                                                height: 90,
                                                canSelect: true,
                                                visibility: compute(showAscendEffectsPanel, show => show ? "visible" : "none"),
                                                selectedCell: compute(selectedAscendEffectIndex, idx => idx === undefined ? null : { row: idx, column: 0 }),
                                                onClick: row => selectedAscendEffectIndex.set(row)
                                            }),
                                            flexible({
                                                direction: LayoutDirection.Horizontal,
                                                content: [
                                                    colouredButton({
                                                        text: "{WHITE}Add",
                                                        width: 70,
                                                        height: 20,
                                                        colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen,
                                                        visibility: compute(showAscendEffectsPanel, show => show ? "visible" : "none"),
                                                        onClick: () => {
                                                            const effects = ascendEffectsStore.get();
                                                            const currentDelay = delay.get();
                                                            if (effects.length > 0 && effects[effects.length - 1].timeTillExplode >= currentDelay) {
                                                                if (typeof ui !== "undefined" && typeof ui.showError === "function") {
                                                                    ui.showError("Invalid ascend load", `The last ascend load already fires at delay ${effects[effects.length - 1].timeTillExplode}, which is at or beyond the shell delay of ${currentDelay}.`);
                                                                }
                                                                return;
                                                            }
                                                            openAddAscendEffectWindow();
                                                        }
                                                    }),
                                                    colouredButton({
                                                        text: "{WHITE}Delete",
                                                        width: 70,
                                                        height: 20,
                                                        colour: Colour.SaturatedRed, colourDark: Colour.BordeauxRedDark, colourLight: Colour.BrightRed,
                                                        visibility: compute(showAscendEffectsPanel, show => show ? "visible" : "none"),
                                                        onClick: deleteSelectedAscendEffect
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    label({ text: "Launch Site" }),
                                    dropdown({
                                        items: compute(launchSitesRevision, () => {
                                            const names = launchSites.map(site => site.name);
                                            return ["[None]", ...names];
                                        }),
                                        selectedIndex: compute(launchSitesRevision, selectedLaunchSiteName, () => {
                                            const names = launchSites.map(site => site.name);
                                            const selectedName = selectedLaunchSiteName.get();
                                            const index = names.indexOf(selectedName);
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

                                            syncShellToEditFromEditor();
                                        },
                                        autoDisable: "never"
                                    }),
                                    label({ text: "Colours" }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            label({ text: "Head", width: 40 }),
                                            colourPicker({
                                                colour: headColour,
                                                width: 21,
                                                height: 21,
                                                onChange: colour => {
                                                    headColour.set(colour);
                                                    syncShellToEditFromEditor();
                                                }
                                            }),
                                            label({ text: "Trail 1", width: 45 }),
                                            colourPicker({
                                                colour: trail1Colour,
                                                width: 21,
                                                height: 21,
                                                onChange: colour => {
                                                    trail1Colour.set(colour);
                                                    syncShellToEditFromEditor();
                                                }
                                            }),
                                            label({ text: "Trail 2", width: 45 }),
                                            colourPicker({
                                                colour: trail2Colour,
                                                width: 21,
                                                height: 21,
                                                onChange: colour => {
                                                    trail2Colour.set(colour);
                                                    syncShellToEditFromEditor();
                                                }
                                            })
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            checkbox({
                                                text: "Big head type",
                                                isChecked: isBigHead,
                                                width: 120,
                                                onChange: value => {
                                                    isBigHead.set(value);
                                                    syncShellToEditFromEditor();
                                                }
                                            }),
                                             checkbox({
                                                text: "Trail",
                                                isChecked: trail,
                                                width: 80,
                                                onChange: value => {
                                                    trail.set(value);
                                                    syncShellToEditFromEditor();
                                                }
                                            }),                                            
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            numberInputSpinner({
                                                labelText: "Trail Density",
                                                labelWidth: 80,
                                                valueStore: trailDensity,
                                                onChange: value => {
                                                    trailDensity.set(value);
                                                    syncShellToEditFromEditor();
                                                },
                                                width: 80,
                                                step: 0.1,
                                                minimum: 0,
                                                maximum: 1
                                            }),
                                            numberInputSpinner({
                                                labelText: "Trail Width",
                                                labelWidth: 80,
                                                valueStore: trailWidth,
                                                onChange: value => {
                                                    trailWidth.set(value);
                                                    syncShellToEditFromEditor();
                                                },
                                                width: 80,
                                                step: 0.5,
                                                minimum: 0,
                                                maximum: 5
                                            })
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            numberInputSpinner({
                                                labelText: "Tilt",
                                                labelWidth: 80,
                                                valueStore: tilt,
                                                onChange: value => {
                                                    tilt.set(value);
                                                    syncShellToEditFromEditor();
                                                },
                                                width: 80,
                                                step: 0.5,
                                                minimum: 0,
                                                maximum: 45
                                            }),
                                            numberInputSpinner({
                                                labelText: "Azimuth",
                                                labelWidth: 80,
                                                valueStore: azimuth,
                                                onChange: value => {
                                                    azimuth.set(value);
                                                    syncShellToEditFromEditor();
                                                },
                                                width: 80,
                                                step: 2,
                                                minimum: -360,
                                                maximum: 360
                                            })
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            numberInputSpinner({
                                                labelText: "Height",
                                                labelWidth: 80,
                                                valueStore: timeTillStall,
                                                onChange: value => setHeightValue(value),
                                                width: 80,
                                                step: 1,
                                                minimum: 0,
                                                maximum: 130
                                            }),
                                            numberInputSpinner({
                                                labelText: "Delay",
                                                labelWidth: 80,
                                                valueStore: delay,
                                                onChange: value => setDelayValue(value),
                                                width: 80,
                                                step: 1,
                                                minimum: 0,
                                                maximum: 130
                                            }),
                                            checkbox({
                                                text: "Sync",
                                                isChecked: syncHeightAndDelay,
                                                onChange: value => {
                                                    syncHeightAndDelay.set(value);
                                                    if (value) {
                                                        delay.set(timeTillStall.get());
                                                        syncShellToEditFromEditor();
                                                    }
                                                }
                                            })
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            numberInputSpinner({
                                                labelText: "Randomness",
                                                labelWidth: 80,
                                                valueStore: randomness,
                                                onChange: value => {
                                                    randomness.set(value);
                                                    syncShellToEditFromEditor();
                                                },
                                                width: 80,
                                                step: 1,
                                                minimum: 0,
                                                maximum: 20
                                            })
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            label({ text: "Preset", width: 80 }),
                                            ...shellSizePresets.map(preset => colouredButton({
                                                text: preset.label,
                                                width: 28,
                                                height: 20,
                                                colour: Colour.LightBrown, colourDark: Colour.SaturatedBrown, colourLight: Colour.SaturatedBrownLight,
                                                onClick: () => applyShellSizePreset(preset)
                                            })),
											label({ text: "", width: "1w" }),
                                            colouredButton({
                                                text: "{WHITE}Test Shell",
                                                width: 80,
                                                height: 20,
												colour: Colour.LightOrange, colourDark: Colour.DarkOrange, colourLight: Colour.OrangeLight,
                                                onClick: onTestShellsButtonClick
                                            })
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            colouredButton({
                                                text: "{WHITE}Add Shell",
                                                width: 100,
                                                height: 20,
                                                colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen,
                                                onClick: addOrUpdateShell
                                            }),
                                            colouredButton({
                                                text: "{WHITE}New",
                                                width: 50,
                                                height: 20,
                                                colour: Colour.LightBlue, colourDark: Colour.DarkBlue, colourLight: Colour.IcyBlue,
                                                onClick: () => confirmDiscardChanges(isShellEditorDirty, resetShellEditor)
                                            }),
                                            colouredButton({
                                                text: "{WHITE}Delete Shell",
                                                width: 90,
                                                height: 20,
                                                colour: Colour.SaturatedRed, colourDark: Colour.BordeauxRedDark, colourLight: Colour.BrightRed,
                                                onClick: deleteSelectedShell
                                            }),
                                            label({ text: "", width: "1w" }),
                                            colouredButton({
                                                text: "{BLACK}Debugger", width: 70, height: 20,
                                                colour: Colour.Yellow, colourDark: Colour.DarkYellow, colourLight: Colour.BrightYellow,
                                                onClick: openDebuggerWindow
                                            }),
                                        ]
                                    })
                                ]
                            })
                        }),
                        box({
                            width: 190,
                            height: "1w",
                            padding: 6,
                            text: "Defined Shells",
                            content: flexible({
                                direction: LayoutDirection.Vertical,
                                content: [
                                    textbox({
                                        text: shellsSearch,
                                        onChange: value => shellsSearch.set(value),
                                        width: 170,
                                        maxLength: 64
                                    }),
                                    listview({
                                        items: compute(filteredShells, shells => shells.map(shell => [shell.name, shell.GetSpriteString()])),
                                        columns: [{ header: "Name", width: "1w" },
                                        { header: "Icons", width: "1w" }
                                        ],
                                        width: 170,
                                        height: "1w",
                                        canSelect: true,
                                        selectedCell: compute(selectedShellIndex, filteredShells, () => {
                                            const idx = selectedShellIndex.get();
                                            if (idx === undefined) return null;
                                            const name = definedShells.get()[idx]?.name;
                                            if (!name) return null;
                                            const row = filteredShells.get().findIndex(s => s.name === name);
                                            return row >= 0 ? { row, column: 0 } : null;
                                        }),
                                        onClick: row => {
                                            const shell = filteredShells.get()[row];
                                            if (!shell) return;
                                            const fullIndex = definedShells.get().findIndex(s => s.name === shell.name);
                                            if (fullIndex >= 0) {
                                                confirmDiscardChanges(isShellEditorDirty, () => {
                                                    loadSelectedShell(fullIndex);
                                                    collapseAscendEffectsPanel();
                                                });
                                            }
                                        }
                                    })
                                ]
                            })
                        })
                    ]
                })
            ]
        })
    ];
}