import { Colour } from "openrct2-flexui";
import { ColourSequence } from "./structures/ColourStructures";
import { ShellOfShellsEffect } from "./structures/effects/burstEffects/shellOfShellsEffect";
import { CometFanEffect } from "./structures/effects/burstEffects/cometFanEffect";
import { MicroBurstEffect } from "./structures/effects/burstEffects/microBurstEffect";
import { PalmEffect, SprayBurstEffect } from "./structures/effects/burstEffects/palmEffect";
import { PictEffect } from "./structures/effects/burstEffects/pictEffect";
import { RingEffect } from "./structures/effects/burstEffects/ringEffect";
import { SphereEffect } from "./structures/effects/burstEffects/sphereEffect";
import { SprayEffectFromAir, SprayEffectFromGround } from "./structures/effects/burstEffects/sprayEffect";
import { SprayFanEffect } from "./structures/effects/burstEffects/sprayFanEffect";
import { StarEffect } from "./structures/effects/burstEffects/starEffect";
import { CrackleEffect } from "./structures/effects/EmitterEffects/crackleEffect";
import { FountainEffect } from "./structures/effects/EmitterEffects/fountainEffect";
import { UnknownEffect } from "./structures/effects/unknownEffect";
import { CometEffect } from "./structures/effects/burstEffects/cometEffect";
import { FlyingFishEffect } from "./structures/effects/burstEffects/flyingFishEffect";
import { SingularFishEffect } from "./structures/effects/EmitterEffects/singularFishEffect";
import { TrailEffect } from "./structures/effects/EmitterEffects/trailEffect";
import { TourbillionRisingWispEffect } from "./structures/effects/EmitterEffects/tourbillionRisingWispEffect";
import { Effect } from "./structures/Effect";
import { LaunchSite } from "./structures/LaunchSite";
import { Shell, GroundEffect } from "./structures/Firework";
import { Sequence } from "./structures/Sequence";
import { Load } from "./structures/Load";
import { Show } from "./structures/Show";
import { pluginVersion } from "../pluginInfo";

interface SerializedPlayerState {
	fireworksToBeShot: any[];
}

interface SerializedExplosion {
	loadName: string;
	timeTillExplode: number;
	particleId: number;
}

interface SerializedShowPlayerState {
	showName: string;
	lastFireTicksElapsed: number;
	lastFireDay: number;
	lastFireMonth: number;
	lastFireYear: number;
	announcementSent: boolean;
}

// Editor states persist the in-progress draft as the domain object's park data,
// plus any editor-only fields that cannot be represented by the domain object.
export interface SerializedLaunchSiteEditorState {
	launchSite?: any;
}

export interface SerializedLoadEditorState {
	load?: any;
	isEffectDeleteMode?: boolean;
}

export interface SerializedShellEditorState {
	shell?: any;
	syncHeightAndDelay?: boolean;
}

export interface SerializedGroundEffectEditorState {
	groundEffect?: any;
	isEffectDeleteMode?: boolean;
}

export interface SerializedSequenceEditorState {
	sequence?: any;
	lockOnTime?: boolean;
	entryEditTimeText?: string;
	entryEditDelayText?: string;
	entryEditIndexText?: string;
	entryEditItemLabel?: string;
	entryEditItemName?: string;
	entryEditItemType?: string;
	entryEditNextItemAfterEnd?: boolean;
	isDeleteMode?: boolean;
	isExpandedView?: boolean;
	lastUsedItemName?: string;
	lastUsedItemType?: string;
	lastUsedItemLabel?: string;
	lastUsedNextItemAfterEnd?: boolean;
}

export interface SerializedShowEditorState {
	show?: any;
}

export interface SerializedColourSequenceEditorState {
	colourSequence?: any;
}

export interface SerializedEditorStates {
	launchSite?: SerializedLaunchSiteEditorState;
	load?: SerializedLoadEditorState;
	shell?: SerializedShellEditorState;
	groundEffect?: SerializedGroundEffectEditorState;
	sequence?: SerializedSequenceEditorState;
	show?: SerializedShowEditorState;
	colourSequence?: SerializedColourSequenceEditorState;
}

interface PlaybackState {
	ticks: number;
	fireworkEffectsActive: boolean;
	interruptWhenTooManyParticles: boolean;
	players: SerializedPlayerState[];
	pendingExplosions?: SerializedExplosion[];
	pendingEmitters?: any[];
	showPlayers?: SerializedShowPlayerState[];
}

interface ParkState {
	version: string;
	launchSites: any[];
	loadList: any[];
	shellList: any[];
	groundEffectList: any[];
	sequenceList: any[];
	shotShow: any[];
	colourSequences: any[];
	playback: PlaybackState;
	editors?: SerializedEditorStates;
}

export function defaultColourSequences(): ColourSequence[] {
	return [
		new ColourSequence("Rainbow", [Colour.BrightRed, 
			Colour.LightOrange, Colour.BrightYellow, Colour.BrightGreen, Colour.LightBlue, Colour.BrightPurple]),
		new ColourSequence("RainbowLong", [27, 28, 20, 17, 38, 14, 9, 7, 5, 47]),
		new ColourSequence("Fire", [Colour.BrightRed, Colour.DarkOrange, Colour.BrightYellow, Colour.DarkOrange, Colour.BordeauxRed]),
		new ColourSequence("Sunset", [Colour.BordeauxRed, Colour.SalmonPink, Colour.LightOrange, Colour.BrightYellow, Colour.DarkOrange]),
		new ColourSequence("Ocean", [8, 46, 9, 7, 6]),
		new ColourSequence("Forest", [Colour.DarkGreen, Colour.BrightGreen, Colour.OliveDark, Colour.BrightGreen, Colour.DarkGreen]),
		new ColourSequence("Netherlands", [27, 2, 6]),
		new ColourSequence("Christmas", [27, 11, 2, 18, 2, 11, 27]),
		new ColourSequence("Winter", [7, 1, 2, 8, 10]),
		new ColourSequence("Spring", [41, 44, 17, 31, 14])
	];
}

export function decodeEffect(effect: any): Effect {
	switch (effect?.className) {
		case "PalmEffect":
			return PalmEffect.fromParkData(effect);
		case "SprayBurstEffect":
			return SprayBurstEffect.fromParkData(effect);
		case "BigBouqetEffect":
		case "ShellOfShellsEffect":
			return ShellOfShellsEffect.fromParkData(effect, decodeEffect);
		case "TourbillionRisingWispEffect":
			return TourbillionRisingWispEffect.fromParkData(effect);
		case "FlyingFishEffect":
			return FlyingFishEffect.fromParkData(effect);
		case "SingularFishEffect":
			return SingularFishEffect.fromParkData(effect);
		case "TrailEffect":
			return TrailEffect.fromParkData(effect);
		case "CometEffect":
			return CometEffect.fromParkData(effect);
		case "CometFanEffect":
			return CometFanEffect.fromParkData(effect);
		case "CrackleEffect":
			return CrackleEffect.fromParkData(effect);
		case "FountainEffect":
			return FountainEffect.fromParkData(effect);
		case "MicroBurstEffect":
			return MicroBurstEffect.fromParkData(effect);
		case "PictEffect":
			return PictEffect.fromParkData(effect);
		case "RingEffect":
			return RingEffect.fromParkData(effect);
		case "SphereEffect":
			return SphereEffect.fromParkData(effect);
		case "SprayEffectFromAir":
			return SprayEffectFromAir.fromParkData(effect);
		case "SprayEffectFromGround":
			return SprayEffectFromGround.fromParkData(effect);
		case "SprayFanEffect":
			return SprayFanEffect.fromParkData(effect);
		case "StarEffect":
			return StarEffect.fromParkData(effect);
		case "TrailEffect":
			return TrailEffect.fromParkData(effect);
		case "UnknownEffect":
			return UnknownEffect.fromParkData(effect);
		default:
			return UnknownEffect.fromParkData(effect);
	}
}

export function serializeParkState(state: {
	launchSites: LaunchSite[];
	loadMap: Map<string, Load>;
	shellMap: Map<string, Shell>;
	groundEffectMap: Map<string, GroundEffect>;
	sequenceMap: Map<string, Sequence>;
	shotShowMap: Map<string, Show>;
	colourSequences: ColourSequence[];
	playback: PlaybackState;
	editors?: SerializedEditorStates;
}): string {
	const parkState: ParkState = {
		version: pluginVersion,
		launchSites: state.launchSites.map(item => item.toParkData()),
		loadList: [...state.loadMap.values()].map(item => item.toParkData()),
		shellList: [...state.shellMap.values()].map(item => item.toParkData()),
		groundEffectList: [...state.groundEffectMap.values()].map(item => item.toParkData()),
		sequenceList: [...state.sequenceMap.values()].map(item => item.toParkData()),
		shotShow: [...state.shotShowMap.values()].map(item => item.toParkData()),
		colourSequences: state.colourSequences.map(item => item.toParkData()),
		playback: state.playback,
		editors: state.editors
	};

	return JSON.stringify(parkState);
}

export function deserializeParkState(rawState: string, applyState: {
	setLaunchSites: (value: LaunchSite[]) => void;
	setLoadMap: (value: Map<string, Load>) => void;
	setShellMap: (value: Map<string, Shell>) => void;
	setGroundEffectMap: (value: Map<string, GroundEffect>) => void;
	setSequenceMap: (value: Map<string, Sequence>) => void;
	setShotShowMap: (value: Map<string, Show>) => void;
	setColourSequences: (value: ColourSequence[]) => void;
	resetTransientState: () => void;
	restorePlaybackState?: (playback: PlaybackState) => void;
	restoreEditorState?: (editors?: SerializedEditorStates, decodeEffect?: (effect: any) => Effect) => void;
	onPluginVersionLoaded?: (version: string) => void;
}): boolean {
	let parsed: ParkState;
	try {
		parsed = JSON.parse(rawState) as ParkState;
	}
	catch (error) {
		console.log(`Fireworks: failed to parse park state: ${error}`);
		return false;
	}

	if (!parsed || typeof parsed.version !== "string") {
		return false;
	}
	applyState.onPluginVersionLoaded?.(parsed.version);

	applyState.resetTransientState();
	applyState.setLaunchSites((parsed.launchSites ?? []).map(item => LaunchSite.fromParkData(item)));

	const loadMap = new Map<string, Load>();
	for (const item of parsed.loadList ?? []) {
		const load = Load.fromParkData(item, decodeEffect);
		if (load.name) loadMap.set(load.name, load);
	}
	applyState.setLoadMap(loadMap);

	const shellMap = new Map<string, Shell>();
	for (const item of parsed.shellList ?? []) {
		const shell = Shell.fromParkData(item, decodeEffect);
		if (shell.name) shellMap.set(shell.name, shell);
	}
	applyState.setShellMap(shellMap);

	const groundEffectMap = new Map<string, GroundEffect>();
	for (const item of parsed.groundEffectList ?? []) {
		const ge = GroundEffect.fromParkData(item, decodeEffect);
		if (ge.name) groundEffectMap.set(ge.name, ge);
	}
	applyState.setGroundEffectMap(groundEffectMap);

	const sequenceMap = new Map<string, Sequence>();
	for (const item of parsed.sequenceList ?? []) {
		const seq = Sequence.fromParkData(item);
		if (seq.name) sequenceMap.set(seq.name, seq);
	}
	applyState.setSequenceMap(sequenceMap);
	// fromParkData() recalculates without a lookup (the map isn't fully built yet during
	// the loop above), so nextItemAfterEnd gaps that depend on a nested sequence's duration
	// are computed as if that nested sequence had zero length. Redo it now that every
	// sequence is available and registered in persistent state so nested durations (including
	// deeply nested sub-sequences) are correctly folded in.
	const resolveSeq = (name: string, visited: Set<string> = new Set<string>()): Sequence | undefined => {
		const trimmed = name.trim();
		if (visited.has(trimmed)) return undefined;
		const s = sequenceMap.get(trimmed);
		if (!s) return undefined;
		visited.add(trimmed);
		s.recalculateCumulativeTimes(0, n => resolveSeq(n, new Set(visited)));
		return s;
	};
	for (const seq of sequenceMap.values()) {
		seq.recalculateCumulativeTimes(0, name => resolveSeq(name));
	}

	const shotShowMap = new Map<string, Show>();
	for (const item of parsed.shotShow ?? []) {
		const show = Show.fromParkData(item);
		if (show.name) shotShowMap.set(show.name, show);
	}
	applyState.setShotShowMap(shotShowMap);

	applyState.setColourSequences((parsed.colourSequences && parsed.colourSequences.length > 0 ? parsed.colourSequences : defaultColourSequences().map(item => item.toParkData())).map(item => ColourSequence.fromParkData(item)));

	if (applyState.restorePlaybackState) {
		applyState.restorePlaybackState(parsed.playback);
	}

	if (applyState.restoreEditorState) {
		applyState.restoreEditorState(parsed.editors, decodeEffect);
	}

	return true;
}

export type { PlaybackState, SerializedPlayerState, SerializedShowPlayerState, SerializedExplosion };
