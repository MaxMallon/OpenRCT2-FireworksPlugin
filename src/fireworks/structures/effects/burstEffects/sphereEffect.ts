import { Colour } from "openrct2-flexui";
import { LoadColours } from "../../ColourStructures";
import { counterGravity1sec, tilePerSecond, zScaleOffset } from "../../../helpers";
import { SpawnLight } from "../../../particleSpawner";
import { BurstEffect, EffectType } from "../../Effect";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";

export class SphereEffect extends BurstEffect {
	constructor(size: number, physicalSize: number, extraLongevity: number, colours: LoadColours) {
		super(EffectType.Sphere, size, physicalSize, extraLongevity, colours);
	}

	override toParkData(): any { return { ...super.toParkData(), className: "SphereEffect" }; }

	static fromParkData(effect: any): SphereEffect {
		return new SphereEffect(effect?.size ?? 0, effect?.physicalSize ?? 0, effect?.extraLongevity ?? 0, LoadColours.fromParkData(effect?.colours));
	}

	override Make(posOri: CoordsXYZ, _velocity: CoordsXYZ): BurstEffect | undefined {
		this.LoadColoursFromSequence();
		let distance = 10;
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
				//Seperate switch
				switch (this.colours.pattern) {
					case "blinking-uniform-1zone": {
						let f = 0;
						c1 = this.colours.getColour("baseColour");
						c2 = this.colours.getColour("colour1");
						SpawnLight(posOri,
							{ x: tilePerSecond * x, y: tilePerSecond * y, z: 1.5 * counterGravity1sec + tilePerSecond * z },
							c1, c2, this.extraLongevity + this.physicalSize * 15 + Math.random() * 15 * this.physicalSize, f);
					} break;
					case "blinking-uniform-2zones": {
						let f = 0;
						c1 = this.colours.getColour("baseColour");
						if (x > 0) {
							c2 = this.colours.getColour("colour1");
						}
						else {
							c2 = this.colours.getColour("colour2");
							f = 3;
						}
						SpawnLight(posOri,
							{ x: tilePerSecond * x, y: tilePerSecond * y, z: 1.5 * counterGravity1sec + tilePerSecond * z },
							c1, c2, this.extraLongevity + this.physicalSize * 15 + Math.random() * 15 * this.physicalSize, f);
					} break;
					case "blinking-uniform-4zones": {
						let f = 0;
						c1 = this.colours.getColour("baseColour");
						if (j < stepsAtHeight / 4) {
							c2 = this.colours.getColour("colour1");
						}
						else if (j < stepsAtHeight / 2) {
							c2 = this.colours.getColour("colour2");
							f = 1;
						}
						else if (j < stepsAtHeight / 4 * 3) {
							c2 = this.colours.getColour("colour3");
							f = 2;
						}
						else {
							c2 = this.colours.getColour("colour4");
							f = 3;
						}
						SpawnLight(posOri,
							{ x: tilePerSecond * x, y: tilePerSecond * y, z: 1.5 * counterGravity1sec + tilePerSecond * z },
							c1, c2, this.extraLongevity + this.physicalSize * 15 + Math.random() * 15 * this.physicalSize, f);
					} break;
					case "blinking-uniform-6zones": {
						let f = 0;
						c1 = this.colours.getColour("baseColour");
						const xyThreshold = this.physicalSize * 0.85;
						const zThreshold = adjustedZRadius * 0.85;
						if (x > xyThreshold) {
							c2 = this.colours.getColour("colour1");
							f = 0;

						}
						else if (x < -xyThreshold) {
							c2 = this.colours.getColour("colour2");
							f = 0;
						}
						else if (y > xyThreshold) {
							c2 = this.colours.getColour("colour3");
							f = 2;
						}
						else if (y < -xyThreshold) {
							c2 = this.colours.getColour("colour4");
							f = 2;
						}
						else if (z > zThreshold) {
							c2 = this.colours.getColour("colour5");
							f = 4;
						}
						else if (z < -zThreshold) {
							c2 = this.colours.getColour("colour6");
							f = 4;
						}
						else {
							c2 = this.colours.getColour("baseColour");

						}
						SpawnLight(posOri,
							{ x: tilePerSecond * x, y: tilePerSecond * y, z: 1.5 * counterGravity1sec + tilePerSecond * z },
							c1, c2, this.extraLongevity + this.physicalSize * 15 + Math.random() * 15 * this.physicalSize, f);
					} break;


					default:
						if (c1 !== undefined && c2 !== undefined && c1 != Colour.Invisible && c2 != Colour.Invisible)
							SpawnLight(posOri,
								{ x: tilePerSecond * x, y: tilePerSecond * y, z: 1.5 * counterGravity1sec + tilePerSecond * z },
								c1, c2, this.extraLongevity + this.physicalSize * 15 + Math.random() * 15 * this.physicalSize);
						break;
				}
			}
		}
		return undefined;
	}
	override GetSpriteString(): string {
		switch (this.colours.pattern) {
			case "one-pair":
				return sprite(GetColouredEffectSprite("effectSphere", this.colours.getColour("colour1")));
			case "colour-sequence-layered":
			case "random":
			case "colour-sequence":
				return sprite(GetColouredEffectSprite("effectSphere", this.colours.colourList[0]));				
			case "blinking-uniform-1zone": 
			case "blinking-uniform-2zones": 
			case "blinking-uniform-4zones": 
			case "blinking-uniform-6zones": 
			return sprite(GetColouredEffectSprite("effectSphere", this.colours.getColour("baseColour")));
			default:
				return sprite(GetColouredEffectSprite("effectSphere", this.colours.getColour("colour1A")));

		}
	}
}