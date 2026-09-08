import { ShellColours } from "./ColourStructures";
import { DegreeToRad, counterGravity1sec } from "../helpers";
import { ValidationContext, ValidationIssue } from "../usageChecker";
import { Effect } from "./Effect";
import { ShellLoad } from "./ShellLoad";
import { Load } from "./Load";
import { PersistentDataObject } from "./PersistentDataObject";
import { customImageFor, sprite } from "../../img/images";
import { loadMap } from "../persistent";

export class Firework extends PersistentDataObject {
    readonly className: string = "Firework";

    constructor(public name: string) {
        super();
    }

    override toParkData(): any {
        return {
            ...super.toParkData(),
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
    override readonly className: string = "GroundEffect";

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

    /** Estimated number of ticks until every effect fired by this ground effect has finished. */
    getDuration(): number {
        return new Load(this.effects).getDuration();
    }

    override toParkData(): any {
        return {
            ...super.toParkData(),
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
        let spriteString = "";
        for (const effect of this.effects.slice(0, 4)) {
            spriteString += effect?.GetSpriteString();
        }
        return spriteString;
	}
}


export enum ShellFactorySource {
    Direct = "direct", //nono use
    Ground = "ground",
    Burst = "burst"
}

export class Shell extends Firework {
    override readonly className: string = "Shell";

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
        public randomness: number = 0,
        public factorySource: ShellFactorySource = ShellFactorySource.Direct,
    ) { 
        super(name);}

    /* runtime only, member stored to use value to scale ascendloads later */
    public lastHeightRandomnessFactor: number = 1;

    override toParkData(): any {
        return {
            ...super.toParkData(),
            load: this.load.toParkData(),
            ascendEffects: this.ascendEffects.map(entry => entry.toParkData()),
            position: typeof this.position === "string" ? this.position : { x: this.position.x, y: this.position.y, z: this.position.z },
            shellColours: this.shellColours.toParkData(),
            velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z }
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
            shell?.randomness ?? 0,
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
        randomness: number = 0,
    ): Shell {
        return new Shell(name, load, ascendEffects, headType, trail, trailDensity, trailWidth, position, shellColours, timeTillStall, { x: 0, y: 0, z: 0 }, delay, azimuth, tilt, randomness, ShellFactorySource.Ground);
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
        return new Shell(name, load, ascendEffects, headType, trail, trailDensity, trailWidth, position, shellColours, 0, velocity, delay, 0, 0, 0, ShellFactorySource.Burst);
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

    //transform 'fromground' params to actual velocity vector
    CalculateVelocityVector(): void {
        this.lastHeightRandomnessFactor = 1;
        let tilt = this.tilt;
        let azimuth = this.azimuth;
        let timeTillStall = this.timeTillStall;
        if (this.randomness > 0) {
            const fraction = this.randomness / 100;
            const azimuthDeviation = (Math.random() * 2 - 1) * this.randomness * 0.5;
            const trajectoryDeviation = (Math.random() * 2 - 1) * this.randomness * 0.5;
            const heightMultiplier = 1 + (Math.random() * 2 - 1) * fraction;
            azimuth += azimuthDeviation;
            tilt += trajectoryDeviation;
            timeTillStall *= heightMultiplier;
            this.lastHeightRandomnessFactor = heightMultiplier;
        }
        const tiltRad = DegreeToRad(tilt + 3);
        const azimuthRad = DegreeToRad(azimuth);
        const sinTilt = Math.sin(tiltRad);
        const cosTilt = Math.cos(tiltRad);
        const sinAz = Math.sin(azimuthRad);
        const cosAz = Math.cos(azimuthRad);
        const speed = timeTillStall / 20 * counterGravity1sec;
        const vx = sinAz * sinTilt * speed;
        const vy = cosAz * sinTilt * speed;
        const vz = cosTilt * speed;
        this.velocity = { x: vx, y: vy, z: vz };
    }

    override Light(): boolean {
        return _shellLauncher ? _shellLauncher(this) : false;
    }

    /** Estimated number of ticks until the shell's ascent, main load and all ascend loads have finished. */
    getDuration(resolveLoad: (name: string) => Load | undefined = name => loadMap.get(name.trim())): number {
        let maxEnd = this.delay + 1;

        const mainLoad = this.load.runtimeLoad ?? resolveLoad(this.load.loadName);
        maxEnd = Math.max(maxEnd, this.delay + (mainLoad?.getDuration() ?? 0));

        for (const ascend of this.ascendEffects) {
            const fireTime = ascend.timeTillExplode === ShellLoad.explodeAtEnd ? this.delay : ascend.timeTillExplode;
            const ascendLoad = ascend.runtimeLoad ?? resolveLoad(ascend.loadName);
            maxEnd = Math.max(maxEnd, fireTime + (ascendLoad?.getDuration() ?? 0));
        }

        return maxEnd;
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
