import { AddNewsMessage } from "./helpers";
import * as persistent from "./persistent";
import { AddFireworksPlayer, ClearFireworksEffects, Play, Stop } from "./fireworksEffectsPlayer";
import { cloneSequence } from "./cloneHelpers";
import { ResetCounts } from "./particleSpawner";
import type { PlaybackState, SerializedShowPlayerState } from "./parkStorage";
import { Show, ShowTrigger, ShowTriggerKind, InGameRecurringPeriod } from "./structures/Show";

// ---- Constants ----
const DAYS_IN_MONTH = [31, 30, 31, 30, 31, 31, 30, 31]; // March(0) … October(7)
const YEAR_LENGTH   = 245;//31 + 30 + 31 + 30 + 31 + 31 + 30 + 31;
const ANNOUNCEMENT_TICKS = 2400;     // 1 real minute (60 s × 40 fps) – for interval trigger
const ANNOUNCEMENT_DAYS  = 5;        // days ahead for date-based announcement

// ---- Per-show scheduler state ----

interface TickShowState {
    showName: string;
    lastFireTicksElapsed: number;
    announcementSent: boolean;
}

interface DayShowState {
    showName: string;
    lastFireDay: number;
    lastFireMonth: number;
    lastFireYear: number;
}

const tickShowStates: TickShowState[] = [];
const dayShowStates:  DayShowState[]  = [];
let sharedTickSub: IDisposable | undefined;
let sharedDaySub:  IDisposable | undefined;

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

function dayOfYear(month: number, day: number): number
{
    let d = day - 1;
    for (let m = 0; m < month; m++) d += DAYS_IN_MONTH[m];
    return d;
}

/** Days from today until the given in-game date; 0 means today. */
function timeTillDate(targetMonth: number, targetDay: number): number
{
    const { day, month } = date;
    const cur = dayOfYear(month, day);
    const tgt = dayOfYear(targetMonth, targetDay);
    return tgt >= cur ? tgt - cur : YEAR_LENGTH - cur + tgt;
}

function daysUntilNextDateTrigger(trigger: ShowTrigger, firedToday: boolean): number
{
    if (!firedToday && isDateTriggerMatchingToday(trigger)) return 0;

    switch (trigger.kind)
    {
        case ShowTriggerKind.InGameRecurring: {
            if (trigger.period === InGameRecurringPeriod.Daily) return 1;
            if (trigger.period === InGameRecurringPeriod.Monthly) {
                const { day, month } = date;
                const dom = trigger.dayOfMonth ?? 1;
                if (!firedToday && day < dom) return dom - day;
                return DAYS_IN_MONTH[month] - day + dom;
            }
            // Yearly
            const days = timeTillDate(trigger.month ?? 0, trigger.dayOfMonth ?? 1);
            return days > 0 ? days : YEAR_LENGTH;
        }
        case ShowTriggerKind.InGameAnnualDates: {
            if (!trigger.dates.length) return YEAR_LENGTH;
            let min = YEAR_LENGTH;
            for (const d of trigger.dates) {
                let diff = timeTillDate(d.month, d.day);
                if (diff === 0) diff = YEAR_LENGTH; // today already fired
                if (diff < min) min = diff;
            }
            return min;
        }
    }
    return YEAR_LENGTH;
}

// ---- Shared loop functions ----
//Two loops cause ticks and days don't match easily.
function sharedTickLoop(): void
{
    persistent.incrementShowTick();
    const now = date.ticksElapsed;
    for (const state of tickShowStates)
    {
        const show = persistent.showMap.get(state.showName);
        if (!show?.trigger || show.trigger.kind !== ShowTriggerKind.RealTimeInterval) continue;

        const trigger       = show.trigger;
        const intervalTicks = trigger.intervalMinutes * 60 * 40;
        const nextFire      = state.lastFireTicksElapsed < 0 ? now : state.lastFireTicksElapsed + intervalTicks;

        if (!state.announcementSent && now >= nextFire - ANNOUNCEMENT_TICKS)
        {
            if (show.anouncement1.trim())
                AddNewsMessage(show.anouncement1, persistent.showPositionTarget);
            state.announcementSent = true;
        }

        if (now >= nextFire)
        {
            if (show.anouncement2.trim())
                AddNewsMessage(show.anouncement2, persistent.showPositionTarget);
            StartShowSequence(show);
            state.lastFireTicksElapsed = now;
            state.announcementSent     = false;
        }
    }
}

function sharedDayLoop(): void
{
    const { day, month, year } = date;
    for (const state of dayShowStates)
    {
        const show = persistent.showMap.get(state.showName);
        if (!show?.trigger || show.trigger.kind === ShowTriggerKind.RealTimeInterval) continue;

        const firedToday = state.lastFireDay === day && state.lastFireMonth === month && state.lastFireYear === year;
        const daysLeft   = daysUntilNextDateTrigger(show.trigger, firedToday);

        if (daysLeft === ANNOUNCEMENT_DAYS && show.anouncement1.trim())
            AddNewsMessage(show.anouncement1, persistent.showPositionTarget);

        if (daysLeft === 0 && !firedToday)
        {
            if (show.anouncement2.trim())
                AddNewsMessage(show.anouncement2, persistent.showPositionTarget);
            StartShowSequence(show);
            state.lastFireDay   = day;
            state.lastFireMonth = month;
            state.lastFireYear  = year;
        }
    }
}

function addTickShow(showName: string, initTicks: number, initAnnounced: boolean): void
{
    tickShowStates.push({ showName, lastFireTicksElapsed: initTicks, announcementSent: initAnnounced });
    if (!sharedTickSub)
        sharedTickSub = context.subscribe("interval.tick", sharedTickLoop);
}

function addDayShow(showName: string, initDay: number, initMonth: number, initYear: number): void
{
    dayShowStates.push({ showName, lastFireDay: initDay, lastFireMonth: initMonth, lastFireYear: initYear });
    if (!sharedDaySub)
        sharedDaySub = context.subscribe("interval.day", sharedDayLoop);
}

function removeScheduler(showName: string): void
{
    const ti = tickShowStates.findIndex(s => s.showName === showName);
    if (ti >= 0) tickShowStates.splice(ti, 1);
    const di = dayShowStates.findIndex(s => s.showName === showName);
    if (di >= 0) dayShowStates.splice(di, 1);
    if (tickShowStates.length === 0 && sharedTickSub) { sharedTickSub.dispose(); sharedTickSub = undefined; }
    if (dayShowStates.length  === 0 && sharedDaySub)  { sharedDaySub.dispose();  sharedDaySub  = undefined; }
}

function removeAllSchedulers(): void
{
    sharedTickSub?.dispose(); sharedTickSub = undefined;
    sharedDaySub?.dispose();  sharedDaySub  = undefined;
    tickShowStates.length = 0;
    dayShowStates.length  = 0;
}

// ---- Public API ----

export function StartShowProgramme(showName: string): void
{
    const show = persistent.showMap.get(showName.trim());
    if (!show?.trigger) return;

    removeScheduler(showName.trim());
    persistent.setInterruptWhenTooManyParticles(show.interruptWhenTooManyParticles);

    if (show.trigger.kind === ShowTriggerKind.RealTimeInterval)
        addTickShow(showName.trim(), -1, false);
    else
        addDayShow(showName.trim(), -1, -1, -1);
}

export function StartAllEnabledShowProgrammes(): void
{
    removeAllSchedulers();
    ClearFireworksEffects();
    Play(false); // ensure loopSubscription exists before any show fires
    persistent.setShowTick(0);
    for (const show of persistent.showMap.values())
    {
        if (show.enabled && show.trigger)
            StartShowProgramme(show.name);
    }
}

export function StopShowProgramme(): void
{
    removeAllSchedulers();
    persistent.setShowTick(0);
    Stop();
}

export interface ScheduledShowStatus {
    name:      string;
    status:    string;
    isPlaying: boolean;
}

/** Length of the show's assigned sequence, in ticks; 0 if unknown. */
function getShowDurationTicks(show: Show): number
{
    const seq = persistent.sequenceMap.get(show.sequence.trim());
    if (!seq) return 0;
    return seq.getEndCumulativeTime(name => persistent.sequenceMap.get(name));
}

function formatTickCountdown(ticksUntil: number): string
{
    if (ticksUntil <= 0) return "Imminent";
    const secondsLeft = Math.ceil(ticksUntil / 40);
    if (secondsLeft < 120)       return `${secondsLeft}s`;
    if (secondsLeft < 7200)      return `${Math.ceil(secondsLeft / 60)} min`;
    return `${Math.ceil(secondsLeft / 3600)} hr`;
}

/** Status (playing / time until next run) for every currently scheduled show. */
export function getScheduledShowsStatus(): ScheduledShowStatus[]
{
    const results: ScheduledShowStatus[] = [];
    const now = date.ticksElapsed;

    for (const state of tickShowStates)
    {
        const show = persistent.showMap.get(state.showName);
        if (!show?.trigger) continue;

        const intervalTicks = (show.trigger as { intervalMinutes: number }).intervalMinutes * 60 * 40;
        const durationTicks = getShowDurationTicks(show);

        if (state.lastFireTicksElapsed >= 0 && durationTicks > 0)
        {
            const elapsedSinceFire = now - state.lastFireTicksElapsed;
            if (elapsedSinceFire >= 0 && elapsedSinceFire < durationTicks)
            {
                results.push({ name: state.showName, status: "Playing", isPlaying: true });
                continue;
            }
        }

        const nextFire   = state.lastFireTicksElapsed < 0 ? now : state.lastFireTicksElapsed + intervalTicks;
        const ticksUntil = Math.max(0, nextFire - now);
        results.push({ name: state.showName, status: formatTickCountdown(ticksUntil), isPlaying: false });
    }

    for (const state of dayShowStates)
    {
        const show = persistent.showMap.get(state.showName);
        if (!show?.trigger) continue;

        const { day, month, year } = date;
        const firedToday    = state.lastFireDay === day && state.lastFireMonth === month && state.lastFireYear === year;
        const durationTicks = getShowDurationTicks(show);

        if (firedToday && durationTicks > 0)
        {
            const elapsedSinceFire = now % 528; // ticks into the current in-game day
            if (elapsedSinceFire < durationTicks)
            {
                results.push({ name: state.showName, status: "Playing", isPlaying: true });
                continue;
            }
        }

        const daysLeft = daysUntilNextDateTrigger(show.trigger, firedToday);
        const status   = daysLeft === 0 ? "Today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
        results.push({ name: state.showName, status, isPlaying: false });
    }

    return results;
}

export function StartShowSequence(show: Show): void
{
    if (show.music && typeof map !== "undefined")
    {
        for (const ride of map.rides)
        {
            if (ride.id === show.musicRideID)
            {
                const rideMusicID = ride.music;
                context.executeAction("ridesetsetting", { ride: ride.id, setting: 7, value: 0 } as RideSetSettingArgs);//6 = music, 7 = musictype
                context.executeAction("ridesetsetting", { ride: ride.id, setting: 7, value: rideMusicID } as RideSetSettingArgs);
                context.executeAction("ridesetsetting", { ride: ride.id, setting: 6, value: 1 } as RideSetSettingArgs);
                break;
            }
        }
    }

    const { sequence } = show;
    const seq = persistent.sequenceMap.get(sequence.trim());
    if (!seq) { console.log("[StartShowSequence] sequence not found:", sequence); return; }
    const startTick = persistent.effectTick;
    persistent.setInterruptWhenTooManyParticles(show.interruptWhenTooManyParticles);
    const seqClone  = cloneSequence(seq);
    seqClone.recalculateCumulativeTimes(startTick, name => persistent.resolveSequence(name));
    AddFireworksPlayer(seqClone);
    ResetCounts();
    Play(true);
}

// ---- Park state persistence ----

export function getActiveShowName(): string
{
    return tickShowStates[0]?.showName ?? dayShowStates[0]?.showName ?? "";
}

export function getRunningShowCount(): number
{
    return tickShowStates.length + dayShowStates.length;
}

export function isShowProgrammeRunning(): boolean
{
    return tickShowStates.length > 0 || dayShowStates.length > 0;
}

export function getShowPlayerSnapshot(): SerializedShowPlayerState[]
{
    return [
        ...tickShowStates.map(s => ({
            showName:             s.showName,
            lastFireTicksElapsed: s.lastFireTicksElapsed,
            lastFireDay:          -1,
            lastFireMonth:        -1,
            lastFireYear:         -1,
            announcementSent:     s.announcementSent
        })),
        ...dayShowStates.map(s => ({
            showName:             s.showName,
            lastFireTicksElapsed: -1,
            lastFireDay:          s.lastFireDay,
            lastFireMonth:        s.lastFireMonth,
            lastFireYear:         s.lastFireYear,
            announcementSent:     false
        }))
    ];
}

export function restoreShowPlayerFromSnapshot(playback: PlaybackState): void
{
    removeAllSchedulers();

    let states: SerializedShowPlayerState[];
    if (playback.showPlayers)
    {
        states = playback.showPlayers;
    }
    else
    {
        states = [];
    }

    for (const sp of states)
    {
        if (!sp.showName) continue;
        const show = persistent.showMap.get(sp.showName);
        if (!show?.trigger) continue;

        const ticks = isFinite(sp.lastFireTicksElapsed) ? sp.lastFireTicksElapsed : -1;
        const day   = isFinite(sp.lastFireDay)          ? sp.lastFireDay          : -1;
        const mon   = isFinite(sp.lastFireMonth)        ? sp.lastFireMonth        : -1;
        const yr    = isFinite(sp.lastFireYear)         ? sp.lastFireYear         : -1;

        if (show.trigger.kind === ShowTriggerKind.RealTimeInterval)
            addTickShow(sp.showName, ticks, !!sp.announcementSent);
        else
            addDayShow(sp.showName, day, mon, yr);
    }
}

export function initShowPlayerCallbacks(): void
{
    persistent.registerShowPlayerCallbacks(getShowPlayerSnapshot, restoreShowPlayerFromSnapshot);
}