import { AddNewsMessage } from "./helpers";
import * as persistent from "./persistent";
import { LoadFireworks, Play, Stop } from "./fireworksEffectsPlayer";
import { ResetCounts } from "./particleSpawner";
import type { PlaybackState, SerializedShowPlayerState } from "./parkStorage";
import { Sequence, SequenceEntry } from "./structures/Sequence";
import { Show, ShowTrigger, ShowTriggerKind, InGameRecurringPeriod } from "./structures/Show";

// ---- Constants ----
const DAYS_PER_MONTH = 31;
const MONTHS_PER_YEAR = 8;           // March … October
const ANNOUNCEMENT_TICKS = 2400;     // 1 real minute (60 s × 40 fps) – for interval trigger
const ANNOUNCEMENT_DAYS  = 5;        // days ahead for date-based announcement

// ---- Module-level state ----
let activeShowName: string = "";
let lastFireTicksElapsed: number = -1;  // -1 = never fired (interval trigger only)
let lastFireDay:   number = -1;         // date-based fire tracking
let lastFireMonth: number = -1;
let lastFireYear:  number = -1;
let announcementSent: boolean = false;  // interval trigger only

// Two separate subscriptions: one for tick-based, one for day-based triggers.
let showSubscriptionTick: IDisposable | undefined;
let showSubscriptionDay:  IDisposable | undefined;

// ---- Private helpers ----

function getActiveShow(): Show | undefined
{
    if (!activeShowName) return undefined;
    return persistent.showMap.get(activeShowName);
}

function isDateTriggerMatchingToday(trigger: ShowTrigger): boolean
{
    const { day, month } = date;
    switch (trigger.kind)
    {
        case ShowTriggerKind.RealTimeInterval: return false;
        case ShowTriggerKind.InGameRecurring:
            if (trigger.period === InGameRecurringPeriod.Daily) return true;
            if (trigger.period === InGameRecurringPeriod.Monthly) return day === (trigger.dayOfMonth ?? 1);
            return day === (trigger.dayOfMonth ?? 1) && month === (trigger.month ?? 0);
        case ShowTriggerKind.InGameAnnualDates:
            return trigger.dates.some(d => d.month === month && d.day === day);
    }
}

/**
 * Days from today until the date-based trigger fires next.
 * Returns 0 if today is the trigger day and the show has not yet fired today.
 */
function daysUntilNextDateTrigger(trigger: ShowTrigger, firedToday: boolean): number
{
    const { day, month } = date;
    if (!firedToday && isDateTriggerMatchingToday(trigger)) return 0;

    switch (trigger.kind)
    {
        case ShowTriggerKind.InGameRecurring: {
            if (trigger.period === InGameRecurringPeriod.Daily) return 1;
            if (trigger.period === InGameRecurringPeriod.Monthly) {
                const dom = trigger.dayOfMonth ?? 1;
                if (!firedToday && day < dom) return dom - day;
                return (DAYS_PER_MONTH - day) + dom;
            }
            // Yearly
            const dom = trigger.dayOfMonth ?? 1;
            const mon = trigger.month ?? 0;
            const curPos = month * DAYS_PER_MONTH + (day - 1);
            const tgtPos = mon   * DAYS_PER_MONTH + (dom  - 1);
            if (tgtPos > curPos) return tgtPos - curPos;
            return MONTHS_PER_YEAR * DAYS_PER_MONTH - curPos + tgtPos;
        }
        case ShowTriggerKind.InGameAnnualDates: {
            if (!trigger.dates.length) return MONTHS_PER_YEAR * DAYS_PER_MONTH;
            const curPos  = month * DAYS_PER_MONTH + (day - 1);
            const yearLen = MONTHS_PER_YEAR * DAYS_PER_MONTH;
            let min = yearLen;
            for (const d of trigger.dates) {
                const tgtPos = d.month * DAYS_PER_MONTH + (d.day - 1);
                let diff = tgtPos >= curPos ? tgtPos - curPos : yearLen - curPos + tgtPos;
                if (diff === 0) diff = yearLen; // today already fired
                if (diff < min) min = diff;
            }
            return min;
        }
    }
    return MONTHS_PER_YEAR * DAYS_PER_MONTH;
}

function disposeSubscriptions(): void
{
    if (showSubscriptionTick) { showSubscriptionTick.dispose(); showSubscriptionTick = undefined; }
    if (showSubscriptionDay)  { showSubscriptionDay.dispose();  showSubscriptionDay  = undefined; }
}

// ---- Loop functions ----

/**
 * Called every game tick. Used only for RealTimeInterval triggers.
 */
function ShowLoopTick(): void
{
    persistent.incrementShowTick();
    const show = getActiveShow();
    if (!show?.trigger || show.trigger.kind !== ShowTriggerKind.RealTimeInterval) return;

    const trigger       = show.trigger;
    const now           = date.ticksElapsed;
    const intervalTicks = trigger.intervalMinutes * 60 * 40;
    const nextFire      = lastFireTicksElapsed < 0 ? now : lastFireTicksElapsed + intervalTicks;

    if (!announcementSent && now >= nextFire - ANNOUNCEMENT_TICKS)
    {
        if (show.anouncement1.trim())
            AddNewsMessage(show.anouncement1, persistent.showPositionTarget);
        announcementSent = true;
    }

    if (now >= nextFire)
    {
        if (show.anouncement2.trim())
            AddNewsMessage(show.anouncement2, persistent.showPositionTarget);
        StartShowSequence(show);
        lastFireTicksElapsed = now;
        announcementSent = false;
        persistent.saveParkState();
    }
}

/**
 * Called once per in-game day. Used for InGameRecurring and InGameAnnualDates triggers.
 */
function ShowLoopDay(): void
{
    persistent.incrementShowTick();
    const show = getActiveShow();
    if (!show?.trigger || show.trigger.kind === ShowTriggerKind.RealTimeInterval) return;

    const trigger    = show.trigger;
    const { day, month, year } = date;
    const firedToday = lastFireDay === day && lastFireMonth === month && lastFireYear === year;
    const daysLeft   = daysUntilNextDateTrigger(trigger, firedToday);

    // Announcement 5 days before the show
    if (daysLeft === ANNOUNCEMENT_DAYS && show.anouncement1.trim())
        AddNewsMessage(show.anouncement1, persistent.showPositionTarget);

    // Fire the show
    if (daysLeft === 0 && !firedToday)
    {
        if (show.anouncement2.trim())
            AddNewsMessage(show.anouncement2, persistent.showPositionTarget);
        StartShowSequence(show);
        lastFireDay   = day;
        lastFireMonth = month;
        lastFireYear  = year;
        persistent.saveParkState();
    }
}

// ---- Public API ----

export function StartShowProgramme(showName: string): void
{
    const show = persistent.showMap.get(showName.trim());
    if (!show?.trigger) return;

    disposeSubscriptions();

    activeShowName = showName.trim();
    lastFireTicksElapsed = -1;
    lastFireDay   = -1;
    lastFireMonth = -1;
    lastFireYear  = -1;
    announcementSent = false;
    persistent.setShowTick(0);
    persistent.setInterruptWhenTooManyParticles(show.interruptWhenTooManyParticles);

    if (show.trigger.kind === ShowTriggerKind.RealTimeInterval)
        showSubscriptionTick = context.subscribe("interval.tick", ShowLoopTick);
    else
        showSubscriptionDay = context.subscribe("interval.day", ShowLoopDay);

    persistent.saveParkState();
}

export function StopShowProgramme(): void
{
    disposeSubscriptions();
    activeShowName = "";
    persistent.setShowTick(0);
    lastFireTicksElapsed = -1;
    lastFireDay   = -1;
    lastFireMonth = -1;
    lastFireYear  = -1;
    announcementSent = false;
    persistent.saveParkState();
    Stop();
}

/**
 * Human-readable time until the next show fires.
 * Date-based: days remaining.  Interval-based: seconds / minutes.
 */
export function TimeTillNextShow(): string
{
    const show = getActiveShow();
    if (!show?.trigger) return "No show scheduled";

    const trigger = show.trigger;
    if (trigger.kind === ShowTriggerKind.RealTimeInterval)
    {
        const now           = date.ticksElapsed;
        const intervalTicks = trigger.intervalMinutes * 60 * 40;
        const nextFire      = lastFireTicksElapsed < 0 ? now : lastFireTicksElapsed + intervalTicks;
        if (nextFire <= now) return "Imminent";
        const secondsLeft = Math.ceil((nextFire - now) / 40);
        if (secondsLeft < 120) return `${secondsLeft}s`;
        const minsLeft = Math.ceil(secondsLeft / 60);
        if (minsLeft < 120) return `${minsLeft} min`;
        return `${Math.ceil(minsLeft / 60)} hr`;
    }

    // Date-based
    const { day, month, year } = date;
    const firedToday = lastFireDay === day && lastFireMonth === month && lastFireYear === year;
    const daysLeft   = daysUntilNextDateTrigger(trigger, firedToday);
    if (daysLeft === 0) return "Today";
    return `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
}

/**
 * Clones the show's sequence offset to the current effectTick and hands it to
 * the fireworks effects player.
 */
export function StartShowSequence(show: Show): void
{
    // Stop ride music one tick before the show starts
    if (show.music && typeof map !== "undefined")
    {
        for (const ride of map.rides)
        {
            if (ride.id === show.musicRideID)
            {
                context.executeAction("ridesetsetting", { ride: ride.id, setting: 6, value: 0 } as RideSetSettingArgs);
                break;
            }
        }
    }

    const { sequence, music, musicRideID } = show;
    let tickCount = 0;
    const sub = context.subscribe("interval.tick", () =>
    {
        tickCount++;
        if (tickCount < 2) return;
        sub.dispose();
        const seq = persistent.sequenceMap.get(sequence.trim());
        if (!seq) { console.log("[StartShowSequence] sequence not found:", sequence); return; }
        const startTick = persistent.effectTick;
        persistent.setInterruptWhenTooManyParticles(show.interruptWhenTooManyParticles);
        const seqClone  = new Sequence(seq.name, []);
        seqClone.items  = seq.items.map(e => new SequenceEntry(e.itemName, e.itemType, e.timeTillLight, e.cumulativeTimeTillLight, e.nextItemAfterEnd));
        seqClone.recalculateCumulativeTimes(startTick, name => persistent.resolveSequence(name));
        LoadFireworks(seqClone);
        ResetCounts();
        Play(true);
        if (music) ActivateRideMusic(musicRideID);
    });
}

export function ActivateRideMusic(id: number): void
{
    // ride.music holds a music-object index (number).
    if (typeof map === "undefined") return;
    for (const ride of map.rides)
    {//TODO max, might be easier to 1 in tick, and set music to something else and immedeatly back
        context.executeAction("ridesetsetting", { ride: ride.id, setting: 6, value: 1 } as RideSetSettingArgs);
        if (ride.id === id) return;
    }
}

// ---- Park state persistence ----

export function getActiveShowName(): string  { return activeShowName; }
export function isShowProgrammeRunning(): boolean { return activeShowName !== ""; }

export function getShowPlayerSnapshot(): SerializedShowPlayerState
{
    return { activeShowName, lastFireTicksElapsed, lastFireDay, lastFireMonth, lastFireYear, announcementSent };
}

export function restoreShowPlayerFromSnapshot(playback: PlaybackState): void
{
    disposeSubscriptions();

    const sp = playback.showPlayer;
    if (!sp || !sp.activeShowName) { activeShowName = ""; return; }

    activeShowName       = sp.activeShowName;
    lastFireTicksElapsed = isFinite(sp.lastFireTicksElapsed) ? sp.lastFireTicksElapsed : -1;
    lastFireDay          = isFinite(sp.lastFireDay)          ? sp.lastFireDay          : -1;
    lastFireMonth        = isFinite(sp.lastFireMonth)        ? sp.lastFireMonth        : -1;
    lastFireYear         = isFinite(sp.lastFireYear)         ? sp.lastFireYear         : -1;
    announcementSent     = !!sp.announcementSent;

    const show = persistent.showMap.get(activeShowName);
    if (show?.trigger)
    {
        if (show.trigger.kind === ShowTriggerKind.RealTimeInterval)
            showSubscriptionTick = context.subscribe("interval.tick", ShowLoopTick);
        else
            showSubscriptionDay = context.subscribe("interval.day", ShowLoopDay);
    }
}

export function initShowPlayerCallbacks(): void
{
    persistent.registerShowPlayerCallbacks(getShowPlayerSnapshot, restoreShowPlayerFromSnapshot);
}