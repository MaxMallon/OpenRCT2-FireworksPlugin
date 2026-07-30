import { button, compute, flexible, label, LayoutDirection, listview, OpenWindow, store, textbox, window } from "openrct2-flexui";
import { cloneLoad, loadContainsBigBouqetEffect } from "../../fireworks/loadHelpers";
import { getMainWindowPosition } from "../windowState";
import { Load } from "../../fireworks/structures/Load";

export function openBigBouqetLoadSelectionWindow(loads: Load[], selectedLoadNames: string[], onSelect: (load: Load) => void): void
{
	const search = store("");
	const filteredLoads = compute(search, query => {
		const normalizedQuery = query.trim().toLowerCase();
		return loads.filter(load => {
			const loadName = load.name.trim();
			if (!loadName || selectedLoadNames.indexOf(loadName) >= 0 || loadContainsBigBouqetEffect(load))
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

	const template = window({
		title: "Select Custom Load",
		width: 320,
		height: 260,
		padding: 8,
		position,
		direction: LayoutDirection.Vertical,
		content: [
			label({ text: "Search by prefix" }),
			textbox({
				text: search,
				onChange: value => search.set(value),
				width: 280,
				maxLength: 64
			}),
			listview({
				items: compute(filteredLoads, nextLoads => nextLoads.map(load => [load.name, load.GetSpriteString(), `${load.effects.length}`])),
				columns: [
					{ header: "Load", width: "2w" },
					{ header: "Effects", width: "1w" },
					{ header: "Count", width: "1w" }
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
					label({ text: "Click a load to add it.", width: "1w" }),
					button({
						text: "Close",
						width: 70,
						onClick: () => handle?.close()
					})
				]
			})
		]
	});

	handle = template.open();
}
