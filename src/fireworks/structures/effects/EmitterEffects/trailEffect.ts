import { Colour } from "openrct2-flexui";
import { LoadColours } from "../../ColourStructures";
import { counterGravity1sec } from "../../../helpers";
import { SpawnLight } from "../../../particleSpawner";
import { EmitterEffect, EffectType } from "../../Effect";

export class TrailEffect extends EmitterEffect
{
	override readonly className: string = "TrailEffect";

	constructor(timeLeft: number, public width: number, public density: number, public colour1: Colour, public colour2: Colour, public particle: CrashedVehicleParticle)
	{
		super(EffectType.Trail, timeLeft, timeLeft, 0 as unknown as LoadColours, { x: particle.x, y: particle.y, z: particle.z });
	}

	override toParkData(): any { return { ...super.toParkData(), particle: undefined, particleId: this.particle?.id ?? -1 }; }

	static fromParkData(effect: any): TrailEffect
	{
		const pos = effect?.position ?? { x: 0, y: 0, z: 0 };
		const dummy = { x: pos.x, y: pos.y, z: pos.z } as CrashedVehicleParticle;
		return new TrailEffect(effect?.timeLeft ?? 0, effect?.width ?? 3, effect?.density ?? 0.5, effect?.colour1 ?? Colour.Invisible, effect?.colour2 ?? Colour.Invisible, dummy);
	}

	override Make(_posOri: CoordsXYZ, _velocity: CoordsXYZ): EmitterEffect | undefined
	{	
		this.timeLeft--;
		if (!this.particle) {
			this.timeLeft = 0;
			return undefined;
		}
        let s = this.width;
        let r = Math.random() * this.density;
        if (this.timeLeft > 25){
            for (let j = 0; j < 1; j += 0.2){
                if (r > j)
                    SpawnLight({ x: this.particle.x + Math.random() * 2 * s - s, y: this.particle.y + Math.random() * 2 * s - s, z: this.particle.z + Math.random() * 2 * s - s }, { x: 0, y: 0, z: counterGravity1sec }, this.colour1, this.colour2, 40);
            		
            }
        }
		return undefined;
	}
}