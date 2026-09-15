import { t } from "../../localization";
import { Colour, compute, flexible, label, LayoutDirection, listview, OpenWindow, store, textbox, window } from "openrct2-flexui";
import { cloneLoad } from "../../fireworks/cloneHelpers";
import { loadContainsShellOfShellsEffect } from "../../fireworks/usageChecker";
import { getMainWindowPosition } from "../windowState";
import { isPopupOpen, openPopupCustom } from "../popupWindows";
import { EFFECT_SUB_WINDOW_GROUP } from "./effectWindowTemplate";
import { Load } from "../../fireworks/structures/Load";
import { colouredButton } from "../ColouredButton";

export function openShellOfShellsLoadSelectionWindow(loads: Load[], selectedLoadNames: string[], onSelect: (load: Load) => void): void
{
	if (isPopupOpen(EFFECT_SUB_WINDOW_GROUP))
	{
		return;
	}
	const search = store("");
	const filteredLoads = compute(search, query => {
		const normalizedQuery = query.trim().toLowerCase();
		return loads.filter(load => {
			const loadName = load.name.trim();
			if (!loadName || selectedLoadNames.indexOf(loadName) >= 0 || loadContainsShellOfShellsEffect(load))
			{
				return false;
			}

			if (!normalizedQuery)
			{
				return true;
			}

			return loadName.toLowerCase().indexOf(normalizedQuery) === 0;
		});
	});
	let handle: OpenWindow | undefined;
	const mainPos = getMainWindowPosition();
	const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;

	openPopupCustom(EFFECT_SUB_WINDOW_GROUP, onClose =>
	{
		const template = window({
		title: t("Select Custom Load"),
		width: 320,
		height: 260,
		padding: 8,
		position,
		onClose,
		direction: LayoutDirection.Vertical,
		content: [
			label({ text: t("Search by prefix") }),
			textbox({
				text: search,
				onChange: value => search.set(value),
				width: 280,
				maxLength: 64
			}),
			listview({
				items: compute(filteredLoads, nextLoads => nextLoads.map(load => [load.name, load.GetSpriteString(), `${load.effects.length}`])),
				columns: [
					{ header: t("Load"), width: "2w" },
					{ header: t("Effects"), width: "1w" },
					{ header: t("Count"), width: "1w" }
				],
				width: 292,
				height: 160,
				canSelect: true,
				onClick: row => {
					const load = filteredLoads.get()[row];
					if (!load)
					{
						return;
					}

					onSelect(cloneLoad(load));
					handle?.close();
				}
			}),
			flexible({
				direction: LayoutDirection.Horizontal,
				content: [
					label({ text: t("Click a load to add it."), width: "1w" }),
					colouredButton({
						text: t("Close"),
						width: 70,
						height: 22,
						colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
						onClick: () => handle?.close()
					})
				]
			})
		]
	});

		handle = template.open();
		return handle;
	});
}
