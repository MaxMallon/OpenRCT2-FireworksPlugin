import { isKorean, t } from "../localization";
import { ColourSequence } from "./structures/ColourStructures";
import { cloneEffect, cloneLoad, cloneSequence } from "./cloneHelpers";
import { getLoadMap, getShellMap, getGroundEffectMap, getSequenceMap, getShotShowMap, resolveSequence, setLoadList, setShellList, setGroundEffectList, setSequenceList, setShotShow, colourSequences, launchSites, getEditLoad, setEditLoad, getShellToEdit, setShellToEdit, getGroundEffectToEdit, setGroundEffectToEdit, getEditSequence, setEditSequence, getEditShow, setEditShow } from "./persistent";
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

export type UsageKind = "load" | "shell" | "groundEffect" | "sequence" | "show" | "unsavedEditor";

export interface UsageReference {
	kind: UsageKind;
	name: string;
	/** Extra context, e.g. "ascend load" or "Shell of Shells sub-load". */
	detail?: string;
}

/** Build a usage reference for an item currently selected in an unsaved (not-yet-added) editor tab. */
function unsavedEditorUsage(detail: string): UsageReference {
	return { kind: "unsavedEditor", name: t("Current unsaved editor state"), detail };
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

	const editedLoad = getEditLoad();
	if (editedLoad && editedLoad.effects.some(e => (e.colours?.sequenceName ?? "").trim() === trimmed)) {
		refs.push(unsavedEditorUsage(t("Load tab (unsaved load)")));
	}
	const editedGroundEffect = getGroundEffectToEdit();
	if (editedGroundEffect && editedGroundEffect.effects.some(e => (e.colours?.sequenceName ?? "").trim() === trimmed)) {
		refs.push(unsavedEditorUsage(t("Ground effect tab (unsaved ground effect)")));
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

	const editedShell = getShellToEdit();
	if (editedShell && typeof editedShell.position === "string" && editedShell.position.trim() === trimmed) {
		refs.push(unsavedEditorUsage(t("Shell tab (unsaved shell)")));
	}
	const editedGroundEffect = getGroundEffectToEdit();
	if (editedGroundEffect && editedGroundEffect.position.trim() === trimmed) {
		refs.push(unsavedEditorUsage(t("Ground effect tab (unsaved ground effect)")));
	}
	const editedShow = getEditShow();
	if (editedShow && (editedShow.launchTerrain ?? "").trim() === trimmed) {
		refs.push(unsavedEditorUsage(t("Show tab (unsaved show)")));
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
			refs.push({ kind: "shell", name: shell.name, detail: t("main load") });
		} else if (shell.ascendEffects.some(e => e.loadName.trim() === trimmed)) {
			refs.push({ kind: "shell", name: shell.name, detail: t("ascend load") });
		}
	}
	// Shell of Shells sub-loads inside other loads
	for (const load of getLoadMap().values()) {
		for (const effect of load.effects) {
			if (effect.type === EffectType.ShellOfShells) {
				const subLoads: ShellLoad[] = (effect as unknown as { subLoads?: ShellLoad[] }).subLoads ?? [];
				if (subLoads.some(sl => sl.loadName.trim() === trimmed)) {
					refs.push({ kind: "load", name: load.name, detail: t("Shell of Shells sub-load") });
					break;
				}
			}
		}
	}

	const editedShell = getShellToEdit();
	if (editedShell && (editedShell.load.loadName.trim() === trimmed || editedShell.ascendEffects.some(e => e.loadName.trim() === trimmed))) {
		refs.push(unsavedEditorUsage(t("Shell tab (unsaved shell)")));
	}
	const editedLoad = getEditLoad();
	if (editedLoad) {
		for (const effect of editedLoad.effects) {
			if (effect.type === EffectType.ShellOfShells) {
				const subLoads: ShellLoad[] = (effect as unknown as { subLoads?: ShellLoad[] }).subLoads ?? [];
				if (subLoads.some(sl => sl.loadName.trim() === trimmed)) {
					refs.push(unsavedEditorUsage(t("Load tab (unsaved load, Shell of Shells sub-load)")));
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

	const editedSequence = getEditSequence();
	if (editedSequence && editedSequence.items.some(e => e.itemType === SequenceItemType.Shell && e.itemName.trim() === trimmed)) {
		refs.push(unsavedEditorUsage(t("Sequence tab (unsaved sequence)")));
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

	const editedSequence = getEditSequence();
	if (editedSequence && editedSequence.items.some(e => e.itemType === SequenceItemType.GroundEffect && e.itemName.trim() === trimmed)) {
		refs.push(unsavedEditorUsage(t("Sequence tab (unsaved sequence)")));
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

	const editedSequence = getEditSequence();
	if (editedSequence && editedSequence.items.some(e => e.itemType === SequenceItemType.Sequence && e.itemName.trim() === trimmed)) {
		refs.push(unsavedEditorUsage(t("Sequence tab (unsaved sequence)")));
	}
	const editedShow = getEditShow();
	if (editedShow && editedShow.sequence.trim() === trimmed) {
		refs.push(unsavedEditorUsage(t("Show tab (unsaved show)")));
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

	// Strip matching effects from the currently unsaved editor state
	const editedLoad = getEditLoad();
	if (editedLoad) {
		const kept = editedLoad.effects.filter(e => (e.colours?.sequenceName ?? "").trim() !== trimmed);
		if (kept.length !== editedLoad.effects.length) {
			setEditLoad(new Load(kept.map(cloneEffect), editedLoad.name));
		}
	}
	const editedGroundEffect = getGroundEffectToEdit();
	if (editedGroundEffect) {
		const kept = editedGroundEffect.effects.filter(e => (e.colours?.sequenceName ?? "").trim() !== trimmed);
		if (kept.length !== editedGroundEffect.effects.length) {
			setGroundEffectToEdit(new GroundEffect(kept.map(cloneEffect), editedGroundEffect.name, editedGroundEffect.position));
		}
	}
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

	// Clear the launch site from the currently unsaved editor state
	const editedShell = getShellToEdit();
	if (editedShell && typeof editedShell.position === "string" && editedShell.position.trim() === trimmed) {
		editedShell.position = "";
		setShellToEdit(editedShell);
	}
	const editedGroundEffect = getGroundEffectToEdit();
	if (editedGroundEffect && editedGroundEffect.position.trim() === trimmed) {
		setGroundEffectToEdit(new GroundEffect(editedGroundEffect.effects, editedGroundEffect.name, ""));
	}
	const editedShow = getEditShow();
	if (editedShow && (editedShow.launchTerrain ?? "").trim() === trimmed) {
		setEditShow(new Show(
			editedShow.name, editedShow.sequence, editedShow.interruptWhenTooManyParticles,
			editedShow.anouncement1, editedShow.anouncement2,
			editedShow.trigger, editedShow.music, editedShow.musicRideID, undefined, editedShow.enabled
		));
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

	// Clear this load reference from the currently unsaved editor state
	const editedShell = getShellToEdit();
	if (editedShell) {
		let shellChanged = false;
		if (editedShell.load.loadName.trim() === trimmed) {
			editedShell.load = new ShellLoad("", editedShell.load.timeTillExplode);
			shellChanged = true;
		}
		if (editedShell.ascendEffects.some(e => e.loadName.trim() === trimmed)) {
			editedShell.ascendEffects = editedShell.ascendEffects.filter(e => e.loadName.trim() !== trimmed);
			shellChanged = true;
		}
		if (shellChanged) setShellToEdit(editedShell);
	}
	const editedLoad = getEditLoad();
	if (editedLoad) {
		let loadEditChanged = false;
		const newEffects = editedLoad.effects.map(effect => {
			if (effect.type === EffectType.ShellOfShells) {
				const bb = effect as unknown as { subLoads?: ShellLoad[] };
				if (bb.subLoads && bb.subLoads.some(sl => sl.loadName.trim() === trimmed)) {
					const clonedEffect = cloneEffect(effect);
					(clonedEffect as unknown as { subLoads: ShellLoad[] }).subLoads =
						(bb.subLoads ?? []).filter(sl => sl.loadName.trim() !== trimmed);
					loadEditChanged = true;
					return clonedEffect;
				}
			}
			return effect;
		});
		if (loadEditChanged) setEditLoad(new Load(newEffects, editedLoad.name));
	}
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

	// Also strip matching entries from the currently unsaved editor sequence
	const editedSequence = getEditSequence();
	if (editedSequence) {
		const indices: number[] = [];
		for (let i = 0; i < editedSequence.items.length; i++) {
			const e = editedSequence.items[i];
			if (e.itemType === itemType && e.itemName.trim() === trimmed) {
				indices.push(i);
			}
		}
		if (indices.length > 0) {
			const cloned = cloneSequence(editedSequence);
			cloned.recalculateCumulativeTimes(0, resolveSequence);
			removeLockOnTimeItemsFromSequence(cloned, indices);
			setEditSequence(cloned);
		}
	}
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

	// Also clear the sequence from the currently unsaved editor state
	const editedSequence = getEditSequence();
	if (editedSequence && editedSequence.items.some(e => e.itemType === SequenceItemType.Sequence && e.itemName.trim() === trimmed)) {
		const indices: number[] = [];
		for (let i = 0; i < editedSequence.items.length; i++) {
			const e = editedSequence.items[i];
			if (e.itemType === SequenceItemType.Sequence && e.itemName.trim() === trimmed) {
				indices.push(i);
			}
		}
		const cloned = cloneSequence(editedSequence);
		cloned.recalculateCumulativeTimes(0, resolveSequence);
		removeLockOnTimeItemsFromSequence(cloned, indices);
		setEditSequence(cloned);
	}
	const editedShow = getEditShow();
	if (editedShow && editedShow.sequence.trim() === trimmed) {
		setEditShow(new Show(
			editedShow.name, "", editedShow.interruptWhenTooManyParticles,
			editedShow.anouncement1, editedShow.anouncement2,
			editedShow.trigger, editedShow.music, editedShow.musicRideID, editedShow.launchTerrain, editedShow.enabled
		));
	}
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
		lines.push(isKorean() ? `\u2026 그 외 문제 ${rest}개` : `\u2026 and ${rest} more issue${rest > 1 ? "s" : ""}`);
	}
	return lines.join("\n");
}
