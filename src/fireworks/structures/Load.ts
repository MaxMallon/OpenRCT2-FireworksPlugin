import { ValidationContext, ValidationIssue } from "../usageChecker";
import { Effect } from "./Effect";

export class Load {
	constructor(public effects: Effect[] = [], public name: string = "") { }

	isValid(ctx: ValidationContext, issues: ValidationIssue[], path: string): boolean {
		
		let valid = true;
		for (let i = 0; i < this.effects.length; i++) {
			if (!this.effects[i].isValid(ctx, issues, `${path} > Effect ${i + 1}`)) {
				valid = false;
			}
		}
		return valid;
	}

	toParkData(): any {
		return {
			className: "Load",
			name: this.name,
			effects: this.effects.map(effect => effect.toParkData())
		};
	}

	static fromParkData(load: any, decodeEffect: (effect: any) => Effect): Load {
		return new Load((load?.effects ?? []).map((effect: any) => decodeEffect(effect)), String(load?.name ?? ""));
	}
	
	GetSpriteString(): string {
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