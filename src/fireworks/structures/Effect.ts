import { LoadColours } from "./ColourStructures";
import { GetConfiguredColourSequence } from "../persistent";
import { ValidationContext, ValidationIssue } from "../usageChecker";
import { GetColouredEffectSprite, sprite } from "../../img/images";

export enum EffectType {
    Star = "Star",
    Palm = "Palm",
    SprayBurst = "Spray Burst",
    Sphere = "Sphere",
    Crackle = "Crackle",
    Pict = "Pict",
    Ring = "Ring",
    Spray = "Spray Mine",
    SprayFan = "Spray Fan",
    Comet = "Comet Mine",
    CometFan = "Comet Fan",
    ShellOfShells = "Shell of Shells",
    MicroBurst = "Micro Burst",
    Fountain = "Fountain",
    Trail = "Trail",
    SingularFish = "Singular Fish",
    FlyingFish = "Flying Fish",
    TourbillionRisingWisp = "Tourbillion Rising Wisp",
    Unknown = "Unknown"
}

export class Effect {
    constructor(
        public type: EffectType,
        public colours: LoadColours
    ) {        
		this.LoadColoursFromSequence();
     }

    Make(_posOri: CoordsXYZ, _velocity: CoordsXYZ): Effect | undefined {
        return undefined;
    }
    LoadColoursFromSequence(sequenceName?: string): void {
        const resolvedSequenceName = (sequenceName ?? this.colours.sequenceName ?? "").trim();
        if (!resolvedSequenceName) {
            return;
        }

        const sequenceColours = GetConfiguredColourSequence(resolvedSequenceName, this.colours.reverseSequence);
        if (sequenceColours) {
            this.colours.colourList = sequenceColours;
        }
    }

    isValid(ctx: ValidationContext, issues: ValidationIssue[], path: string): boolean {
        const seqName =  (this.colours.sequenceName ?? this.colours.sequenceName ?? "").trim();
        if (seqName && !ctx.colourSequences.some(cs => cs.name === seqName)) {
            issues.push({ path, problem: `Colour sequence "${seqName}" not found` });
            return false;
        }
        return true;
    }

    toParkData(): any {
        const className = (this as any).constructor?.name ?? "Effect";
        return {
            ...this,
            className,
            colours: this.colours?.toParkData ? this.colours.toParkData() : this.colours
        };
    }

    GetSpriteString(): string {    
         return sprite(GetColouredEffectSprite("effectSphere", 7))
    }
}

export class BurstEffect extends Effect {
    constructor(type: EffectType, public size: number, public physicalSize: number, public extraLongevity: number, colours: LoadColours) {
        super(type, colours);
    }
}

export class EmitterEffect extends Effect {
    constructor(type: EffectType, public duration: number, public timeLeft: number, colours: LoadColours, public position : string | CoordsXYZ) {
        super(type, colours);
    }
}
