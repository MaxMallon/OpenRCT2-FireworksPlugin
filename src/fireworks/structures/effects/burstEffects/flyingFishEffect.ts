import { Colour } from "openrct2-flexui";
import { LoadColours } from "../../ColourStructures";
import { counterGravity1sec, tilePerSecond } from "../../../helpers";
import { SpawnLight } from "../../../particleSpawner";
import { AddFireworkToEmit, AddTrailToEmit } from "../../../fireworksEffectsPlayer";
import { SingularFishEffect } from "../EmitterEffects/singularFishEffect";
import { BurstEffect, EffectType } from "../../Effect";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";

export class FlyingFishEffect extends BurstEffect {
	override readonly className: string = "FlyingFishEffect";

	constructor(size: number, physicalSize: number, extraLongevity: number, colours: LoadColours) {
		super(EffectType.FlyingFish, size, physicalSize, extraLongevity, colours);
	}

	static fromParkData(effect: any): FlyingFishEffect {
		return new FlyingFishEffect(effect?.size ?? 0, effect?.physicalSize ?? 0, effect?.extraLongevity ?? 0, LoadColours.fromParkData(effect?.colours));
	}

	override getDuration(): number {
		return this.extraLongevity + this.physicalSize * 35;
	}

	override Make(posOri: CoordsXYZ, _velocity: CoordsXYZ): BurstEffect | undefined {
		this.LoadColoursFromSequence();
		let colour = Colour.Invisible;
		const hs = 2; // half-spacing for the 2x2x2 cluster
		const clusterOffsets = [
			{ x: -hs, y: -hs, z: -hs }, { x: -hs, y: -hs, z: hs },
			{ x: -hs, y:  hs, z: -hs }, { x: -hs, y:  hs, z: hs },
			{ x:  hs, y: -hs, z: -hs }, { x:  hs, y: -hs, z: hs },
			{ x:  hs, y:  hs, z: -hs }, { x:  hs, y:  hs, z: hs },
		];
		for (let i = 0; i < this.size; i++) {{
			switch (this.colours.pattern) {
				case "one-colour":
					colour = this.colours.getColour("colour1");
					break;
				case "two-colours":
					if (i % 2 == 0) {
						colour = this.colours.getColour("colour1");
					}
					else {
						colour = this.colours.getColour("colour2");
					}
					break;
				case "three-colours":
					if (i % 3 == 0) {
						colour = this.colours.getColour("colour1");
					}
					else if (i % 3 == 1) {
						colour = this.colours.getColour("colour2");
					}
					else {
						colour = this.colours.getColour("colour3");
					}
					break;
					case "colour-sequence":
					colour = this.colours.colourList[Math.min(Math.round(this.colours.colourList.length / this.size * i), this.colours.colourList.length - 1)];
					break;				
			}
			const angle1 = Math.random() * Math.PI * 2;
			const angle2 = Math.random() * Math.PI * 2;
			const xDir = Math.cos(angle1) * Math.sin(angle2);
			const yDir = Math.sin(angle1) * Math.sin(angle2);
			const zDir = Math.cos(angle2);
			const speed = tilePerSecond * this.physicalSize * (Math.random() * 0.5 + 0.5);
			const longevity = this.extraLongevity + this.physicalSize * 15 + Math.random() * 15 * this.physicalSize;
			const vel = { x: speed * xDir, y: speed * yDir, z: 1.5 * counterGravity1sec + speed * zDir };
			const horizLen = Math.sqrt(xDir * xDir + yDir * yDir);
			const perpSign = Math.random() < 0.5 ? 1 : -1;
			const perpX = horizLen > 0.001 ? perpSign * yDir / horizLen : perpSign;
			const perpY = horizLen > 0.001 ? perpSign * -xDir / horizLen : 0;
			const swimDelay = Math.floor(longevity * 0.35);
			const accLength = Math.floor(longevity * 0.5);
			let firstInCluster = true;
			for (const offset of clusterOffsets) {
				const spawnPos = { x: posOri.x + offset.x, y: posOri.y + offset.y, z: posOri.z + offset.z };
				const particle = SpawnLight(spawnPos, vel, colour, colour, longevity, 0);
				if (particle) {
					particle.colours = { body: Colour.Invisible, trim: Colour.Invisible };
					if (firstInCluster) {
						const trailColour = this.colours.getColour("trailColour");
						AddTrailToEmit(Math.floor(longevity), 2, 0.15, trailColour, trailColour, particle);
						firstInCluster = false;
					}
					AddFireworkToEmit(new SingularFishEffect(
						Math.floor(longevity), swimDelay, colour,
						{ x: perpX, y: perpY, z: 0 },
						accLength, accLength,
						speed * 0.05,
						particle
					));
				}
			}
			}
		}
		return undefined;
	}

	override GetSpriteString(): string {
		if (this.colours.pattern == "colour-sequence" && this.colours.colourList.length > 0) {
			return sprite(GetColouredEffectSprite("effectFlyingFish", this.colours.colourList[0]));
		}
		return sprite(GetColouredEffectSprite("effectFlyingFish", this.colours.getColour("colour1")));
	}
}