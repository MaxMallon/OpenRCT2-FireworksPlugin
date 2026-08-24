import {
    box,
    button,
    checkbox,
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
    OpenWindow
} from "openrct2-flexui";
import {
    getSequenceList,
    getSequenceMap,
    getShotShow,
    setShotShow,
    setEditShow,
    launchSites,
    launchSitesRevision,
    definedShows
} from "../../fireworks/persistent";
import { getMainWindowPosition, closeMainWindow } from "../windowState";
import { StartShowProgramme, StopShowProgramme, StartShowSequence } from "../../fireworks/showPlayer";
import { showFireworksShowPlayingWindow } from "../fireworksShowPlayingWindow";
import { buildValidationContext, formatValidationIssues, ValidationIssue } from "../../fireworks/usageChecker";
import { InGameDate, InGameRecurringPeriod, Show, ShowTrigger, ShowTriggerKind } from "../../fireworks/structures/Show";
import { openDebuggerWindow } from "../debuggerWindow";

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

const selectedShowIndex = store<number | undefined>(undefined);
const editedShowName = store("");
const selectedSequenceName = store("");
const selectedLaunchSiteName = store("");
const musicEnabled = store(false);
const musicRideId = store(0);
const ridesRevision = store(0);
const interruptStore = store(true);

// Trigger for the currently edited show (only one allowed)
const currentTrigger = store<ShowTrigger | undefined>(undefined);
const triggersRevision = store(0);

// Announcements for the currently edited show
const anouncement1Store = store("");
const anouncement2Store = store("");

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

function cloneShow(source: Show): Show
{
    return new Show(
        source.name,
        source.sequence,
        source.interruptWhenTooManyParticles,
        source.anouncement1,
        source.anouncement2,
        source.trigger,
        source.music,
        source.musicRideID,
        source.launchTerrain
    );
}

function getFallbackShowName(): string
{
    return `Show ${definedShows.get().length + 1}`;
}

function resetShowEditor(): void
{
    editedShowName.set("");
    selectedSequenceName.set("");
    selectedLaunchSiteName.set("");
    musicEnabled.set(false);
    musicRideId.set(0);
    interruptStore.set(true);
    selectedShowIndex.set(undefined);
    currentTrigger.set(undefined);
    triggersRevision.set(triggersRevision.get() + 1);
    anouncement1Store.set("");
    anouncement2Store.set("");
    setEditShow(undefined);
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

    const nextShow = new Show(
        nextName,
        selectedSequenceName.get().trim(),
        interruptStore.get(),
        anouncement1Store.get(),
        anouncement2Store.get(),
        currentTrigger.get(),
        musicEnabled.get(),
        musicRideId.get(),
        selectedLaunchSiteName.get().trim() || undefined
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
    const selectorWindow = window({
        title: "Select Sequence",
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
            button({
                text: "Close",
                width: 70,
                onClick: () => handle?.close()
            })
        ]
    });
    handle = selectorWindow.open();
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
    const selectorWindow = window({
        title: "Select Launch Site",
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
                    button({
                        text: "Clear",
                        width: 70,
                        onClick: () => {
                            selectedLaunchSiteName.set("");
                            handle?.close();
                        }
                    }),
                    button({
                        text: "Close",
                        width: 70,
                        onClick: () => handle?.close()
                    })
                ]
            })
        ]
    });
    handle = selectorWindow.open();
}

function clearCurrentTrigger(): void
{
    currentTrigger.set(undefined);
    triggersRevision.set(triggersRevision.get() + 1);
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

    const popup = window({
        title: "Set Schedule Trigger",
        width: 340,
        height: 460,
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
                onChange: idx => { typeIndex.set(idx); refreshWarning(); }
            }),
            label({ text: "" }),

            // ---- Real-time interval ----
            groupbox({
                text: "Real-time interval",
                content: [
                    flexible({
                        direction: LayoutDirection.Horizontal,
                        content: [
                            label({ text: "Every", width: 40 }),
                            spinner({
                                value: intervalMins,
                                step: 1,
                                minimum: 1,
                                maximum: 9999,
                                width: 70,
                                disabled: compute(typeIndex, t => t !== 0),
                                onChange: v => { intervalMins.set(v); refreshWarning(); }
                            }),
                            label({ text: "real minutes" })
                        ]
                    })
                ]
            }),
            label({ text: "" }),

            // ---- In-game recurring ----
            groupbox({
                text: "In-game recurring",
                content: [
                    flexible({
                        direction: LayoutDirection.Horizontal,
                        content: [
                            label({ text: "Period:", width: 65 }),
                            dropdown({
                                items: PERIOD_LABELS,
                                selectedIndex: periodIndex,
                                width: "1w",
                                disabled: compute(typeIndex, t => t !== 1),
                                onChange: idx => { periodIndex.set(idx); refreshWarning(); }
                            })
                        ]
                    }),
                    flexible({
                        direction: LayoutDirection.Horizontal,
                        content: [
                            label({ text: "Day of month:", width: 85 }),
                            spinner({
                                value: dayOfMonth,
                                step: 1,
                                minimum: 1,
                                maximum: DAYS_PER_MONTH,
                                width: 70,
                                disabled: compute(typeIndex, periodIndex, (t, p) => t !== 1 || p === 0),
                                onChange: v => { dayOfMonth.set(v); refreshWarning(); }
                            })
                        ]
                    }),
                    flexible({
                        direction: LayoutDirection.Horizontal,
                        content: [
                            label({ text: "Month:", width: 65 }),
                            dropdown({
                                items: INGAME_MONTH_NAMES,
                                selectedIndex: monthIndex,
                                width: "1w",
                                disabled: compute(typeIndex, periodIndex, (t, p) => t !== 1 || p !== 2),
                                onChange: idx => { monthIndex.set(idx); refreshWarning(); }
                            })
                        ]
                    })
                ]
            }),
            label({ text: "" }),

            // ---- In-game annual dates ----
            groupbox({
                text: "In-game annual dates",
                content: [
                    flexible({
                        direction: LayoutDirection.Horizontal,
                        content: [
                            dropdown({
                                items: INGAME_MONTH_NAMES,
                                selectedIndex: pendingDateMonth,
                                width: "1w",
                                disabled: compute(typeIndex, t => t !== 2),
                                onChange: idx => pendingDateMonth.set(idx)
                            }),
                            spinner({
                                value: pendingDateDay,
                                step: 1,
                                minimum: 1,
                                maximum: DAYS_PER_MONTH,
                                width: 60,
                                disabled: compute(typeIndex, t => t !== 2),
                                onChange: v => pendingDateDay.set(v)
                            }),
                            button({
                                text: "Add Date",
                                width: 75,
                                height: 20,
                                disabled: compute(typeIndex, t => t !== 2),
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
                        selectedCell: compute(pendingDateSel, sel => sel === undefined ? null : { row: sel, column: 0 }),
                        onClick: row => pendingDateSel.set(row)
                    }),
                    button({
                        text: "Remove Date",
                        width: 100,
                        height: 20,
                        disabled: compute(typeIndex, pendingDateSel, (t, s) => t !== 2 || s === undefined),
                        onClick: removePendingDate
                    })
                ]
            }),
            label({ text: "" }),

            // ---- Warning ----
            label({ text: warningText }),

            // ---- Actions ----
            flexible({
                direction: LayoutDirection.Horizontal,
                content: [
                    button({
                        text: "Set Trigger",
                        width: 100,
                        height: 22,
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
                    button({
                        text: "Cancel",
                        width: 70,
                        height: 22,
                        onClick: () => handle?.close()
                    })
                ]
            })
        ]
    });

    refreshWarning();
    handle = popup.open();
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
                                            button({
                                                text: "Select Sequence",
                                                width: 120,
                                                height: 20,
                                                onClick: openSequenceSelectionWindow
                                            })
                                        ]
                                    }),
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            label({ text: compute(selectedLaunchSiteName, name => `Location: ${name.trim() || "[None]"}`), width: "1w" }),
                                            button({
                                                text: "Select Location",
                                                width: 120,
                                                height: 20,
                                                onClick: openLaunchSiteSelectionWindow
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
                                        text: "Interrupt when too many particles",
                                        isChecked: interruptStore,
                                        onChange: value => interruptStore.set(value)
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
                                                    button({
                                                        text: "Set Trigger",
                                                        width: 90,
                                                        height: 20,
                                                        onClick: openAddTriggerWindow
                                                    }),
                                                    button({
                                                        text: "Clear",
                                                        width: 55,
                                                        height: 20,
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
                                    label({ text: "News announcement 5 days before show (date triggers) / 1 min before (interval):" }),
                                    textbox({
                                        text: anouncement1Store,
                                        width: "1w",
                                        maxLength: 255,
                                        onChange: v => anouncement1Store.set(v)
                                    }),
                                    label({ text: "News announcement at start of show:" }),
                                    textbox({
                                        text: anouncement2Store,
                                        width: "1w",
                                        maxLength: 255,
                                        onChange: v => anouncement2Store.set(v)
                                    }),
                                    // ---- Actions ----
                                    flexible({
                                        direction: LayoutDirection.Horizontal,
                                        content: [
                                            button({
                                                text: compute(selectedShowIndex, idx => idx !== undefined ? "Update Show" : "Add Show"),
                                                width: 100,
                                                height: 20,
                                                onClick: addOrUpdateShow
                                            }),
                                            button({
                                                text: "New",
                                                width: 50,
                                                height: 20,
                                                onClick: resetShowEditor
                                            }),
                                            button({
                                                text: "Delete Show",
                                                width: 90,
                                                height: 20,
                                                onClick: deleteSelectedShow
                                            })
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
                                    items: compute(definedShows, shows => shows.map(s => ["{WHITE}" + s.name])),
                                    columns: [{ header: "{WHITE}Name", width: "1w" }],
                                    width: 170,
                                    height: "1w",
                                    canSelect: true,
                                    selectedCell: compute(selectedShowIndex, index => index === undefined ? null : { row: index, column: 0 }),
                                    onClick: row => loadSelectedShow(row)
                                })
                            }),
                            button({
                                text: compute(selectedShowIndex, idx =>
                                    idx !== undefined ? `Start: ${definedShows.get()[idx]?.name ?? ""}` : "Start Show Programme"
                                ),
                                width: "1w",
                                height: 22,
                                disabled: compute(selectedShowIndex, idx => idx === undefined),
                                onClick: () =>
                                {
                                    const name = editedShowName.get().trim();
                                    if (!name) return;
                                    // Validate show before starting
                                    const showToStart = new Show(
                                        name,
                                        selectedSequenceName.get().trim(),
                                        interruptStore.get(),
                                        anouncement1Store.get(),
                                        anouncement2Store.get(),
                                        currentTrigger.get(),
                                        musicEnabled.get(),
                                        musicRideId.get(),
                                        selectedLaunchSiteName.get().trim() || undefined
                                    );
                                    const ctx = buildValidationContext();
                                    const issues: ValidationIssue[] = [];
                                    if (!showToStart.isValid(ctx, issues, `Show "${name}"`))
                                    {
                                        if (typeof ui !== "undefined" && typeof ui.showError === "function")
                                        {
                                            ui.showError("Invalid show", formatValidationIssues(issues));
                                        }
                                        return;
                                    }
                                    StartShowProgramme(name);
                                    closeMainWindow();
                                    showFireworksShowPlayingWindow();
                                }
                            }),
                            button({
                                text: "Test Show Now",
                                width: "1w",
                                height: 22,
                                disabled: compute(selectedShowIndex, idx => idx === undefined),
                                onClick: () =>
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
                                        selectedLaunchSiteName.get().trim() || undefined
                                    );
                                    // Validate show before testing
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
                                }
                            }),
                            button({
                                text: "Stop",
                                width: "1w",
                                height: 22,
                                onClick: () => StopShowProgramme()
                            }),
                            button({ text: "Debugger", width: "1w",
                                height: 22, onClick: openDebuggerWindow })
                        ]})
                    ]
                })
            ]
        })
    ];
}