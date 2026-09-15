import { t } from "../localization";
import { Colour, flexible, label, LayoutDirection } from "openrct2-flexui";
import type { OpenWindow } from "openrct2-flexui";
import { getMainWindowPosition } from "./windowState";
import { makePopupGroupSwitchable, openPopupWindow } from "./popupWindows";
import { colouredButton } from "./ColouredButton";

export const DISCARD_CHANGES_GROUP = "discard-changes-window";
makePopupGroupSwitchable(DISCARD_CHANGES_GROUP);

let discardWindowCounter = 0;

/**
 * Open a reusable confirmation popup asking the user if they want to discard unsaved changes.
 * Opening another discard window automatically closes the previous one and brings the new one to front.
 */
export function openDiscardChangesWindow(onConfirm: () => void): void {
	if (typeof ui === "undefined") {
		onConfirm();
		return;
	}

	let handle: OpenWindow | undefined;
	const mainPos = getMainWindowPosition();
	const position = mainPos
		? { x: mainPos.x + 80, y: mainPos.y + 80 }
		: "center" as const;

	const key = `discard-changes-${++discardWindowCounter}`;

	handle = openPopupWindow(key, {
		title: t("Unsaved changes"),
		width: 280,
		height: 90,
		padding: 8,
		position,
		colours: [Colour.BordeauxRedDark, Colour.Grey],
		direction: LayoutDirection.Vertical,
		content: [
			label({ text: t("{WHITE}Discard unsaved changes?"), alignment: "centred" }),
			label({ text: "", height: 6 }),
			flexible({
				direction: LayoutDirection.Horizontal,
				content: [
					label({ text: "", width: "1w" }),
                    colouredButton({
						text: t("{WHITE}Yes"),
						width: 80,
						height: 22,
						colour: Colour.SaturatedRed,
						colourDark: Colour.BordeauxRedDark,
						colourLight: Colour.BrightRed,
						onClick: () => {
							handle?.close();
							onConfirm();
						}
					}),	
					label({ text: "", width: "1w" }),
					colouredButton({
						text: t("Cancel"),
						width: 80,
						height: 22,
						colour: Colour.Grey,
						colourDark: Colour.Black,
						colourLight: Colour.White,
						onClick: () => {
							handle?.close();
						}
					}),				
					label({ text: "", width: "1w" }),
				]
			})
		]
	}, DISCARD_CHANGES_GROUP);
}

export function confirmDiscardChanges(isDirty: () => boolean, onConfirm: () => void): void {
	if (!isDirty()) {
		onConfirm();
		return;
	}
	openDiscardChangesWindow(onConfirm);
}
