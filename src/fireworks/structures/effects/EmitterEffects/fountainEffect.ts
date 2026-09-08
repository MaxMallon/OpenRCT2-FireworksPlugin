import { LoadColours, ShellColours } from "../../ColourStructures";
import { counterGravity1sec, DegreeToRad } from "../../../helpers";
import { SpawnLight } from "../../../particleSpawner";
import { Colour } from "openrct2-flexui";
import { MicroBurstEffect } from "../burstEffects/microBurstEffect";
import { EmitterEffect, EffectType } from "../../Effect";
import { Shell, ShotHeadType } from "../../Firework";
import { ShellLoad } from "../../ShellLoad";
import { Load } from "../../Load";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";
export class FountainEffectPhase{
	constructor (public density: number, public maxHeight: number, public colour1: Colour, public colour2: Colour, public colour3: Colour, public crackleColour: Colour, public crackle: boolean, public angularSize: number, public duration: number){}
}

export class FountainEffect extends EmitterEffect {
	override readonly className: string = "FountainEffect";

	constructor(public phases: FountainEffectPhase[], public tilt: number, public azimuth: number, timeLeft: number, position: string | CoordsXYZ, public currentPhaseIndex: number = -1) {
		super(EffectType.Fountain, phases[0].duration, timeLeft,  0 as unknown as LoadColours, position);
	}

	static fromParkData(effect: any): FountainEffect {
		const fe = new FountainEffect(effect.phases.map((phase: any) => new FountainEffectPhase(phase.density, phase.maxHeight, phase.colour1, phase.colour2, phase.colour3, phase.crackleColour, phase.crackle, phase.angularSize, phase.duration)), effect.tilt, effect.azimuth, effect.timeLeft, effect.position, effect.currentPhaseIndex ?? -1);
		if (fe.currentPhaseIndex >= 0 && fe.currentPhaseIndex < fe.phases.length) {
			fe.duration = fe.phases[fe.currentPhaseIndex].duration;
		}
		return fe;
	}

	override getDuration(): number {
		// Effect walks through each phase then a final 1-tick wind-down phase.
		return this.phases.reduce((sum, phase) => sum + phase.duration, 0) + 1;
	}

	InterpolateFountainEffectPhase(phase1: FountainEffectPhase, phase2: FountainEffectPhase, t: number): FountainEffectPhase {
		const density = phase1.density + (phase2.density - phase1.density) * t;
		// Clamp at 0 so interpolating into the 0-height wind-down phase never produces a
		// negative maxHeight (which would give spawned particles a negative lifetime).
		const maxHeight = Math.max(0, phase1.maxHeight + (phase2.maxHeight - phase1.maxHeight) * t);
		const ran = Math.random();
		let colour1 = phase1.colour1;
		let colour2 = phase1.colour2;
		let colour3 = phase1.colour3;		
		let crackleColour = phase1.crackleColour;
		if (t > ran) {
			colour1 = phase2.colour1;
			colour2 = phase2.colour2;
			colour3 = phase2.colour3;
			crackleColour = phase2.crackleColour;
		}
		const crackle = t >= 0.5 ? phase2.crackle : phase1.crackle;
		const angularSize = phase1.angularSize + (phase2.angularSize - phase1.angularSize) * t;
		return new FountainEffectPhase(density, maxHeight, colour1, colour2, colour3, crackleColour, crackle, angularSize, 0);
	}

	override Make(_posOri: CoordsXYZ, _velocity: CoordsXYZ): EmitterEffect | undefined {
		if (this.currentPhaseIndex == -1){
			this.currentPhaseIndex = 0;
			this.timeLeft = this.phases[0].duration;
			this.duration = this.phases[0].duration;
			//Add a final phase to wind down effect.
			const lastPhase = this.phases[this.phases.length - 1];
			this.phases = [...this.phases, new FountainEffectPhase(0, 0, lastPhase.colour1,
				lastPhase.colour2, lastPhase.colour3, lastPhase.crackleColour, false, 0, 1)];
			this.LoadColoursFromSequence();
		}
		let ratio = 1 - this.timeLeft / this.duration;
		if (this.currentPhaseIndex + 1 <= this.phases.length - 1) {		
			const nextPhase = this.phases[this.currentPhaseIndex + 1];
			const currentPhase = this.phases[this.currentPhaseIndex];
			const interpolatedPhase = this.InterpolateFountainEffectPhase(currentPhase, nextPhase, ratio);
		
			let colour = interpolatedPhase.colour1;
			if (interpolatedPhase.colour2 != Colour.Invisible && Math.random() < 0.5)
				colour = interpolatedPhase.colour2;
			else if (interpolatedPhase.colour3 != Colour.Invisible && Math.random() < 0.33)
				colour = interpolatedPhase.colour3;

			// Pre-compute rotation terms once per tick, outside the per-particle loop
			const spreadRad = DegreeToRad(interpolatedPhase.angularSize / 2);
			const tiltRad = DegreeToRad(this.tilt + 3);
			const azimuthRad = DegreeToRad(this.azimuth);
			const sinTilt = Math.sin(tiltRad);
			const cosTilt = Math.cos(tiltRad);
			const sinAz = Math.sin(azimuthRad);
			const cosAz = Math.cos(azimuthRad);
			const speed = interpolatedPhase.maxHeight / 20 * counterGravity1sec;

			for (let i = 0; i < interpolatedPhase.density; i++) {
				// Sample a random deviation within the cone in local frame (+Z = spray axis)
				const devTilt = Math.random() * spreadRad;
				const devAz = Math.random() * 2 * Math.PI;
				const lx = Math.sin(devTilt) * Math.cos(devAz);
				const ly = Math.sin(devTilt) * Math.sin(devAz);
				const lz = Math.cos(devTilt);

				// Rotate local direction into world space via R = Rz(90°-azimuth) * Ry(tilt)
				const dx = sinAz * cosTilt * lx - cosAz * ly + sinAz * sinTilt * lz;
				const dy = cosAz * cosTilt * lx + sinAz * ly + cosAz * sinTilt * lz;
				const dz = -sinTilt * lx + cosTilt * lz;

				let vx = dx * speed;
				let vy = dy * speed;
				let vz = dz * speed;
				
				SpawnLight(_posOri, { x: vx, y: vy, z: vz }, colour, colour, interpolatedPhase.maxHeight + Math.random() * 30);

				if (interpolatedPhase.crackle && Math.random() < 0.2) {
					const loadColours = new LoadColours([interpolatedPhase.crackleColour, interpolatedPhase.crackleColour, interpolatedPhase.crackleColour], "", false, "");
					const load = new ShellLoad("", ShellLoad.explodeAtEnd, undefined, new Load([new MicroBurstEffect(loadColours, 3)]));
					// Floor and clamp at 1 — the engine stores timeToLive as an int and only despawns at
					// exactly 0, so a fractional value here would leave an immortal particle behind.
					const crackleLife = Math.max(1, Math.floor((interpolatedPhase.maxHeight + Math.random() * 30) * (Math.random() * 0.75 + 0.25)));
					const shot = Shell.fromBurst("", load, [], ShotHeadType.Small, false, 0, 0, _posOri, new ShellColours(colour, Colour.Invisible, Colour.Invisible), { x: vx, y: vy, z: vz }, crackleLife);
					shot.Light();
				}
			}
		}

		this.timeLeft--;
		if (this.timeLeft <= 0) {
			this.currentPhaseIndex++;
			if (this.currentPhaseIndex < this.phases.length) {
				this.timeLeft = this.phases[this.currentPhaseIndex].duration;
				this.duration = this.phases[this.currentPhaseIndex].duration;
			}
		}

		return undefined;
	}
	override GetSpriteString(): string {
		return sprite(GetColouredEffectSprite("effectFountain", this.phases[0].colour1));
	}
}


