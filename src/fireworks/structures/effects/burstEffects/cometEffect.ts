import { GetColouredEffectSprite, sprite } from "../../../../img/images";
import { LoadColours, ShellColours } from "../../ColourStructures";
import { BurstEffect, EffectType } from "../../Effect";
import { Shell, ShotHeadType } from "../../Firework";
import { Load } from "../../Load";
import { ShellLoad } from "../../ShellLoad";

export class CometEffect extends BurstEffect {
	override readonly className: string = "CometEffect";

	constructor(extraLongevity: number, colours: LoadColours, public timeTillStall: number, public trailDensity: number = 0.5, public trailWidth: number = 3, public tilt: number, public azimuth: number ) {
		super(EffectType.Comet, 0, 0, extraLongevity, colours);
	}

	static fromParkData(effect: any): CometEffect {
		return new CometEffect(effect?.extraLongevity ?? 0, LoadColours.fromParkData(effect?.colours), effect?.timeTillStall ?? 0, effect?.trailDensity ?? 0.5, effect?.trailWidth ?? 3, effect?.tilt ?? 0, effect?.azimuth ?? 0);
	}

	override getDuration(): number {
		return this.timeTillStall + this.extraLongevity * 1.5 + 20;
	}

	override Make(posOri: CoordsXYZ, _velocity: CoordsXYZ): BurstEffect | undefined {

		let shotColours = new ShellColours(this.colours.getColour("head"), this.colours.getColour("trail1"), this.colours.getColour("trail2"));
		const shot = Shell.fromGround("", new ShellLoad("", ShellLoad.explodeAtEnd, undefined, new Load([])), [], ShotHeadType.Big, true, this.trailDensity, this.trailWidth, posOri, shotColours, this.timeTillStall, this.extraLongevity + this.timeTillStall * 1.5, this.azimuth, this.tilt);
		shot.Light();
		return undefined;
	}
	
	override GetSpriteString(): string {
		return sprite(GetColouredEffectSprite("effectCometMine", this.colours.getColour("trail1")));
	}
}