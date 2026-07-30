import { resolveLoad } from "./persistent";
import { Effect, EffectType } from "./structures/Effect";
import { Load } from "./structures/Load";
import { ShellLoad } from "./structures/ShellLoad";

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

export function resolveLoadContentsToLatest(source: Load): Load
{
	return cloneLoad(source);
}

export function resolveNamedLoadToLatest(loadName: string): Load | undefined
{
	return resolveLoad(loadName);
}

export function loadContainsBigBouqetEffect(load: Load): boolean
{
	for (let index = 0; index < load.effects.length; index++)
	{
		if (load.effects[index].type === EffectType.ShellOfShells)
		{
			return true;
		}
	}

	return false;
}

export function collectBigBouqetReferencedLoadNames(loads: Load[]): string[]
{
	const names: string[] = [];
	for (let loadIndex = 0; loadIndex < loads.length; loadIndex++)
	{
		const load = loads[loadIndex];
		for (let effectIndex = 0; effectIndex < load.effects.length; effectIndex++)
		{
			const effect = load.effects[effectIndex];
			if (effect.type !== EffectType.ShellOfShells)
			{
				continue;
			}

			const subLoads = (effect as unknown as { subLoads?: ShellLoad[] }).subLoads;
			if (!subLoads)
			{
				continue;
			}

			for (let subLoadIndex = 0; subLoadIndex < subLoads.length; subLoadIndex++)
			{
				const name = subLoads[subLoadIndex].loadName.trim();
				if (name && names.indexOf(name) < 0)
				{
					names.push(name);
				}
			}
		}
	}

	return names;
}

