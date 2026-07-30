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
	constructor(public phases: FountainEffectPhase[], public tilt: number, public azimuth: number, timeLeft: number, position: string | CoordsXYZ, public currentPhaseIndex: number = -1) {
		super(EffectType.Fountain, phases[0].duration, timeLeft,  0 as unknown as LoadColours, position);
	}

	override toParkData(): any { return { ...super.toParkData(), className: "FountainEffect" }; }

	static fromParkData(effect: any): FountainEffect {
		return new FountainEffect(effect.phases.map((phase: any) => new FountainEffectPhase(phase.density, phase.maxHeight, phase.colour1, phase.colour2, phase.colour3, phase.crackleColour, phase.crackle, phase.angularSize, phase.duration)), effect.tilt, effect.azimuth, effect.timeLeft, effect.position);
	}

	InterpolateFountainEffectPhase(phase1: FountainEffectPhase, phase2: FountainEffectPhase, t: number): FountainEffectPhase {
		const density = phase1.density + (phase2.density - phase1.density) * t;
		const maxHeight = phase1.maxHeight + (phase2.maxHeight - phase1.maxHeight) * t;
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
		
			/*this.maxHeight = interpolatedPhase.maxHeight;
			let height = this.maxHeight;
			/*
			switch (this.forceProfile) {
				case "flat":
					height = this.maxHeight;
					break;
				case "linear":
					height = this.maxHeight * ratio;
					break;
				case "sine":
					height = this.maxHeight * Math.sin(ratio * Math.PI);
					break;
				case "rounded-trapezoid":
					height = this.maxHeight * Math.pow(Math.sin(ratio * Math.PI), 0.3);
					break;
				case "skewed-rounded-trapezoid":
					let x = ratio * Math.PI;
					let inner = (x + Math.PI)/ 2;
					height = this.maxHeight * 1.4 * (Math.pow(Math.sin(inner), 0.3) * - Math.cos(inner));
					break;

			}*/
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
					const shot = Shell.fromBurst("", load, [], ShotHeadType.Small, false, 0, 0, _posOri, new ShellColours(colour, Colour.Invisible, Colour.Invisible), { x: vx, y: vy, z: vz }, (interpolatedPhase.maxHeight + Math.random() * 30) * (Math.random() * 0.75 + 0.25));
					shot.Light();
				}
			}
			
			/*if (interpolatedPhase.crackle) {
				for (let j = 0; j < 2 * interpolatedPhase.angularSize / 4; j++){
					var	theta = Math.random() * 2 * Math.PI;
					var	phi = Math.acos(2 * Math.random() - 1);	

					let x3 = Math.sin(phi) * Math.cos(theta);
					let y3 = Math.sin(phi) * Math.sin(theta);
					let z3 = Math.cos(phi);
					let size = interpolatedPhase.angularSize / 15;
					let x = _posOri.x + x3 * tileSize * size;		
					let y = _posOri.y + y3 * tileSize * size;	
					let z = _posOri.z + interpolatedPhase.maxHeight * 4 + z3 * tileSize * size * zScaleOffset;
					SpawnLight({x, y, z}, { x: 0, y: 0, z: counterGravity1sec}, interpolatedPhase.crackleColour, interpolatedPhase.crackleColour, 5);
				}
			}*/
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


