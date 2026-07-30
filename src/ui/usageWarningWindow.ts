import { button, Colour, flexible, label, LayoutDirection, listview, store, window } from "openrct2-flexui";
import type { OpenWindow } from "openrct2-flexui";
import { UsageReference } from "../fireworks/usageChecker";
import { getMainWindowPosition } from "./windowState";

const KIND_LABELS: Record<string, string> = {
	load: "Load",
	shell: "Shell",
	groundEffect: "Ground Effect",
	sequence: "Sequence",
	show: "Show",
};

/**
 * Open a small warning window informing the user that the item they want to
 * delete is referenced elsewhere, and let them choose how to proceed.
 *
 * @param itemLabel   Short description of the item, e.g. `Load "Red Burst"`.
 * @param usages      List of references to this item.
 * @param onLeaveIt   Callback for "Delete only" – deletes the item and leaves
 *                    existing references pointing at nothing (the user can
 *                    create a new item with the same name to fill the slot).
 * @param onRemoveAll Callback for "Remove from all" – deletes the item AND
 *                    removes / clears every reference to it.
 */
export function openUsageWarningWindow(
	itemLabel: string,
	usages: UsageReference[],
	onLeaveIt: () => void,
	onRemoveAll: () => void
): void {
	if (typeof ui === "undefined") {
		// Headless / test environment – just proceed with deletion.
		onLeaveIt();
		return;
	}

	const usageRows = usages.map(u => {
		const kindLabel = KIND_LABELS[u.kind] ?? u.kind;
		const nameLabel = u.detail ? `${u.name} (${u.detail})` : u.name;
		return [`{WHITE}${kindLabel}`, `{WHITE}${nameLabel}`];
	});

	let handle: OpenWindow | undefined;

	const mainPos = getMainWindowPosition();
	const position = mainPos
		? { x: mainPos.x + 40, y: mainPos.y + 40 }
		: "center" as const;

	const listHeight = Math.max(30, Math.min(120, usages.length * 14 + 16));
	const totalHeight = 120 + listHeight;

	const popup = window({
		title: "Item In Use",
		width: 400,
		height: totalHeight,
		padding: 8,
		position,
		colours: [Colour.BordeauxRedDark, Colour.Grey],
		direction: LayoutDirection.Vertical,
		content: [
			label({ text: `{WHITE}Warning: ${itemLabel} is referenced by:` }),
			listview({
				items: store(usageRows),
				columns: [
					{ header: "Type", width: 100 },
					{ header: "Name / Detail", width: "1w" },
				],
				width: "1w",
				height: listHeight,
				canSelect: false,
			}),
			label({ text: "" }),
			label({ text: "{WHITE}How would you like to proceed?" }),
			flexible({
				direction: LayoutDirection.Horizontal,
				content: [
					
					button({
						text: "Delete anyway and leave references",
						width: 180,
						height: 22,
						onClick: () => {
							handle?.close();
							onLeaveIt();
						},
					}),
					button({
						text: "Delete cascading",
						width: 120,
						height: 22,
						onClick: () => {
							handle?.close();
							onRemoveAll();
						},
					}),
                    button({
						text: "Cancel",
						width: 70,
						height: 22,
						onClick: () => handle?.close(),
					}),
				],
			}),
		],
	});

	handle = popup.open();
}
