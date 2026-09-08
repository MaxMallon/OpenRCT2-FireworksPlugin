import { Colour } from "openrct2-flexui";
import { LoadColours } from "../../ColourStructures";
import { EmitterEffect, EffectType } from "../../Effect";

export class SingularFishEffect extends EmitterEffect
{
	override readonly className: string = "SingularFishEffect";

	constructor(timeLeft: number, public timeTillAccelerationLeft: number, public colour: Colour, public direction: CoordsXYZ, public accelerationLength: number, public totalAccelerationLength: number, public acceleration: number, public particle: CrashedVehicleParticle)
	{
		super(EffectType.SingularFish, timeLeft, timeLeft, 0 as unknown as LoadColours, { x: particle.x, y: particle.y, z: particle.z });
	}

	override toParkData(): any { return { ...super.toParkData(), particle: undefined, particleId: this.particle?.id ?? -1 }; }

	static fromParkData(effect: any): SingularFishEffect
	{
		// Use saved position as a stand-in coords object; particle is re-linked by the caller.
		const pos = effect?.position ?? { x: 0, y: 0, z: 0 };
		const dummy = { x: pos.x, y: pos.y, z: pos.z } as CrashedVehicleParticle;
		return new SingularFishEffect(effect?.timeLeft ?? 0, effect?.timeTillAccelerationLeft ?? 0, effect?.colour ?? Colour.Invisible, effect?.direction ?? { x: 0, y: 0, z: 0 }, effect?.accelerationLength ?? 0, effect?.totalAccelerationLength ?? 0, effect?.acceleration ?? 0, dummy);
	}

	override Make(_posOri: CoordsXYZ, _velocity: CoordsXYZ): EmitterEffect | undefined
	{	
		this.timeLeft--;
		if (!this.particle) {
			this.timeLeft = 0;
			return undefined;
		}
		this.timeTillAccelerationLeft--;
		if (this.timeTillAccelerationLeft > 0) {
			return undefined;
		}
		if (this.accelerationLength <= 0) {
			return undefined;
		}
		// On the first swim tick: reveal the particle with its colour.
		if (this.accelerationLength === this.totalAccelerationLength) {
			try { this.particle.colours = { body: this.colour, trim: this.colour }; } catch { /* particle gone */ }
		}
		// Slowly change direction with the acceleration
		this.accelerationLength--;
		const t = (this.totalAccelerationLength - this.accelerationLength) / this.totalAccelerationLength;
		const accelMag = this.acceleration * Math.sin(t * Math.PI);
		try {
			const cur = this.particle.acceleration;
			if (cur) {
				this.particle.acceleration = {
					x: cur.x + this.direction.x * accelMag,
					y: cur.y + this.direction.y * accelMag,
					z: cur.z
				};
			}
		} catch { /* particle already gone */ }
		return undefined;
	}
}