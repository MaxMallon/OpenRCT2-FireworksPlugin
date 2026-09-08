import { GetGroundEffectByName, GetShellByName } from "../persistent";
import { ValidationContext, ValidationIssue } from "../usageChecker";
import { Firework, Shell } from "./Firework";
import { PersistentDataObject } from "./PersistentDataObject";

export type SequenceEntryItem = Firework | Sequence;
export enum SequenceItemType {
	Shell = "shell",
	GroundEffect = "groundEffect",
	Sequence = "sequence"
}


export class SequenceEntry extends PersistentDataObject {
    readonly className: string = "SequenceEntry";

    constructor(
        public itemName: string,
        public itemType: SequenceItemType,
        public timeTillLight: number = 0, //Frames after the previous shot in the sequence before this one is launched
        public cumulativeTimeTillLight: number = 0, //Frames since the start of the root sequence/show.
        public nextItemAfterEnd: boolean = true, // Only relevant for Sequence type entries; the next item's delay counts from end rather than start
        public runtimeItem?: SequenceEntryItem // Not persisted; used by the player for direct runtime items
    ) {
        super();
    }

    override toParkData(): any {
        return {
            ...super.toParkData(),
            runtimeItem: undefined
        };
    }

    static fromParkData(entry: any): SequenceEntry {
        return new SequenceEntry(
            String(entry?.itemName ?? ""),
            entry?.itemType ?? SequenceItemType.Shell,
            entry?.timeTillLight ?? 0,
            entry?.cumulativeTimeTillLight ?? 0,
            entry?.nextItemAfterEnd ?? true
        );
    }

    GetSpriteString(): string {
        switch (this.itemType) {
            case SequenceItemType.Shell:
                return GetShellByName(this.itemName.trim())?.GetSpriteString() ?? "";
            case SequenceItemType.GroundEffect:
                return GetGroundEffectByName(this.itemName.trim())?.GetSpriteString() ?? "";
            default:
                return "";
        }}
}

export class Sequence extends PersistentDataObject {
    readonly className: string = "Sequence";

    constructor(
        public name: string,
        public items: SequenceEntry[] = []
    ) {
        super();
        this.recalculateCumulativeTimes();
    }

    override toParkData(): any {
        return {
            ...super.toParkData(),
            items: this.items.map(entry => entry.toParkData())
        };
    }

    static fromParkData(sequence: any): Sequence {
        const revived = new Sequence(String(sequence?.name ?? ""), []);
        revived.items = (sequence?.items ?? []).map((entry: any) => SequenceEntry.fromParkData(entry));
        revived.recalculateCumulativeTimes();
        return revived;
    }

    private static normalizeFrameDelay(value: number): number
    {
        if (!isFinite(value))
        {
            return 0;
        }

        return Math.max(0, Math.floor(value));
    }

    private static clampInsertIndex(index: number, length: number): number
    {
        if (!isFinite(index))
        {
            return length;
        }

        return Math.min(Math.max(0, Math.floor(index)), length);
    }

    private applyEntryCumulativeTime(entry: SequenceEntry, absoluteTime: number): void
    {
        entry.cumulativeTimeTillLight = absoluteTime;
    }

    containsSequenceWithName(name: string, lookup: (sequenceName: string) => Sequence | undefined): boolean
    {
        for (let index = 0; index < this.items.length; index++)
        {
            const entry = this.items[index];
            if (entry.itemType !== SequenceItemType.Sequence)
            {
                continue;
            }
            if (entry.itemName === name)
            {
                return true;
            }
            const nested = lookup(entry.itemName);
            if (nested && nested.containsSequenceWithName(name, lookup))
            {
                return true;
            }
        }
        return false;
    }

    getEndCumulativeTime(lookup?: (sequenceName: string) => Sequence | undefined): number
    {
        let endTime = 0;

        for (let index = 0; index < this.items.length; index++)
        {
            const entry = this.items[index];
            if (entry.itemType === SequenceItemType.Sequence && lookup)
            {
                const nested = lookup(entry.itemName);
                if (nested)
                {
                    const nestedEnd = entry.cumulativeTimeTillLight + nested.getEndCumulativeTime(lookup);
                    if (nestedEnd > endTime) endTime = nestedEnd;
                    continue;
                }
            }
            if (entry.cumulativeTimeTillLight > endTime)
            {
                endTime = entry.cumulativeTimeTillLight;
            }
        }

        return endTime;
    }

    private resolveInsertedEntryTimeTillShot(
        insertIndex: number,
        timeTillShot: number,
        timeReference: InsertTimeReference,
        lookup?: (sequenceName: string) => Sequence | undefined
    ): number
    {
        const normalizedTimeTillShot = isFinite(timeTillShot) ? Math.floor(timeTillShot) : 0;
        if (timeReference !== InsertTimeReference.PreviousSequenceEnd || insertIndex <= 0)
        {
            return normalizedTimeTillShot;
        }

        const previousEntry = this.items[insertIndex - 1];
        if (previousEntry.itemType !== SequenceItemType.Sequence || !lookup)
        {
            return normalizedTimeTillShot;
        }

        const previousSeq = lookup(previousEntry.itemName);
        if (!previousSeq) return normalizedTimeTillShot;

        const previousSequenceDuration = previousSeq.getEndCumulativeTime(lookup);
        return normalizedTimeTillShot + previousSequenceDuration;
    }

    recalculateCumulativeTimesFromIndex(startIndex: number, baseTime: number = 0, lookup?: (sequenceName: string) => Sequence | undefined): void
    {
        const normalizedStartIndex = Sequence.clampInsertIndex(startIndex, this.items.length);
        let previousTime = normalizedStartIndex <= 0
            ? Sequence.normalizeFrameDelay(baseTime)
            : this.items[normalizedStartIndex - 1].cumulativeTimeTillLight;

        // When starting mid-sequence, check if the preceding entry extends the base via nextItemAfterEnd.
        if (normalizedStartIndex > 0 && lookup)
        {
            const prevEntry = this.items[normalizedStartIndex - 1];
            if (prevEntry.itemType === SequenceItemType.Sequence && prevEntry.nextItemAfterEnd)
            {
                const prevSeq = lookup(prevEntry.itemName);
                if (prevSeq) previousTime = prevEntry.cumulativeTimeTillLight + prevSeq.getEndCumulativeTime(lookup);
            }
        }

        for (let index = normalizedStartIndex; index < this.items.length; index++)
        {
            const entry = this.items[index];
            if (!isFinite(entry.timeTillLight)) entry.timeTillLight = 0;
            else entry.timeTillLight = Math.floor(entry.timeTillLight);
            const absoluteTime = previousTime + entry.timeTillLight;
            this.applyEntryCumulativeTime(entry, absoluteTime);
            previousTime = absoluteTime;
            if (lookup && entry.itemType === SequenceItemType.Sequence && entry.nextItemAfterEnd)
            {
                const seq = lookup(entry.itemName);
                if (seq) previousTime = absoluteTime + seq.getEndCumulativeTime(lookup);
            }
        }
    }

    recalculateCumulativeTimes(startTime: number = 0, lookup?: (sequenceName: string) => Sequence | undefined): void
    {
        this.recalculateCumulativeTimesFromIndex(0, startTime, lookup);
    }

    addShotAt(shot: Shell, index: number): SequenceEntry
    {
        const insertIndex = Sequence.clampInsertIndex(index, this.items.length);
        const entry = new SequenceEntry(shot.name, SequenceItemType.Shell, 0);
        this.items.splice(insertIndex, 0, entry);
        this.recalculateCumulativeTimesFromIndex(insertIndex);
        return entry;
    }

    addItemAt(
        itemName: string,
        itemType: SequenceItemType,
        timeTillShot: number,
        index: number,
        timeReference: InsertTimeReference = InsertTimeReference.PreviousEntryStart,
        nextItemAfterEnd: boolean = true,
        lookup?: (sequenceName: string) => Sequence | undefined
    ): SequenceEntry
    {
        const insertIndex = Sequence.clampInsertIndex(index, this.items.length);
        this.recalculateCumulativeTimesFromIndex(0, 0, lookup);
        const resolvedTimeTillShot = this.resolveInsertedEntryTimeTillShot(insertIndex, timeTillShot, timeReference, lookup);
        const entry = new SequenceEntry(itemName, itemType, resolvedTimeTillShot, 0, nextItemAfterEnd);
        this.items.splice(insertIndex, 0, entry);
        this.recalculateCumulativeTimesFromIndex(insertIndex, 0, lookup);
        return entry;
    }

    removeItemAt(index: number, lookup?: (sequenceName: string) => Sequence | undefined): SequenceEntry | undefined
    {
        if (index < 0 || index >= this.items.length)
        {
            return undefined;
        }

        const removed = this.items.splice(index, 1)[0];
        this.recalculateCumulativeTimesFromIndex(index, 0, lookup);
        return removed;
    }

    isValid(ctx: ValidationContext, issues: ValidationIssue[], path: string): boolean {
        if (!ctx._visitedSequences) { ctx._visitedSequences = new Set<string>(); }
        if (ctx._visitedSequences.has(this.name)) { return true; }
        ctx._visitedSequences.add(this.name);
        let valid = true;
        for (let i = 0; i < this.items.length; i++) {
            const entry = this.items[i];
            const entryPath = `${path} > Entry ${i + 1} ("${entry.itemName}")`;
            if (entry.itemType === SequenceItemType.Shell) {
                const shell = ctx.shellMap.get(entry.itemName.trim());
                if (!shell) {
                    issues.push({ path: entryPath, problem: `Shell "${entry.itemName}" not found` });
                    valid = false;
                } else if (!shell.isValid(ctx, issues, entryPath)) {
                    valid = false;
                }
            } else if (entry.itemType === SequenceItemType.GroundEffect) {
                const ge = ctx.groundEffectMap.get(entry.itemName.trim());
                if (!ge) {
                    issues.push({ path: entryPath, problem: `Ground effect "${entry.itemName}" not found` });
                    valid = false;
                } else if (!ge.isValid(ctx, issues, entryPath)) {
                    valid = false;
                }
            } else if (entry.itemType === SequenceItemType.Sequence) {
                const nested = ctx.sequenceMap.get(entry.itemName.trim());
                if (!nested) {
                    issues.push({ path: entryPath, problem: `Sequence "${entry.itemName}" not found` });
                    valid = false;
                } else if (!nested.isValid(ctx, issues, entryPath)) {
                    valid = false;
                }
            }
        }
        ctx._visitedSequences.delete(this.name);
        return valid;
    }
}

export enum InsertTimeReference {
	PreviousEntryStart = "previous-entry-start",
	PreviousSequenceEnd = "previous-sequence-end"
}