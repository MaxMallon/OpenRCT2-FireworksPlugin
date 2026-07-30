import { Colour } from "openrct2-flexui";
import { LoadColours, ShellColours } from "../../ColourStructures";
import { DegreeToRad } from "../../../helpers";
import { BurstEffect, EffectType } from "../../Effect";
import { Shell, ShotHeadType } from "../../Firework";
import { ShellLoad } from "../../ShellLoad";
import { Load } from "../../Load";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";

export class CometFanEffect extends BurstEffect {
	constructor(public numberComets: number, public fanAngle: number, extraLongevity: number, colours: LoadColours, public timeTillStall: number, public trailDensity: number = 0.5, public trailWidth: number = 3, public fanOrientation: number = 0) {
		super(EffectType.CometFan, 0, 0, extraLongevity, colours);
	}

	override toParkData(): any { return { ...super.toParkData(), className: "CometFanEffect" }; }

	static fromParkData(effect: any): CometFanEffect {
		return new CometFanEffect(effect?.numberComets ?? 0, effect?.fanAngle ?? 0, effect?.extraLongevity ?? 0, LoadColours.fromParkData(effect?.colours), effect?.timeTillStall ?? 0, effect?.trailDensity ?? 0.5, effect?.trailWidth ?? 3, effect?.fanOrientation ?? 0);
	}

	override Make(posOri: CoordsXYZ, _velocity: CoordsXYZ): BurstEffect | undefined {
		this.LoadColoursFromSequence(); //Make again to ensure colours are up to date
		for (let i = 0; i < this.numberComets; i++) {
			let angleIncrement = this.fanAngle / (this.numberComets - 1) * i - (this.fanAngle / 2);
			let shotColours = new ShellColours(Colour.Invisible, Colour.Invisible, Colour.Invisible);

			switch (this.colours.pattern) {
				case "solid":
					shotColours = new ShellColours(this.colours.getColour("head"), this.colours.getColour("trail1"), this.colours.getColour("trail2"));
					break;
				case "2-col-alternating":
					if (i % 2 == 0)
						shotColours = new ShellColours(this.colours.getColour("headA"), this.colours.getColour("trail1A"), this.colours.getColour("trail2A"));
					else
						shotColours = new ShellColours(this.colours.getColour("headB"), this.colours.getColour("trail1B"), this.colours.getColour("trail2B"));
					break;
				case "colour-sequence-trail":
					{
						let col = this.colours.colourList[Math.round(this.colours.colourList.length / this.numberComets * i)];
						shotColours = new ShellColours(this.colours.getColour("head"), col, col);
					} break;
				case "colour-sequence-head":
					{
						let col = this.colours.colourList[Math.round(this.colours.colourList.length / this.numberComets * i)];
						shotColours = new ShellColours(col, this.colours.getColour("trail1"), this.colours.getColour("trail2"));
					} break;
				case "colour-sequence":
					{
						let col = this.colours.colourList[Math.round(this.colours.colourList.length / this.numberComets * i)];
						shotColours = new ShellColours(col, col, col);
					} break;
			}


			const orientRad = DegreeToRad(this.fanOrientation);
			const azimuthDeg = angleIncrement * Math.sin(orientRad);
			const tiltDeg = angleIncrement * Math.cos(orientRad);
			const shot = Shell.fromGround("", new ShellLoad("", ShellLoad.explodeAtEnd, undefined, new Load([])), [], ShotHeadType.Big, true, this.trailDensity, this.trailWidth, posOri, shotColours, this.timeTillStall, this.extraLongevity + this.timeTillStall * 1.5, azimuthDeg, tiltDeg);
			shot.Light();

		}
		return undefined;
	}
	
		
	override GetSpriteString(): string {
		switch (this.colours.pattern) {
			case "solid":
			default:
				return sprite(GetColouredEffectSprite("effectCometFan", this.colours.getColour("trail1")));
			case "2-col-alternating":
				return sprite(GetColouredEffectSprite("effectCometFan", this.colours.getColour("trail1A")));
			case "colour-sequence-trail":
				return sprite(GetColouredEffectSprite("effectCometFan", this.colours.colourList[0]));	
			case "colour-sequence-head":
				return sprite(GetColouredEffectSprite("effectCometFan", this.colours.colourList[0]));
			case "colour-sequence":
				return sprite(GetColouredEffectSprite("effectCometFan", this.colours.colourList[0]));
		}
	}
}