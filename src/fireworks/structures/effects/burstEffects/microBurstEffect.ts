import { LoadColours } from "../../ColourStructures";
import { tilePerSecond } from "../../../helpers";
import { SpawnLight } from "../../../particleSpawner";
import { BurstEffect, EffectType } from "../../Effect";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";

export class MicroBurstEffect extends BurstEffect {
	override readonly className: string = "MicroBurstEffect";

	constructor( colours: LoadColours, public speedMultiplier: number = 1) {
		super(EffectType.MicroBurst, 0, 0, 0, colours);
	}

	static fromParkData(effect: any): MicroBurstEffect {
		return new MicroBurstEffect(
			LoadColours.fromParkData(effect?.colours),
			effect?.speedMultiplier ?? 1
		);
	}

	override getDuration(): number {
		return 44 / this.speedMultiplier;
	}

	override Make(posOri: CoordsXYZ, velocity: CoordsXYZ): BurstEffect | undefined {
		for (let i = 0; i < 3; i++) {
			let vx = velocity.x + (-2 + 4 * Math.random() ) * this.speedMultiplier * tilePerSecond;
			let vy = velocity.y + (-2 + 4 * Math.random() ) * this.speedMultiplier * tilePerSecond;
			let vz = velocity.z + (-2 + 4 * Math.random() ) * this.speedMultiplier * tilePerSecond;
			SpawnLight(posOri, { x: vx, y: vy, z: vz }, this.colours.getColour("colour1"), this.colours.getColour("colour1"), (36 + Math.random() * 8) / this.speedMultiplier, undefined);
		}
		for (let i = 0; i < 3; i++) {
			let vx = velocity.x + (-2 + 4 * Math.random() ) * this.speedMultiplier * tilePerSecond;
			let vy = velocity.y + (-2 + 4 * Math.random() ) * this.speedMultiplier * tilePerSecond;
			let vz = velocity.z + (-2 + 4 * Math.random() ) * this.speedMultiplier * tilePerSecond;
			SpawnLight(posOri, { x: vx, y: vy, z: vz }, this.colours.getColour("colour2"), this.colours.getColour("colour2"), (36 + Math.random() * 8) / this.speedMultiplier, undefined);
		}
		for (let i = 0; i < 3; i++) {
			let vx = velocity.x + (-2 + 4 * Math.random() ) * this.speedMultiplier * tilePerSecond;
			let vy = velocity.y + (-2 + 4 * Math.random() ) * this.speedMultiplier * tilePerSecond;
			let vz = velocity.z + (-2 + 4 * Math.random() ) * this.speedMultiplier * tilePerSecond;
			SpawnLight(posOri, { x: vx, y: vy, z: vz }, this.colours.getColour("colour3"), this.colours.getColour("colour3"), (36 + Math.random() * 8) / this.speedMultiplier, undefined);
		}
		return undefined;
	}
	override GetSpriteString(): string {
		return sprite(GetColouredEffectSprite("effectMicroBurst", this.colours.getColour("colour1")));
	}
}