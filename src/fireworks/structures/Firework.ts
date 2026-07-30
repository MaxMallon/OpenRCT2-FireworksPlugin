import { ShellColours } from "./ColourStructures";
import { DegreeToRad, counterGravity1sec } from "../helpers";
import { ValidationContext, ValidationIssue } from "../usageChecker";
import { Effect } from "./Effect";
import { ShellLoad } from "./ShellLoad";
import { customImageFor, sprite } from "../../img/images";
import { loadMap } from "../persistent";

export class Firework{
    constructor(public name: string) {}

    toParkData(): any {
        return {
            className: "Firework",
            name: this.name
        };
    }

    static fromParkData(firework: any, decodeEffect: (effect: any) => Effect): Firework {
        switch (firework?.className) {
            case "Shell":
                return Shell.fromParkData(firework, decodeEffect);
            case "GroundEffect":
                return GroundEffect.fromParkData(firework, decodeEffect);
            default:
                return new Firework(String(firework?.name ?? ""));
        }
    }

    Light(): boolean {
        return false;
    }
    
	GetSpriteString(): string {
		return "";
	}
}

export enum ShotHeadType {
    Big = "big",
    Small = "small"
}




export class GroundEffect extends Firework {
    constructor(public effects: Effect[] = [], name: string = "", public position: string = "") { super(name); }

    isValid(ctx: ValidationContext, issues: ValidationIssue[], path: string): boolean {
        const siteName = this.position.trim();
        if (siteName && !ctx.launchSites.some(s => s.name === siteName)) {
            issues.push({ path, problem: `Launch site "${siteName}" not found` });
            return false;
        }
        return true;
    }

    override Light(): boolean {
        return _groundEffectLauncher ? _groundEffectLauncher(this) : false;
    }

    override toParkData(): any {
        return {
            className: "GroundEffect",
            name: this.name,
            effects: this.effects.map(effect => effect.toParkData()),
            position: this.position
        };
    }

    static override fromParkData(firework: any, decodeEffect: (effect: any) => Effect): GroundEffect {
        return new GroundEffect(
            (firework?.effects ?? []).map((effect: any) => decodeEffect(effect)),
            String(firework?.name ?? ""),
            String(firework?.position ?? "")
        );
    }

    override GetSpriteString(): string {
		switch (this.effects.length) {
			case 0:
				return "";
			case 1:
				return this.effects[0]?.GetSpriteString();
			case 2:
				return this.effects[0]?.GetSpriteString() + this.effects[1]?.GetSpriteString();
			case 3:
				return this.effects[0]?.GetSpriteString() + this.effects[1]?.GetSpriteString() + this.effects[2]?.GetSpriteString();
			default:
				return this.effects[0]?.GetSpriteString() + this.effects[1]?.GetSpriteString() + this.effects[2]?.GetSpriteString() + this.effects[3]?.GetSpriteString();
		}
	}
}


export enum ShellFactorySource {
    Direct = "direct",
    Ground = "ground",
    Burst = "burst"
}

export class Shell extends Firework {
    constructor(
        name: string = "",
        public load: ShellLoad,
        public ascendEffects: ShellLoad[] = [],
        public headType: ShotHeadType = ShotHeadType.Big,
        public trail: boolean = false,
        public trailDensity: number = 0.5,
        public trailWidth: number = 3,
        public position: string | CoordsXYZ = "",
        public shellColours: ShellColours = new ShellColours(),
        public timeTillStall: number = 0,
        public velocity: CoordsXYZ = { x: 0, y: 0, z: 0 },
        public delay: number = 0, //Time for crackle to start.
        public azimuth: number = 0,
        public tilt: number = 0,
        public factorySource: ShellFactorySource = ShellFactorySource.Direct,
    ) { 
        super(name);}

    override toParkData(): any {
        return {
            className: "Shell",
            name: this.name,
            load: this.load.toParkData(),
            ascendEffects: this.ascendEffects.map(entry => entry.toParkData()),
            headType: this.headType,
            trail: this.trail,
            trailDensity: this.trailDensity,
            trailWidth: this.trailWidth,
            position: typeof this.position === "string" ? this.position : { x: this.position.x, y: this.position.y, z: this.position.z },
            shellColours: this.shellColours.toParkData(),
            timeTillStall: this.timeTillStall,
            velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
            delay: this.delay,
            azimuth: this.azimuth,
            tilt: this.tilt,
            factorySource: this.factorySource
        };
    }

    static override fromParkData(shell: any, _decodeEffect: (effect: any) => Effect): Shell {
        const position = shell?.position ?? { x: 0, y: 0, z: 0 };
        const velocity = shell?.velocity ?? { x: 0, y: 0, z: 0 };
        return new Shell(
            String(shell?.name ?? ""),
            ShellLoad.fromParkData(shell?.load),
            (shell?.ascendEffects ?? []).map((entry: any) => ShellLoad.fromParkData(entry)),
            shell?.headType ?? ShotHeadType.Big,
            shell?.trail ?? false,
            shell?.trailDensity ?? 0.5,
            shell?.trailWidth ?? 3,
            typeof shell?.position === "string" ? shell.position : { x: position.x, y: position.y, z: position.z },
            ShellColours.fromParkData(shell?.shellColours),
            shell?.timeTillStall ?? 0,
            { x: velocity.x, y: velocity.y, z: velocity.z },
            shell?.delay ?? 0,
            shell?.azimuth ?? shell?.angleX ?? 0,
            shell?.tilt ?? shell?.angleY ?? 0,
            shell?.factorySource ?? ShellFactorySource.Direct
        );
    }

    static fromGround(
        name: string = "",
        load: ShellLoad,
        ascendEffects: ShellLoad[] = [],
        headType: ShotHeadType = ShotHeadType.Big,
        trail: boolean = false,
        trailDensity: number = 0.5,
        trailWidth: number = 3,
        position: string | CoordsXYZ = "",
        shellColours: ShellColours = new ShellColours(),
        timeTillStall: number = 0,
        delay: number = 0,
        azimuth: number = 0,
        tilt: number = 0,
    ): Shell {
        return new Shell(name, load, ascendEffects, headType, trail, trailDensity, trailWidth, position, shellColours, timeTillStall, { x: 0, y: 0, z: 0 }, delay, azimuth, tilt, ShellFactorySource.Ground);
    }

    static fromBurst(
        name: string = "",
        load: ShellLoad,
        ascendEffects: ShellLoad[] = [],
        headType: ShotHeadType = ShotHeadType.Big,
        trail: boolean = false,
        trailDensity: number = 0.5,
        trailWidth: number = 3,
        position: string | CoordsXYZ = "",
        shellColours: ShellColours = new ShellColours(),
        velocity: CoordsXYZ = { x: 0, y: 0, z: 0 },
        delay: number = 0
    ): Shell {
        return new Shell(name, load, ascendEffects, headType, trail, trailDensity, trailWidth, position, shellColours, 0, velocity, delay, 0, 0, ShellFactorySource.Burst);
    }

    isValid(ctx: ValidationContext, issues: ValidationIssue[], path: string): boolean {
        let valid = true;
        const loadName = this.load.loadName.trim();
        if (loadName) {
            const load = ctx.loadMap.get(loadName);
            if (!load) {
                issues.push({ path, problem: `Load "${loadName}" not found` });
                valid = false;
            } else if (!load.isValid(ctx, issues, `${path} > Load "${loadName}"`)) {
                valid = false;
            }
        }
        for (let i = 0; i < this.ascendEffects.length; i++) {
            const ae = this.ascendEffects[i];
            const aeName = ae.loadName.trim();
            if (aeName) {
                const aeLoad = ctx.loadMap.get(aeName);
                if (!aeLoad) {
                    issues.push({ path, problem: `Ascend load "${aeName}" not found` });
                    valid = false;
                } else if (!aeLoad.isValid(ctx, issues, `${path} > Ascend load "${aeName}"`)) {
                    valid = false;
                }
            }
        }
        if (typeof this.position === "string" && this.position.trim()) {
            const siteName = this.position.trim();
            if (!ctx.launchSites.some(s => s.name === siteName)) {
                issues.push({ path, problem: `Launch site "${siteName}" not found` });
                valid = false;
            }
        }
        return valid;
    }

    CalculateVelocityVector(): void {
        const tiltRad = DegreeToRad(this.tilt + 3);
        const azimuthRad = DegreeToRad(this.azimuth);
        const sinTilt = Math.sin(tiltRad);
        const cosTilt = Math.cos(tiltRad);
        const sinAz = Math.sin(azimuthRad);
        const cosAz = Math.cos(azimuthRad);
        const speed = this.timeTillStall / 20 * counterGravity1sec;
        const vx = sinAz * sinTilt * speed;
        const vy = cosAz * sinTilt * speed;
        const vz = cosTilt * speed;
        this.velocity = { x: vx, y: vy, z: vz };
    }

    override Light(): boolean {
        return _shellLauncher ? _shellLauncher(this) : false;
    }

    override GetSpriteString(): string {
        return  loadMap.get(this.load.loadName)?.GetSpriteString() + (this.ascendEffects.length > 0 ? sprite(customImageFor("ascendLoadsPresent")) : "");
    }
}


type ShellLauncherFn = (shell: Shell) => boolean;
let _shellLauncher: ShellLauncherFn | undefined;
export function setShellLauncher(fn: ShellLauncherFn): void {
	_shellLauncher = fn;
}

type GroundEffectLauncherFn = (groundEffect: GroundEffect) => boolean;
let _groundEffectLauncher: GroundEffectLauncherFn | undefined;
export function setGroundEffectLauncher(fn: GroundEffectLauncherFn): void {
	_groundEffectLauncher = fn;
}
