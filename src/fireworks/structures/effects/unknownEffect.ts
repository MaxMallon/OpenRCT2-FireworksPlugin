import { LoadColours } from "../ColourStructures";
import { Effect, EffectType } from "../Effect";

export class UnknownEffect extends Effect
{
	override readonly className: string;

	constructor(public typeName: string, private rawData?: any)
	{
		super(EffectType.Unknown, {} as LoadColours);
		this.className = this.typeName;
	}

	override toParkData(): any
	{
		// Re-emit the original raw data verbatim so all fields survive round-trips.
		// Override className with the original class name so a newer version can decode it.
		if (this.rawData)
		{
			return { ...this.rawData, className: this.typeName };
		}
		return { ...super.toParkData(), className: this.typeName };
	}

	static fromParkData(effect: any): UnknownEffect
	{
		const typeName = String(effect?.typeName ?? effect?.className ?? "unknown");
		return new UnknownEffect(typeName, effect);
	}

	override Make(_posOri: CoordsXYZ, _velocity: CoordsXYZ): Effect | undefined
	{
		console.log("Warning: Unknown effect type: " + this.typeName);
		return undefined;
	}
}