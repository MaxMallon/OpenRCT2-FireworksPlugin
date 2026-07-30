import { Colour } from "openrct2-flexui";
import { MicroBurstEffect } from "./microBurstEffect";
import { AddTrailToEmit } from "../../../fireworksEffectsPlayer";
import { LoadColours, ShellColours } from "../../ColourStructures";
import { counterGravity1sec, tilePerSecond, zScaleOffset } from "../../../helpers";
import { SpawnLightCluster } from "../../../particleSpawner";
import { BurstEffect, EffectType } from "../../Effect";
import { Shell, ShotHeadType } from "../../Firework";
import { ShellLoad } from "../../ShellLoad";
import { Load } from "../../Load";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";

export class RingEffect extends BurstEffect {
	constructor(size: number, physicalSize: number, extraLongevity: number, colours: LoadColours, public azimuth: number, public tilt: number, public trail: boolean, public microburst: boolean, public trailDensity: number = 0.5, public trailWidth: number = 3) {
		super(EffectType.Ring, size, physicalSize, extraLongevity, colours);
	}

	override toParkData(): any { return { ...super.toParkData(), className: "RingEffect" }; }

	static fromParkData(effect: any): RingEffect {
		return new RingEffect(effect?.size ?? 0, effect?.physicalSize ?? 0, effect?.extraLongevity ?? 0, LoadColours.fromParkData(effect?.colours), effect?.azimuth ?? effect?.angleX ?? 0, effect?.tilt ?? effect?.angleY ?? 0, effect?.trail ?? false, effect?.microburst ?? false, effect?.trailDensity ?? 0.5, effect?.trailWidth ?? 3);
	}

	override Make(posOri: CoordsXYZ, _velocity: CoordsXYZ): BurstEffect | undefined {
		this.LoadColoursFromSequence();
		let distance = 13;
		let maxCircumference = this.size * Math.PI * 2;
		let rows = maxCircumference / 2 / distance;

		if (this.azimuth == undefined)
			this.azimuth = Math.random() * 2 * Math.PI;
		if (this.tilt == undefined)
			this.tilt = Math.random() * 2 * Math.PI;

		for (let i = 0; i < rows; i++) {
			let a = i * Math.PI * 2 / rows;
			let x1 = Math.cos(a);
			let y1 = Math.sin(a);
			let z1 = 0;
			let x2 = x1;
			let y2 = y1 * Math.cos(this.azimuth) - z1 * Math.sin(this.azimuth);
			let z2 = y1 * Math.sin(this.azimuth) + z1 * Math.cos(this.azimuth);
			let x3 = x2 * Math.cos(this.tilt) + z2 * Math.sin(this.tilt);
			let y3 = y2;
			let z3 = -x2 * Math.sin(this.tilt) + z2 * Math.cos(this.tilt);
			let x = x3 * this.physicalSize;
			let y = y3 * this.physicalSize;
			let z = z3 * this.physicalSize * zScaleOffset;
			x *= tilePerSecond;
			y *= tilePerSecond;
			z = 1.5 * counterGravity1sec + tilePerSecond * z;
			let velocity = { x, y, z };
			let particle;
			let duration = this.extraLongevity + this.physicalSize * (18 + Math.random() * 4);

			let shellColours = new ShellColours(Colour.Invisible, Colour.Invisible, Colour.Invisible);
			let loadColours = new LoadColours([], "", false, "");
			let load: ShellLoad = new ShellLoad("", ShellLoad.explodeAtEnd, undefined, new Load([]));
			let colour = Colour.White;

			switch (this.colours.pattern) {
				case "solid":
					colour = this.colours.getColour("head");
					particle = SpawnLightCluster(posOri, velocity, colour, duration, 5);
					break;
				case "solid-transition":
					SpawnLightCluster(posOri, velocity, this.colours.getColour("head1"), duration, 5);
					duration += this.physicalSize * 4 + Math.random() * 3 * this.physicalSize;
					colour = this.colours.getColour("head2");
					particle = SpawnLightCluster(posOri, velocity, colour, duration, 3);
					break;
				case "2-col":
					if (i % 2 == 0) {
					SpawnLightCluster(posOri, velocity, this.colours.getColour("head1"), duration, 5);
						particle = SpawnLightCluster(posOri, velocity, colour, duration, 5);
					}
					else {
					SpawnLightCluster(posOri, velocity, this.colours.getColour("head2"), duration, 5);
						particle = SpawnLightCluster(posOri, velocity, colour, duration, 5);
					}
					break;
				case "2-col-transition":
					if (i % 2 == 0) {
						SpawnLightCluster(posOri, velocity, this.colours.getColour("head1A"), duration, 5);
						duration += this.physicalSize * 4 + Math.random() * 3 * this.physicalSize;
						colour = this.colours.getColour("head2A");
						particle = SpawnLightCluster(posOri, velocity, colour, duration, 3);
					}
					else {
						SpawnLightCluster(posOri, velocity, this.colours.getColour("head1B"), duration, 5);
						duration += this.physicalSize * 4 + Math.random() * 3 * this.physicalSize;
						colour = this.colours.getColour("head2B");
						particle = SpawnLightCluster(posOri, velocity, colour, duration, 3);
					}
					break;
				case "colour-sequence":
					colour = this.colours.colourList[Math.floor(this.colours.colourList.length / rows * i)];
					particle = SpawnLightCluster(posOri, velocity, colour, duration, 5);
					break;

			}
			if (this.microburst) {
				loadColours = new LoadColours([colour, colour, colour], "", false, "");
				load = new ShellLoad("", ShellLoad.explodeAtEnd, undefined, new Load([new MicroBurstEffect(loadColours)]));
			}
			const shot = Shell.fromBurst("", load, [], ShotHeadType.Small, false, 0, 0, posOri, shellColours, velocity, duration);
			shot.Light();
			if (particle && this.trail) {
				let trailColours = new ShellColours(Colour.Yellow, colour, colour);
				if (!(this.colours.pattern == "colour-sequence" && this.colours.getColour("trail1") == undefined))
					trailColours = new ShellColours(Colour.Yellow, this.colours.getColour("trail1"), this.colours.getColour("trail2"));

				AddTrailToEmit(duration + 30, this.trailWidth, this.trailDensity, trailColours.trail1Colour, trailColours.trail2Colour, particle);
			}

		}
		return undefined;
	}

	override GetSpriteString(): string {
		switch (this.colours.pattern) {
			case "solid":
			default:
				return sprite(GetColouredEffectSprite("effectRing", this.colours.getColour("head")));
			case "solid-transition":
			case "2-col":
				return sprite(GetColouredEffectSprite("effectRing", this.colours.getColour("head1")));
			case "2-col-transition":
				return sprite(GetColouredEffectSprite("effectRing", this.colours.getColour("head1A")));
			case "colour-sequence":
				return sprite(GetColouredEffectSprite("effectRing", this.colours.colourList[0]));
		}
	}
}