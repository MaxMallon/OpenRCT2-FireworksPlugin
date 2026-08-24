import {
    box,
    button,
    checkbox,
    colourPicker,
    compute,
    dropdown,
    flexible,
    groupbox,
    label,
    LayoutDirection,
    listview,
    spinner,
    store,
    textbox,
    window,
    OpenWindow,
    Colour
} from "openrct2-flexui";
import { ShellColours } from "../../fireworks/structures/ColourStructures";
import { cloneLoad } from "../../fireworks/loadHelpers";
import { getLoadList, getShellList, getShellToEdit, launchSites, launchSitesRevision, setShellList, setShellToEdit, definedShells } from "../../fireworks/persistent";
import * as persistent from "../../fireworks/persistent";
import { LoadFireworks, Play } from "../../fireworks/fireworksEffectsPlayer";
import { ResetCounts } from "../../fireworks/particleSpawner";
import { resizeFireworksWindow } from "../fireworksEditorWindow";
import { getMainWindowPosition } from "../windowState";
import { openDebuggerWindow } from "../debuggerWindow";
import { buildValidationContext, findShellUsages, formatValidationIssues, removeItemFromSequences, ValidationIssue } from "../../fireworks/usageChecker";
import { openUsageWarningWindow } from "../usageWarningWindow";
import { Shell, ShotHeadType } from "../../fireworks/structures/Firework";
import { ShellLoad } from "../../fireworks/structures/ShellLoad";
import { Load } from "../../fireworks/structures/Load";
import { SequenceItemType } from "../../fireworks/structures/Sequence";

const selectedShellIndex = store<number | undefined>(undefined);
const editedShellName = store("");
const selectedLoadName = store("");
const selectedLaunchSiteName = store("");
const headColour = store<Colour>(Colour.BrightYellow);
const trail1Colour = store<Colour>(Colour.DarkOrange);
const trail2Colour = store<Colour>(Colour.DarkOrange);
const isBigHead = store(false);
const trail = store(true);
const trailDensity = store(0.5);
const trailWidth = store(3);
const azimuth = store(0);
const tilt = store(0);
const timeTillStall = store(75);
const delay = store(75);
const syncHeightAndDelay = store(true);
const ascendEffectsStore = store<ShellLoad[]>([]);
const ascendEffectsRevision = store(0);
const selectedAscendEffectIndex = store<number | undefined>(undefined);
const showAscendEffectsPanel = store(false);

const shellsSearch = store("");
const filteredShells = compute(shellsSearch, definedShells, () => {
    const q = shellsSearch.get().trim().toLowerCase();
    const all = definedShells.get();
    if (!q) return all;
    return all.filter(s => s.name.trim().toLowerCase().indexOf(q) === 0);
});

interface ShellSizePreset
{
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

function applyShellSizePreset(preset: ShellSizePreset): void
{
    timeTillStall.set(preset.height);
    delay.set(preset.delay);
    isBigHead.set(preset.isBigHead);
    trail.set(preset.trail);
    syncShellToEditFromEditor();
}

function setHeightValue(value: number): void
{
    timeTillStall.set(value);
    if (syncHeightAndDelay.get())
    {
        delay.set(value);
    }

    syncShellToEditFromEditor();
}

function setDelayValue(value: number): void
{
    delay.set(value);
    if (syncHeightAndDelay.get())
    {
        timeTillStall.set(value);
    }

    syncShellToEditFromEditor();
}

function cloneShell(source: Shell): Shell
{
    const clonedPosition = typeof source.position === "string"
        ? source.position
        : { x: source.position.x, y: source.position.y, z: source.position.z };

    return new Shell(
        source.name,
        new ShellLoad(source.load.loadName, source.load.timeTillExplode),
        source.ascendEffects.map(effect => new ShellLoad(effect.loadName, effect.timeTillExplode)),
        source.headType,
        source.trail,
        source.trailDensity,
        source.trailWidth,
        clonedPosition,
        new ShellColours(source.shellColours.headColour, source.shellColours.trail1Colour, source.shellColours.trail2Colour),
        source.timeTillStall,
        { x: source.velocity.x, y: source.velocity.y, z: source.velocity.z },
        source.delay,
        source.azimuth,
        source.tilt,
        source.factorySource
    );
}

function getFallbackShellName(): string
{
    return `Shell ${definedShells.get().length + 1}`;
}

function createEmptyShell(name: string = ""): Shell
{
    return Shell.fromGround(
        name,
        new ShellLoad("", ShellLoad.explodeAtEnd),
        [],
        ShotHeadType.Small,
        false,
        0.5,
        3,
        "",
        new ShellColours(Colour.BrightYellow, Colour.DarkOrange, Colour.DarkOrange),
        70,
        70,
        0,
        0
    );
}

function syncShellToEditFromEditor(): void
{
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
    setShellToEdit(shell);
}

function resetShellEditor(): void
{
    editedShellName.set("");
    selectedLoadName.set("");
    selectedLaunchSiteName.set("");
    headColour.set(Colour.BrightYellow);
    trail1Colour.set(Colour.DarkOrange);
    trail2Colour.set(Colour.DarkOrange);
    isBigHead.set(false);
    trail.set(false);
    trailDensity.set(0.5);
    trailWidth.set(3);
    azimuth.set(0);
    tilt.set(0);
    timeTillStall.set(70);
    delay.set(70);
    ascendEffectsStore.set([]);
    ascendEffectsRevision.set(0);
    selectedAscendEffectIndex.set(undefined);
    selectedShellIndex.set(undefined);
    setShellToEdit(createEmptyShell());
}

function loadSelectedShell(index: number): void
{
    const shell = definedShells.get()[index];
    if (!shell)
    {
        return;
    }

    selectedShellIndex.set(index);
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
    ascendEffectsStore.set(shell.ascendEffects.map(e => new ShellLoad(e.loadName, e.timeTillExplode)));
    ascendEffectsRevision.set(ascendEffectsRevision.get() + 1);
    selectedAscendEffectIndex.set(undefined);
    setShellToEdit(cloneShell(shell));
}

function validateShellEditor(): boolean
{
    if (!selectedLoadName.get().trim())
    {
        if (typeof ui !== "undefined" && typeof ui.showError === "function")
            ui.showError("Invalid shell", "A shell must have a selected load.");
        return false;
    }

    if (!selectedLaunchSiteName.get().trim())
    {
        if (typeof ui !== "undefined" && typeof ui.showError === "function")
            ui.showError("Invalid shell", "A shell must have a selected launch site.");
        return false;
    }

    const currentDelay = delay.get();
    const invalidAscendEffect = ascendEffectsStore.get().find((e: ShellLoad) => e.timeTillExplode > currentDelay);
    if (invalidAscendEffect)
    {
        if (typeof ui !== "undefined" && typeof ui.showError === "function")
            ui.showError("Invalid shell", `Ascend load "${invalidAscendEffect.loadName}" fires at delay ${invalidAscendEffect.timeTillExplode}, which exceeds the shell delay of ${currentDelay}.`);
        return false;
    }

    return true;
}

function addOrUpdateShell(): void
{
    if (!validateShellEditor()) return;

    const trimmedName = editedShellName.get().trim();
    const nextName = trimmedName || getFallbackShellName();
    const loadName = selectedLoadName.get().trim();

    if (!persistent.resolveLoad(loadName))
    {
        if (typeof ui !== "undefined" && typeof ui.showError === "function")
        {
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
    const updated = [...getShellList().map(cloneShell)];
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
        updated[existingIndex] = nextShell;
        selectedShellIndex.set(existingIndex);
    }
    else
    {
        updated.push(nextShell);
        selectedShellIndex.set(updated.length - 1);
    }

    setShellList(updated.map(cloneShell));
    editedShellName.set(nextName);
    setShellToEdit(cloneShell(nextShell));
}

function deleteSelectedShell(): void
{
    const selectedIndex = selectedShellIndex.get();
    if (typeof selectedIndex !== "number")
    {
        return;
    }

    const shell = definedShells.get()[selectedIndex];
    if (!shell) return;

    const usages = findShellUsages(shell.name);

    const doDelete = () => {
        const updated = getShellList().filter((_, index) => index !== selectedIndex).map(cloneShell);
        setShellList(updated.map(cloneShell));
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

function onTestShellsButtonClick(): void
{
    const shell = getShellToEdit();
    if (!shell)
    {
        return;
    }
    if (!validateShellEditor()) return;

    // Validate all named references before testing
    const ctx = buildValidationContext();
    const issues: ValidationIssue[] = [];
    if (!shell.isValid(ctx, issues, `Shell "${shell.name}"`))
    {
        if (typeof ui !== "undefined" && typeof ui.showError === "function")
        {
            ui.showError("Invalid shell", formatValidationIssues(issues));
        }
        return;
    }

    LoadFireworks(cloneShell(shell));
    ResetCounts();
    Play(true);
}

function deleteSelectedAscendEffect(): void
{
    const index = selectedAscendEffectIndex.get();
    if (typeof index !== "number")
    {
        return;
    }

    const effects = [...ascendEffectsStore.get()];
    if (index < 0 || index >= effects.length)
    {
        selectedAscendEffectIndex.set(undefined);
        return;
    }

    effects.splice(index, 1);
    ascendEffectsStore.set(effects);
    selectedAscendEffectIndex.set(undefined);
    ascendEffectsRevision.set(ascendEffectsRevision.get() + 1);
    syncShellToEditFromEditor();
}

function openAddAscendEffectWindow(): void
{
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
    const popup = window({
        title: "Add Ascend Load",
        width: 300,
        height: 280,
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
                    if (load)
                    {
                        selectedAscendLoad.set(cloneLoad(load));
                    }
                }
            }),
            label({ text: compute(selectedAscendLoad, l => l ? `Selected: ${l.name}` : "Selected: none") }),
            flexible({
                direction: LayoutDirection.Horizontal,
                content: [
                    label({ text: "Delay", width: 50 }),
                    spinner({
                        value: ascendDelay,
                        onChange: value => ascendDelay.set(value),
                        width: 100,
                        step: 1,
                        minimum: minDelay,
                        maximum: compute(delay, t => t)
                    })
                ]
            }),
            flexible({
                direction: LayoutDirection.Horizontal,
                content: [
                    button({
                        text: "Add",
                        width: 70,
                        onClick: () => {
                            const load = selectedAscendLoad.get();
                            if (!load)
                            {
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
                    button({
                        text: "Cancel",
                        width: 70,
                        onClick: () => handle?.close()
                    })
                ]
            })
        ]
    });

    handle = popup.open();
}

function openShellLoadSelectionWindow(onSelect: (load: Load) => void): void
{
    const search = store("");
    const filteredLoads = compute(search, query => {
        const normalizedQuery = query.trim().toLowerCase();
        return getLoadList().filter(load => {
            const name = load.name.trim();
            if (!name)
            {
                return false;
            }

            if (!normalizedQuery)
            {
                return true;
            }

            return name.toLowerCase().indexOf(normalizedQuery) === 0;
        });
    });

    let handle: OpenWindow | undefined;
    const mainPos = getMainWindowPosition();
    const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;
    const selectorWindow = window({
        title: "Select Load",
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
                    if (!selected)
                    {
                        return;
                    }

                    onSelect(cloneLoad(selected));
                    handle?.close();
                }
            }),
            button({
                text: "Close",
                width: 70,
                onClick: () => handle?.close()
            })
        ]
    });

    handle = selectorWindow.open();
}

export function expandAcsendEffectsPanel(): void
{
    showAscendEffectsPanel.set(true);
    resizeFireworksWindow(640, 540);
}

export function collapseAscendEffectsPanel(): void
{
    showAscendEffectsPanel.set(false);
    resizeFireworksWindow(640, 420);
}

export function createShellsTab()
{
    const currentShell = getShellToEdit();
    if (currentShell)
    {
        editedShellName.set(currentShell.name);
        selectedLoadName.set(currentShell.load.loadName);
        selectedLaunchSiteName.set(typeof currentShell.position === "string" ? currentShell.position : "");
        headColour.set(currentShell.shellColours.headColour);
        trail1Colour.set(currentShell.shellColours.trail1Colour);
        trail2Colour.set(currentShell.shellColours.trail2Colour);
        isBigHead.set(currentShell.headType === ShotHeadType.Big);
        trail.set(currentShell.trail);
        trailDensity.set(currentShell.trailDensity);
        trailWidth.set(currentShell.trailWidth);
        azimuth.set(currentShell.azimuth);
        tilt.set(currentShell.tilt);
        timeTillStall.set(currentShell.timeTillStall);
        delay.set(currentShell.delay);
    }
    else
    {
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
                            height: compute(showAscendEffectsPanel, show => show ? 450 : 310),
                            padding: 6,
                            text: "Current Shell",
                            content: flexible({
                                direction: LayoutDirection.Vertical,
                                height: compute(showAscendEffectsPanel, show => show ? 420 : 290),
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
                                            label({ text: compute(selectedLoadName, name => `Main Load: ${name.trim() + "   " +  (persistent.GetLoadByName(name)?.GetSpriteString() || "[Empty]")}`), width: "1w" }),
                                            button({
                                                text: "Select Main Load",
                                                width: 120,
                                                height: 20,
                                                onClick: () => openShellLoadSelectionWindow(load => {
                                                    selectedLoadName.set(load.name);
                                                    syncShellToEditFromEditor();
                                                })
                                            })
                                        ]
                                    }),
                                    button({
                                        text: "Add Ascend Loads",
                                        width: 120,
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
                                                    button({
                                                        text: "Hide",
                                                        width: 50,
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
                                                    button({
                                                        text: "Add",
                                                        width: 70,
                                                visibility: compute(showAscendEffectsPanel, show => show ? "visible" : "none"),
                                                        onClick: () => {
                                                            const effects = ascendEffectsStore.get();
                                                            const currentDelay = delay.get();
                                                            if (effects.length > 0 && effects[effects.length - 1].timeTillExplode >= currentDelay)
                                                            {
                                                                if (typeof ui !== "undefined" && typeof ui.showError === "function")
                                                                {
                                                                    ui.showError("Invalid ascend load", `The last ascend load already fires at delay ${effects[effects.length - 1].timeTillExplode}, which is at or beyond the shell delay of ${currentDelay}.`);
                                                                }
                                                                return;
                                                            }
                                                            openAddAscendEffectWindow();
                                                        }
                                                    }),
                                                    button({
                                                        text: "Delete",
                                                        width: 70,
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
                                            if (index <= 0)
                                            {
                                                selectedLaunchSiteName.set("");
                                            }
                                            else
                                            {
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
                                    checkbox({
                                        text: "Big head type",
                                        isChecked: isBigHead,
                                        onChange: value => {
                                            isBigHead.set(value);
                                            syncShellToEditFromEditor();
                                        }
                                    }),
                                    checkbox({
                                        text: "Trail",
                                        isChecked: trail,
                                        onChange: value => {
                                            trail.set(value);
                                            syncShellToEditFromEditor();
                                        }
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            label({ text: "Trail Density", width: 80 }),
                                            spinner({
                                                value: trailDensity,
                                                onChange: value => {
                                                    trailDensity.set(value);
                                                    syncShellToEditFromEditor();
                                                },
                                                width: 80,
                                                step: 0.1,
                                                minimum: 0,
                                                maximum: 1
                                            }),
                                            label({ text: "Trail Width", width: 80 }),
                                            spinner({
                                                value: trailWidth,
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
                                            label({ text: "Tilt", width: 80 }),
                                            spinner({
                                                value: tilt,
                                                onChange: value => {
                                                    tilt.set(value);
                                                    syncShellToEditFromEditor();
                                                },
                                                width: 80,
                                                step: 0.5,
                                                minimum: 0,
                                                maximum: 45
                                            }),
                                            label({ text: "Azimuth", width: 80 }),
                                            spinner({
                                                value: azimuth,
                                                onChange: value => {
                                                    azimuth.set(value);
                                                    syncShellToEditFromEditor();
                                                },
                                                width: 80,
                                                step: 2,
                                                minimum: -360,
                                                maximum: 360
                                            }),
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            label({ text: "Height", width: 80 }),
                                            spinner({
                                                value: timeTillStall,
                                                onChange: value => setHeightValue(value),
                                                width: 80,
                                                step: 1,
                                                minimum: 0,
                                                maximum: 130
                                            }),
                                            label({ text: "Delay", width: 80 }),
                                            spinner({
                                                value: delay,
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
                                                    if (value)
                                                    {
                                                        delay.set(timeTillStall.get());
                                                        syncShellToEditFromEditor();
                                                    }
                                                }
                                            }),
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            label({ text: "Preset", width: 80 }),
                                            ...shellSizePresets.map(preset => button({
                                                text: preset.label,
                                                width: 28,
                                                height: 20,
                                                onClick: () => applyShellSizePreset(preset)
                                            }))
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            button({
                                                text: "Add Shell",
                                                width: 100,
                                                height: 20,
                                                onClick: addOrUpdateShell
                                            }),
                                            button({
                                                text: "New",
                                                width: 50,
                                                height: 20,
                                                onClick: resetShellEditor
                                            }),
                                            button({
                                                text: "Delete Shell",
                                                width: 90,
                                                height: 20,
                                                onClick: deleteSelectedShell
                                            }),
                                            label({ text: "", width: "1w" }),
                                            button({ text: "Debugger", width: 70, height: 20, onClick: openDebuggerWindow }),
                                            label({ text: "", width: "1w" }),
                                            button({
                                                text: "Test",
                                                width: 45,
                                                height: 20,
                                                onClick: onTestShellsButtonClick
                                            })
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
                                            if (fullIndex >= 0) { loadSelectedShell(fullIndex); collapseAscendEffectsPanel(); }
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