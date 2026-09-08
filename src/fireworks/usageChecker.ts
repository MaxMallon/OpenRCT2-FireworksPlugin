import { ColourSequence } from "./structures/ColourStructures";
import { cloneEffect, cloneLoad, cloneSequence } from "./cloneHelpers";
import { getLoadMap, getShellMap, getGroundEffectMap, getSequenceMap, getShotShowMap, resolveSequence, setLoadList, setShellList, setGroundEffectList, setSequenceList, setShotShow, colourSequences, launchSites } from "./persistent";
import { EffectType } from "./structures/Effect";
import { Shell, GroundEffect } from "./structures/Firework";
import { LaunchSite } from "./structures/LaunchSite";
import { Load } from "./structures/Load";
import { Sequence, SequenceItemType } from "./structures/Sequence";
import { ShellLoad } from "./structures/ShellLoad";
import { Show } from "./structures/Show";

// Checker to see if items are still used, to warn user when they try to delete them

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export interface ValidationContext {
	colourSequences: ColourSequence[];
	loadMap: Map<string, Load>;
	shellMap: Map<string, Shell>;
	groundEffectMap: Map<string, GroundEffect>;
	sequenceMap: Map<string, Sequence>;
	launchSites: LaunchSite[];
	/** Internal: cycle guard used by Sequence.isValid – do not set manually. */
	_visitedSequences?: Set<string>;
}

export interface ValidationIssue {
	path: string;
	problem: string;
}

export function loadContainsShellOfShellsEffect(load: Load): boolean
{
	return load.effects.some(effect => effect.type === EffectType.ShellOfShells);
}

export function collectShellOfShellsReferencedLoadNames(loads: Load[]): string[]
{
	const names: string[] = [];
	for (const load of loads)
	{
		for (const effect of load.effects)
		{
			if (effect.type !== EffectType.ShellOfShells)
			{
				continue;
			}

			const subLoads = (effect as unknown as { subLoads?: ShellLoad[] }).subLoads;
			for (const subLoad of subLoads ?? [])
			{
				const name = subLoad.loadName.trim();
				if (name && names.indexOf(name) < 0)
				{
					names.push(name);
				}
			}
		}
	}

	return names;
}


// ---------------------------------------------------------------------------
// Usage reference descriptor
// ---------------------------------------------------------------------------

export type UsageKind = "load" | "shell" | "groundEffect" | "sequence" | "show";

export interface UsageReference {
	kind: UsageKind;
	name: string;
	/** Extra context, e.g. "ascend load" or "Shell of Shells sub-load". */
	detail?: string;
}

// ---------------------------------------------------------------------------
// Finding usages
// ---------------------------------------------------------------------------

/** Find all loads whose effects reference the given colour sequence by name. */
export function findColourSequenceUsages(seqName: string): UsageReference[] {
	const trimmed = seqName.trim();
	if (!trimmed) return [];
	const refs: UsageReference[] = [];
	for (const load of getLoadMap().values()) {
		if (load.effects.some(e => (e.colours?.sequenceName ?? "").trim() === trimmed)) {
			refs.push({ kind: "load", name: load.name });
		}
	}
	return refs;
}

/** Find all shells/ground-effects that use the given launch site name as their position. */
export function findLaunchSiteUsages(siteName: string): UsageReference[] {
	const trimmed = siteName.trim();
	if (!trimmed) return [];
	const refs: UsageReference[] = [];
	for (const shell of getShellMap().values()) {
		if (typeof shell.position === "string" && shell.position.trim() === trimmed) {
			refs.push({ kind: "shell", name: shell.name });
		}
	}
	for (const ge of getGroundEffectMap().values()) {
		if (ge.position.trim() === trimmed) {
			refs.push({ kind: "groundEffect", name: ge.name });
		}
	}
	return refs;
}

/**
 * Find all shells that reference the given load (as main load, ascend load, or
 * Shell-of-Shells sub-load inside another load).
 */
export function findLoadUsages(loadName: string): UsageReference[] {
	const trimmed = loadName.trim();
	if (!trimmed) return [];
	const refs: UsageReference[] = [];
	for (const shell of getShellMap().values()) {
		if (shell.load.loadName.trim() === trimmed) {
			refs.push({ kind: "shell", name: shell.name, detail: "main load" });
		} else if (shell.ascendEffects.some(e => e.loadName.trim() === trimmed)) {
			refs.push({ kind: "shell", name: shell.name, detail: "ascend load" });
		}
	}
	// Shell of Shells sub-loads inside other loads
	for (const load of getLoadMap().values()) {
		for (const effect of load.effects) {
			if (effect.type === EffectType.ShellOfShells) {
				const subLoads: ShellLoad[] = (effect as unknown as { subLoads?: ShellLoad[] }).subLoads ?? [];
				if (subLoads.some(sl => sl.loadName.trim() === trimmed)) {
					refs.push({ kind: "load", name: load.name, detail: "Shell of Shells sub-load" });
					break;
				}
			}
		}
	}
	return refs;
}

/** Find all sequences that contain an entry for the given shell name. */
export function findShellUsages(shellName: string): UsageReference[] {
	const trimmed = shellName.trim();
	if (!trimmed) return [];
	const refs: UsageReference[] = [];
	for (const seq of getSequenceMap().values()) {
		if (seq.items.some(e => e.itemType === SequenceItemType.Shell && e.itemName.trim() === trimmed)) {
			refs.push({ kind: "sequence", name: seq.name });
		}
	}
	return refs;
}

/** Find all sequences that contain an entry for the given ground-effect name. */
export function findGroundEffectUsages(geName: string): UsageReference[] {
	const trimmed = geName.trim();
	if (!trimmed) return [];
	const refs: UsageReference[] = [];
	for (const seq of getSequenceMap().values()) {
		if (seq.items.some(e => e.itemType === SequenceItemType.GroundEffect && e.itemName.trim() === trimmed)) {
			refs.push({ kind: "sequence", name: seq.name });
		}
	}
	return refs;
}

/** Find all sequences and shows that reference the given sequence by name. */
export function findSequenceUsages(seqName: string): UsageReference[] {
	const trimmed = seqName.trim();
	if (!trimmed) return [];
	const refs: UsageReference[] = [];
	for (const seq of getSequenceMap().values()) {
		if (seq.items.some(e => e.itemType === SequenceItemType.Sequence && e.itemName.trim() === trimmed)) {
			refs.push({ kind: "sequence", name: seq.name });
		}
	}
	for (const show of getShotShowMap().values()) {
		if (show.sequence.trim() === trimmed) {
			refs.push({ kind: "show", name: show.name });
		}
	}
	return refs;
}

// ---------------------------------------------------------------------------
// Removal helpers ("Remove from all" option)
// ---------------------------------------------------------------------------

/**
 * Remove entries matching itemName+itemType from a sequence clone using
 * lock-on-time mode (absolute times of subsequent entries are preserved).
 */
function removeLockOnTimeItemsFromSequence(seq: Sequence, indicesToRemove: number[]): void {
	// Remove from highest index first so lower indices are not shifted.
	const sorted = [...indicesToRemove].sort((a, b) => b - a);
	for (const row of sorted) {
		if (row < 0 || row >= seq.items.length) continue;
		if (row + 1 < seq.items.length) {
			const savedCumulativeBelow = seq.items[row + 1].cumulativeTimeTillLight;
			seq.removeItemAt(row, resolveSequence);
			if (row < seq.items.length) {
				let effectiveBase = row === 0 ? 0 : seq.items[row - 1].cumulativeTimeTillLight;
				if (row > 0) {
					const prevEntry = seq.items[row - 1];
					if (prevEntry.itemType === SequenceItemType.Sequence && prevEntry.nextItemAfterEnd) {
						const prevSeq = resolveSequence(prevEntry.itemName);
						if (prevSeq) effectiveBase += prevSeq.getEndCumulativeTime(resolveSequence);
					}
				}
				seq.items[row].timeTillLight = Math.max(0, savedCumulativeBelow - effectiveBase);
				seq.recalculateCumulativeTimesFromIndex(row, 0, resolveSequence);
			}
		} else {
			seq.removeItemAt(row, resolveSequence);
		}
	}
}

/**
 * Remove any effects that reference the given colour sequence from every load
 * and every ground effect. The load/ground effect itself is kept; only the
 * matching effects are removed.
 */
export function removeColourSequenceUsages(seqName: string): void {
	const trimmed = seqName.trim();

	// Strip matching effects from loads
	const updatedLoads = [...getLoadMap().values()].map(load => {
		const kept = load.effects.filter(e => (e.colours?.sequenceName ?? "").trim() !== trimmed);
		if (kept.length === load.effects.length) return load;
		return new Load(kept.map(cloneEffect), load.name);
	});
	setLoadList(updatedLoads);

	// Strip matching effects from ground effects
	const updatedGes = [...getGroundEffectMap().values()].map(ge => {
		const kept = ge.effects.filter(e => (e.colours?.sequenceName ?? "").trim() !== trimmed);
		if (kept.length === ge.effects.length) return ge;
		return new GroundEffect(kept.map(cloneEffect), ge.name, ge.position);
	});
	setGroundEffectList(updatedGes);
}

/**
 * Cascade-delete every shell and ground effect that uses the given launch site
 * as their position. Each deleted item is first removed from all sequences
 * (lock-on-time), then deleted from its respective map.
 */
export function removeLaunchSiteUsages(siteName: string): void {
	const trimmed = siteName.trim();

	const shellNames = [...getShellMap().values()]
		.filter(s => typeof s.position === "string" && s.position.trim() === trimmed)
		.map(s => s.name);

	const geNames = [...getGroundEffectMap().values()]
		.filter(ge => ge.position.trim() === trimmed)
		.map(ge => ge.name);

	// Remove each affected shell from sequences, then delete from shellMap
	for (const name of shellNames) {
		removeItemFromSequences(name, SequenceItemType.Shell);
	}
	if (shellNames.length > 0) {
		setShellList([...getShellMap().values()].filter(s => shellNames.indexOf(s.name) < 0));
	}

	// Remove each affected ground effect from sequences, then delete from groundEffectMap
	for (const name of geNames) {
		removeItemFromSequences(name, SequenceItemType.GroundEffect);
	}
	if (geNames.length > 0) {
		setGroundEffectList([...getGroundEffectMap().values()].filter(ge => geNames.indexOf(ge.name) < 0));
	}
}

/**
 * Cascade-delete every shell that uses the given load (main load or any ascend
 * load). Each shell is first removed from all sequences (lock-on-time), then
 * deleted from the shellMap. Shell-of-Shells sub-load references
 * inside other loads and ground effects are stripped rather than causing
 * full deletions.
 */
export function removeLoadUsages(loadName: string): void {
	const trimmed = loadName.trim();

	// Identify every shell that references this load
	const shellNames = [...getShellMap().values()]
		.filter(s =>
			s.load.loadName.trim() === trimmed ||
			s.ascendEffects.some(e => e.loadName.trim() === trimmed)
		)
		.map(s => s.name);

	// Remove each of those shells from sequences, then delete from shellMap
	for (const name of shellNames) {
		removeItemFromSequences(name, SequenceItemType.Shell);
	}
	if (shellNames.length > 0) {
		setShellList([...getShellMap().values()].filter(s => shellNames.indexOf(s.name) < 0));
	}

	// Strip Shell-of-Shells sub-load references from other loads
	let loadChanged = false;
	const updatedLoads = [...getLoadMap().values()].map(load => {
		const cloned = cloneLoad(load);
		let changed = false;
		for (const effect of cloned.effects) {
			if (effect.type === EffectType.ShellOfShells) {
				const bb = effect as unknown as { subLoads?: ShellLoad[] };
				if (bb.subLoads) {
					const before = bb.subLoads.length;
					bb.subLoads = bb.subLoads.filter(sl => sl.loadName.trim() !== trimmed);
					if (bb.subLoads.length !== before) changed = true;
				}
			}
		}
		if (changed) loadChanged = true;
		return changed ? cloned : load;
	});
	if (loadChanged) setLoadList(updatedLoads);

	// Strip Shell-of-Shells sub-load references from ground effects
	let geChanged = false;
	const updatedGes = [...getGroundEffectMap().values()].map(ge => {
		let changed = false;
		const newEffects = ge.effects.map(effect => {
			if (effect.type === EffectType.ShellOfShells) {
				const bb = effect as unknown as { subLoads?: ShellLoad[] };
				if (bb.subLoads && bb.subLoads.some(sl => sl.loadName.trim() === trimmed)) {
					const clonedEffect = cloneEffect(effect);
					(clonedEffect as unknown as { subLoads: ShellLoad[] }).subLoads =
						(bb.subLoads ?? []).filter(sl => sl.loadName.trim() !== trimmed);
					changed = true;
					return clonedEffect;
				}
			}
			return effect;
		});
		if (changed) geChanged = true;
		return changed ? new GroundEffect(newEffects, ge.name, ge.position) : ge;
	});
	if (geChanged) setGroundEffectList(updatedGes);
}

/**
 * Remove all entries of the given name+type from every sequence, preserving
 * the absolute timing of subsequent entries (lock-on-time removal).
 */
export function removeItemFromSequences(itemName: string, itemType: SequenceItemType): void {
	const trimmed = itemName.trim();
	const seqMap = getSequenceMap();
	const updatedSeqs: Sequence[] = [];

	for (const seq of seqMap.values()) {
		const indices: number[] = [];
		for (let i = 0; i < seq.items.length; i++) {
			const e = seq.items[i];
			if (e.itemType === itemType && e.itemName.trim() === trimmed) {
				indices.push(i);
			}
		}

		if (indices.length > 0) {
			const cloned = cloneSequence(seq);
			cloned.recalculateCumulativeTimes(0, resolveSequence);
			removeLockOnTimeItemsFromSequence(cloned, indices);
			updatedSeqs.push(cloned);
		} else {
			updatedSeqs.push(seq);
		}
	}

	setSequenceList(updatedSeqs);
}

/**
 * Clear the sequence field on every show that references the given sequence name.
 */
export function removeSequenceFromShows(seqName: string): void {
	const trimmed = seqName.trim();
	const updated = [...getShotShowMap().values()].map(show => {
		if (show.sequence.trim() === trimmed) {
			return new Show(
				show.name, "", show.interruptWhenTooManyParticles,
				show.anouncement1, show.anouncement2,
				show.trigger, show.music, show.musicRideID, show.launchTerrain
			);
		}
		return show;
	});
	setShotShow(updated);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Build a ValidationContext snapshot from current persistent state. */
export function buildValidationContext(): ValidationContext {
	return {
		colourSequences: colourSequences.get(),
		loadMap: getLoadMap(),
		shellMap: getShellMap(),
		groundEffectMap: getGroundEffectMap(),
		sequenceMap: getSequenceMap(),
		launchSites: [...launchSites],
	};
}

/**
 * Format a list of ValidationIssues into a user-facing message string.
 * Shows up to `maxShown` issues; remainder is summarised.
 */
export function formatValidationIssues(issues: ValidationIssue[], maxShown: number = 3): string {
	const shown = issues.slice(0, maxShown);
	const rest = issues.length - shown.length;
	const lines = shown.map(i => `\u2022 ${i.problem} (at ${i.path})`);
	if (rest > 0) {
		lines.push(`\u2026 and ${rest} more issue${rest > 1 ? "s" : ""}`);
	}
	return lines.join("\n");
}
