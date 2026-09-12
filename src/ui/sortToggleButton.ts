import { Colour, compute, store, WidgetCreator, FlexiblePosition } from "openrct2-flexui";
import { colouredButton } from "./ColouredButton";

/** Shared at runtime so the sort order set in one select window carries over to the others. */
const sharedSortOrder = store(false);

/** Returns the shared sort order store (old-to-new = false, new-to-old = true), synced across all select windows for the runtime session. */
export function createSortOrderStore(): ReturnType<typeof store<boolean>>
{
	return sharedSortOrder;
}

/** A toggleable button showing "Sort: Old-New" / "Sort: New-Old", flipping the given order store. */
export function sortToggleButton(newestFirst: ReturnType<typeof store<boolean>>, width = 100, height = 20): WidgetCreator<FlexiblePosition>
{
	return colouredButton({
		text: compute(newestFirst, reversed => reversed ? "Sort: New-Old" : "Sort: Old-New"),
		width,
		height,
		colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
		onClick: () => newestFirst.set(!newestFirst.get())
	});
}

/** Reverses `items` (newest first) when `newestFirst` is true, otherwise returns them unchanged (oldest first). */
export function applySortOrder<T>(items: T[], newestFirst: boolean): T[]
{
	return newestFirst ? [...items].reverse() : items;
}
