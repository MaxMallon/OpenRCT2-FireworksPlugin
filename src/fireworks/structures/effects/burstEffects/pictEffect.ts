import { LoadColours } from "../../ColourStructures";
import { BurstEffect, EffectType, Effect } from "../../Effect";
//Not doable (well) until rct particle behaviour uses proper math
export class PictEffect extends BurstEffect
{
	override readonly className: string = "PictEffect";

	constructor(size: number, physicalSize: number, extraLongevity: number, colours: LoadColours)
	{
		super(EffectType.Pict, size, physicalSize, extraLongevity, colours);
	}

	static fromParkData(effect: any): PictEffect
	{
		return new PictEffect(effect?.size ?? 0, effect?.physicalSize ?? 0, effect?.extraLongevity ?? 0, LoadColours.fromParkData(effect?.colours));
	}

	override Make(_xposOriyz: CoordsXYZ, _velocity: CoordsXYZ): Effect | undefined
	{
		return undefined;
	}
}