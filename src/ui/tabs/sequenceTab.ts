

// ---- Module-level state ----

import { store, compute, OpenWindow, window, LayoutDirection, label, textbox, listview, button, flexible, dropdown, groupbox, box, checkbox, Colour } from "openrct2-flexui";
import { LoadFireworks, Play, Stop, flattenScheduledEntryToShots } from "../../fireworks/fireworksEffectsPlayer";
import { ResetCounts } from "../../fireworks/particleSpawner";
import { getEditSequence, setEditSequence, resolveSequence, getSequenceList, setSequenceList, getShellList, getGroundEffectList, effectTick, definedSequences } from "../../fireworks/persistent";
import { Shell, GroundEffect } from "../../fireworks/structures/Firework";
import { Sequence, SequenceEntry, SequenceItemType } from "../../fireworks/structures/Sequence";
import { findSequenceUsages, removeItemFromSequences, removeSequenceFromShows, buildValidationContext, formatValidationIssues, ValidationIssue } from "../../fireworks/usageChecker";
import { openDebuggerWindow } from "../debuggerWindow";
import { openUsageWarningWindow } from "../usageWarningWindow";
import { getMainWindowPosition } from "../windowState";

const selectedSequenceIndex = store<number | undefined>(undefined);
const editedSequenceName = store("");
const editedSequenceItems = store<SequenceEntry[]>([]);
const lockOnTime = store(false); // false = lock delay mode, true = lock time mode
const entryEditTimeText = store("");
const entryEditDelayText = store("");
const entryEditIndexText = store("");
const entryEditItemLabel = store("[Empty]");
const isDeleteMode = store(false);
const isExpandedView = store(false);
const playingRelTick = store(-1); // -1 = not playing; >=0 = ticks since test started
const selectedEntryIndex = store<number | undefined>(undefined);
const selectedExpandedIndex = store<number | undefined>(undefined);
const playStartRow = store<number>(0); // 0-based index of the first item being played
const isPlaying = compute(playingRelTick, tick => tick >= 0);
const sequencesSearch = store("");
const filteredSequences = compute(sequencesSearch, definedSequences, () => {
    const q = sequencesSearch.get().trim().toLowerCase();
    const all = definedSequences.get();
    if (!q) return all;
    return all.filter(s => s.name.trim().toLowerCase().indexOf(q) === 0);
});
const textColourNormal = "{PALEGOLD}";
const textColourPlaying = "{GREY}";

let entryEditItemName: string | undefined;
let entryEditItemType: SequenceItemType | undefined;
let entryEditNextItemAfterEnd: boolean = true;
let playTickSubscription: { dispose(): void } | undefined;

// ---- Short time format ----

function pad2(n: number): string {
    return n < 10 ? "0" + n : String(n);
}

/**
 * Compact time string: omits leading zero units and trailing zero units.
 * Examples: 0t, 5t, 1s, 1s05t, 1m, 1m01s, 1m01s05t, 1m00s05t
 */
function ticksToShortTimeString(ticks: number): string {
    const t = isFinite(ticks) ? Math.max(0, Math.floor(ticks)) : 0;
    const totalSec = Math.floor(t / 40);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const tcks = t % 40;

    const parts: string[] = [];
    if (mins > 0) {
        parts.push(`${mins}m`);
    }
    if (secs > 0 || (mins > 0 && tcks > 0)) {
        parts.push(`${mins > 0 ? pad2(secs) : secs}s`);
    }
    if (tcks > 0) {
        parts.push(`${parts.length > 0 ? pad2(tcks) : tcks}t`);
    }
    else if (parts.length === 0) {
        parts.push("0t");
    }
    return parts.join("");
}

// ---- Time parsing ----

/**
 * Parse a human-readable time string to ticks (40 ticks/sec).
 * Accepts: plain number (ticks), "2s", "80t", "1m30s", "1m30s5t", "00m30s00t", etc.
 * Returns undefined for invalid input, 0 for empty.
 */
function parseTimeString(input: string): number | undefined {
    const cleaned = input.replace(/\s+/g, "");
    if (!cleaned) {
        return 0;
    }
    if (/^\d+$/.test(cleaned)) {
        return parseInt(cleaned, 10);
    }
    let remaining = cleaned.toLowerCase();
    let minutes = 0;
    let seconds = 0;
    let ticks = 0;
    let found = false;
    const mMatch = remaining.match(/^(\d+)m/);
    if (mMatch) {
        minutes = parseInt(mMatch[1], 10);
        remaining = remaining.slice(mMatch[0].length);
        found = true;
    }
    const sMatch = remaining.match(/^(\d+)s/);
    if (sMatch) {
        seconds = parseInt(sMatch[1], 10);
        remaining = remaining.slice(sMatch[0].length);
        found = true;
    }
    const tMatch = remaining.match(/^(\d+)t/);
    if (tMatch) {
        ticks = parseInt(tMatch[1], 10);
        remaining = remaining.slice(tMatch[0].length);
        found = true;
    }
    if (!found || remaining.length > 0) {
        return undefined;
    }
    return (minutes * 60 + seconds) * 40 + ticks;
}

// ---- Clone helpers ----

function cloneSequence(seq: Sequence): Sequence {
    const cloned = new Sequence(seq.name, []);
    cloned.items = seq.items.map(e => new SequenceEntry(e.itemName, e.itemType, e.timeTillLight, e.cumulativeTimeTillLight, e.nextItemAfterEnd));
    return cloned;
}

// ---- Sync helpers ----

function syncEditorItems(): void {
    editedSequenceItems.set([...(getEditSequence()?.items ?? [])]);
}

function resetEntryEditor(): void {
    entryEditTimeText.set("");
    entryEditDelayText.set("");
    entryEditIndexText.set("");
    entryEditItemLabel.set("[Empty]");
    entryEditItemName = undefined;
    entryEditItemType = undefined;
    entryEditNextItemAfterEnd = true;
}

function resetSequenceEditor(): void {
    setEditSequence(new Sequence(""));
    editedSequenceName.set("");
    selectedSequenceIndex.set(undefined);
    selectedEntryIndex.set(undefined);
    isDeleteMode.set(false);
    syncEditorItems();
    resetEntryEditor();
}

function loadSelectedSequence(index: number): void {
    const seq = definedSequences.get()[index];
    if (!seq) {
        return;
    }
    selectedSequenceIndex.set(index);
    editedSequenceName.set(seq.name);
    const editSeq = cloneSequence(seq);
    editSeq.recalculateCumulativeTimes(0, resolveSequence);
    setEditSequence(editSeq);
    syncEditorItems();
    selectedEntryIndex.set(undefined);
    resetEntryEditor();
}

// ---- Error display ----

function showError(title: string, message: string): void {
    if (typeof ui !== "undefined" && typeof ui.showError === "function") {
        ui.showError(title, message);
    }
    else {
        console.log(`Error [${title}]: ${message}`);
    }
}

// ---- Insertion with lock logic ----

function insertWithLock(insertIndex: number, delay: number): void {
    if (!entryEditItemName || !entryEditItemType) {
        showError("Invalid entry", "Select a shell, ground effect, or sequence before adding.");
        return;
    }
    const seq = getEditSequence()!;
    const clamped = Math.min(Math.max(0, Math.floor(insertIndex)), seq.items.length);
    const normalizedDelay = isFinite(delay) ? Math.floor(delay) : 0;

    if (lockOnTime.get()) {
        seq.recalculateCumulativeTimesFromIndex(0, 0, resolveSequence);

        // Compute the intended absolute fire time: effective base at clamped plus the user's delay.
        let requestedBase = 0;
        if (clamped > 0) {
            const prevItem = seq.items[clamped - 1];
            requestedBase = prevItem.cumulativeTimeTillLight;
            if (prevItem.itemType === SequenceItemType.Sequence && prevItem.nextItemAfterEnd) {
                const prevSeq = resolveSequence(prevItem.itemName);
                if (prevSeq) requestedBase += prevSeq.getEndCumulativeTime(resolveSequence);
            }
        }
        const newItemAbsoluteTime = requestedBase + normalizedDelay;

        // Advance the insert position past any items that fire strictly before the new one.
        let actualInsert = clamped;
        while (actualInsert < seq.items.length && seq.items[actualInsert].cumulativeTimeTillLight < newItemAbsoluteTime) {
            actualInsert++;
        }

        // Compute timeTillLight relative to the actual insert position's effective base.
        let actualBase = 0;
        if (actualInsert > 0) {
            const prevAtInsert = seq.items[actualInsert - 1];
            actualBase = prevAtInsert.cumulativeTimeTillLight;
            if (prevAtInsert.itemType === SequenceItemType.Sequence && prevAtInsert.nextItemAfterEnd) {
                const prevSeq = resolveSequence(prevAtInsert.itemName);
                if (prevSeq) actualBase += prevSeq.getEndCumulativeTime(resolveSequence);
            }
        }
        const actualTimeTillLight = newItemAbsoluteTime - actualBase;

        const entryBelow = seq.items[actualInsert];
        const oldCumulativeBelow = entryBelow?.cumulativeTimeTillLight;
        const newEntry = new SequenceEntry(entryEditItemName, entryEditItemType, actualTimeTillLight, 0, entryEditNextItemAfterEnd);
        seq.items.splice(actualInsert, 0, newEntry);
        seq.recalculateCumulativeTimesFromIndex(actualInsert, 0, resolveSequence);

        if (entryBelow !== undefined && oldCumulativeBelow !== undefined) {
            const belowIndex = actualInsert + 1;
            if (belowIndex < seq.items.length) {
                const newItem = seq.items[actualInsert];
                let newItemEffectiveBase = newItem.cumulativeTimeTillLight;
                if (newItem.itemType === SequenceItemType.Sequence && newItem.nextItemAfterEnd) {
                    const insertedSeq = resolveSequence(newItem.itemName);
                    if (insertedSeq) newItemEffectiveBase += insertedSeq.getEndCumulativeTime(resolveSequence);
                }
                seq.items[belowIndex].timeTillLight = oldCumulativeBelow - newItemEffectiveBase;
                seq.recalculateCumulativeTimesFromIndex(belowIndex, 0, resolveSequence);
            }
        }
    }
    else {
        seq.addItemAt(entryEditItemName, entryEditItemType, normalizedDelay, clamped, undefined, entryEditNextItemAfterEnd, resolveSequence);
    }

    syncEditorItems();
}

// ---- Add-at-time button handler ----

function onAddAt(): void {
    if (!entryEditItemName || !entryEditItemType) {
        showError("Invalid entry", "Select a shell, ground effect, or sequence before adding.");
        return;
    }
    const timeStr = entryEditTimeText.get().trim();
    const absoluteTime = parseTimeString(timeStr);
    if (absoluteTime === undefined) {
        showError("Invalid time", `"${timeStr}" is not a valid time. Examples: 2s, 80t, 1m30s, 01m30s10t`);
        return;
    }

    const seq = getEditSequence()!;
    seq.recalculateCumulativeTimesFromIndex(0, 0, resolveSequence);
    let insertIndex = seq.items.length;
    for (let i = 0; i < seq.items.length; i++) {
        if (seq.items[i].cumulativeTimeTillLight > absoluteTime) {
            insertIndex = i;
            break;
        }
    }
    let prevTime: number;
    if (insertIndex === 0) {
        prevTime = 0;
    } else {
        const prevEntry = seq.items[insertIndex - 1];
        prevTime = prevEntry.cumulativeTimeTillLight;
        if (prevEntry.itemType === SequenceItemType.Sequence && prevEntry.nextItemAfterEnd) {
            const prevSeq = resolveSequence(prevEntry.itemName);
            if (prevSeq) prevTime += prevSeq.getEndCumulativeTime(resolveSequence);
        }
    }
    const delay = absoluteTime - prevTime;
    insertWithLock(insertIndex, delay);
    resetEntryEditor();
}

// ---- Add-after-index button handler ----

function onAddAfterIndex(): void {
    if (!entryEditItemName || !entryEditItemType) {
        showError("Invalid entry", "Select a shell, ground effect, or sequence before adding.");
        return;
    }
    const delayStr = entryEditDelayText.get().trim();
    const delay = parseTimeString(delayStr || "0");
    if (delay === undefined) {
        showError("Invalid delay", `"${delayStr}" is not a valid delay. Examples: 2s, 80t, 1m30s`);
        return;
    }
    const indexStr = entryEditIndexText.get().trim();
    const seq = getEditSequence()!;
    let insertIndex: number;
    if (!indexStr) {
        insertIndex = seq.items.length;
    }
    else {
        const parsed = parseInt(indexStr, 10);
        if (!isFinite(parsed) || parsed < 1) {
            insertIndex = seq.items.length;
        }
        else {
            insertIndex = Math.min(parsed, seq.items.length);
        }
    }
    insertWithLock(insertIndex, delay);
    resetEntryEditor();
}

// ---- Delete entry ----

function onDeleteEntryClick(row: number): void {
    const seq = getEditSequence()!;

    if (lockOnTime.get() && row + 1 < seq.items.length) {
        // In lock-on-time mode: preserve the absolute time of the entry below.
        const savedCumulativeBelow = seq.items[row + 1].cumulativeTimeTillLight;
        seq.removeItemAt(row, resolveSequence);

        if (row < seq.items.length) {
            // Compute the effective base for the entry now at 'row' (same logic as recalculation).
            let effectiveBase = row === 0 ? 0 : seq.items[row - 1].cumulativeTimeTillLight;
            if (row > 0) {
                const prevEntry = seq.items[row - 1];
                if (prevEntry.itemType === SequenceItemType.Sequence && prevEntry.nextItemAfterEnd) {
                    const prevSeq = resolveSequence(prevEntry.itemName);
                    if (prevSeq) effectiveBase += prevSeq.getEndCumulativeTime(resolveSequence);
                }
            }
            seq.items[row].timeTillLight = savedCumulativeBelow - effectiveBase;
            seq.recalculateCumulativeTimesFromIndex(row, 0, resolveSequence);
        }
    } else {
        seq.removeItemAt(row, resolveSequence);
    }

    syncEditorItems();
}

// ---- Sequence CRUD ----

function validateSequenceEditor(): boolean {
    if (getEditSequence()!.items.length === 0) {
        showError("Invalid sequence", "A sequence must have at least one item.");
        return false;
    }
    return true;
}

function addOrUpdateSequence(): void {
    if (!validateSequenceEditor()) return;
    const seq = getEditSequence()!;
    const trimmedName = editedSequenceName.get().trim();
    const nextName = trimmedName || `Sequence ${definedSequences.get().length + 1}`;
    seq.name = nextName;
    const nextSeq = cloneSequence(seq);
    const updated = getSequenceList().map(cloneSequence);
    let existingIndex = -1;
    for (let i = 0; i < updated.length; i++) {
        if (updated[i].name === nextName) {
            existingIndex = i;
            break;
        }
    }
    if (existingIndex >= 0) {
        updated[existingIndex] = nextSeq;
        selectedSequenceIndex.set(existingIndex);
    }
    else {
        updated.push(nextSeq);
        selectedSequenceIndex.set(updated.length - 1);
    }
    setSequenceList(updated.map(cloneSequence));
    editedSequenceName.set(nextName);
}

function deleteSelectedSequence(): void {
    const selectedIndex = selectedSequenceIndex.get();
    if (typeof selectedIndex !== "number") {
        return;
    }

    const seq = definedSequences.get()[selectedIndex];
    if (!seq) return;

    const usages = findSequenceUsages(seq.name);

    const doDelete = () => {
        const updated = getSequenceList().filter((_, i) => i !== selectedIndex).map(cloneSequence);
        setSequenceList(updated.map(cloneSequence));
        resetSequenceEditor();
    };

    if (usages.length > 0) {
        openUsageWarningWindow(
            `Sequence "${seq.name}"`,
            usages,
            doDelete,
            () => {
                removeItemFromSequences(seq.name, SequenceItemType.Sequence);
                removeSequenceFromShows(seq.name);
                doDelete();
            }
        );
        return;
    }

    openConfirmDeleteWindow(`Sequence "${seq.name}"`, doDelete);
}

function openConfirmDeleteWindow(itemLabel: string, onConfirm: () => void): void {
    if (typeof ui === "undefined") {
        onConfirm();
        return;
    }

    let handle: OpenWindow | undefined;

    const mainPos = getMainWindowPosition();
    const position = mainPos
        ? { x: mainPos.x + 40, y: mainPos.y + 40 }
        : "center" as const;

    const popup = window({
        title: "Delete Sequence",
        width: 300,
        height: 90,
        padding: 8,
        position,
        colours: [Colour.BordeauxRedDark, Colour.Grey],
        direction: LayoutDirection.Vertical,
        content: [
            flexible({
                direction: LayoutDirection.Vertical,
                content: [
                    label({ text: `{WHITE}Are you sure you want to delete\n${itemLabel}?`, height: 30 }),
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
            }),
            
        ]
    });
    handle = popup.open();
}

// ---- Test sequence ----

function onPlaySequenceClick(): void {
    if (!validateSequenceEditor()) return;
    const seq = getEditSequence()!;

    // Validate all named references before playing
    const ctx = buildValidationContext();
    const issues: ValidationIssue[] = [];
    if (!seq.isValid(ctx, issues, `Sequence "${seq.name}"`)) {
        showError("Invalid sequence", formatValidationIssues(issues));
        return;
    }

    if (playTickSubscription) {
        playTickSubscription.dispose();
        playTickSubscription = undefined;
    }
    textColour.set(textColourPlaying);
    const startTick = effectTick;
    const seqToTest = cloneSequence(seq);
    seqToTest.recalculateCumulativeTimes(startTick, resolveSequence);
    LoadFireworks(seqToTest);
    ResetCounts();
    Play(true);
    playStartRow.set(0);
    playingRelTick.set(0);
    const maxTime = seq.items.reduce(
        (max, e) => Math.max(max, e.cumulativeTimeTillLight), 0
    );
    playTickSubscription = context.subscribe("interval.tick", () => {
        const relTick = effectTick - startTick;
        playingRelTick.set(relTick);
        if (relTick > maxTime + 80) {
            if (playTickSubscription) {
                playTickSubscription.dispose();
                playTickSubscription = undefined;
            }
            playingRelTick.set(-1);
            textColour.set(textColourNormal);
        }
    });
}

// ---- Play from index / Stop ----

function onPlayFromIndexClick(): void {
    const startRow = selectedEntryIndex.get();
    if (startRow === undefined) {
        showError("Invalid selection", "Select a row in the sequence list to play from.");
        return;
    }
    const seq = getEditSequence()!;
    if (seq.items.length === 0 || startRow >= seq.items.length) {
        showError("Invalid selection", "The selected row is out of range.");
        return;
    }

    // Validate all named references before playing
    const ctx = buildValidationContext();
    const issues: ValidationIssue[] = [];
    if (!seq.isValid(ctx, issues, `Sequence "${seq.name}"`)) {
        showError("Invalid sequence", formatValidationIssues(issues));
        return;
    }

    if (playTickSubscription) {
        playTickSubscription.dispose();
        playTickSubscription = undefined;
    }
    textColour.set(textColourPlaying);
    const startTick = effectTick;
    const seqToTest = cloneSequence(seq);
    seqToTest.items = seqToTest.items.slice(startRow);
    seqToTest.recalculateCumulativeTimes(startTick, resolveSequence);
    LoadFireworks(seqToTest);
    ResetCounts();
    Play(true);
    playStartRow.set(startRow);
    playingRelTick.set(0);
    const maxTime = seqToTest.items.reduce(
        (max, e) => Math.max(max, e.cumulativeTimeTillLight - startTick), 0
    );
    playTickSubscription = context.subscribe("interval.tick", () => {
        const relTick = effectTick - startTick;
        playingRelTick.set(relTick);
        if (relTick > maxTime + 80) {
            if (playTickSubscription) {
                playTickSubscription.dispose();
                playTickSubscription = undefined;
            }
            playingRelTick.set(-1);
            textColour.set(textColourNormal);
        }
    });
}

function onStopClick(): void {
    if (playTickSubscription) {
        playTickSubscription.dispose();
        playTickSubscription = undefined;
    }
    Stop();
    playingRelTick.set(-1);
    textColour.set(textColourNormal);
}

// ---- Item picker windows ----

function openShellPickerWindow(onSelect: (shell: Shell) => void): void {
    const search = store("");
    const filteredShells = compute(search, query => {
        const q = query.trim().toLowerCase();
        return getShellList().filter(s => {
            const name = s.name.trim();
            if (!name) return false;
            if (!q) return true;
            return name.toLowerCase().indexOf(q) === 0;
        });
    });
    let handle: OpenWindow | undefined;
    const mainPos = getMainWindowPosition();
    const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;
    const win = window({
        title: "Select Shell",
        width: 300,
        height: 250,
        padding: 8,
        position,
        direction: LayoutDirection.Vertical,
        content: [
            label({ text: "Search by prefix" }),
            textbox({ text: search, onChange: v => search.set(v), width: 260, maxLength: 64 }),
            listview({
                items: compute(filteredShells, shells => shells.map(s => [s.name, s.GetSpriteString()])),
                columns: [{ header: "Name", width: "1w" },
                        { header: "Icons", width: "1w" }
                ],
                width: 260,
                height: 150,
                canSelect: true,
                onClick: row => {
                    const selected = filteredShells.get()[row];
                    if (!selected) return;
                    onSelect(selected);
                    handle?.close();
                }
            }),
            button({ text: "Close", width: 70, onClick: () => handle?.close() })
        ]
    });
    handle = win.open();
}

function openGroundEffectPickerWindow(onSelect: (ge: GroundEffect) => void): void {
    const search = store("");
    const filteredEffects = compute(search, query => {
        const q = query.trim().toLowerCase();
        return getGroundEffectList().filter(ge => {
            const name = ge.name.trim();
            if (!name) return false;
            if (!q) return true;
            return name.toLowerCase().indexOf(q) === 0;
        });
    });
    let handle: OpenWindow | undefined;
    const mainPos = getMainWindowPosition();
    const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;
    const win = window({
        title: "Select Ground Effect",
        width: 300,
        height: 250,
        padding: 8,
        position,
        direction: LayoutDirection.Vertical,
        content: [
            label({ text: "Search by prefix" }),
            textbox({ text: search, onChange: v => search.set(v), width: 260, maxLength: 64 }),
            listview({
                items: compute(filteredEffects, effects => effects.map(ge => [ge.name, ge.GetSpriteString()])),
                columns: [{ header: "Name", width: "1w" },
                    { header: "Icons", width: "1w" }
                ],
                width: 260,
                height: 150,
                canSelect: true,
                onClick: row => {
                    const selected = filteredEffects.get()[row];
                    if (!selected) return;
                    onSelect(selected);
                    handle?.close();
                }
            }),
            button({ text: "Close", width: 70, onClick: () => handle?.close() })
        ]
    });
    handle = win.open();
}

function openSequencePickerWindow(onSelect: (seqName: string, nextItemAfterEnd: boolean) => void): void {
    const search = store("");
    const nextItemAfterEndIndex = store(1); // 0 = Start of sequence, 1 = End of sequence
    const nextAfterOptions = ["Start of sequence", "End of sequence"];
    const filteredSequences = compute(search, query => {
        const q = query.trim().toLowerCase();
        const currentName = (getEditSequence()?.name ?? "").trim();
        return getSequenceList().filter(s => {
            const name = s.name.trim();
            if (!name) return false;
            if (currentName && (name === currentName || s.containsSequenceWithName(currentName, resolveSequence))) return false; // avoid circular references
            if (!q) return true;
            return name.toLowerCase().indexOf(q) === 0;
        });
    });
    let handle: OpenWindow | undefined;
    const mainPos = getMainWindowPosition();
    const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;
    const win = window({
        title: "Select Sequence",
        width: 320,
        height: 310,
        padding: 8,
        position,
        direction: LayoutDirection.Vertical,
        content: [
            label({ text: "Search by prefix" }),
            textbox({ text: search, onChange: v => search.set(v), width: 280, maxLength: 64 }),
            listview({
                items: compute(filteredSequences, seqs => seqs.map(s => [s.name, `${s.items.length}`])),
                columns: [
                    { header: "Name", width: "2w" },
                    { header: "Items", width: "1w" }
                ],
                width: 292,
                height: 150,
                canSelect: true,
                onClick: row => {
                    const selected = filteredSequences.get()[row];
                    if (!selected) return;
                    onSelect(selected.name.trim(), nextItemAfterEndIndex.get() === 1);
                    handle?.close();
                }
            }),
            flexible({
                direction: LayoutDirection.Horizontal,
                height: 16,
                content: [
                    label({ text: "Fire next item after:", width: "1w" }),
                    dropdown({
                        items: nextAfterOptions,
                        selectedIndex: nextItemAfterEndIndex,
                        onChange: i => nextItemAfterEndIndex.set(i),
                        autoDisable: "never",
                        width: 160
                    })
                ]
            }),
            flexible({
                direction: LayoutDirection.Horizontal,
                content: [
                    label({ text: "Click a sequence to add it.", width: "1w" }),
                    button({ text: "Close", width: 70, onClick: () => handle?.close() })
                ]
            })
        ]
    });
    handle = win.open();
}

// ---- Launch site helpers ----

function getLaunchSiteName(entry: SequenceEntry): string {
    if (entry.itemType === SequenceItemType.Sequence) return "-";
    if (entry.itemType === SequenceItemType.Shell) {
        const shell = getShellList().find(s => s.name === entry.itemName);
        if (!shell) return "-";
        return typeof shell.position === "string" && shell.position.trim() ? shell.position.trim() : "-";
    }
    if (entry.itemType === SequenceItemType.GroundEffect) {
        const ge = getGroundEffectList().find(g => g.name === entry.itemName);
        if (!ge) return "-";
        return ge.position.trim() || "-";
    }
    return "-";
}

function computeFlattenedDisplayItems(items: SequenceEntry[]): SequenceEntry[] {
    const result: SequenceEntry[] = [];
    for (const item of items) {
        const shots = flattenScheduledEntryToShots(item);
        for (const shot of shots) {
            result.push(shot);
        }
    }
    result.sort((a, b) => a.cumulativeTimeTillLight - b.cumulativeTimeTillLight);
    return result;
}

// ---- Dynamic "Add after" button label ----

const addAfterButtonLabel = compute(
    entryEditDelayText,
    entryEditIndexText,
    editedSequenceItems,
    (delayText, indexText, items) => {
        const delayDisplay = delayText.trim() || "0";
        const trimmedIndex = indexText.trim();
        const parsedIndex = trimmedIndex ? parseInt(trimmedIndex, 10) : NaN;
        const indexIsValid = isFinite(parsedIndex) && parsedIndex >= 1 && parsedIndex <= items.length;
        return `Add ${delayDisplay} after ${indexIsValid ? String(parsedIndex) : "last"}`;
    }
);

// ---- Tab creation ----
const textColour = store("{PALEGOLD}");

export function createSequenceTab() {
    const savedEdit = getEditSequence();
    if (savedEdit) {
        editedSequenceName.set(savedEdit.name);
        savedEdit.recalculateCumulativeTimes(0, resolveSequence);
    } else {
        setEditSequence(new Sequence(""));
    }
    syncEditorItems();

    return [
        groupbox({
            text: compute(textColour, c => `${c}Sequence Editor`),
            height: "1w",
            width: "1w",
            content: [
                flexible({
                    direction: LayoutDirection.Horizontal,
                    height: "1w",
                    width: "1w",
                    content: [
                        // ---- Left: vertical stack of two boxes ----
                        flexible({
                            direction: LayoutDirection.Vertical,
                            width: "1w",
                            height: "1w",
                            content: [
                                // "Sequence Entry" box (auto-height)
                                box({
                                    text: compute(textColour, c => `${c}Sequence Entry`),
                                    width: "1w",
                                    height: 80,
                                    padding: 6,
                                    content: flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            flexible({
                                                direction: LayoutDirection.Vertical,
                                                width: "1w",
                                                content: [
                                                    // Labels row
                                                    flexible({
                                                        direction: LayoutDirection.Horizontal,
                                                        content: [
                                                            label({ text: compute(textColour, lockOnTime, (c, lock) => `${c}Time${lock ? " [L]" : ""}`), width: 80 }),
                                                            label({ text: "", width: 25 }),
                                                            label({ text: compute(textColour, lockOnTime, (c, lock) => `${c}Delay${!lock ? " [L]" : ""}`), width: 70 }),
                                                            label({ text: compute(textColour, c => `${c}Index`), width: 35 })
                                                        ]
                                                    }),
                                                    // Inputs + item label row
                                                    flexible({
                                                        direction: LayoutDirection.Horizontal,
                                                        content: [
                                                            textbox({ text: entryEditTimeText, onChange: v => entryEditTimeText.set(v), width: 80, maxLength: 32, disabled: isPlaying }),
                                                            label({ text: "", width: 25 }),
                                                            textbox({ text: entryEditDelayText, onChange: v => entryEditDelayText.set(v), width: 70, maxLength: 32, disabled: isPlaying }),
                                                            textbox({ text: entryEditIndexText, onChange: v => {
                                                entryEditIndexText.set(v);
                                                const parsed = parseInt(v.trim(), 10);
                                                if (isFinite(parsed) && parsed >= 1) {
                                                    selectedEntryIndex.set(parsed - 1);
                                                    selectedExpandedIndex.set(undefined);
                                                } else {
                                                    selectedEntryIndex.set(undefined);
                                                }
                                            }, width: 35, maxLength: 8, disabled: isPlaying }),
                                                            label({ text: compute(entryEditItemLabel, textColour, (n, c) => `${c}Item: ${n}`), width: "1w" }),// Picker buttons row
                                                        ]
                                                    }),
                                                    // Add buttons row
                                                    flexible({
                                                        direction: LayoutDirection.Horizontal,
                                                        content: [
                                                            button({ text: compute(textColour, c => `${c}Add at`), width: 85, disabled: isPlaying, onClick: onAddAt }),
                                                            label({ text: compute(textColour, c => `${c}or`), width: 20 }),
                                                            button({ text: compute(addAfterButtonLabel, textColour, (l, c) => `${c}${l}`), width: 155, disabled: isPlaying, onClick: onAddAfterIndex })
                                                        ]
                                                    })
                                                ],
                                            }),

                                            flexible({
                                                direction: LayoutDirection.Vertical,
                                                content: [
                                                    button({
                                                        text: compute(textColour, c => `${c}Shell`),
                                                        width: 60,
                                                        disabled: isPlaying,
                                                        onClick: () => openShellPickerWindow(s => {
                                                            entryEditItemName = s.name.trim();
                                                            entryEditItemType = SequenceItemType.Shell;
                                                            entryEditNextItemAfterEnd = true;
                                                            entryEditItemLabel.set(s.name.trim() || "[Unnamed]");
                                                        })
                                                    }),
                                                    button({
                                                        text: compute(textColour, c => `${c}GroundEffect`),
                                                        width: 98,
                                                        disabled: isPlaying,
                                                        onClick: () => openGroundEffectPickerWindow(ge => {
                                                            entryEditItemName = ge.name.trim();
                                                            entryEditItemType = SequenceItemType.GroundEffect;
                                                            entryEditNextItemAfterEnd = true;
                                                            entryEditItemLabel.set(ge.name.trim() || "[Unnamed]");
                                                        })
                                                    }),
                                                    button({
                                                        text: compute(textColour, c => `${c}Sequence`),
                                                        width: 82,
                                                        disabled: isPlaying,
                                                        onClick: () => openSequencePickerWindow((seqName, nextAfterEnd) => {
                                                            entryEditItemName = seqName;
                                                            entryEditItemType = SequenceItemType.Sequence;
                                                            entryEditNextItemAfterEnd = nextAfterEnd;
                                                            entryEditItemLabel.set(seqName || "[Unnamed]");
                                                        })
                                                    })
                                                ]
                                            }),
                                        ]
                                    })
                                }),
                                // "Current Sequence" box (fills remaining height)
                                box({
                                    text: compute(textColour, c => `${c}Current Sequence`),
                                    width: "1w",
                                    height: "1w",
                                    padding: 6,
                                    content: flexible({
                                        direction: LayoutDirection.Vertical,
                                        content: [
                                            // Name
                                            label({ text: compute(textColour, c => `${c}Name`) }),
                                            textbox({
                                                text: editedSequenceName,
                                                onChange: v => editedSequenceName.set(v),
                                                width: 370,
                                                    maxLength: 64,
                                                    disabled: isPlaying
                                            }),
                                            // Lock checkboxes: [] Lock []
                                            // Positioned to align with Time (x≈38) and Delay (x≈174) columns
                                            flexible({
                                                direction: LayoutDirection.Horizontal,
                                                content: [
                                                    label({ text: "", width: 70 }),
                                                    checkbox({ text: "", isChecked: lockOnTime, width: 15, disabled: isPlaying, onChange: v => lockOnTime.set(v) }),
                                                    label({ text: compute(textColour, c => `${c}Lock`), width: 35 }),
                                                    checkbox({ text: "", isChecked: compute(lockOnTime, v => !v), width: 22, disabled: isPlaying, onChange: v => lockOnTime.set(!v) })
                                                ]
                                            }),
                                            // Sequence entries listview (fills remaining height)
                                            // Red in delete mode; blue for currently playing row; topaz for locked column
                                            listview({
                                                visibility: compute(isExpandedView, v => v ? "none" : "visible"),
                                                items: compute(editedSequenceItems, playingRelTick, isDeleteMode, playStartRow, lockOnTime,
                                                    (items, relTick, delMode, startRow, lockIsTime) => {
                                                        const offset = startRow > 0 && startRow < items.length
                                                            ? items[startRow].cumulativeTimeTillLight - items[startRow].timeTillLight
                                                            : 0;
                                                        return items.map((entry, i) => {
                                                            const adjCum = entry.cumulativeTimeTillLight - offset;
                                                            const adjNext = (i < items.length - 1) ? items[i + 1].cumulativeTimeTillLight - offset : Infinity;
                                                            const isRowPlaying = relTick >= 0
                                                                && i >= startRow
                                                                && relTick >= adjCum
                                                                && relTick < adjNext;
                                                            const color = relTick >= 0 ? (isRowPlaying ? "{BABYBLUE}" : "") : (delMode ? "{RED}" : "{WHITE}");
                                                            const timeColor = color || (lockIsTime ? "{TOPAZ}" : "");
                                                            const delayColor = color || (!lockIsTime ? "{TOPAZ}" : "");
                                                            const typeLabel = entry.itemType === SequenceItemType.Sequence ? "Seq."
                                                                : entry.itemType === SequenceItemType.Shell ? "Shell"
                                                                : entry.itemType === SequenceItemType.GroundEffect ? "G.E."
                                                                : "Unknown";
                                                            return [
                                                                isRowPlaying ? ">" : "",
                                                                `${color}${String(i + 1)}`,
                                                                `${timeColor}${ticksToShortTimeString(entry.cumulativeTimeTillLight)}`,
                                                                `${delayColor}${ticksToShortTimeString(entry.timeTillLight)}`,
                                                                `${color}${(() => { const s = entry.itemType === SequenceItemType.Sequence ? resolveSequence(entry.itemName) : undefined; return s ? ticksToShortTimeString(s.getEndCumulativeTime(resolveSequence)) : "-"; })()}`,
                                                                `${color}${entry.itemName || "[Unnamed]"}`,
                                                                `${color}${entry.GetSpriteString()}`,
                                                                `${color}${typeLabel}`,
                                                                `${color}${getLaunchSiteName(entry)}`,
                                                                `${color}${entry.itemType === SequenceItemType.Sequence ? (entry.nextItemAfterEnd ? "end" : "start") : ""}`
                                                            ];
                                                        });
                                                    }),
                                                columns: [
                                                    { header: "", width: 14 },
                                                    { header: "{WHITE}#", width: 24 },
                                                    { header: "{WHITE}Time", width: 72 },
                                                    { header: "{WHITE}Delay", width: 55 },
                                                    { header: "{WHITE}Duration", width: 54 },
                                                    { header: "{WHITE}Name", width: "1w" },
                                                    { header: "{WHITE}Icons", width: 64 },
                                                    { header: "{WHITE}Type", width: 38 },
                                                    { header: "{WHITE}Launch Site", width: 80 },
                                                    { header: "{WHITE}Next after", width: 72 }
                                                ],
                                                height: "1w",
                                                canSelect: true,
                                                selectedCell: compute(selectedEntryIndex, i => i === undefined ? null : { row: i, column: 0 }),
                                                onClick: row => {
                                                    if (isPlaying.get()) return;
                                                    if (isDeleteMode.get()) {
                                                        onDeleteEntryClick(row);
                                                        selectedEntryIndex.set(undefined);
                                                        entryEditIndexText.set("");
                                                    } else {
                                                        selectedEntryIndex.set(row);
                                                        entryEditIndexText.set(String(row + 1));
                                                    }
                                                }
                                            }),
                                            // Expanded (flattened) listview — only fireworks, sorted by time
                                            listview({
                                                visibility: compute(isExpandedView, v => v ? "visible" : "none"),
                                                items: compute(editedSequenceItems, playingRelTick,
                                                    (items, relTick) => {
                                                        const flat = computeFlattenedDisplayItems(items);
                                                        return flat.map((entry, i) => {
                                                            const adjCum = entry.cumulativeTimeTillLight;
                                                            const adjNext = (i < flat.length - 1) ? flat[i + 1].cumulativeTimeTillLight : Infinity;
                                                            const playing = relTick >= 0 && relTick >= adjCum && relTick < adjNext;
                                                            const color = playing ? "{BABYBLUE}" : "{WHITE}";
                                                            const typeLabel = entry.itemType === SequenceItemType.Shell ? "Shell"
                                                                : entry.itemType === SequenceItemType.GroundEffect ? "G.E."
                                                                : "Unknown";
                                                            return [
                                                                playing ? ">" : "",
                                                                `${color}${String(i + 1)}`,
                                                                `${color}${ticksToShortTimeString(entry.cumulativeTimeTillLight)}`,
                                                                `${color}${entry.itemName || "[Unnamed]"}`,
                                                                `${color}${entry.GetSpriteString()}`,
                                                                `${color}${typeLabel}`,
                                                                `${color}${getLaunchSiteName(entry)}`
                                                            ];
                                                        });
                                                    }),
                                                columns: [
                                                    { header: "", width: 14 },
                                                    { header: "{WHITE}#", width: 24 },
                                                    { header: "{WHITE}Time", width: 72 },
                                                    { header: "{WHITE}Name", width: "1w" },
                                                    { header: "{WHITE}Icons", width: "1w" },
                                                    { header: "{WHITE}Type", width: 44 },
                                                    { header: "{WHITE}Launch Site", width: "1w" }
                                                ],
                                                height: "1w",
                                                canSelect: true,
                                                selectedCell: compute(selectedExpandedIndex, i => i === undefined ? null : { row: i, column: 0 }),
                                                onClick: row => {
                                                    const items = editedSequenceItems.get();
                                                    const withParent: { parentIndex: number, cumTime: number }[] = [];
                                                    for (let i = 0; i < items.length; i++) {
                                                        const shots = flattenScheduledEntryToShots(items[i]);
                                                        for (const shot of shots) {
                                                            withParent.push({ parentIndex: i, cumTime: shot.cumulativeTimeTillLight });
                                                        }
                                                    }
                                                    withParent.sort((a, b) => a.cumTime - b.cumTime);
                                                    const clicked = withParent[row];
                                                    if (!clicked) return;
                                                    const parentIdx = clicked.parentIndex;
                                                    selectedEntryIndex.set(parentIdx);
                                                    selectedExpandedIndex.set(row);
                                                    entryEditIndexText.set(String(parentIdx + 1));
                                                }
                                            }),
                                            // Delete mode / Play controls row
                                            flexible({
                                                direction: LayoutDirection.Horizontal,
                                                height: 20,
                                                content: [
                                                    button({
                                                        text: compute(isDeleteMode, textColour, (d, c) => d ? `${c}Delete Mode: {RED}ON` : `${c}Delete Mode: OFF`),
                                                        width: 115,
                                                        isPressed: isDeleteMode,
                                                        disabled: isPlaying,
                                                        onClick: () => isDeleteMode.set(!isDeleteMode.get())
                                                    }),
                                                    button({
                                                        text: compute(isExpandedView, textColour, (expanded, c) => `${c}${expanded ? "{RED}Compact Sub-Sequences" : "Expand Sub-Sequences"}`),
                                                        width: 140,
                                                        isPressed: isExpandedView,
                                                        disabled: isPlaying,
                                                        onClick: () => {
                                                            isExpandedView.set(!isExpandedView.get());
                                                            selectedEntryIndex.set(undefined);
                                                            selectedExpandedIndex.set(undefined);
                                                        }
                                                    }),
                                                    label({ text: "", width: "1w" }),
                                                    button({ text: compute(textColour, c => `${c}Play from start`), width: 95, disabled: isPlaying, onClick: onPlaySequenceClick }),
                                                    button({ text: compute(textColour, c => `${c}Play from index`), width: 95, disabled: isPlaying, onClick: onPlayFromIndexClick }),
                                                    button({ text: compute(textColour, c => `${c}Stop`), width: 40, onClick: onStopClick })
                                                ]
                                            }),
                                            // Sequence list actions
                                            flexible({
                                                height: 20,
                                                direction: LayoutDirection.Horizontal,
                                                content: [
                                                    button({ text: compute(textColour, c => `${c}Add Sequence`), width: 110, disabled: isPlaying, onClick: addOrUpdateSequence }),
                                                    button({ text: compute(textColour, c => `${c}New`), width: 50, disabled: isPlaying, onClick: resetSequenceEditor }),
                                                    button({ text: compute(textColour, c => `${c}Delete Sequence`), width: 110, disabled: isPlaying, onClick: deleteSelectedSequence }),
                                                    label({ text: "", width: "1w" }),
                                                    button({ text: compute(textColour, c => `${c}Debugger`), width: 70, onClick: openDebuggerWindow })
                                                ]
                                            })
                                        ]
                                    })
                                })
                            ]
                        }),
                        // ---- Right: Sequences list box ----
                        box({
                            text: compute(textColour, c => `${c}Defined Sequences`),
                            width: 160,
                            height: "1w",
                            padding: 6,
                            content: flexible({
                                direction: LayoutDirection.Vertical,
                                content: [
                                    textbox({
                                        text: sequencesSearch,
                                        onChange: value => sequencesSearch.set(value),
                                        width: 140,
                                        maxLength: 64
                                    }),
                                    listview({
                                        items: compute(filteredSequences, seqs => seqs.map(s => ["{WHITE}" + s.name])),
                                        columns: [{ header: "{WHITE}Name", width: "1w" }],
                                        width: 140,
                                        height: "1w",
                                        canSelect: true,
                                        selectedCell: compute(selectedSequenceIndex, filteredSequences, () => {
                                            const idx = selectedSequenceIndex.get();
                                            if (idx === undefined) return null;
                                            const name = definedSequences.get()[idx]?.name;
                                            if (!name) return null;
                                            const row = filteredSequences.get().findIndex(s => s.name === name);
                                            return row >= 0 ? { row, column: 0 } : null;
                                        }),
                                        onClick: row => {
                                            if (isPlaying.get()) return;
                                            const seq = filteredSequences.get()[row];
                                            if (!seq) return;
                                            const fullIndex = definedSequences.get().findIndex(s => s.name === seq.name);
                                            if (fullIndex >= 0) loadSelectedSequence(fullIndex);
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
