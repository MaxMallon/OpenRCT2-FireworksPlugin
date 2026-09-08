import { ShellOfShellsEffect } from "../../fireworks/structures/effects/burstEffects/shellOfShellsEffect";
import { PalmEffect, SprayBurstEffect } from "../../fireworks/structures/effects/burstEffects/palmEffect";
import { CometEffect } from "../../fireworks/structures/effects/burstEffects/cometEffect";
import { CometFanEffect } from "../../fireworks/structures/effects/burstEffects/cometFanEffect";
import { CrackleEffect } from "../../fireworks/structures/effects/EmitterEffects/crackleEffect";
import { FountainEffect } from "../../fireworks/structures/effects/EmitterEffects/fountainEffect";
import { MicroBurstEffect } from "../../fireworks/structures/effects/burstEffects/microBurstEffect";
import { PictEffect } from "../../fireworks/structures/effects/burstEffects/pictEffect";
import { RingEffect } from "../../fireworks/structures/effects/burstEffects/ringEffect";
import { FlyingFishEffect } from "../../fireworks/structures/effects/burstEffects/flyingFishEffect";
import { TourbillionRisingWispEffect } from "../../fireworks/structures/effects/EmitterEffects/tourbillionRisingWispEffect";
import { SphereEffect } from "../../fireworks/structures/effects/burstEffects/sphereEffect";
import { SprayEffectFromGround } from "../../fireworks/structures/effects/burstEffects/sprayEffect";
import { SprayFanEffect } from "../../fireworks/structures/effects/burstEffects/sprayFanEffect";
import { StarEffect } from "../../fireworks/structures/effects/burstEffects/starEffect";
import { openShellOfShellsEffectWindow as openShellOfShellsEffectWindow } from "./shellOfShellsWindow";
import { openPalmEffectWindow } from "./palmEffectWindow";
import { openCometEffectWindow } from "./cometEffectWindow";
import { openCometFanEffectWindow } from "./cometFanEffectWindow";
import { openFlyingFishEffectWindow } from "./flyingFishEffectWindow";
import { openTourbillionRisingWispEffectWindow } from "./tourbillionRisingWispEffectWindow";
import { openCrackleEffectWindow } from "./crackleEffectWindow";
import { openFountainEffectWindow } from "./fountainEffectWindow";
import { openMicroBurstEffectWindow } from "./microBurstEffectWindow";
import { openPictEffectWindow } from "./pictEffectWindow";
import { openRingEffectWindow } from "./ringEffectWindow";
import { openSphereEffectWindow } from "./sphereEffectWindow";
import { openSprayEffectWindow } from "./sprayEffectWindow";
import { openSprayFanEffectWindow } from "./sprayFanEffectWindow";
import { openStarEffectWindow } from "./starEffectWindow";
import { openSprayBurstEffectWindow } from "./sprayBurstEffectWindow";
import { EffectType, Effect } from "../../fireworks/structures/Effect";
import { isPopupOpen } from "../popupWindows";
import { EFFECT_WINDOW_GROUP } from "./effectWindowTemplate";

function effectWindowAlreadyOpen(): boolean
{
	return isPopupOpen(EFFECT_WINDOW_GROUP);
}

export function openEffectEditorWindowForType(effectType: EffectType, onSave: (effect: Effect) => void, onClose?: () => void): void
{
	if (effectWindowAlreadyOpen())
	{
		onClose?.();
		return;
	}
	switch (effectType)
	{
		case EffectType.ShellOfShells:
			openShellOfShellsEffectWindow(undefined, onSave, onClose);
			return;
		case EffectType.Palm:
			openPalmEffectWindow(undefined, onSave, false, onClose);
			return;
		case EffectType.SprayBurst:
			openSprayBurstEffectWindow(undefined, onSave, false, onClose);
			return;
		case EffectType.FlyingFish:
			openFlyingFishEffectWindow(undefined, onSave, false, onClose);
			return;
		case EffectType.TourbillionRisingWisp:
			openTourbillionRisingWispEffectWindow(undefined, onSave, onClose);
			return;
		case EffectType.Comet:
			openCometEffectWindow(undefined, onSave, false, onClose);
			return;
		case EffectType.CometFan:
			openCometFanEffectWindow(undefined, onSave, false, onClose);
			return;
		case EffectType.Crackle:
			openCrackleEffectWindow(undefined, onSave, onClose);
			return;
		case EffectType.Fountain:
			openFountainEffectWindow(undefined, onSave, onClose);
			return;
		case EffectType.MicroBurst:
			openMicroBurstEffectWindow(undefined, onSave, onClose);
			return;
		case EffectType.Pict:
			openPictEffectWindow(undefined, onSave, onClose);
			return;
		case EffectType.Ring:
			openRingEffectWindow(undefined, onSave, false, onClose);
			return;
		case EffectType.Sphere:
			openSphereEffectWindow(undefined, onSave, false, onClose);
			return;
		case EffectType.Spray:
			openSprayEffectWindow(undefined, onSave, onClose);
			return;
		case EffectType.SprayFan:
			openSprayFanEffectWindow(undefined, onSave, false, onClose);
			return;
		case EffectType.Star:
			openStarEffectWindow(undefined, onSave, false, onClose);
			return;
		default:
			return;
	}
}

export function openEffectEditorWindowForEffect(effect: Effect, onSave: (effect: Effect) => void, onClose?: () => void): void
{
	if (effectWindowAlreadyOpen())
	{
		onClose?.();
		return;
	}
	switch (effect.type)
	{
		case EffectType.ShellOfShells:
			openShellOfShellsEffectWindow(effect as ShellOfShellsEffect, onSave, onClose);
			return;
		case EffectType.Palm:
			openPalmEffectWindow(effect as PalmEffect, onSave, true, onClose);
			return;		
		case EffectType.SprayBurst:
			openSprayBurstEffectWindow(effect as SprayBurstEffect, onSave, true, onClose);
			return;
		case EffectType.TourbillionRisingWisp:
			openTourbillionRisingWispEffectWindow(effect as TourbillionRisingWispEffect, onSave, onClose);
			return;
		case EffectType.FlyingFish:
			openFlyingFishEffectWindow(effect as FlyingFishEffect, onSave, true, onClose);
			return;
		case EffectType.Comet:
			openCometEffectWindow(effect as CometEffect, onSave, true, onClose);
			return;
		case EffectType.CometFan:
			openCometFanEffectWindow(effect as CometFanEffect, onSave, true, onClose);
			return;
		case EffectType.Crackle:
			openCrackleEffectWindow(effect as CrackleEffect, onSave, onClose);
			return;
		case EffectType.Fountain:
			openFountainEffectWindow(effect as FountainEffect, onSave, onClose);
			return;
		case EffectType.MicroBurst:
			openMicroBurstEffectWindow(effect as MicroBurstEffect, onSave, onClose);
			return;
		case EffectType.Pict:
			openPictEffectWindow(effect as PictEffect, onSave, onClose);
			return;
		case EffectType.Ring:
			openRingEffectWindow(effect as RingEffect, onSave, true, onClose);
			return;
		case EffectType.Sphere:
			openSphereEffectWindow(effect as SphereEffect, onSave, true, onClose);
			return;
		case EffectType.Spray:
			openSprayEffectWindow(effect as SprayEffectFromGround, onSave, onClose);
			return;
		case EffectType.SprayFan:
			openSprayFanEffectWindow(effect as SprayFanEffect, onSave, true, onClose);
			return;
		case EffectType.Star:
			openStarEffectWindow(effect as StarEffect, onSave, true, onClose);
			return;
		default:
			return;
	}
}

