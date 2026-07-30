import { Colour } from "openrct2-flexui";
import { SprayEffectFromGround as SprayEffectFromGround } from "./sprayEffect";
import { LoadColours } from "../../ColourStructures";
import { BurstEffect, EffectType } from "../../Effect";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";

export class SprayFanEffect extends BurstEffect
{
	constructor(public amount: number, public numberSprays: number, public fanAngle: number, extraLongevity: number, public timeTillStall: number, colours: LoadColours, public fanOrientation: number = 0)
	{
		super(EffectType.SprayFan, 0, 0, extraLongevity, colours);
	}

	override toParkData(): any { return { ...super.toParkData(), className: "SprayFanEffect" }; }

	static fromParkData(effect: any): SprayFanEffect
	{
		return new SprayFanEffect(effect?.amount ?? 0, effect?.numberSprays ?? 0, effect?.fanAngle ?? 0, effect?.extraLongevity ?? 0, effect?.timeTillStall ?? 0, LoadColours.fromParkData(effect?.colours), effect?.fanOrientation ?? 0);
	}

	override Make(posOri: CoordsXYZ, velocity: CoordsXYZ): BurstEffect | undefined
	{
		this.LoadColoursFromSequence();
		for (let i = 0; i < this.numberSprays; i++){
		const angleIncrement = this.fanAngle / (this.numberSprays - 1) * i - (this.fanAngle / 2);
		const azimuthDeg = this.fanOrientation;
		const tiltDeg = angleIncrement;
		if (this.colours.pattern == "colour-sequence-layered"){
			for (let j = 0; j < this.colours.colourList.length; j++){
				const spray = new SprayEffectFromGround(Math.ceil(this.amount / this.colours.colourList.length), azimuthDeg, tiltDeg, this.timeTillStall + 4 * j - (4 * this.colours.colourList.length), 0.9, this.extraLongevity, this.colours.colourList[this.colours.colourList.length - 1 - j]);
				spray.Make(posOri, velocity);
			}
		}
		else{
			let colour: Colour = Colour.Invisible;
			switch (this.colours.pattern){
				case "solid":				
					colour = this.colours.getColour("colour1");
					break;
				case "2-col-alternating":
					if (i%2 == 0)
						colour = this.colours.getColour("colour1");
					else
						colour = this.colours.getColour("colour2");
					break;
				case "colour-sequence":				
					colour = this.colours.colourList[Math.round(this.colours.colourList.length / this.numberSprays * i)];
					break;
			}
			const spray = new SprayEffectFromGround(this.amount, azimuthDeg, tiltDeg, this.timeTillStall, 0.8, this.extraLongevity, colour);
			spray.Make(posOri, velocity);
		}
	}
		return undefined;
	}
	override GetSpriteString(): string {
		if (this.colours.pattern == "solid" || this.colours.pattern == "2-col-alternating")
			return sprite(GetColouredEffectSprite("effectSprayFan", this.colours.getColour("colour1")));
		else
			return sprite(GetColouredEffectSprite("effectSprayFan", this.colours.colourList[0]));
	}
}

