import { Colour } from "openrct2-flexui";
import { counterGravity1sec, DegreeToRad, zScaleOffset } from "../../../helpers";
import { LoadColours } from "../../ColourStructures";
import { SpawnLight } from "../../../particleSpawner";
import { BurstEffect, EffectType, Effect } from "../../Effect";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";

export class SprayEffect extends BurstEffect {
	constructor(public amount: number, extraLongevity: number) {
		super(EffectType.Spray, 0, 0, extraLongevity, 0 as unknown as LoadColours);
	}
}


export class SprayEffectFromGround extends SprayEffect {
	constructor(amount: number, public azimuthBase: number, public tiltBase: number, public timeTillStall: number, public verticalSpread: number, extraLongevity: number, public colour: Colour) {
		super(amount, extraLongevity);
	}

	override toParkData(): any { return { ...super.toParkData(), className: "SprayEffectFromGround" }; }

	static fromParkData(effect: any): SprayEffectFromGround {
		return new SprayEffectFromGround(effect?.amount ?? 0, effect?.azimuthBase ?? effect?.angleXBase ?? 0, effect?.tiltBase ?? effect?.angleYBase ?? 0, effect?.timeTillStall ?? 0, effect?.verticalSpread ?? 0, effect?.extraLongevity ?? 0, effect?.colour ?? Colour.Invisible);
	}

	override Make(posOri: CoordsXYZ, _velocity: CoordsXYZ): Effect | undefined {
		const angularSize = 10;
		const spreadRad = DegreeToRad(angularSize / 2);
		const tiltRad = DegreeToRad(this.tiltBase + 3);
		const azimuthRad = DegreeToRad(this.azimuthBase);
		const sinTilt = Math.sin(tiltRad);
		const cosTilt = Math.cos(tiltRad);
		const sinAz = Math.sin(azimuthRad);
		const cosAz = Math.cos(azimuthRad);
		
		for (let i = 0; i < this.amount; i++) {
			// Sample a random deviation within a cone around the spray axis in local space.
			const devTilt = Math.random() * spreadRad;
			const devAz = Math.random() * 2 * Math.PI;
			const lx = Math.sin(devTilt) * Math.cos(devAz);
			const ly = Math.sin(devTilt) * Math.sin(devAz);
			const lz = Math.cos(devTilt);
			const speed = (this.timeTillStall / 20 * counterGravity1sec) * (this.verticalSpread + Math.random() * (1 - this.verticalSpread));

			// Rotate local direction into world space
			const dx = sinAz * cosTilt * lx - cosAz * ly + sinAz * sinTilt * lz;
			const dy = cosAz * cosTilt * lx + sinAz * ly + cosAz * sinTilt * lz;
			const dz = -sinTilt * lx + cosTilt * lz;

			const vx = dx * speed;
			const vy = dy * speed;
			const vz = dz * speed;
			SpawnLight(posOri, { x: vx, y: vy, z: vz }, this.colour, this.colour, this.extraLongevity + this.timeTillStall + Math.random() * 30);
		}
		return undefined;
	}
	override GetSpriteString(): string {
		return sprite(GetColouredEffectSprite("effectSprayMine", this.colour));
	}
}

export class SprayEffectFromAir extends SprayEffect {
	constructor(amount: number, public baseDir: CoordsXYZ, public lifeTime: number, public speed: number, public spread: number, public thicknessSpread: number, public colour: Colour) {
		super(amount, lifeTime);
	}

	override toParkData(): any { return { ...super.toParkData(), className: "SprayEffectFromAir" }; }

	static fromParkData(effect: any): SprayEffectFromAir {
		return new SprayEffectFromAir(effect?.amount ?? 0, effect?.baseDir ?? { x: 0, y: 0, z: 0 }, effect?.lifeTime ?? 0, effect?.speed ?? 0, effect?.spread ?? 0, effect?.thicknessSpread ?? 0, effect?.colour ?? Colour.Invisible);
	}


	override Make(posOri: CoordsXYZ, _velocity: CoordsXYZ): Effect | undefined {
		// baseDir should be a vector {x, y, z} specifying the *direction* you want to shoot
		this.spread = DegreeToRad(this.spread);

		// normalize baseDir
		let mag = Math.sqrt(this.baseDir.x * this.baseDir.x + this.baseDir.y * this.baseDir.y + this.baseDir.z * this.baseDir.z);
		let bx = this.baseDir.x / mag;
		let by = this.baseDir.y / mag;
		let bz = this.baseDir.z / mag;
		let speedFactor = (this.thicknessSpread + Math.random() * (1 - this.thicknessSpread));

		for (let i = 0; i < this.amount; i++) {
			// Random small deviation
			let dx = (Math.random() - 0.5) * 2 * this.spread;
			let dy = (Math.random() - 0.5) * 2 * this.spread;
			let dz = (Math.random() - 0.5) * 2 * this.spread;

			// Perturbed direction
			let dirx = bx + dx;
			let diry = by + dy;
			let dirz = bz + dz;

			// Re-normalize direction
			let magDir = Math.sqrt(dirx * dirx + diry * diry + dirz * dirz);
			dirx /= magDir;
			diry /= magDir;
			dirz /= magDir;

			let vx = dirx * this.speed * speedFactor;
			let vy = diry * this.speed * speedFactor;
			let vz = (dirz * this.speed * speedFactor + 1.5 * counterGravity1sec) * zScaleOffset;
			/*if (vx > 0)
				vx *= 1.4;
			if (vy > 0)
				vy *= 1.4*/
			SpawnLight(posOri, { x: vx, y: vy, z: vz }, this.colour, this.colour, this.lifeTime + Math.random() * 30);
		}

		return undefined;
	}
	override GetSpriteString(): string {
		return sprite(GetColouredEffectSprite("effectSprayMine", this.colour));
	}
}
