import { LoadColours, ShellColours } from "./structures/ColourStructures";
import { Effect } from "./structures/Effect";
import { GroundEffect, Shell } from "./structures/Firework";
import { Load } from "./structures/Load";
import { ShellLoad } from "./structures/ShellLoad";
import { Sequence, SequenceEntry } from "./structures/Sequence";
import { Show, showTriggerFromParkData, showTriggerToParkData } from "./structures/Show";

// Helper functions to clone structures

export function cloneLoadColours(colours?: LoadColours): LoadColours
{
	if (!colours)
	{
		return new LoadColours([], "", false, "", {});
	}

	return new LoadColours(
		[...(colours.colourList ?? [])],
		colours.sequenceName,
		colours.reverseSequence,
		colours.pattern,
		{ ...(colours.namedColours ?? {}) }
	);
}

export function cloneEffect(effect: Effect): Effect
{
	const clonedEffect = Object.create(Object.getPrototypeOf(effect)) as Effect;
	for (const key in effect)
	{
		if (Object.prototype.hasOwnProperty.call(effect, key))
		{
			(clonedEffect as unknown as { [key: string]: unknown })[key] = (effect as unknown as { [key: string]: unknown })[key];
		}
	}

	clonedEffect.colours = cloneLoadColours(effect.colours);

	return clonedEffect;
}

export function cloneLoad(load: Load): Load
{
	return new Load(load.effects.map(cloneEffect), load.name);
}

export function cloneShellLoad(shellLoad: ShellLoad): ShellLoad
{
	return new ShellLoad(shellLoad.loadName, shellLoad.timeTillExplode, shellLoad.particle, shellLoad.runtimeLoad ? cloneLoad(shellLoad.runtimeLoad) : undefined);
}

export function cloneSequence(sequence: Sequence): Sequence
{
	return new Sequence(sequence.name, sequence.items.map(entry => new SequenceEntry(
		entry.itemName,
		entry.itemType,
		entry.timeTillLight,
		entry.cumulativeTimeTillLight,
		entry.nextItemAfterEnd
	)));
}

export function cloneGroundEffect(groundEffect: GroundEffect): GroundEffect
{
	return new GroundEffect(
		groundEffect.effects.map(cloneEffect),
		groundEffect.name,
		groundEffect.position
	);
}

export function cloneShow(show: Show): Show
{
	const trigger = show.trigger
		? showTriggerFromParkData(showTriggerToParkData(show.trigger))
		: undefined;

	return new Show(
		show.name,
		show.sequence,
		show.interruptWhenTooManyParticles,
		show.anouncement1,
		show.anouncement2,
		trigger,
		show.music,
		show.musicRideID,
		show.launchTerrain,
		show.enabled
	);
}

//blueprint as in, not active instance
export function cloneShellBlueprint(shell: Shell): Shell
{
	const position = typeof shell.position === "string"
		? shell.position
		: { x: shell.position.x, y: shell.position.y, z: shell.position.z };

	return new Shell(
		shell.name,
		cloneShellLoad(shell.load),
		shell.ascendEffects.map(cloneShellLoad),
		shell.headType,
		shell.trail,
		shell.trailDensity,
		shell.trailWidth,
		position,
		new ShellColours(shell.shellColours.headColour, shell.shellColours.trail1Colour, shell.shellColours.trail2Colour),
		shell.timeTillStall,
		{ x: shell.velocity.x, y: shell.velocity.y, z: shell.velocity.z },
		shell.delay,
		shell.azimuth,
		shell.tilt,
		shell.randomness,
		shell.factorySource
	);
}
