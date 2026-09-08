import {
    box, checkbox, compute, dropdown, flexible, groupbox, label, LayoutDirection, listview, store, textbox, OpenWindow, Colour
} from "openrct2-flexui";
import { numberInputSpinner } from "../numberInputSpinner";
import { colouredButton } from "../ColouredButton";
import {
    getSequenceList,
    getSequenceMap,
    getShotShow,
    getShotShowMap,
    setShotShow,
    setEditShow,
    launchSites,
    launchSitesRevision,
    definedShows
} from "../../fireworks/persistent";
import { getMainWindowPosition, closeMainWindow } from "../windowState";
import { openPopupWindow } from "../popupWindows";
import { StartAllEnabledShowProgrammes, StopShowProgramme, StartShowSequence } from "../../fireworks/showPlayer";
import { showFireworksShowPlayingWindow } from "../fireworksShowPlayingWindow";
import { buildValidationContext, formatValidationIssues, ValidationIssue } from "../../fireworks/usageChecker";
import { InGameDate, InGameRecurringPeriod, Show, ShowTrigger, ShowTriggerKind, showTriggerToParkData } from "../../fireworks/structures/Show";
import { cloneShow } from "../../fireworks/cloneHelpers";
import { beginPaletteTestUntilIdle } from "../../fireworks/testPaletteMode";
import { openDebuggerWindow } from "../debuggerWindow";
import { SerializedShowEditorState } from "../../fireworks/parkStorage";
import { confirmDiscardChanges } from "../discardChangesWindow";

// ---- Schedule constants & helpers ----

const FRAMES_PER_DAY = 528;         // ~13.2 s × 40 fps
const DAYS_PER_MONTH = 31;
const MONTHS_PER_YEAR = 8;          // March … October (game skips Jan, Feb, Nov, Dec)
const INGAME_MONTH_NAMES = ["March", "April", "May", "June", "July", "August", "September", "October"];

function ordinalSuffix(n: number): string
{
    const rem100 = Math.abs(n) % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
    switch (Math.abs(n) % 10)
    {
        case 1: return `${n}st`;
        case 2: return `${n}nd`;
        case 3: return `${n}rd`;
        default: return `${n}th`;
    }
}

function triggerTypeLabel(trigger: ShowTrigger): string
{
    switch (trigger.kind)
    {
        case ShowTriggerKind.RealTimeInterval: return "Real-time";
        case ShowTriggerKind.InGameRecurring:  return "Recurring";
        case ShowTriggerKind.InGameAnnualDates: return "Annual dates";
    }
}

function triggerDetailsLabel(trigger: ShowTrigger): string
{
    switch (trigger.kind)
    {
        case ShowTriggerKind.RealTimeInterval:
            return `Every ${trigger.intervalMinutes} min`;
        case ShowTriggerKind.InGameRecurring:
            if (trigger.period === InGameRecurringPeriod.Daily)
                return "Every day";
            if (trigger.period === InGameRecurringPeriod.Monthly)
                return `${ordinalSuffix(trigger.dayOfMonth ?? 1)} of each month`;
            return `Every ${INGAME_MONTH_NAMES[trigger.month ?? 0] ?? "?"} ${ordinalSuffix(trigger.dayOfMonth ?? 1)}`;
        case ShowTriggerKind.InGameAnnualDates:
            if (trigger.dates.length === 0) return "(no dates)";
            return trigger.dates.map(d => `${INGAME_MONTH_NAMES[d.month] ?? "?"} ${d.day}`).join(", ");
    }
}

function minIntervalFramesFor(trigger: ShowTrigger): number
{
    switch (trigger.kind)
    {
        case ShowTriggerKind.RealTimeInterval:
            return trigger.intervalMinutes * 60 * 40;
        case ShowTriggerKind.InGameRecurring:
            if (trigger.period === InGameRecurringPeriod.Daily)   return FRAMES_PER_DAY;
            if (trigger.period === InGameRecurringPeriod.Monthly) return DAYS_PER_MONTH * FRAMES_PER_DAY;
            return MONTHS_PER_YEAR * DAYS_PER_MONTH * FRAMES_PER_DAY;
        case ShowTriggerKind.InGameAnnualDates: {
            const yearDays = MONTHS_PER_YEAR * DAYS_PER_MONTH;
            if (trigger.dates.length === 0) return 0;
            if (trigger.dates.length === 1) return yearDays * FRAMES_PER_DAY;
            const positions = trigger.dates
                .map(d => d.month * DAYS_PER_MONTH + (d.day - 1))
                .sort((a, b) => a - b);
            let minGap = yearDays - positions[positions.length - 1] + positions[0]; // wrap gap
            for (let i = 1; i < positions.length; i++)
            {
                const gap = positions[i] - positions[i - 1];
                if (gap < minGap) minGap = gap;
            }
            return Math.max(0, minGap) * FRAMES_PER_DAY;
        }
    }
}

function getSelectedSequenceDurationFrames(): number
{
    const seqName = selectedSequenceName.get().trim();
    if (!seqName) return 0;
    const seq = getSequenceMap().get(seqName);
    if (!seq) return 0;
    return seq.getEndCumulativeTime(name => getSequenceMap().get(name));
}

function triggerValidationWarning(trigger: ShowTrigger, durationFrames: number): string
{
    if (durationFrames <= 0) return "";
    const intervalFrames = minIntervalFramesFor(trigger);
    if (intervalFrames >= durationFrames) return "";
    const intSec = (intervalFrames / 40).toFixed(1);
    const durSec = (durationFrames / 40).toFixed(1);
    return `Warning: interval ~${intSec}s < sequence duration ~${durSec}s`;
}

// ---- Module-level stores ----

const DEFAULT_SHOW_EDITOR = {
    name: "",
    sequenceName: "",
    launchSiteName: "",
    musicEnabled: false,
    musicRideId: 0,
    interrupt: true,
    enabled: false,
    trigger: undefined as ShowTrigger | undefined,
    anouncement1: "",
    anouncement2: "",
    selectedIndex: undefined as number | undefined
};

const selectedShowIndex = store<number | undefined>(DEFAULT_SHOW_EDITOR.selectedIndex);
const editedShowName = store(DEFAULT_SHOW_EDITOR.name);
const selectedSequenceName = store(DEFAULT_SHOW_EDITOR.sequenceName);
const selectedLaunchSiteName = store(DEFAULT_SHOW_EDITOR.launchSiteName);
const musicEnabled = store(DEFAULT_SHOW_EDITOR.musicEnabled);
const musicRideId = store(DEFAULT_SHOW_EDITOR.musicRideId);
const ridesRevision = store(0);
const interruptStore = store(DEFAULT_SHOW_EDITOR.interrupt);
const enabledStore = store(DEFAULT_SHOW_EDITOR.enabled);

// Trigger for the currently edited show (only one allowed)
const currentTrigger = store<ShowTrigger | undefined>(DEFAULT_SHOW_EDITOR.trigger);
const triggersRevision = store(0);

// Announcements for the currently edited show
const anouncement1Store = store(DEFAULT_SHOW_EDITOR.anouncement1);
const anouncement2Store = store(DEFAULT_SHOW_EDITOR.anouncement2);

// ---- Helpers ----

function getSortedRides(): { id: number; name: string }[]
{
    if (typeof map === "undefined") return [];
    return [...map.rides]
        .filter(r => r.name.trim() !== "")
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(r => ({ id: r.id, name: r.name }));
}

export function refreshShowTabRides(): void
{
    ridesRevision.set(ridesRevision.get() + 1);
}

function getFallbackShowName(): string
{
    return `Show ${definedShows.get().length + 1}`;
}

export function getShowEditorState(): SerializedShowEditorState {
    const show = new Show(
        editedShowName.get(),
        selectedSequenceName.get().trim(),
        interruptStore.get(),
        anouncement1Store.get(),
        anouncement2Store.get(),
        currentTrigger.get(),
        musicEnabled.get(),
        musicRideId.get(),
        selectedLaunchSiteName.get().trim() || undefined,
        enabledStore.get()
    );
    return { show: show.toParkData() };
}

export function restoreShowEditorState(state?: SerializedShowEditorState): void {
    if (!state || !state.show) {
        resetShowEditor();
        return;
    }
    const show = Show.fromParkData(state.show);
    selectedShowIndex.set(DEFAULT_SHOW_EDITOR.selectedIndex);
    editedShowName.set(show.name);
    selectedSequenceName.set(show.sequence);
    selectedLaunchSiteName.set(show.launchTerrain ?? DEFAULT_SHOW_EDITOR.launchSiteName);
    musicEnabled.set(show.music);
    musicRideId.set(show.musicRideID);
    interruptStore.set(show.interruptWhenTooManyParticles);
    enabledStore.set(show.enabled);
    currentTrigger.set(show.trigger);
    triggersRevision.set(triggersRevision.get() + 1);
    anouncement1Store.set(show.anouncement1);
    anouncement2Store.set(show.anouncement2);

    if (show.name || show.sequence || show.trigger) {
        setEditShow(cloneShow(show));
    } else {
        setEditShow(undefined);
    }
}

export function resetShowEditor(): void
{
    editedShowName.set(DEFAULT_SHOW_EDITOR.name);
    selectedSequenceName.set(DEFAULT_SHOW_EDITOR.sequenceName);
    selectedLaunchSiteName.set(DEFAULT_SHOW_EDITOR.launchSiteName);
    musicEnabled.set(DEFAULT_SHOW_EDITOR.musicEnabled);
    musicRideId.set(DEFAULT_SHOW_EDITOR.musicRideId);
    interruptStore.set(DEFAULT_SHOW_EDITOR.interrupt);
    enabledStore.set(DEFAULT_SHOW_EDITOR.enabled);
    selectedShowIndex.set(DEFAULT_SHOW_EDITOR.selectedIndex);
    currentTrigger.set(DEFAULT_SHOW_EDITOR.trigger);
    triggersRevision.set(triggersRevision.get() + 1);
    anouncement1Store.set(DEFAULT_SHOW_EDITOR.anouncement1);
    anouncement2Store.set(DEFAULT_SHOW_EDITOR.anouncement2);
    setEditShow(undefined);
}

export function isShowEditorDirty(): boolean {
    const currentName = editedShowName.get().trim();
    const currentSequence = selectedSequenceName.get().trim();
    const currentSite = selectedLaunchSiteName.get().trim();
    const currentMusicEnabled = musicEnabled.get();
    const currentMusicRideId = musicRideId.get();
    const currentInterrupt = interruptStore.get();
    const currentTrig = currentTrigger.get();
    const currentAnouncement1 = anouncement1Store.get().trim();
    const currentAnouncement2 = anouncement2Store.get().trim();

    if (!currentName) {
        return (
            currentSequence !== DEFAULT_SHOW_EDITOR.sequenceName ||
            currentSite !== DEFAULT_SHOW_EDITOR.launchSiteName ||
            currentMusicEnabled !== DEFAULT_SHOW_EDITOR.musicEnabled ||
            currentMusicRideId !== DEFAULT_SHOW_EDITOR.musicRideId ||
            currentInterrupt !== DEFAULT_SHOW_EDITOR.interrupt ||
            currentTrig !== DEFAULT_SHOW_EDITOR.trigger ||
            currentAnouncement1 !== DEFAULT_SHOW_EDITOR.anouncement1 ||
            currentAnouncement2 !== DEFAULT_SHOW_EDITOR.anouncement2
        );
    }

    const saved = getShotShowMap().get(currentName);
    if (!saved) {
        return true;
    }

    const savedSite = saved.launchTerrain ?? "";
    const currentTriggerData = currentTrig ? showTriggerToParkData(currentTrig) : null;
    const savedTriggerData = saved.trigger ? showTriggerToParkData(saved.trigger) : null;

    return (
        saved.sequence !== currentSequence ||
        savedSite !== currentSite ||
        saved.music !== currentMusicEnabled ||
        saved.musicRideID !== currentMusicRideId ||
        saved.interruptWhenTooManyParticles !== currentInterrupt ||
        saved.anouncement1 !== currentAnouncement1 ||
        saved.anouncement2 !== currentAnouncement2 ||
        JSON.stringify(savedTriggerData) !== JSON.stringify(currentTriggerData)
    );
}

function loadSelectedShow(index: number): void
{
    const show = definedShows.get()[index];
    if (!show) return;

    selectedShowIndex.set(index);
    editedShowName.set(show.name);
    selectedSequenceName.set(show.sequence);
    selectedLaunchSiteName.set(show.launchTerrain ?? "");
    musicEnabled.set(show.music);
    musicRideId.set(show.musicRideID);
    interruptStore.set(show.interruptWhenTooManyParticles);
    enabledStore.set(show.enabled);
    currentTrigger.set(show.trigger);
    triggersRevision.set(triggersRevision.get() + 1);
    anouncement1Store.set(show.anouncement1);
    anouncement2Store.set(show.anouncement2);
    setEditShow(show);
}

function addOrUpdateShow(): void
{
    const trimmedName = editedShowName.get().trim();
    const nextName = trimmedName || getFallbackShowName();

    const updated = [...getShotShow().map(cloneShow)];
    let existingIndex = -1;
    for (let i = 0; i < updated.length; i++)
    {
        if (updated[i].name === nextName)
        {
            existingIndex = i;
            break;
        }
    }

    const trigger = currentTrigger.get();
    const existingEnabled = existingIndex >= 0 ? getShotShow()[existingIndex].enabled : false;
    const nextShow = new Show(
        nextName,
        selectedSequenceName.get().trim(),
        interruptStore.get(),
        anouncement1Store.get(),
        anouncement2Store.get(),
        trigger,
        musicEnabled.get(),
        musicRideId.get(),
        selectedLaunchSiteName.get().trim() || undefined,
        existingEnabled && trigger !== undefined
    );

    if (existingIndex >= 0)
    {
        updated[existingIndex] = nextShow;
        selectedShowIndex.set(existingIndex);
    }
    else
    {
        updated.push(nextShow);
        selectedShowIndex.set(updated.length - 1);
    }

    setShotShow(updated.map(cloneShow));
    editedShowName.set(nextName);
}

function deleteSelectedShow(): void
{
    const selectedIndex = selectedShowIndex.get();
    if (typeof selectedIndex !== "number") return;

    const updated = getShotShow().filter((_, i) => i !== selectedIndex).map(cloneShow);
    setShotShow(updated.map(cloneShow));
    resetShowEditor();
}

// Tests the show exactly as currently entered in the editor (no need to add/update first).
function onTestShowClick(): void
{
    const trimmedName = editedShowName.get().trim();
    const show = new Show(
        trimmedName,
        selectedSequenceName.get().trim(),
        interruptStore.get(),
        anouncement1Store.get(),
        anouncement2Store.get(),
        currentTrigger.get(),
        musicEnabled.get(),
        musicRideId.get(),
        selectedLaunchSiteName.get().trim() || undefined,
        false
    );
    // Validate show before testing; warn instead of playing if invalid
    const ctx = buildValidationContext();
    const issues: ValidationIssue[] = [];
    if (!show.isValid(ctx, issues, `Show "${trimmedName}"`))
    {
        if (typeof ui !== "undefined" && typeof ui.showError === "function")
        {
            ui.showError("Invalid show", formatValidationIssues(issues));
        }
        return;
    }
    StartShowSequence(show);
    beginPaletteTestUntilIdle();
}

function openSequenceSelectionWindow(): void
{
    const search = store("");
    const filteredSequences = compute(search, query => {
        const norm = query.trim().toLowerCase();
        return getSequenceList().filter(seq => {
            const n = seq.name.trim();
            return n && (!norm || n.toLowerCase().indexOf(norm) === 0);
        });
    });

    let handle: OpenWindow | undefined;
    const mainPos = getMainWindowPosition();
    const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;
    handle = openPopupWindow("show-select-sequence", {
        title: "Select Sequence for Show",
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
                items: compute(filteredSequences, seqs => seqs.map(s => [s.name])),
                columns: [{ header: "Name", width: "1w" }],
                width: 260,
                height: 150,
                canSelect: true,
                onClick: row => {
                    const selected = filteredSequences.get()[row];
                    if (!selected) return;
                    selectedSequenceName.set(selected.name);
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

function openLaunchSiteSelectionWindow(): void
{
    const search = store("");
    const filteredSites = compute(search, launchSitesRevision, () => {
        const norm = search.get().trim().toLowerCase();
        return launchSites.filter(site => {
            const n = site.name.trim();
            return n && (!norm || n.toLowerCase().indexOf(norm) === 0);
        });
    });

    let handle: OpenWindow | undefined;
    const mainPos = getMainWindowPosition();
    const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;
    handle = openPopupWindow("show-select-location", {
        title: "Select News Message Position",
        width: 300,
        height: 260,
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
                items: compute(filteredSites, sites => sites.map(s => [s.name])),
                columns: [{ header: "Name", width: "1w" }],
                width: 260,
                height: 150,
                canSelect: true,
                onClick: row => {
                    const site = filteredSites.get()[row];
                    if (!site) return;
                    selectedLaunchSiteName.set(site.name);
                    handle?.close();
                }
            }),
            flexible({
                direction: LayoutDirection.Horizontal,
                content: [
                    colouredButton({
                        text: "Clear",
                        width: 70,
                        height: 22,
                        colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
                        onClick: () => {
                            selectedLaunchSiteName.set("");
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
            })
        ]
    });
}

function clearCurrentTrigger(): void
{
    currentTrigger.set(undefined);
    triggersRevision.set(triggersRevision.get() + 1);
    enabledStore.set(false); // can't be enabled without a trigger
}

function openAddTriggerWindow(): void
{
    const TYPE_LABELS = ["Real-time interval", "In-game recurring", "In-game annual dates"];
    const PERIOD_LABELS = ["Daily", "Monthly", "Yearly"];
    const PERIOD_VALUES = [InGameRecurringPeriod.Daily, InGameRecurringPeriod.Monthly, InGameRecurringPeriod.Yearly];

    const typeIndex     = store(0);
    const intervalMins  = store(15);
    const periodIndex   = store(1);  // Monthly default
    const dayOfMonth    = store(1);
    const monthIndex    = store(0);
    const pendingDates  = store<InGameDate[]>([]);
    const pendingDatesRevision = store(0);
    const pendingDateMonth = store(0);
    const pendingDateDay   = store(1);
    const pendingDateSel   = store<number | undefined>(undefined);
    const warningText   = store("");

    const isRealTimeVisible = compute(typeIndex, t => t === 0 ? "visible" as const : "none" as const);
    const isRecurringVisible = compute(typeIndex, t => t === 1 ? "visible" as const : "none" as const);
    const isAnnualVisible = compute(typeIndex, t => t === 2 ? "visible" as const : "none" as const);

    const GROUP_HEIGHTS = [180, 203, 255]; // Real-time interval, In-game recurring, In-game annual dates

    function resizePopupForType(): void
    {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const native = (handle as any)?.D;
        if (!native) return;
        const height = GROUP_HEIGHTS[typeIndex.get()];
        native.minHeight = height;
        native.maxHeight = height;
        native.height = height;
    }

    function buildTrigger(): ShowTrigger
    {
        const t = typeIndex.get();
        if (t === 0)
        {
            return { kind: ShowTriggerKind.RealTimeInterval, intervalMinutes: Math.max(1, intervalMins.get()) };
        }
        if (t === 1)
        {
            return {
                kind: ShowTriggerKind.InGameRecurring,
                period: PERIOD_VALUES[periodIndex.get()] ?? InGameRecurringPeriod.Daily,
                dayOfMonth: dayOfMonth.get(),
                month: monthIndex.get()
            };
        }
        return { kind: ShowTriggerKind.InGameAnnualDates, dates: [...pendingDates.get()] };
    }

    function refreshWarning(): void
    {
        const trigger = buildTrigger();
        const duration = getSelectedSequenceDurationFrames();
        warningText.set(triggerValidationWarning(trigger, duration));
    }

    function addPendingDate(): void
    {
        const month = pendingDateMonth.get();
        const day   = Math.min(Math.max(1, pendingDateDay.get()), DAYS_PER_MONTH);
        const existing = pendingDates.get();
        if (existing.some(d => d.month === month && d.day === day)) return;
        pendingDates.set([...existing, { month, day }].sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day));
        pendingDatesRevision.set(pendingDatesRevision.get() + 1);
        pendingDateSel.set(undefined);
        refreshWarning();
    }

    function removePendingDate(): void
    {
        const sel = pendingDateSel.get();
        if (typeof sel !== "number") return;
        const updated = pendingDates.get().filter((_, i) => i !== sel);
        pendingDates.set(updated);
        pendingDateSel.set(undefined);
        pendingDatesRevision.set(pendingDatesRevision.get() + 1);
        refreshWarning();
    }

    let handle: OpenWindow | undefined;
    const mainPos = getMainWindowPosition();
    const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;

    handle = openPopupWindow("show-set-trigger", {
        title: "Set Schedule Trigger",
        width: 340,
        height: 250,
        padding: 8,
        position,
        direction: LayoutDirection.Vertical,
        content: [
            // ---- Type ----
            label({ text: "Trigger type" }),
            dropdown({
                items: TYPE_LABELS,
                selectedIndex: typeIndex,
                width: "1w",
                onChange: idx => { typeIndex.set(idx); refreshWarning(); resizePopupForType(); }
            }),
            label({ text: "" }),

            // ---- Real-time interval ----
            groupbox({
                text: "Real-time interval",
                visibility: isRealTimeVisible,
                height: compute(typeIndex, t => t === 0 ? 44 : 0),
                content: [
                    flexible({
                        direction: LayoutDirection.Horizontal,
                        content: [
                            numberInputSpinner({
                                labelText: "Every",
                                labelWidth: 40,
                                valueStore: intervalMins,
                                step: 1,
                                minimum: 1,
                                maximum: 100,
                                width: 70,
                                visibility: isRealTimeVisible,
                                onChange: v => { intervalMins.set(v); refreshWarning(); }
                            }),
                            label({ text: "real minutes", visibility: isRealTimeVisible })
                        ]
                    })
                ]
            }),

            // ---- In-game recurring ----
            groupbox({
                text: "In-game recurring",
                visibility: isRecurringVisible,
                height: compute(typeIndex, t => t === 1 ? 70 : 0),
                content: [
                    flexible({
                        direction: LayoutDirection.Horizontal,
                        content: [
                            label({ text: "Period:", width: 65, visibility: isRecurringVisible }),
                            dropdown({
                                items: PERIOD_LABELS,
                                selectedIndex: periodIndex,
                                width: "1w",
                                visibility: isRecurringVisible,
                                onChange: idx => { periodIndex.set(idx); refreshWarning(); }
                            })
                        ]
                    }),
                    flexible({
                        direction: LayoutDirection.Horizontal,
                        content: [
                            numberInputSpinner({
                                labelText: "Day of month:",
                                labelWidth: 85,
                                valueStore: dayOfMonth,
                                step: 1,
                                minimum: 1,
                                maximum: DAYS_PER_MONTH,
                                width: 70,
                                visibility: isRecurringVisible,
                                disabled: compute(periodIndex, p => p === 0),
                                onChange: v => { dayOfMonth.set(v); refreshWarning(); }
                            })
                        ]
                    }),
                    flexible({
                        direction: LayoutDirection.Horizontal,
                        content: [
                            label({ text: "Month:", width: 65, visibility: isRecurringVisible }),
                            dropdown({
                                items: INGAME_MONTH_NAMES,
                                selectedIndex: monthIndex,
                                width: "1w",
                                visibility: isRecurringVisible,
                                disabled: compute(periodIndex, p => p !== 2),
                                onChange: idx => { monthIndex.set(idx); refreshWarning(); }
                            })
                        ]
                    })
                ]
            }),

            // ---- In-game annual dates ----
            groupbox({
                text: "In-game annual dates",
                visibility: isAnnualVisible,
                height: compute(typeIndex, t => t === 2 ? 120 : 0),
                content: [
                    flexible({
                        direction: LayoutDirection.Horizontal,
                        content: [
                            dropdown({
                                items: INGAME_MONTH_NAMES,
                                selectedIndex: pendingDateMonth,
                                width: "1w",
                                visibility: isAnnualVisible,
                                onChange: idx => pendingDateMonth.set(idx)
                            }),
                            numberInputSpinner({
                                valueStore: pendingDateDay,
                                step: 1,
                                minimum: 1,
                                maximum: DAYS_PER_MONTH,
                                width: 60,
                                visibility: isAnnualVisible,
                                onChange: v => pendingDateDay.set(v)
                            }),
                            colouredButton({
                                text: "{WHITE}Add Date",
                                width: 75,
                                height: 20,
                                colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen,
                                visibility: isAnnualVisible,
                                onClick: addPendingDate
                            })
                        ]
                    }),
                    listview({
                        items: compute(pendingDatesRevision, () =>
                            pendingDates.get().map(d => [INGAME_MONTH_NAMES[d.month] ?? "?", String(d.day)])
                        ),
                        columns: [{ header: "Month", width: 90 }, { header: "Day", width: "1w" }],
                        width: "1w",
                        height: 50,
                        canSelect: true,
                        visibility: isAnnualVisible,
                        selectedCell: compute(pendingDateSel, sel => sel === undefined ? null : { row: sel, column: 0 }),
                        onClick: row => pendingDateSel.set(row)
                    }),
                    colouredButton({
                        text: "{WHITE}Remove Date",
                        width: 100,
                        height: 20,
                        colour: Colour.SaturatedRed, colourDark: Colour.BordeauxRedDark, colourLight: Colour.BrightRed,
                        visibility: isAnnualVisible,
                        disabled: compute(pendingDateSel, s => s === undefined),
                        onClick: removePendingDate
                    })
                ]
            }),
            // ---- Warning ----
            label({ text: warningText, height: 20 }),

            // ---- Actions ----
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
                        text: "{WHITE}Set Trigger",
                        width: 100,
                        height: 22,
                        colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen,
                        onClick: () =>
                        {
                            const trigger = buildTrigger();
                            if (trigger.kind === ShowTriggerKind.InGameAnnualDates && trigger.dates.length === 0) return;
                            const warning = warningText.get();
                            if (warning)
                            {
                                if (typeof ui !== "undefined" && typeof ui.showError === "function")
                                    ui.showError("Invalid trigger", warning);
                                return;
                            }
                            currentTrigger.set(trigger);
                            triggersRevision.set(triggersRevision.get() + 1);
                            handle?.close();
                        }
                    }),
                    label({ text: "", width: "1w" })
                ]
            })
        ]
    });

    refreshWarning();
    resizePopupForType();
}

export function createShowTab()
{
    return [
        groupbox({
            text: "Show Editor",
            content: [
                flexible({
                    direction: LayoutDirection.Horizontal,
                    content: [
                        box({
                            width: 390,
                            height: "1w",
                            padding: 6,
                            text: "Current Show",
                            content: flexible({
                                direction: LayoutDirection.Vertical,
                                height: "1w",
                                content: [
                                    label({ text: "Name" }),
                                    textbox({
                                        text: editedShowName,
                                        onChange: value => editedShowName.set(value),
                                        width: 280,
                                        maxLength: 64
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            label({ text: compute(selectedSequenceName, name => `Sequence: ${name.trim() || "[None]"}`), width: "1w" }),
                                            colouredButton({
                                                text: "Select Sequence",
                                                width: 120,
                                                height: 20,
                                                colour: Colour.Black, colourDark: Colour.Black, colourLight: Colour.Grey,
                                                onClick: openSequenceSelectionWindow
                                            })
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            checkbox({
                                                text: "Sync with ride music:",
                                                isChecked: musicEnabled,
                                                width: 150,
                                                onChange: value => musicEnabled.set(value)
                                            }),
                                            dropdown({
                                                items: compute(ridesRevision, () => {
                                                    const rides = getSortedRides();
                                                    return rides.length > 0 ? rides.map(r => r.name) : ["[No rides]"];
                                                }),
                                                selectedIndex: compute(ridesRevision, musicRideId, () => {
                                                    const rides = getSortedRides();
                                                    const idx = rides.findIndex(r => r.id === musicRideId.get());
                                                    return Math.max(0, idx);
                                                }),
                                                onChange: idx => {
                                                    const rides = getSortedRides();
                                                    const ride = rides[idx];
                                                    if (ride) musicRideId.set(ride.id);
                                                },
                                                disabled: compute(musicEnabled, enabled => !enabled),
                                                width: "1w",
                                                autoDisable: "never"
                                            })
                                        ]
                                    }),
                                    checkbox({
                                        text: "Retry misfires due to particle limits and delay sequence",
                                        isChecked: interruptStore,
                                        onChange: value => interruptStore.set(value)
                                    }),
                                    checkbox({
                                        text: "Skip misfires due to particle limits and keep sync",
                                        isChecked: compute(interruptStore, v => !v),
                                        onChange: value => interruptStore.set(!value)
                                    }),
                                    // ---- Schedule / triggers ----
                                    groupbox({
                                        text: "Schedule",
                                        content: [
                                            listview({
                                                items: compute(triggersRevision, () => {
                                                    const t = currentTrigger.get();
                                                    return t ? [["{WHITE}" + triggerTypeLabel(t), "{WHITE}" + triggerDetailsLabel(t)]] : [];
                                                }),
                                                columns: [{ header: "{WHITE}Type", width: 90 }, { header: "{WHITE}Details", width: "1w" }],
                                                width: "1w",
                                                height: 35,
                                            }),
                                            flexible({
                                                direction: LayoutDirection.Horizontal,
                                                content: [
                                                    colouredButton({
                                                        text: "Set Trigger",
                                                        width: 90,
                                                        height: 20,
                                                        colour: Colour.Black, colourDark: Colour.Black, colourLight: Colour.Grey,
                                                        onClick: openAddTriggerWindow
                                                    }),
                                                    colouredButton({
                                                        text: "Clear",
                                                        width: 55,
                                                        height: 20,
                                                        colour: Colour.Black, colourDark: Colour.Black, colourLight: Colour.Grey,
                                                        disabled: compute(triggersRevision, () => currentTrigger.get() === undefined),
                                                        onClick: clearCurrentTrigger
                                                    }),
                                                    label({
                                                        text: compute(triggersRevision, selectedSequenceName, () => {
                                                            const t = currentTrigger.get();
                                                            if (!t) return "";
                                                            return triggerValidationWarning(t, getSelectedSequenceDurationFrames());
                                                        }),
                                                        width: "1w"
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    // ---- Announcements ----
                                    label({ text: "News announcement ~1 min before show (disabled if empty):" }),
                                    textbox({
                                        text: anouncement1Store,
                                        width: "1w",
                                        maxLength: 255,
                                        onChange: v => anouncement1Store.set(v)
                                    }),
                                    label({ text: "News announcement at start of show (disabled if empty):" }),
                                    textbox({
                                        text: anouncement2Store,
                                        width: "1w",
                                        maxLength: 255,
                                        onChange: v => anouncement2Store.set(v)
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            label({ text: compute(selectedLaunchSiteName, name => `Location for news message locator: ${name.trim() || "[None]"}`), width: "1w" })
                                        ]
                                    }),
                                    // ---- Test / Stop controls ----
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            colouredButton({
                                                text: "Select Location",
                                                width: 120,
                                                height: 22,
                                                colour: Colour.Black, colourDark: Colour.Black, colourLight: Colour.Grey,
                                                onClick: openLaunchSiteSelectionWindow
                                            }),
                                            label({ text: "", width: "1w" }),
                                            colouredButton({
                                                text: "{WHITE}Test Show",
                                                width: 80,
                                                height: 22,
                                                colour: Colour.LightOrange, colourDark: Colour.DarkOrange, colourLight: Colour.OrangeLight,
                                                onClick: onTestShowClick
                                            }),
                                            colouredButton({
                                                text: "{RED}Stop",
                                                width: 40,
                                                height: 22,
                                                colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
                                                onClick: () => StopShowProgramme()
                                            })
                                        ]
                                    }),
                                    // ---- Actions ----
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            colouredButton({
                                                text: compute(selectedShowIndex, idx => idx !== undefined ? "{WHITE}Update Show" : "{WHITE}Add Show"),
                                                width: 100,
                                                height: 22,
                                                colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen,
                                                onClick: addOrUpdateShow
                                            }),
                                            colouredButton({
                                                text: "{WHITE}New",
                                                width: 50,
                                                height: 22,
                                                colour: Colour.LightBlue, colourDark: Colour.DarkBlue, colourLight: Colour.IcyBlue,
                                                onClick: () => confirmDiscardChanges(isShowEditorDirty, resetShowEditor)
                                            }),
                                            colouredButton({
                                                text: "{WHITE}Delete Show",
                                                width: 90,
                                                height: 22,
                                                colour: Colour.SaturatedRed, colourDark: Colour.BordeauxRedDark, colourLight: Colour.BrightRed,
                                                onClick: deleteSelectedShow
                                            }),
                                            label({ text: "", width: "1w" }),
                                            colouredButton({ text: "{BLACK}Debugger", width: 70, height: 22,
                                                colour: Colour.Yellow, colourDark: Colour.DarkYellow, colourLight: Colour.BrightYellow,
                                                onClick: openDebuggerWindow })
                                        ]
                                    }),
                                ]
                            })
                        }),
                        flexible({
                        direction: LayoutDirection.Vertical,
                        content: [
                            box({
                                width: 190,
                                height: 200,
                                padding: 6,
                                text: "Defined Shows",
                                content: listview({
                                    items: compute(definedShows, shows => shows.map(s => ["{WHITE}" + s.name, s.enabled ? "{GREEN}Y" : ""])),
                                    columns: [{ header: "{WHITE}Name", width: "1w" }, { header: "{WHITE}On", width: 32 }],
                                    width: 170,
                                    height: "1w",
                                    canSelect: true,
                                    selectedCell: compute(selectedShowIndex, index => index === undefined ? null : { row: index, column: 0 }),
                                    onClick: row => confirmDiscardChanges(isShowEditorDirty, () => loadSelectedShow(row))
                                })
                            }),
                            colouredButton({
                                text: compute(selectedShowIndex, definedShows, (idx, shows) => {
                                    if (idx === undefined) return "Selected show {GREY}N/A";
                                    const show = shows[idx];
                                    if (!show) return "Selected show {GREY}N/A";
                                    return show.enabled ? "Selected show {GREEN}ENABLED" : "Selected show {RED}DISABLED";
                                }),
                                width: 206,
                                height: 22,
                                colour: Colour.Black, colourDark: Colour.Black, colourLight: Colour.Grey,
                                disabled: compute(selectedShowIndex, idx => idx === undefined),
                                onClick: () => {
                                    const idx = selectedShowIndex.get();
                                    if (typeof idx !== "number") return;
                                    const shows = getShotShow().map(cloneShow);
                                    const show = shows[idx];
                                    if (!show) return;
                                    const newEnabled = !show.enabled && show.trigger !== undefined;
                                    shows[idx] = new Show(
                                        show.name,
                                        show.sequence,
                                        show.interruptWhenTooManyParticles,
                                        show.anouncement1,
                                        show.anouncement2,
                                        show.trigger,
                                        show.music,
                                        show.musicRideID,
                                        show.launchTerrain,
                                        newEnabled
                                    );
                                    setShotShow(shows.map(cloneShow));
                                    enabledStore.set(newEnabled);
                                }
                            }),
                            colouredButton({
                                text: "{BLACK}Start Show Programme",
                                width: 206,
                                height: 44,
                                colour: Colour.SaturatedGreenLight, colourDark: Colour.SaturatedGreen, colourLight: Colour.BrightGreen,
                                onClick: () =>
                                {
                                    const enabledShows = getShotShow().filter(s => s.enabled && s.trigger);
                                    if (enabledShows.length === 0)
                                    {
                                        if (typeof ui !== "undefined" && typeof ui.showError === "function")
                                            ui.showError("No enabled shows", "Enable at least one show with a trigger to start the programme.");
                                        return;
                                    }
                                    const ctx = buildValidationContext();
                                    const issues: ValidationIssue[] = [];
                                    for (const show of enabledShows)
                                        show.isValid(ctx, issues, `Show "${show.name}"`);
                                    if (issues.length > 0)
                                    {
                                        if (typeof ui !== "undefined" && typeof ui.showError === "function")
                                            ui.showError("Invalid show configuration", formatValidationIssues(issues));
                                        return;
                                    }
                                    StartAllEnabledShowProgrammes();
                                    closeMainWindow();
                                    showFireworksShowPlayingWindow();
                                }
                            })
                        ]})
                    ]
                })
            ]
        })
    ];
}