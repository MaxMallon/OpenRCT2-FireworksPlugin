import { ValidationContext, ValidationIssue } from "../usageChecker";

export class Show {
	constructor(
		public name: string,
		public sequence: string = "",
		public interruptWhenTooManyParticles: boolean = true,
		public anouncement1: string = "",
		public anouncement2: string = "",
		public trigger: ShowTrigger | undefined = undefined, // single schedule trigger
		public music: boolean = false,
		public musicRideID: number = 0,
		public launchTerrain: string | undefined = undefined,
	) {
	}

	toParkData(): any {
		return {
			className: "Show",
			name: this.name,
			sequence: this.sequence,
			interruptWhenTooManyParticles: this.interruptWhenTooManyParticles,
			anouncement1: this.anouncement1,
			anouncement2: this.anouncement2,
			trigger: this.trigger ? showTriggerToParkData(this.trigger) : undefined,
			music: this.music,
			musicRideID: this.musicRideID,
			launchTerrain: this.launchTerrain
		};
	}

	static fromParkData(show: any): Show {
		// Support old saves that stored an array; migrate first element.
		const legacyTriggers: ShowTrigger[] = (show?.triggers ?? []).map((t: any) => showTriggerFromParkData(t));
		const trigger = show?.trigger
			? showTriggerFromParkData(show.trigger)
			: (legacyTriggers.length > 0 ? legacyTriggers[0] : undefined);
		const launchTerrain = show?.launchTerrain ?? undefined;
		return new Show(
			String(show?.name ?? ""),
			String(show?.sequence ?? ""),
			show?.interruptWhenTooManyParticles ?? true,
			String(show?.anouncement1 ?? ""),
			String(show?.anouncement2 ?? ""),
			trigger,
			show?.music ?? false,
			show?.musicRideID ?? 0,
			launchTerrain
		);
	}

	isValid(ctx: ValidationContext, issues: ValidationIssue[], path: string): boolean {
		const seqName = this.sequence.trim();
		if (!seqName) {
			issues.push({ path, problem: "No sequence assigned" });
			return false;
		}
		const seq = ctx.sequenceMap.get(seqName);
		if (!seq) {
			issues.push({ path, problem: `Sequence "${seqName}" not found` });
			return false;
		}
		return seq.isValid(ctx, issues, `${path} > Sequence "${seqName}"`);
	}
}


// ---------------------------------------------------------------------------
// Show trigger types – define when a show should start.
// ---------------------------------------------------------------------------

/** Discriminant for each trigger variant. */
export enum ShowTriggerKind {
	/** Fire on a real-world clock interval, e.g. every 15 real minutes. */
	RealTimeInterval = "realTimeInterval",
	/** Fire on a repeating in-game calendar pattern (daily / monthly / yearly). */
	InGameRecurring = "inGameRecurring",
	/** Fire on a set of specific in-game month+day pairs that repeat every year. */
	InGameAnnualDates = "inGameAnnualDates"
}

/** Granularity for {@link InGameRecurringTrigger}. */
export enum InGameRecurringPeriod {
	/** Every in-game day. */
	Daily = "daily",
	/** A fixed day-of-month, every month. Requires `dayOfMonth`. */
	Monthly = "monthly",
	/** A fixed month+day, every year. Requires `dayOfMonth` and `month`. */
	Yearly = "yearly"
}

/**
 * A month+day pair in the in-game calendar.
 * `month` follows the OpenRCT2 calendar: 0 = March … 7 = October.
 * `day` is 1-based.
 */
export interface InGameDate {
	month: number;
	day: number;
}

/** Fire every `intervalMinutes` real-world minutes. */
export interface RealTimeIntervalTrigger {
	kind: ShowTriggerKind.RealTimeInterval;
	intervalMinutes: number;
}

/**
 * Fire on a recurring in-game calendar pattern.
 *
 * - `period = Daily`   → triggers every in-game day.
 * - `period = Monthly` → triggers on `dayOfMonth` of every month.
 * - `period = Yearly`  → triggers on `month`/`dayOfMonth` every year.
 */
export interface InGameRecurringTrigger {
	kind: ShowTriggerKind.InGameRecurring;
	period: InGameRecurringPeriod;
	/** Day of the month (1-based). Required for `Monthly` and `Yearly`. */
	dayOfMonth?: number;
	/** Month index (0-7). Required for `Yearly`. */
	month?: number;
}

/**
 * Fire on any of the listed month+day pairs, repeating every year.
 * Example: [{ month: 4, day: 4 }, { month: 6, day: 2 }] for July 4th and September 2nd.
 */
export interface InGameAnnualDatesTrigger {
	kind: ShowTriggerKind.InGameAnnualDates;
	dates: InGameDate[];
}

export type ShowTrigger = RealTimeIntervalTrigger | InGameRecurringTrigger | InGameAnnualDatesTrigger;

export function showTriggerToParkData(trigger: ShowTrigger): any {
	return { ...trigger, dates: (trigger as InGameAnnualDatesTrigger).dates ? [...(trigger as InGameAnnualDatesTrigger).dates] : undefined };
}

export function showTriggerFromParkData(data: any): ShowTrigger {
	switch (data?.kind as ShowTriggerKind) {
		case ShowTriggerKind.RealTimeInterval:
			return {
				kind: ShowTriggerKind.RealTimeInterval,
				intervalMinutes: isFinite(data?.intervalMinutes) ? Number(data.intervalMinutes) : 15
			} satisfies RealTimeIntervalTrigger;
		case ShowTriggerKind.InGameRecurring:
			return {
				kind: ShowTriggerKind.InGameRecurring,
				period: data?.period ?? InGameRecurringPeriod.Daily,
				dayOfMonth: isFinite(data?.dayOfMonth) ? Number(data.dayOfMonth) : undefined,
				month: isFinite(data?.month) ? Number(data.month) : undefined
			} satisfies InGameRecurringTrigger;
		case ShowTriggerKind.InGameAnnualDates:
			return {
				kind: ShowTriggerKind.InGameAnnualDates,
				dates: (data?.dates ?? []).map((d: any): InGameDate => ({
					month: isFinite(d?.month) ? Number(d.month) : 0,
					day: isFinite(d?.day) ? Number(d.day) : 1
				}))
			} satisfies InGameAnnualDatesTrigger;
		default:
			return { kind: ShowTriggerKind.InGameRecurring, period: InGameRecurringPeriod.Daily };
	}
}

