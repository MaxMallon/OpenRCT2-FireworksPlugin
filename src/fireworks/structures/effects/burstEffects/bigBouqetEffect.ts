
import { LoadColours, ShellColours } from "../../ColourStructures";
import { counterGravity1sec, tilePerSecond } from "../../../helpers";
import { BurstEffect, Effect, EffectType } from "../../Effect";
import { Shell, ShotHeadType } from "../../Firework";
import { Load } from "../../Load";
import { ShellLoad } from "../../ShellLoad";
import { ValidationContext, ValidationIssue } from "../../../usageChecker";
import { SphereEffect } from "./sphereEffect";
import { StarEffect } from "./starEffect";
import { GetColouredEffectSprite, sprite } from "../../../../img/images";
import { GetLoadByName } from "../../../persistent";
import { Colour } from "openrct2-flexui";

export class BigBouqetEffect extends BurstEffect {
	constructor(public subSize: number, public subPhysicalSize: number, physicalSize: number, public numberSubShots: number, extraLongevity: number, colours: LoadColours, public subLoads: ShellLoad[] = []) {
		super(EffectType.ShellOfShells, 0, physicalSize, extraLongevity, colours);
		if (colours.colourList.length < 1){
			for (const key in colours.namedColours) {
				if (Object.prototype.hasOwnProperty.call(colours.namedColours, key)) {
					if (colours.namedColours[key] != Colour.Invisible)
						colours.colourList.push(colours.namedColours[key]);
				}
			}
		}
	}

	override toParkData(): any { return { ...super.toParkData(), className: "BigBouqetEffect", subLoads: this.subLoads.map(sl => sl.toParkData()) }; }

	override isValid(ctx: ValidationContext, issues: ValidationIssue[], path: string): boolean {
		let valid = super.isValid(ctx, issues, path);
		for (let i = 0; i < this.subLoads.length; i++) {
			const sl = this.subLoads[i];
			const subLoadName = sl.loadName.trim();
			if (subLoadName) {
				const load = ctx.loadMap.get(subLoadName);
				if (!load) {
					issues.push({ path, problem: `Shell of Shells sub-load "${subLoadName}" not found` });
					valid = false;
				} else if (!load.isValid(ctx, issues, `${path} > Sub-load "${subLoadName}"`)) {
					valid = false;
				}
			}
		}
		return valid;
	}

	static fromParkData(effect: any, _decodeEffect: (effect: any) => Effect): BigBouqetEffect {
		return new BigBouqetEffect(
			effect?.subSize ?? 0,
			effect?.subPhysicalSize ?? 0,
			effect?.physicalSize ?? 0,
			effect?.numberSubShots ?? 0,
			effect?.extraLongevity ?? 0,
			LoadColours.fromParkData(effect?.colours),
			(effect?.subLoads ?? []).map((entry: any) => ShellLoad.fromParkData(entry))
		);
	}

	override Make(posOri: CoordsXYZ, _velocity: CoordsXYZ): BurstEffect | undefined {
		for (let i = 0; i < this.numberSubShots; i++) {
			let x = Math.random() * this.physicalSize - this.physicalSize / 2;
			let y = Math.random() * this.physicalSize - this.physicalSize / 2;
			let z = Math.random() * this.physicalSize - this.physicalSize / 2;
			if (x > 0)
				x *= 1.4;
			if (y > 0)
				y *= 1.4

			let load: ShellLoad;
			let effect: BurstEffect;
			switch (this.colours.pattern) {
				default:
				case "mono-colour-spheres": {
					let c = this.colours.colourList[Math.floor(Math.random() * this.colours.colourList.length)];
						effect = new SphereEffect(this.subSize, this.subPhysicalSize, this.extraLongevity, new LoadColours([], "", false, "one-pair", { "colour1": c, "colour2": c }));
				} break;
				case "mono-colour-stars": {
					let c = this.colours.colourList[Math.floor(Math.random() * this.colours.colourList.length)];
						effect = new StarEffect(this.subSize, this.subPhysicalSize, this.extraLongevity, new LoadColours([], "", false, "one-pair", { "colour1": c, "colour2": c }), 5);
				} break;
				case "duo-colour-spheres": {
					let c1 = this.colours.colourList[Math.floor(Math.random() * this.colours.colourList.length)];
					let c2 = this.colours.colourList[Math.floor(Math.random() * this.colours.colourList.length)];
						effect = new SphereEffect(this.subSize, this.subPhysicalSize, this.extraLongevity, new LoadColours([], "", false, "2-mixed", { "colour1A": c1, "colour2A": c1, "colour1B": c2, "colour2B": c2 }));
				} break;
				case "duo-colour-stars": {
					let c1 = this.colours.colourList[Math.floor(Math.random() * this.colours.colourList.length)];
					let c2 = this.colours.colourList[Math.floor(Math.random() * this.colours.colourList.length)];
						effect = new StarEffect(this.subSize, this.subPhysicalSize, this.extraLongevity, new LoadColours([], "", false, "2-mixed", { "colour1A": c1, "colour2A": c1, "colour1B": c2, "colour2B": c2 }), 5);
				} break;
			}
			this.extraLongevity = 0;
			if (this.colours.pattern == "custom-load"){
				const subLoad = this.subLoads[Math.floor(Math.random() * this.subLoads.length)];
				load = new ShellLoad(subLoad.loadName, ShellLoad.explodeAtEnd);
			}
			else
				load = new ShellLoad("", ShellLoad.explodeAtEnd, undefined, new Load([effect]));

			const shell = Shell.fromBurst("", load, [], ShotHeadType.Small, false, 0, 0, posOri, new ShellColours(this.colours.getColour("heads")), 
			{ x: tilePerSecond * x, y: tilePerSecond * y, z: 1.5 * counterGravity1sec + tilePerSecond * z }, 
				this.extraLongevity + 100 + Math.random() * 20);
			shell.Light();
		}
		return undefined;
	}

	override GetSpriteString(): string {
		if (this.colours.pattern == "custom-load" && this.subLoads.length > 0) {
			const subLoad = this.subLoads[0];
			const load = GetLoadByName(subLoad.loadName);
			return sprite(GetColouredEffectSprite("effectShellOfShells", Colour.Yellow))  + load?.GetSpriteString();
		}
		return sprite(GetColouredEffectSprite("effectShellOfShells", this.colours.colourList[0]));
	}
}