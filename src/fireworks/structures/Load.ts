import { ValidationContext, ValidationIssue } from "../usageChecker";
import { Effect } from "./Effect";
import { PersistentDataObject } from "./PersistentDataObject";

export class Load extends PersistentDataObject {
	readonly className: string = "Load";

	constructor(public effects: Effect[] = [], public name: string = "") {
		super();
	}

	isValid(ctx: ValidationContext, issues: ValidationIssue[], path: string): boolean {
		
		let valid = true;
		for (let i = 0; i < this.effects.length; i++) {
			if (!this.effects[i].isValid(ctx, issues, `${path} > Effect ${i + 1}`)) {
				valid = false;
			}
		}
		return valid;
	}

	/** Estimated number of ticks until every effect in this load has finished. */
	getDuration(): number {
		let max = 0;
		for (const effect of this.effects) {
			max = Math.max(max, effect.getDuration());
		}
		return max;
	}

	override toParkData(): any {
		return {
			...super.toParkData(),
			effects: this.effects.map(effect => effect.toParkData())
		};
	}

	static fromParkData(load: any, decodeEffect: (effect: any) => Effect): Load {
		return new Load((load?.effects ?? []).map((effect: any) => decodeEffect(effect)), String(load?.name ?? ""));
	}
	
	GetSpriteString(): string {
		let spriteString = "";
        for (const effect of this.effects.slice(0, 4)) {
            spriteString += effect?.GetSpriteString();
        }
        return spriteString;
	}
}