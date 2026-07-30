import { Colour } from "openrct2-flexui";

import { counterGravity1sec, resolveLaunchSitePosition } from "./helpers";
import { IncrementDelayedShotsCount, IncrementLaunchedShotsCount, IncrementSkippedShotsCount, SpawnLight, SpawnLightCluster } from "./particleSpawner";
import { LoadColours, ShellColours } from "./structures/ColourStructures";
import * as persistent from "./persistent";
import { TrailEffect } from "./structures/effects/EmitterEffects/trailEffect";
import type { PlaybackState, SerializedPlayerState } from "./parkStorage";
import { EmitterEffect, Effect } from "./structures/Effect";
import { Shell, GroundEffect, ShellFactorySource, ShotHeadType, setShellLauncher, setGroundEffectLauncher } from "./structures/Firework";
import { SequenceEntry, Sequence, SequenceItemType } from "./structures/Sequence";
import { ShellLoad } from "./structures/ShellLoad";
import { Load } from "./structures/Load";

// ==================== FireworksPlayer class ====================

let FireworksToExplode: ShellLoad[] = []; //fireworks in air, counting down to explode
let FireworksToEmit: EmitterEffect[] = []; //fireworks emitting constant effects
let activePlayers: FireworksPlayer[] = [];


class FireworksPlayer {
	readonly fireworksToBeShot: SequenceEntry[] = [];
	/** Accumulated tick delay from failed shots. All planned times are shifted forward by this amount. */
	tickOffset: number = 0;

	get isIdle(): boolean {
		return this.fireworksToBeShot.length === 0;
	}

	/** Load a single shell to fire immediately. */
	loadShell(shell: Shell): void {
		this.fireworksToBeShot.length = 0;
		this.fireworksToBeShot.push(new SequenceEntry(shell.name, SequenceItemType.Shell, 0, 0, true, shell));
	}

	/**
	 * Load the direct items of a sequence into this player's shot queue.
	 * Each item's absolute fire tick = item.cumulativeTimeTillLight + offset.
	 * Nested sequence entries are kept as-is and spawn child players when their tick arrives.
	 */
	loadSequenceItems(sequence: Sequence, offset: number): void {
		this.fireworksToBeShot.length = 0;
		for (let i = 0; i < sequence.items.length; i++) {
			const item = sequence.items[i];
			this.fireworksToBeShot.push(new SequenceEntry(
				item.itemName,
				item.itemType,
				item.timeTillLight,
				normalizeFrame(item.cumulativeTimeTillLight) + offset,
				item.nextItemAfterEnd,
				item.runtimeItem
			));
		}
		this.fireworksToBeShot.sort((a, b) => a.cumulativeTimeTillLight - b.cumulativeTimeTillLight);
	}

	tickShots(): void {
		while (this.fireworksToBeShot.length > 0 && persistent.effectTick >= this.fireworksToBeShot[0].cumulativeTimeTillLight + this.tickOffset) {
			const scheduledEntry = this.fireworksToBeShot.shift()!;

			// Sequence entry: spawn a child player for that sequence's own items.
			// Bake this player's accumulated tickOffset into the child's sequence offset so
			// the child's absolute times are already correct and it can start with tickOffset = 0.
			if (scheduledEntry.itemType === SequenceItemType.Sequence) {
				const seq = scheduledEntry.runtimeItem instanceof Sequence
					? scheduledEntry.runtimeItem as Sequence
					: persistent.sequenceMap.get(scheduledEntry.itemName.trim());
				if (seq) {
					const child = new FireworksPlayer();
					child.loadSequenceItems(seq, scheduledEntry.cumulativeTimeTillLight + this.tickOffset);
					activePlayers.push(child);
				}
				continue;
			}

			let success = false;
			if (scheduledEntry.runtimeItem instanceof Shell) {
				success = lightShell(scheduledEntry.runtimeItem as Shell);
			} else if (scheduledEntry.runtimeItem instanceof GroundEffect) {
				success = lightGroundEffect(scheduledEntry.runtimeItem as GroundEffect);
			} else if (scheduledEntry.itemType === SequenceItemType.Shell) {
				const shell = persistent.shellMap.get(scheduledEntry.itemName.trim());
				if (shell) success = lightShell(cloneShell(shell));
			} else if (scheduledEntry.itemType === SequenceItemType.GroundEffect) {
				const ge = persistent.groundEffectMap.get(scheduledEntry.itemName.trim());
				if (ge) success = lightGroundEffect(ge);
			}
			if (!success && persistent.interruptWhenTooManyParticles) {
				// Put the failed shot back and push all of this player's remaining shots
				// forward by one tick so it retries next frame without skipping anything.
				this.fireworksToBeShot.unshift(scheduledEntry);
				this.tickOffset++;
				IncrementDelayedShotsCount();
				return;
			}
			else if (!success) {
				IncrementSkippedShotsCount();
			}
		}
	}
}

function normalizeFrame(value: number): number {
	if (!isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.floor(value));
}

function cloneCoords(coords: CoordsXYZ): CoordsXYZ {
	return { x: coords.x, y: coords.y, z: coords.z };
}

function cloneLoadColours(colours: LoadColours): LoadColours {
	if (!colours || typeof (colours as unknown) !== 'object') {
		return colours;
	}
	return new LoadColours(
		[...colours.colourList],
		colours.sequenceName,
		colours.reverseSequence,
		colours.pattern,
		{ ...colours.namedColours }
	);
}

function cloneEffect(effect: Effect): Effect {
	const clonedEffect = Object.create(Object.getPrototypeOf(effect)) as Effect;
	for (const key in effect) {
		if (Object.prototype.hasOwnProperty.call(effect, key)) {
			(clonedEffect as unknown as { [key: string]: unknown })[key] = (effect as unknown as { [key: string]: unknown })[key];
		}
	}

	clonedEffect.colours = cloneLoadColours(effect.colours);
	return clonedEffect;
}

function cloneLoad(load: Load): Load {
	return new Load(load.effects.map(cloneEffect));
}

function cloneShellLoad(load: ShellLoad): ShellLoad {
	return new ShellLoad(load.loadName, load.timeTillExplode, load.particle, load.runtimeLoad ? cloneLoad(load.runtimeLoad) : undefined);
}

function cloneShellColours(colours: ShellColours): ShellColours {
	return new ShellColours(colours.headColour, colours.trail1Colour, colours.trail2Colour);
}

function cloneShell(shell: Shell): Shell {
	const position = typeof shell.position === "string" ? shell.position : cloneCoords(shell.position);

	return new Shell(
		shell.name,
		cloneShellLoad(shell.load),
		shell.ascendEffects.map(cloneShellLoad),
		shell.headType,
		shell.trail,
		shell.trailDensity,
		shell.trailWidth,
		position,
		cloneShellColours(shell.shellColours),
		shell.timeTillStall,
		cloneCoords(shell.velocity),
		shell.delay,
		shell.azimuth,
		shell.tilt,
		shell.factorySource,
	);
}


// ==================== Sequence flattening utilities ====================
// Kept for displaying a flattened shot list.

export function collectShotsInRange(sequence: Sequence, startTime: number, endTime: number, collected: SequenceEntry[], offset: number = 0): void {
	for (let index = 0; index < sequence.items.length; index++) {
		const entry = sequence.items[index];
		const absoluteTime = normalizeFrame(entry.cumulativeTimeTillLight) + offset;

		if (entry.itemType === SequenceItemType.Sequence) {
			const nested = persistent.sequenceMap.get(entry.itemName.trim());
			if (nested) {
				collectShotsInRange(nested, startTime, endTime, collected, absoluteTime);
			}
			continue;
		}

		if (absoluteTime >= startTime && absoluteTime <= endTime) {
			collected.push(new SequenceEntry(entry.itemName, entry.itemType, 0, absoluteTime, entry.nextItemAfterEnd, entry.runtimeItem));
		}
	}
}

export function flattenScheduledEntryToShots(entry: SequenceEntry, cumulativeOverride?: number): SequenceEntry[] {
	const absoluteCumulativeTime = cumulativeOverride === undefined
		? normalizeFrame(entry.cumulativeTimeTillLight)
		: normalizeFrame(cumulativeOverride);

	if (entry.itemType !== SequenceItemType.Sequence) {
		return [new SequenceEntry(entry.itemName, entry.itemType, 0, absoluteCumulativeTime, entry.nextItemAfterEnd, entry.runtimeItem)];
	}

	const sequence = persistent.sequenceMap.get(entry.itemName.trim());
	if (!sequence) return [];

	const sequenceOffset = absoluteCumulativeTime;
	const flattenedEntries: SequenceEntry[] = [];

	for (let index = 0; index < sequence.items.length; index++) {
		const child = sequence.items[index];
		const childAbsoluteTime = normalizeFrame(child.cumulativeTimeTillLight) + sequenceOffset;
		const childShots = flattenScheduledEntryToShots(child, childAbsoluteTime);
		for (let shotIndex = 0; shotIndex < childShots.length; shotIndex++) {
			flattenedEntries.push(childShots[shotIndex]);
		}
	}

	return flattenedEntries;
}

export function sortAndNormalizeShotList(queue: SequenceEntry[]): void {
	queue.sort((left, right) => left.cumulativeTimeTillLight - right.cumulativeTimeTillLight);

	let previousCumulativeTime = 0;
	for (let index = 0; index < queue.length; index++) {
		const entry = queue[index];
		entry.cumulativeTimeTillLight = normalizeFrame(entry.cumulativeTimeTillLight);
		entry.timeTillLight = Math.max(0, entry.cumulativeTimeTillLight - previousCumulativeTime);
		previousCumulativeTime = entry.cumulativeTimeTillLight;
	}
}

export function AddFireworkToExplode(load: ShellLoad): void {
	FireworksToExplode.push(load);
}

export function AddFireworkToEmit(effect: EmitterEffect): void
{
	FireworksToEmit.push(effect);
}

export function AddAnchoredEmitterToEmit(effect: EmitterEffect, posOri: CoordsXYZ, velocity: CoordsXYZ): void
{
	// If the effect has a named launch site, let MakeContinousFireworks resolve the
	// position live each tick so entity-based sites track movement.
	if (typeof effect.position === "string" && effect.position.trim())
	{
		FireworksToEmit.push(effect);
		return;
	}

	const anchoredPos = { x: posOri.x, y: posOri.y, z: posOri.z };
	const anchoredVelocity = { x: velocity.x, y: velocity.y, z: velocity.z };
	const originalMake = effect.Make.bind(effect) as (_posOri: CoordsXYZ, _velocity: CoordsXYZ) => Effect | undefined;
	effect.Make = function(_posOri: CoordsXYZ, _velocity: CoordsXYZ): EmitterEffect | undefined {
		originalMake(anchoredPos, anchoredVelocity);
		return undefined;
	};
	FireworksToEmit.push(effect);
}

export function AddTrailToEmit(timeLeft: number, width: number, density: number, colour1: Colour, colour2: Colour, particle: CrashedVehicleParticle): void
{
	FireworksToEmit.push(new TrailEffect(timeLeft, width, density, colour1, colour2, particle));
}

export function LoadFireworks(fireworks: Shell): void;
export function LoadFireworks(fireworks: Sequence, startTime?: number, endTime?: number): void;
export function LoadFireworks(fireworks: Sequence | Shell, _startTime: number = 0, _endTime: number = Number.MAX_VALUE): void {
	const player = new FireworksPlayer();

	if (fireworks instanceof Shell) {
		// Carry the shell as a runtimeItem so the player can fire it without a registry lookup.
		player.loadShell(fireworks);
	} else {
		// fireworks has been pre-recalculated with absolute tick times by the caller.
		// Load direct items only; nested sequence entries spawn child players at runtime.
		player.loadSequenceItems(fireworks, 0);
	}

	activePlayers = [player];
}

export function AddFireworksToBeShot(fireworks: Sequence | Shell, startTime: number = 0, endTime: number = Number.MAX_VALUE) {
	if (fireworks instanceof Shell) {
		LoadFireworks(fireworks);
		return;
	}

	LoadFireworks(fireworks, startTime, endTime);
}

let loopSubscription: any;
export function Play(testShot: boolean = false): void {
	if (!loopSubscription) {
		loopSubscription = context.subscribe("interval.tick", FireWorksLoop);		
	}
	if (testShot)
		persistent.setFireworkEffectsActive(true);
}
export function Pause(): void {
	persistent.setFireworkEffectsActive(false);
}
export function Stop(): void {
	activePlayers = [];
	FireworksToExplode = [];
	FireworksToEmit = [];
	if (loopSubscription) {
		loopSubscription.dispose();
		loopSubscription = undefined;
		persistent.setFireworkEffectsActive(false);
	}
}

/**
 * Returns a snapshot of all active players' pending shot queues, suitable for
 * inclusion in the park save file. Call this inside saveParkState().
 */
export function getPlayersSnapshot(): SerializedPlayerState[] {
	return activePlayers.map(player => ({
		fireworksToBeShot: player.fireworksToBeShot.map(entry => entry.toParkData())
	}));
}

/**
 * Rebuilds active players from a saved playback state and (re-)starts the loop
 * subscription. Called from loadParkState() when restoring a running show.
 */
export function restorePlayersFromSnapshot(playback: PlaybackState): void {
	// Discard any existing state first.
	activePlayers = [];
	FireworksToExplode = [];
	FireworksToEmit = [];
	if (loopSubscription) {
		loopSubscription.dispose();
		loopSubscription = undefined;
	}

	if (!playback.fireworkEffectsActive || !playback.players || playback.players.length === 0) {
		return;
	}

	for (const playerData of playback.players) {
		const player = new FireworksPlayer();
		player.fireworksToBeShot.length = 0;
		for (const entryData of playerData.fireworksToBeShot ?? []) {
			player.fireworksToBeShot.push(SequenceEntry.fromParkData(entryData));
		}
		if (player.fireworksToBeShot.length > 0) {
			activePlayers.push(player);
		}
	}

	if (activePlayers.length > 0) {
		loopSubscription = context.subscribe("interval.tick", FireWorksLoop);
	}
}

export function explodeLoad(load: Load, posOri: CoordsXYZ, velocity: CoordsXYZ): void {
	load.effects.forEach(effect => {
		if (effect instanceof EmitterEffect) {
			AddAnchoredEmitterToEmit(cloneEffect(effect) as EmitterEffect, posOri, velocity);
			return;
		}
		effect.Make(posOri, velocity);
	});
}

function explodeShellLoad(shellLoad: ShellLoad): void {
	const particle = shellLoad.particle!;
	const load = shellLoad.runtimeLoad ?? persistent.loadMap.get(shellLoad.loadName.trim());
	if (!load) return;
	explodeLoad(load, { x: particle.x, y: particle.y, z: particle.z }, { x: particle.acceleration.x, y: particle.acceleration.y, z: particle.acceleration.z });
}

function lightShell(shell: Shell): boolean {
	let particle;
	let pos = resolveLaunchSitePosition(shell.position);
	if (shell.factorySource == ShellFactorySource.Ground)
		shell.CalculateVelocityVector();
	if (!pos)
		return false;
	if (shell.headType == ShotHeadType.Small)
		particle = SpawnLight(pos, shell.velocity, shell.shellColours.headColour, shell.shellColours.headColour, shell.delay + 1);
	else if (shell.headType == ShotHeadType.Big)
		particle = SpawnLightCluster(pos, shell.velocity, shell.shellColours.headColour, shell.delay + 1, 5);
	if (!particle){
		IncrementDelayedShotsCount();
		return false;
	}
	IncrementLaunchedShotsCount();
	if (shell.trail)
		AddTrailToEmit(shell.delay + 1, shell.trailWidth, shell.trailDensity, shell.shellColours.trail1Colour, shell.shellColours.trail2Colour, particle);

	for (let i = 0; i < shell.ascendEffects.length; i++) {
		const ascend = shell.ascendEffects[i];
		const ascendTime = ascend.timeTillExplode === ShellLoad.explodeAtEnd ? particle.timeToLive - 1 : ascend.timeTillExplode;
		AddFireworkToExplode(new ShellLoad(ascend.loadName, ascendTime, particle, ascend.runtimeLoad));
	}
	AddFireworkToExplode(new ShellLoad(shell.load.loadName, particle.timeToLive - 1, particle, shell.load.runtimeLoad));
	return true;
}

// ==================== Main loop ====================

export function MakeLaunchedFireworks(): void {
	for (let i = 0; i < FireworksToExplode.length; i++) {
		const firework = FireworksToExplode[i];
		firework.timeTillExplode--;
		if (firework.timeTillExplode <= 0) {
			explodeShellLoad(firework);
			FireworksToExplode.splice(i, 1);
			i--;
		}
	}
}

export function MakeContinousFireworks(): void {
	for (let i = 0; i < FireworksToEmit.length; i++) {
		const firework = FireworksToEmit[i];
		const pos = resolveLaunchSitePosition(firework.position);
		firework.Make(pos ? pos : { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: counterGravity1sec });
		if (firework.timeLeft <= 0) {
			FireworksToEmit.splice(i, 1);
			i--;
		}
	}
}

export function RunShowOrSequence(): void {
	if (!persistent.fireworkEffectsActive) return;
	const count = activePlayers.length;
	for (let i = 0; i < count; i++) {
		activePlayers[i].tickShots();
	}
	persistent.incrementEffectTick();
	if (activePlayers.length === 0 && FireworksToExplode.length === 0 && FireworksToEmit.length === 0) {
		FireworksReset();
	}
}

//Main loop that makes fireworks work
export function FireWorksLoop(): void {
	MakeLaunchedFireworks();
	MakeContinousFireworks();

	if (persistent.fireworkEffectsActive) {
		// Snapshot count so child players spawned this tick start next frame.
		const playerCount = activePlayers.length;
		for (let i = 0; i < playerCount; i++) {
			activePlayers[i].tickShots();
		}
		// Remove players that have fired all their shots.
		for (let i = playerCount - 1; i >= 0; i--) {
			if (activePlayers[i].isIdle) {
				activePlayers.splice(i, 1);
			}
		}
	}

	persistent.incrementEffectTick();

	if (activePlayers.length === 0 && FireworksToExplode.length === 0 && FireworksToEmit.length === 0) {
		FireworksReset();
	}
}

let FireworksReset = function (): void {
	/*FireworksToBeShot = FireWorksSequence.slice();
	fireworkTicks = -40 * 120;*/
};

setShellLauncher(lightShell);

function lightGroundEffect(groundEffect: GroundEffect): boolean {
	const pos = resolveLaunchSitePosition(groundEffect.position);
	if (!pos)
		return false;
	explodeLoad(new Load(groundEffect.effects), pos, { x: 0, y: 0, z: 0 });
	return true;
}

setGroundEffectLauncher(lightGroundEffect);

/**
 * Called from startup() after all modules have initialised. Registers the
 * snapshot/restore callbacks with persistent.ts so saveParkState/loadParkState
 * can include active player queues. Must be called BEFORE the first loadParkState().
 */
export function initPlayerCallbacks(): void {
	persistent.registerPlayerCallbacks(getPlayersSnapshot, restorePlayersFromSnapshot);
}