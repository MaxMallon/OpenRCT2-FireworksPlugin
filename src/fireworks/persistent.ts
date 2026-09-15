import { t } from "../localization";
import { Colour, store } from "openrct2-flexui";
import { ColourSequence } from "./structures/ColourStructures";
import { defaultColourSequences, deserializeParkState, serializeParkState } from "./parkStorage";
import type { PlaybackState, SerializedPlayerState, SerializedShowPlayerState, SerializedExplosion, SerializedEditorStates } from "./parkStorage";
import { Effect, EmitterEffect } from "./structures/Effect";
import { Shell, GroundEffect } from "./structures/Firework";
import { LaunchSite } from "./structures/LaunchSite";
import { Load } from "./structures/Load";
import { Sequence, SequenceEntry } from "./structures/Sequence";
import { ShellLoad } from "./structures/ShellLoad";
import { Show } from "./structures/Show";
import { pluginVersion, downloadURL } from "../pluginInfo";
import { openNewerPluginVersionWarningWindow } from "../ui/newerPluginVersionWarningWindow";

// Everything that needs to be saved to file

const parkStorageKey = "fireworks-plugin-state";

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
export const colourSequences = store<ColourSequence[]>(defaultColourSequences());

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

function isNewerPluginVersion(savedVersion: string, currentVersion: string): boolean
{
	const savedParts = savedVersion.match(/\d+/g);
	const currentParts = currentVersion.match(/\d+/g);
	if (!savedParts || !currentParts)
	{
		return false;
	}

	const partCount = Math.max(savedParts.length, currentParts.length);
	for (let index = 0; index < partCount; index++)
	{
		const savedPart = Number(savedParts[index] ?? 0);
		const currentPart = Number(currentParts[index] ?? 0);
		if (savedPart !== currentPart)
		{
			return savedPart > currentPart;
		}
	}

	return false;
}

function warnIfParkUsesNewerPluginVersion(savedVersion: string): void
{
	if (!isNewerPluginVersion(savedVersion, pluginVersion))
	{
		return;
	}

	const title = t("Newer Fireworks Plugin Version");
	const message = `This park was saved with Fireworks ${savedVersion}, but this installation is ${pluginVersion}. An attempt to load has been made, but some or all features may be broken.\nDownload the new version from ${downloadURL}`;
	if (typeof ui !== "undefined")
	{
		openNewerPluginVersionWarningWindow(savedVersion, pluginVersion, downloadURL);
		return;
	}

	console.log(`Warning: ${title}: ${message}`);
}

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
function normalizeLaunchSiteName(name: string): string
{
	return name.trim();
}

export function getLaunchSiteByName(name: string): LaunchSite | undefined
{
	const normalizedName = normalizeLaunchSiteName(name);
	if (!normalizedName)
	{
		return undefined;
	}

	return launchSites.find(site => site.name === normalizedName);
}

export function GetLaunchSiteByName(name: string): LaunchSite | undefined {
	return getLaunchSiteByName(name);
}

export function resolveLaunchSitePosition(position: string | CoordsXYZ): CoordsXYZ | undefined
{
	if (typeof position !== "string")
	{
		return position;
	}

	const launchSite = getLaunchSiteByName(position);
	if (!launchSite)
	{
		return undefined;
	}

	if (launchSite.entityId === undefined)
	{
		return launchSite.position;
	}

	const entity = map.getEntity(launchSite.entityId);
	if (!entity)
	{
		return launchSite.position;
	}

	return {
		x: entity.x + launchSite.position.x,
		y: entity.y + launchSite.position.y,
		z: entity.z + launchSite.position.z
	};
}

export function registerLaunchSite(name: string, position: CoordsXYZ): void
{
	const normalizedName = normalizeLaunchSiteName(name);
	if (!normalizedName)
	{
		return;
	}

	setLaunchSites([...launchSites, new LaunchSite(normalizedName, position, undefined)]);
}

export function unregisterLaunchSite(name: string): void
{
	const normalizedName = normalizeLaunchSiteName(name);
	if (!normalizedName)
	{
		return;
	}

	setLaunchSites(launchSites.filter(site => site.name !== normalizedName));
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
type ShowPlayerSnapshotFn = () => SerializedShowPlayerState[];
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

// Callback for in-flight shell explosions.
type GetExplosionsFn = () => SerializedExplosion[];
let _getExplosionsSnapshot: GetExplosionsFn | undefined;

export function registerExplosionsCallback(fn: GetExplosionsFn): void {
	_getExplosionsSnapshot = fn;
}

// Callback for active continuous emitters.
type GetEmittersFn = () => any[];
let _getEmittersSnapshot: GetEmittersFn | undefined;

export function registerEmittersCallback(fn: GetEmittersFn): void {
	_getEmittersSnapshot = fn;
}

// Callbacks for editor state persistence.
type EditorSnapshotFn = () => SerializedEditorStates;
type RestoreEditorFn = (state: SerializedEditorStates | undefined, decodeEffect: (effect: any) => Effect) => void;
type ResetEditorFn = () => void;

let _getEditorSnapshot: EditorSnapshotFn | undefined;
let _restoreEditorFromSnapshot: RestoreEditorFn | undefined;
let _resetEditorState: ResetEditorFn | undefined;

export function registerEditorCallbacks(
	snapshotFn: EditorSnapshotFn,
	restoreFn: RestoreEditorFn,
	resetFn: ResetEditorFn
): void {
	_getEditorSnapshot = snapshotFn;
	_restoreEditorFromSnapshot = restoreFn;
	_resetEditorState = resetFn;
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
	if (_resetEditorState) {
		_resetEditorState();
	}
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
	colourSequences.set(defaultColourSequences());
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
	const editors = _getEditorSnapshot ? _getEditorSnapshot() : undefined;
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
			pendingExplosions: _getExplosionsSnapshot?.(),
			pendingEmitters: _getEmittersSnapshot?.(),
			showPlayers: _getShowPlayerSnapshot ? _getShowPlayerSnapshot() : undefined
		},
		editors
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
			onPluginVersionLoaded: warnIfParkUsesNewerPluginVersion,
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
			},
			restoreEditorState: (editors, decodeEffectFn) => {
				if (_restoreEditorFromSnapshot && decodeEffectFn) {
					_restoreEditorFromSnapshot(editors, decodeEffectFn);
				}
			}
		});
	}
	finally
	{
		isRestoringParkState = false;
	}
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
}
export function setShellMap(value: Map<string, Shell>): void {
	shellMap.clear();
	value.forEach((v, k) => shellMap.set(k, v));
	definedShells.set([...shellMap.values()]);
}
export function setGroundEffectMap(value: Map<string, GroundEffect>): void {
	groundEffectMap.clear();
	value.forEach((v, k) => groundEffectMap.set(k, v));
	definedGroundEffects.set([...groundEffectMap.values()]);
}
export function setSequenceMap(value: Map<string, Sequence>): void {
	sequenceMap.clear();
	value.forEach((v, k) => sequenceMap.set(k, v));
	definedSequences.set([...sequenceMap.values()]);
}
export function setShotShowMap(value: Map<string, Show>): void {
	showMap.clear();
	value.forEach((v, k) => showMap.set(k, v));
	definedShows.set([...showMap.values()]);
}

// Array setters — rebuild map from array keyed by item name
export function setLoadList(value: Load[]): void {
	loadMap.clear();
	for (const item of value) { loadMap.set(item.name, item); }
	definedLoads.set([...loadMap.values()]);
}
export function setShellList(value: Shell[]): void {
	shellMap.clear();
	for (const item of value) { shellMap.set(item.name, item); }
	definedShells.set([...shellMap.values()]);
}
export function setGroundEffectList(value: GroundEffect[]): void {
	groundEffectMap.clear();
	for (const item of value) { groundEffectMap.set(item.name, item); }
	definedGroundEffects.set([...groundEffectMap.values()]);
}
export function setSequenceList(value: Sequence[]): void {
	sequenceMap.clear();
	for (const item of value) { sequenceMap.set(item.name, item); }
	definedSequences.set([...sequenceMap.values()]);
}
export function setShotShow(value: Show[]): void {
	showMap.clear();
	for (const item of value) { showMap.set(item.name, item); }
	definedShows.set([...showMap.values()]);
}

// Name-based lookup helpers
export function resolveLoad(name: string): Load | undefined { return loadMap.get(name.trim()); }
export function resolveShell(name: string): Shell | undefined { return shellMap.get(name.trim()); }
export function resolveGroundEffect(name: string): GroundEffect | undefined { return groundEffectMap.get(name.trim()); }
export function resolveSequence(name: string, visited: Set<string> = new Set<string>()): Sequence | undefined {
	const trimmed = name.trim();
	if (visited.has(trimmed)) return undefined;
	const seq = sequenceMap.get(trimmed);
	if (!seq) return undefined;

	visited.add(trimmed);
	const clone = new Sequence(seq.name, seq.items.map(e => new SequenceEntry(
		e.itemName, e.itemType, e.timeTillLight, e.cumulativeTimeTillLight, e.nextItemAfterEnd
	)));
	clone.recalculateCumulativeTimes(0, n => resolveSequence(n, new Set(visited)));
	return clone;
}

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
}

export function setLaunchSites(value: LaunchSite[]): void
{
	const normalizedSites = value
		.map(site => {
			const name = normalizeLaunchSiteName(site.name);
			return name ? new LaunchSite(name, site.position, site.entityId) : undefined;
		})
		.filter((site): site is LaunchSite => site !== undefined);
	launchSites.splice(0, launchSites.length, ...normalizedSites);
	launchSitesRevision.set(launchSitesRevision.get() + 1);
}

export function UpdateLaunchSiteMapResize(shiftX: number, shiftY: number): void {
	launchSites.forEach(site => {
		if (site.entityId === undefined) {
			site.position.x += shiftX * 32;
			site.position.y += shiftY * 32;
		}
	});
	launchSitesRevision.set(launchSitesRevision.get() + 1);
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


