import { LoadColours, ShellColours } from "../../ColourStructures";
import { counterGravity1sec, tilePerSecond, zScaleOffset } from "../../../helpers";
import { BurstEffect, EffectType } from "../../Effect";
import { Shell, ShotHeadType } from "../../Firework";
import { Load } from "../../Load";
import { ShellLoad } from "../../ShellLoad";
import { CrackleEffect } from "../EmitterEffects/crackleEffect";
import { SprayEffectFromAir } from "./sprayEffect";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";

//This file contains both palm and spray-burst effect for legacy code reasons
export class PalmEffect extends BurstEffect {
	override readonly className: string = "PalmEffect";

	constructor(size: number, physicalSize: number, extraLongevity: number, colours: LoadColours, public crackle: boolean, public bigHead: boolean = true, public trailDensity: number = 0.5, public trailWidth: number = 3) {
		super(EffectType.Palm, size, physicalSize, extraLongevity, colours);
	}

	static fromParkData(effect: any): PalmEffect {
		return new PalmEffect(effect?.size ?? 0, effect?.physicalSize ?? 0, effect?.extraLongevity ?? 0, LoadColours.fromParkData(effect?.colours), effect?.crackle ?? false, effect?.bigHead ?? true, effect?.trailDensity ?? 0.5, effect?.trailWidth ?? 3);
	}

	override getDuration(): number {
		// Spawns comet-like shots that live extraLongevity + ~120, plus a small crackle tail.
		return this.extraLongevity + 150;
	}

	override Make(posOri: CoordsXYZ, velocity: CoordsXYZ): BurstEffect | undefined {
		this.LoadColoursFromSequence();
		let distance = 60;
		let maxCircumference = this.size * Math.PI * 2;
		const radiusRatio = this.physicalSize / this.size;
		let rows = maxCircumference / 2 / distance;
		for (let i = 0; i < rows; i++) {
			let angle = (Math.PI / rows) * i;
			let radius = this.size * Math.sin(angle);
			let circumferance = radius * Math.PI * 2;
			let adjustedZRadius = this.size * zScaleOffset * radiusRatio;
			let z = adjustedZRadius * Math.cos(angle);
			let stepsAtHeight = Math.ceil(circumferance / distance);


			if (z > 0)
				z *= 1.05;
			for (let j = 0; j < stepsAtHeight; j++) {
				let a = j * Math.PI * 2 / stepsAtHeight;
				let x = radiusRatio * radius * Math.cos(a);
				let y = radiusRatio * radius * Math.sin(a);
				if (x > 0)
					x *= 1.4;
				if (y > 0)
					y *= 1.4
				let lineColours = new ShellColours();

				let load: ShellLoad = new ShellLoad("", ShellLoad.explodeAtEnd, undefined, new Load([]));
				let crackleColour;
				switch (this.colours.pattern) {
					default:
					case "comets-one-type":
						lineColours = new ShellColours(this.colours.getColour("head"), this.colours.getColour("trail1"), this.colours.getColour("trail2"));
						crackleColour = this.colours.getColour("crackle");
						if (this.crackle)
							load = new ShellLoad(
								"",
								ShellLoad.explodeAtEnd,
								undefined,
								new Load([
									new CrackleEffect(20, 3, 3, 1, crackleColour, 0)
								])
							);
						break;
					case "comets-2-halves":
						if (i < rows / 2) {
							lineColours = new ShellColours(this.colours.getColour("headA"), this.colours.getColour("trail1A"), this.colours.getColour("trail2A"));
							crackleColour = this.colours.getColour("crackleA");
						}
						else {
							lineColours = new ShellColours(this.colours.getColour("headB"), this.colours.getColour("trail1B"), this.colours.getColour("trail2B"));
							crackleColour = this.colours.getColour("crackleB");
						}
						if (this.crackle)
							load = new ShellLoad(
								"",
								ShellLoad.explodeAtEnd,
								undefined,
								new Load([
									new CrackleEffect(20, 3, 3, 1, crackleColour, 0)
								])
							);
						break;
					case "comets-mixed":
						if (j % 2 == 0) {
							lineColours = new ShellColours(this.colours.getColour("headA"), this.colours.getColour("trail1A"), this.colours.getColour("trail2A"));
							crackleColour = this.colours.getColour("crackleA");
						}
						else {
							lineColours = new ShellColours(this.colours.getColour("headB"), this.colours.getColour("trail1B"), this.colours.getColour("trail2B"));
							crackleColour = this.colours.getColour("crackleB");
						}
						if (this.crackle)
							load = new ShellLoad(
								"",
								ShellLoad.explodeAtEnd,
								undefined,
								new Load([
									new CrackleEffect(20, 3, 3, 1, crackleColour, 0)
								])
							);
						break;
				}
				if (this.colours.pattern == "sprays-mixed") {
					let colour = this.colours.colourList[Math.floor(Math.random() * this.colours.colourList.length)];
					let spray = new SprayEffectFromAir(20, { x, y, z }, 80 + this.extraLongevity, this.physicalSize * tilePerSecond, 2, 0.7, colour);
					spray.Make(posOri, velocity);
				}
				else {
					const shot = Shell.fromBurst("", load, [], this.bigHead ? ShotHeadType.Big : ShotHeadType.Small, true, this.trailDensity, this.trailWidth, posOri, lineColours,
						{ x: tilePerSecond * x, y: tilePerSecond * y, z: 1.5 * counterGravity1sec + tilePerSecond * z },this.extraLongevity + 100 + Math.random() * 20);
					shot.Light();
				}
			}
		}

		return undefined;
	}
	
	override GetSpriteString(): string {
		if (this.colours.pattern == "colour-sequence" && this.colours.colourList.length > 0) 
			return sprite(GetColouredEffectSprite("effectPalm", this.colours.colourList[0]));
		else if (this.colours.pattern == "sprays-mixed" && this.colours.colourList.length > 0)
			return sprite(GetColouredEffectSprite("effectSprayBurst", this.colours.colourList[0]));
		else if (this.colours.pattern == "comets-one-type")
			return sprite(GetColouredEffectSprite("effectPalm", this.colours.getColour("trail1")));
		else
			return sprite(GetColouredEffectSprite("effectPalm", this.colours.getColour("trail1A")));
	}
}

export class SprayBurstEffect extends PalmEffect {	
	override readonly className: string = "SprayBurstEffect";

	constructor(size: number, physicalSize: number, extraLongevity: number, colours: LoadColours) {
		super(size, physicalSize, extraLongevity, colours, false, false, 0, 0);
		this.type = EffectType.SprayBurst;
	}

	static override fromParkData(effect: any): SprayBurstEffect {
		return new SprayBurstEffect(effect?.size ?? 0, effect?.physicalSize ?? 0, effect?.extraLongevity ?? 0, LoadColours.fromParkData(effect?.colours));
	}
}
