import { Colour } from "openrct2-flexui";
import { LoadColours } from "../../ColourStructures";
import { counterGravity1sec, tilePerSecond, zScaleOffset } from "../../../helpers";
import { SpawnLight } from "../../../particleSpawner";
import { BurstEffect, EffectType } from "../../Effect";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";

export class StarEffect extends BurstEffect {
	override readonly className: string = "StarEffect";

	constructor(size: number, physicalSize: number, extraLongevity: number, colours: LoadColours, public spikeLength: number) {
		super(EffectType.Star, size, physicalSize, extraLongevity, colours);
	}

	static fromParkData(effect: any): StarEffect {
		return new StarEffect(effect?.size ?? 0, effect?.physicalSize ?? 0, effect?.extraLongevity ?? 0, LoadColours.fromParkData(effect?.colours), effect?.spikeLength ?? 0);
	}

	override getDuration(): number {
		return this.extraLongevity + this.physicalSize * 35;
	}

	override Make(posOri: CoordsXYZ, _velocity: CoordsXYZ): BurstEffect | undefined {
		this.LoadColoursFromSequence();
		let distance = 40;
		let maxCircumference = this.size * Math.PI * 2;
		const radiusRatio = this.physicalSize / this.size;
		let rows = maxCircumference / 2 / distance;
		let c1, c2;
		if (this.colours.pattern == "one-pair") {
			c1 = this.colours.getColour("colour1");
			c2 = this.colours.getColour("colour2");
		}
		for (let i = 0; i < rows; i++) {
			let angle = (Math.PI / rows) * i;
			let radius = this.size * Math.sin(angle);
			let circumferance = radius * Math.PI * 2;
			let adjustedZRadius = this.size * zScaleOffset * radiusRatio;
			let z = adjustedZRadius * Math.cos(angle);
			let stepsAtHeight = Math.ceil(circumferance / distance);
			switch (this.colours.pattern) {
				case "2-halves":
					if (i < rows / 2) {
						c1 = this.colours.getColour("colour1A");
						c2 = this.colours.getColour("colour2A");
					}
					else {
						c1 = this.colours.getColour("colour1B");
						c2 = this.colours.getColour("colour2B");
					}
					break;
				case "colour-sequence-layered":
					c1 = c2 = this.colours.colourList[Math.floor(this.colours.colourList.length / rows * i)];
					break;
			}
			for (let j = 0; j < stepsAtHeight; j++) {
				let a = j * Math.PI * 2 / stepsAtHeight;
				let x = radiusRatio * radius * Math.cos(a);
				let y = radiusRatio * radius * Math.sin(a);
				if (x > 0)
					x *= 1.4;
				if (y > 0)
					y *= 1.4

				if (z > 0)
					z *= 1.05;


				switch (this.colours.pattern) {
					case "2-mixed":
						if (j % 2 == 0) {
							c1 = this.colours.getColour("colour1A");
							c2 = this.colours.getColour("colour2A");
						}
						else {
							c1 = this.colours.getColour("colour1B");
							c2 = this.colours.getColour("colour2B");
						}
						break;
					case "3-mixed":
						if (j % 3 == 0) {
							c1 = this.colours.getColour("colour1A");
							c2 = this.colours.getColour("colour2A");
						}
						else if (j % 3 == 1) {
							c1 = this.colours.getColour("colour1B");
							c2 = this.colours.getColour("colour2B");
						}
						else {
							c1 = this.colours.getColour("colour1C");
							c2 = this.colours.getColour("colour2C");
						}
						break;
					case "random": //any even number of colours, 2, 4, 6, 8 etc
						let ran = Math.floor(Math.random() * this.colours.colourList.length / 2);
						c1 = this.colours.colourList[ran * 2];
						c2 = this.colours.colourList[ran * 2 + 1]
						break;

				}
				for (let k = 0; k < this.spikeLength; k++) {
					let velo = (5 + k) / 15;
					switch (this.colours.pattern) {
						case "2-layer-gumball":
							if (k < 5) {
								c1 = this.colours.getColour("colour1A");
								c2 = this.colours.getColour("colour2A");
							}
							else {
								c1 = this.colours.getColour("colour1B");
								c2 = this.colours.getColour("colour2B");
							}
							break;
						case "3-layer-gumball":
							if (k > 7) {
								c1 = this.colours.getColour("colour1A");
								c2 = this.colours.getColour("colour2A");
							}
							else if (k > 3) {
								c1 = this.colours.getColour("colour1B");
								c2 = this.colours.getColour("colour2B");
							}
							else {
								c1 = this.colours.getColour("colour1C");
								c2 = this.colours.getColour("colour2C");
							}
							break;
						case "colour-sequence-gumball":
							c1 = c2 = this.colours.colourList[Math.floor(this.colours.colourList.length / this.spikeLength * k)];
							break;
					}
					if (c1 !== undefined && c2 !== undefined && c1 != Colour.Invisible && c2 != Colour.Invisible)
						SpawnLight(posOri, { x: tilePerSecond * x * velo, y: tilePerSecond * y * velo, z: 1.5 * counterGravity1sec + tilePerSecond * z * velo },
							c1, c2, this.extraLongevity + this.physicalSize * 18 + Math.random() * 15 + Math.random() * 5 * (this.spikeLength - k));
				}

			}
		}
		return undefined;
	}
	override GetSpriteString(): string {
		switch (this.colours.pattern) {
			case "one-pair":
				return sprite(GetColouredEffectSprite("effectStar", this.colours.getColour("colour1")));
			case "colour-sequence-layered":
			case "random":
			case "colour-sequence-gumball":
			case "colour-sequence":
				return sprite(GetColouredEffectSprite("effectStar", this.colours.colourList[0]));		
			default:
				return sprite(GetColouredEffectSprite("effectStar", this.colours.getColour("colour1A")));

		}
	}
}