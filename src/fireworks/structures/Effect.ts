import { LoadColours } from "./ColourStructures";
import { GetConfiguredColourSequence } from "../persistent";
import { ValidationContext, ValidationIssue } from "../usageChecker";
import { GetColouredEffectSprite, sprite } from "../../img/images";
import { PersistentDataObject } from "./PersistentDataObject";

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

export class Effect extends PersistentDataObject {
    readonly className: string = "Effect";

    constructor(
        public type: EffectType,
        public colours: LoadColours
    ) {        
        super();
		this.LoadColoursFromSequence();
     }

    Make(_posOri: CoordsXYZ, _velocity: CoordsXYZ): Effect | undefined {
        return undefined;
    }
    LoadColoursFromSequence(sequenceName?: string): void {
        const resolvedSequenceName = (sequenceName ?? this.colours?.sequenceName ?? "").trim();
        if (!resolvedSequenceName) {
            return;
        }

        const sequenceColours = GetConfiguredColourSequence(resolvedSequenceName, this.colours.reverseSequence);
        if (sequenceColours) {
            this.colours.colourList = sequenceColours;
        }
    }

    isValid(ctx: ValidationContext, issues: ValidationIssue[], path: string): boolean {
        const seqName =  (this.colours?.sequenceName ?? "").trim();
        if (seqName && !ctx.colourSequences.some(cs => cs.name === seqName)) {
            issues.push({ path, problem: `Colour sequence "${seqName}" not found` });
            return false;
        }
        return true;
    }

    override toParkData(): any {
        return {
            ...super.toParkData(),
            colours: this.colours?.toParkData ? this.colours.toParkData() : this.colours
        };
    }

    /** Returns the coloured sprites to represent the effect */
    GetSpriteString(): string {    
         return sprite(GetColouredEffectSprite("effectSphere", 7))
    }

    /** Estimated number of ticks this effect remains visible once fired. Used to preview effects with the real palette. */
    getDuration(): number {
        return 0;
    }
}

// Single burst of particles
export class BurstEffect extends Effect {
    constructor(type: EffectType, public size: number, public physicalSize: number, public extraLongevity: number, colours: LoadColours) {
        super(type, colours);
    }
}

// Continuous emission of particles
export class EmitterEffect extends Effect {
    baseVelocity?: CoordsXYZ;
    constructor(type: EffectType, public duration: number, public timeLeft: number, colours: LoadColours, public position : string | CoordsXYZ) {
        super(type, colours);
    }

    override getDuration(): number {
        return this.duration;
    }
}
