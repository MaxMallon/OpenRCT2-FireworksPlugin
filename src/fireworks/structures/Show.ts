import { ValidationContext, ValidationIssue } from "../usageChecker";
import { PersistentDataObject } from "./PersistentDataObject";

export class Show extends PersistentDataObject {
	readonly className: string = "Show";

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
		public enabled: boolean = false,
	) {
		super();
	}

	override toParkData(): any {
		return {
			...super.toParkData(),
			trigger: this.trigger ? showTriggerToParkData(this.trigger) : undefined
		};
	}

	static fromParkData(show: any): Show {
		const trigger = show?.trigger ? showTriggerFromParkData(show.trigger) : undefined;
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
			launchTerrain,
			show?.enabled ?? false
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


// When a show triggers
export enum ShowTriggerKind {
	RealTimeInterval = "realTimeInterval",
	InGameRecurring = "inGameRecurring",
	InGameAnnualDates = "inGameAnnualDates"
}

/** Granularity for {@link InGameRecurringTrigger}. */
export enum InGameRecurringPeriod {
	Daily = "daily",
	Monthly = "monthly", //fixed day
	Yearly = "yearly" //fixed month and day
}

/** Fire every `intervalMinutes` real-world minutes. */
export interface RealTimeIntervalTrigger {
	kind: ShowTriggerKind.RealTimeInterval;
	intervalMinutes: number;
}

export interface InGameRecurringTrigger {
	kind: ShowTriggerKind.InGameRecurring;
	period: InGameRecurringPeriod;
	/** Day of the month (1-based). Required for `Monthly` and `Yearly`. */
	dayOfMonth?: number;
	/** Month index (0-7). Required for `Yearly`. */
	month?: number;
}

export interface InGameDate {
	month: number;
	day: number;
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

