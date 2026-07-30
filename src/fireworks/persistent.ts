import { Colour, store } from "openrct2-flexui";
import { ColourSequence } from "./structures/ColourStructures";
import { defaultColourSequences, deserializeParkState, serializeParkState } from "./parkStorage";
import type { PlaybackState, SerializedPlayerState, SerializedShowPlayerState } from "./parkStorage";
import { EmitterEffect } from "./structures/Effect";
import { Shell, GroundEffect } from "./structures/Firework";
import { LaunchSite } from "./structures/LaunchSite";
import { Load } from "./structures/Load";
import { Sequence } from "./structures/Sequence";
import { ShellLoad } from "./structures/ShellLoad";
import { Show } from "./structures/Show";

const parkStorageKey = "fireworks-plugin-state";

function createDefaultColourSequences(): ColourSequence[]
{
	return defaultColourSequences();
}

export const launchSites: LaunchSite[] = [];
export const launchSitesRevision = store(0);
export let editLoad: Load | undefined = undefined;
export let loadMap: Map<string, Load> = new Map();
export let shellLoadToEdit: ShellLoad | undefined = undefined;
export let shellToEdit: Shell | undefined = undefined;
export let shellMap: Map<string, Shell> = new Map();
export let emitterList: EmitterEffect[] = [];
export let groundEffectMap: Map<string, GroundEffect> = new Map();
export let groundEffectToEdit: GroundEffect | undefined = undefined;
export let editSequence: Sequence | undefined = undefined;
export let sequenceMap: Map<string, Sequence> = new Map();
export let editShow: Show | undefined = undefined;
export let showMap: Map<string, Show> = new Map();
export const colourSequences = store<ColourSequence[]>(createDefaultColourSequences());

// Reactive UI stores — kept in sync by all setters; tabs bind to these directly.
export const definedLoads = store<Load[]>([]);
export const definedShells = store<Shell[]>([]);
export const definedGroundEffects = store<GroundEffect[]>([]);
export const definedSequences = store<Sequence[]>([]);
export const definedShows = store<Show[]>([]);

export let interruptWhenTooManyParticles: boolean = true;
export let showPositionTarget: number = 0;
export let isShowPlaying: boolean = true;
export let fireworkEffectsActive: boolean = false;
export let effectTick: number = 0;
export let showTick: number = 0;

let isRestoringParkState = false;

export function GetLoadByName(name: string): Load | undefined {
	return loadMap.get(name);
}
export function GetShellByName(name: string): Shell | undefined {
	return shellMap.get(name);
}
export function GetGroundEffectByName(name: string): GroundEffect | undefined {
	return groundEffectMap.get(name);
}
export function GetSequenceByName(name: string): Sequence | undefined {	
	return sequenceMap.get(name);
}
export function GetShowByName(name: string): Show | undefined {
	return showMap.get(name);
}
export function GetLaunchSiteByName(name: string): LaunchSite | undefined {
	return launchSites.find(site => site.name === name);
}
export function GetColourSequenceByName(name: string): ColourSequence | undefined {
	return colourSequences.get().find(seq => seq.name === name);
}

// Callbacks registered by player.ts to avoid circular imports.
type PlayerSnapshotFn = () => SerializedPlayerState[];
type RestorePlayersFn = (playback: PlaybackState) => void;
let _getPlayersSnapshot: PlayerSnapshotFn | undefined;
let _restorePlayersFromSnapshot: RestorePlayersFn | undefined;

export function registerPlayerCallbacks(
	snapshotFn: PlayerSnapshotFn,
	restoreFn: RestorePlayersFn
): void {
	_getPlayersSnapshot = snapshotFn;
	_restorePlayersFromSnapshot = restoreFn;
}

// Callbacks registered by showPlayer.ts to avoid circular imports.
type ShowPlayerSnapshotFn = () => SerializedShowPlayerState;
type RestoreShowPlayerFn = (playback: PlaybackState) => void;
let _getShowPlayerSnapshot: ShowPlayerSnapshotFn | undefined;
let _restoreShowPlayer: RestoreShowPlayerFn | undefined;

export function registerShowPlayerCallbacks(
	snapshotFn: ShowPlayerSnapshotFn,
	restoreFn: RestoreShowPlayerFn
): void {
	_getShowPlayerSnapshot = snapshotFn;
	_restoreShowPlayer = restoreFn;
}

function getParkStorage(): { get<T>(key: string): T | undefined; set<T>(key: string, value: T): void } | undefined
{
	if (typeof context === "undefined" || typeof context.getParkStorage !== "function")
	{
		return undefined;
	}

	return context.getParkStorage();
}

function clearTransientState(): void
{
	editLoad = undefined;
	shellLoadToEdit = undefined;
	shellToEdit = undefined;
	groundEffectToEdit = undefined;
	editSequence = undefined;
	editShow = undefined;
	fireworkEffectsActive = false;
	effectTick = 0;
	interruptWhenTooManyParticles = true;
}

export function resetPersistentStateToDefaults(): void
{
	launchSites.splice(0, launchSites.length);
	loadMap.clear();
	shellMap.clear();
	emitterList.splice(0, emitterList.length);
	groundEffectMap.clear();
	sequenceMap.clear();
	showMap.clear();
	definedLoads.set([]);
	definedShells.set([]);
	definedGroundEffects.set([]);
	definedSequences.set([]);
	definedShows.set([]);
	colourSequences.set(createDefaultColourSequences());
	launchSitesRevision.set(0);
	clearTransientState();
}

export function saveParkState(): void
{
	if (isRestoringParkState)
	{
		return;
	}

	const storage = getParkStorage();
	if (!storage)
	{
		return;
	}

	const players = _getPlayersSnapshot ? _getPlayersSnapshot() : [];
	storage.set(parkStorageKey, serializeParkState({
		launchSites,
		loadMap,
		shellMap,
		groundEffectMap,
		sequenceMap,
		shotShowMap: showMap,
		colourSequences: colourSequences.get(),
		playback: {
			ticks: effectTick,
			fireworkEffectsActive,
			interruptWhenTooManyParticles,
			players,
			showPlayer: _getShowPlayerSnapshot ? _getShowPlayerSnapshot() : undefined
		}
	}));
}

export function loadParkState(): void
{
	const storage = getParkStorage();
	resetPersistentStateToDefaults();

	if (!storage)
	{
		return;
	}

	const rawState = storage.get<string>(parkStorageKey);
	if (!rawState)
	{
		return;
	}

	isRestoringParkState = true;
	try
	{
		deserializeParkState(rawState, {
			setLaunchSites,
			setLoadMap,
			setShellMap,
			setGroundEffectMap,
			setSequenceMap,
			setShotShowMap,
			setColourSequences,
			resetTransientState: clearTransientState,
			restorePlaybackState: (playback: PlaybackState) => {
				effectTick = isFinite(playback.ticks) ? Math.max(0, Math.floor(playback.ticks)) : 0;
				fireworkEffectsActive = !!playback.fireworkEffectsActive;
				interruptWhenTooManyParticles = playback.interruptWhenTooManyParticles !== false;
				if (_restorePlayersFromSnapshot) {
					_restorePlayersFromSnapshot(playback);
				}
				if (_restoreShowPlayer) {
					_restoreShowPlayer(playback);
				}
			}
		});
	}
	finally
	{
		isRestoringParkState = false;
	}

	saveParkState();
}

export function getLoadMap(): Map<string, Load> { return loadMap; }
export function getShellMap(): Map<string, Shell> { return shellMap; }
export function getGroundEffectMap(): Map<string, GroundEffect> { return groundEffectMap; }
export function getSequenceMap(): Map<string, Sequence> { return sequenceMap; }
export function getShotShowMap(): Map<string, Show> { return showMap; }

// Array getters — convenience wrappers for UI code
export function getLoadList(): Load[] { return [...loadMap.values()]; }
export function getShellList(): Shell[] { return [...shellMap.values()]; }
export function getGroundEffectList(): GroundEffect[] { return [...groundEffectMap.values()]; }
export function getSequenceList(): Sequence[] { return [...sequenceMap.values()]; }
export function getShotShow(): Show[] { return [...showMap.values()]; }

// Map setters
export function setLoadMap(value: Map<string, Load>): void {
	loadMap.clear();
	value.forEach((v, k) => loadMap.set(k, v));
	definedLoads.set([...loadMap.values()]);
	saveParkState();
}
export function setShellMap(value: Map<string, Shell>): void {
	shellMap.clear();
	value.forEach((v, k) => shellMap.set(k, v));
	definedShells.set([...shellMap.values()]);
	saveParkState();
}
export function setGroundEffectMap(value: Map<string, GroundEffect>): void {
	groundEffectMap.clear();
	value.forEach((v, k) => groundEffectMap.set(k, v));
	definedGroundEffects.set([...groundEffectMap.values()]);
	saveParkState();
}
export function setSequenceMap(value: Map<string, Sequence>): void {
	sequenceMap.clear();
	value.forEach((v, k) => sequenceMap.set(k, v));
	definedSequences.set([...sequenceMap.values()]);
	saveParkState();
}
export function setShotShowMap(value: Map<string, Show>): void {
	showMap.clear();
	value.forEach((v, k) => showMap.set(k, v));
	definedShows.set([...showMap.values()]);
	saveParkState();
}

// Array setters — rebuild map from array keyed by item name
export function setLoadList(value: Load[]): void {
	loadMap.clear();
	for (const item of value) { loadMap.set(item.name, item); }
	definedLoads.set([...loadMap.values()]);
	saveParkState();
}
export function setShellList(value: Shell[]): void {
	shellMap.clear();
	for (const item of value) { shellMap.set(item.name, item); }
	definedShells.set([...shellMap.values()]);
	saveParkState();
}
export function setGroundEffectList(value: GroundEffect[]): void {
	groundEffectMap.clear();
	for (const item of value) { groundEffectMap.set(item.name, item); }
	definedGroundEffects.set([...groundEffectMap.values()]);
	saveParkState();
}
export function setSequenceList(value: Sequence[]): void {
	sequenceMap.clear();
	for (const item of value) { sequenceMap.set(item.name, item); }
	definedSequences.set([...sequenceMap.values()]);
	saveParkState();
}
export function setShotShow(value: Show[]): void {
	showMap.clear();
	for (const item of value) { showMap.set(item.name, item); }
	definedShows.set([...showMap.values()]);
	saveParkState();
}

// Name-based lookup helpers
export function resolveLoad(name: string): Load | undefined { return loadMap.get(name.trim()); }
export function resolveShell(name: string): Shell | undefined { return shellMap.get(name.trim()); }
export function resolveGroundEffect(name: string): GroundEffect | undefined { return groundEffectMap.get(name.trim()); }
export function resolveSequence(name: string): Sequence | undefined { return sequenceMap.get(name.trim()); }

// Individual item accessors
export function getEditLoad(): Load | undefined { return editLoad; }
export function setEditLoad(value: Load | undefined): void { editLoad = value; }
export function getShellToEdit(): Shell | undefined { return shellToEdit; }
export function setShellToEdit(value: Shell | undefined): void { shellToEdit = value; }
export function getGroundEffectToEdit(): GroundEffect | undefined { return groundEffectToEdit; }
export function setGroundEffectToEdit(value: GroundEffect | undefined): void { groundEffectToEdit = value; }
export function getEditSequence(): Sequence | undefined { return editSequence; }
export function setEditSequence(value: Sequence | undefined): void { editSequence = value; }
export function getEditShow(): Show | undefined { return editShow; }
export function setEditShow(value: Show | undefined): void { editShow = value; }

export function incrementEffectTick(): void { effectTick++; }
export function incrementShowTick(): void { showTick++; }
export function setShowTick(value: number): void { showTick = value; }
export function setFireworkEffectsActive(value: boolean): void { fireworkEffectsActive = value; }
export function setInterruptWhenTooManyParticles(value: boolean): void { interruptWhenTooManyParticles = value; }

export function setColourSequences(value: ColourSequence[]): void
{
	colourSequences.set(value);
	saveParkState();
}

export function setLaunchSites(value: LaunchSite[]): void
{
	launchSites.splice(0, launchSites.length, ...value);
	launchSitesRevision.set(launchSitesRevision.get() + 1);
	saveParkState();
}


export function getColourSequenceByName(name: string): Colour[] | undefined
{
	const normalizedName = name.trim();
	const sequences = colourSequences.get();
	for (let index = 0; index < sequences.length; index++)
	{
		const item = sequences[index];
		if (item.name === normalizedName)
		{
			return [...item.colours];
		}
	}

	return undefined;
}

export function GetConfiguredColourSequence(sequenceName: string, reverse: boolean = false): Colour[] | undefined {
	const sequence = getColourSequenceByName(sequenceName);
	if (!sequence)
	{
		return undefined;
	}

	return reverse ? [...sequence].reverse() : sequence;
}

// ---- Shared storage: persisted across all parks ----

const sharedStorageKey_HasSeenTutorial = "fireworks.hasSeenTutorial";

function getSharedStorage(): { get<T>(key: string): T | undefined; set<T>(key: string, value: T): void } | undefined
{
	if (typeof context === "undefined" || typeof context.sharedStorage === "undefined")
	{
		return undefined;
	}
	return context.sharedStorage;
}

export function getHasSeenTutorial(): boolean
{
	return getSharedStorage()?.get<boolean>(sharedStorageKey_HasSeenTutorial) === true;
}

export function setHasSeenTutorial(value: boolean): void
{
	getSharedStorage()?.set(sharedStorageKey_HasSeenTutorial, value);
}

/*//TODO Max turn back on once PR merged
function UpdateLaunchSiteMapResize(shiftX: number, shiftY: number): void {
	launchSites.forEach(site => {
		if (site.entityId === undefined) {
			site.position.x += shiftX * 32;
			site.position.y += shiftY * 32;
		}
	});
	launchSitesRevision.set(launchSitesRevision.get() + 1);
	saveParkState();
}

context.subscribe("map.resize", (e: MapChangeSizeArgs) => UpdateLaunchSiteMapResize(e.shiftX, e.shiftY));
*/