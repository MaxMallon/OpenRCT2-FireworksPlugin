import { Colour } from "openrct2-flexui";
import { LoadColours } from "../../ColourStructures";
import { counterGravity1sec, tileSize, zScaleOffset } from "../../../helpers";
import { SpawnLight } from "../../../particleSpawner";
import { EmitterEffect, EffectType } from "../../Effect";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";

export class CrackleEffect extends EmitterEffect
{
	constructor(public size: number, public physicalSize: number, public delay: number, public fullDelay: number = delay, public colour: Colour, public extraLongevity: number, duration: number = extraLongevity + 8 * physicalSize,  timeLeft: number = duration, public posOri: CoordsXYZ = { x: 0, y: 0, z: 0 })
	{
		super(EffectType.Crackle, duration, timeLeft,  0 as unknown as LoadColours, posOri);
	}

	override toParkData(): any { return { ...super.toParkData(), className: "CrackleEffect" }; }

	static fromParkData(effect: any): CrackleEffect
	{
		return new CrackleEffect(effect?.size ?? 0, effect?.physicalSize ?? 0, effect?.delay ?? 0, effect?.fullDelay ?? 0, effect?.colour ?? Colour.Invisible, effect?.extraLongevity ?? 0, effect?.duration, effect?.timeLeft, effect?.posOri ?? { x: 0, y: 0, z: 0 });
	}

	override Make(posOri: CoordsXYZ, _velocity: CoordsXYZ): EmitterEffect | undefined
	{
		if (this.delay > 0)
			this.delay--;
		else {
			this.timeLeft--;
			this.posOri = posOri;
			for (let j = 0; j < 2 * this.physicalSize; j++){
				var	theta = Math.random() * 2 * Math.PI;
				var	phi = Math.acos(2 * Math.random() - 1);	

				let x3 = Math.sin(phi) * Math.cos(theta);
				let y3 = Math.sin(phi) * Math.sin(theta);
				let z3 = Math.cos(phi);

				let x = posOri.x + x3 * tileSize* this.physicalSize*0.8 * (((this.duration - this.timeLeft) + this.fullDelay) / (this.fullDelay + this.duration));		
				let y = posOri.y + y3 * tileSize* this.physicalSize*0.8 * (((this.duration - this.timeLeft) + this.fullDelay) / (this.fullDelay + this.duration));	
				let z = posOri.z + z3 * tileSize* this.physicalSize*0.8 * (((this.duration - this.timeLeft) + this.fullDelay) / (this.fullDelay + this.duration)) * zScaleOffset;
				x-= 0.5 * ((this.duration - this.timeLeft) + this.fullDelay);
				y-= 0.5 * ((this.duration - this.timeLeft) + this.fullDelay);
				z += this.fullDelay * 2.5;
				SpawnLight({x, y, z}, { x: 0, y: 0, z: counterGravity1sec}, this.colour, this.colour, 5);
			}
			
		}		
		return undefined;
	}

	override GetSpriteString(): string {
		return sprite(GetColouredEffectSprite("effectCrackle", this.colour));
	}
}