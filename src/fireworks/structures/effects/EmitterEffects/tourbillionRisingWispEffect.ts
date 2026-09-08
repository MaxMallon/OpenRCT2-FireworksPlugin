import { Colour } from "openrct2-flexui";
import { LoadColours } from "../../ColourStructures";
import { SpawnLight } from "../../../particleSpawner";
import { EmitterEffect, EffectType } from "../../Effect";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";
import { counterGravity1sec } from "../../../helpers";

export class TourbillionRisingWispEffect extends EmitterEffect
{
	static readonly TOTAL_TICKS = 400; // 10 seconds at 40 fps


	public posX: number = 0;
	public posY: number = 0;
	public posZ: number = 0;
	public velX: number = 0;
	public velY: number = 0;
	public velZ: number = 0;
	public randomSpeed = Math.random() * 15;
	public driftAngle: number = Math.random() * Math.PI * 2;
	public driftStrength: number = 0.003 + Math.random() * 0.007;

	override readonly className: string = "TourbillionRisingWispEffect";

	constructor(
		public colour: Colour,
		public randomness: number = 80,
		public particle: CrashedVehicleParticle | null = null,
		timeLeft: number = TourbillionRisingWispEffect.TOTAL_TICKS,
		position: CoordsXYZ = { x: 0, y: 0, z: 0 }
	) {
		super(EffectType.TourbillionRisingWisp, TourbillionRisingWispEffect.TOTAL_TICKS, timeLeft, 0 as unknown as LoadColours, position);
	}

	override toParkData(): any
	{
		return { ...super.toParkData(), particle: undefined, particleId: this.particle?.id ?? -1 };
	}

	static fromParkData(effect: any): TourbillionRisingWispEffect
	{
		const wisp = new TourbillionRisingWispEffect(
			effect?.colour ?? Colour.Invisible,
			effect?.randomness ?? 80,
			effect?.particle,
			effect?.timeLeft ?? 0,
			effect?.position ?? { x: 0, y: 0, z: 0 }
		);
		wisp.posX = effect?.posX ?? 0;
		wisp.posY = effect?.posY ?? 0;
		wisp.posZ = effect?.posZ ?? 0;
		wisp.velX = effect?.velX ?? 0;
		wisp.velY = effect?.velY ?? 0;
		wisp.velZ = effect?.velZ ?? 0;
		wisp.randomSpeed = effect?.randomSpeed ?? Math.random() * 15;
		wisp.driftAngle = effect?.driftAngle ?? Math.random() * Math.PI * 2;
		wisp.driftStrength = effect?.driftStrength ?? (0.003 + Math.random() * 0.007);
		return wisp;
	}

	override Make(posOri: CoordsXYZ, _velocity: CoordsXYZ): EmitterEffect | undefined
	{
		this.timeLeft--;
		const elapsed = this.duration - this.timeLeft; // 1 on first call

		if (elapsed === 1)
		{
			// Randomise per-fire parameters, scaled by randomness (80 = default behaviour)
			const scale = this.randomness / 80;
			this.randomSpeed = Math.random() * 15 * scale;
			this.driftAngle = Math.random() * Math.PI * 2;
			this.driftStrength = (0.003 + Math.random() * 0.007) * scale;

			// Spawn the wisp ball with zero initial velocity (we drive it manually)
			let particle = SpawnLight(
				posOri, { x: 0, y: 0, z: 0 },
				this.colour, this.colour,
				this.duration
			);
			if (particle) {
				this.particle = particle;
			}
			if (!this.particle) { this.timeLeft = 0; return undefined; }
			this.posX = posOri.x;
			this.posY = posOri.y;
			this.posZ = posOri.z;
			this.velX = 0;
			this.velY = 0;
			this.velZ = 0;
			return undefined;
		}

		this.velZ += Math.sin(elapsed / (25 + this.randomSpeed)) * 0.05; // oscillate up and down
		this.velX += Math.cos(this.driftAngle) * this.driftStrength; // gentle horizontal curve
		this.velY += Math.sin(this.driftAngle) * this.driftStrength;

		this.posX += this.velX;
		this.posY += this.velY;
		this.posZ += this.velZ;

		if (!this.particle) { this.timeLeft = 0; return undefined; }
		this.particle.x = this.posX;
		this.particle.y = this.posY;
		this.particle.z = this.posZ;
		this.particle.velocity = { x: 0, y: 0, z: counterGravity1sec };

		//magic math makes wisp go zzoooommmm
		// Compute two orthogonal basis vectors for the disc perpendicular to the travel direction
		const speed = Math.sqrt(this.velX * this.velX + this.velY * this.velY + this.velZ * this.velZ);
		let dx = 0, dy = 0, dz = 1;
		if (speed > 1e-4) { dx = this.velX / speed; dy = this.velY / speed; dz = this.velZ / speed; }
		// Reference vector: avoid being parallel to d
		let rx = 0, ry = 0, rz = 1;
		if (Math.abs(dz) > 0.9) { rx = 1; ry = 0; rz = 0; }
		// e1 = cross(ref, d)
		let e1x = ry * dz - rz * dy, e1y = rz * dx - rx * dz, e1z = rx * dy - ry * dx;
		const e1len = Math.sqrt(e1x * e1x + e1y * e1y + e1z * e1z);
		if (e1len > 1e-6) { e1x /= e1len; e1y /= e1len; e1z /= e1len; }
		// e2 = cross(d, e1)
		const e2x = dy * e1z - dz * e1y, e2y = dz * e1x - dx * e1z, e2z = dx * e1y - dy * e1x;

		for (let i = 1; i < 4; i += 1) {
			const displacement = i * 5;
			const xx = this.posX - displacement * this.velX;
			const yy = this.posY - displacement * this.velY;
			const zz = this.posZ - displacement * this.velZ;
			const width = i * 5;
			const r = Math.random();
			for (let j = 0; j < 1; j += 0.5) {
				if (r > j && elapsed > 8 * i) {
					const ru = Math.random() * 2 - 1;
					const rv = Math.random() * 2 - 1;
					SpawnLight({
						x: xx + ru * width * e1x + rv * width * e2x,
						y: yy + ru * width * e1y + rv * width * e2y,
						z: zz + ru * width * e1z + rv * width * e2z
					}, { x: 0, y: 0, z: counterGravity1sec / 2 }, this.colour, this.colour, 8 * i);
				}
			}
		}
		

		return undefined;
		
	}

	override GetSpriteString(): string {
		return sprite(GetColouredEffectSprite("effectWisp", this.colour));
	}
}
