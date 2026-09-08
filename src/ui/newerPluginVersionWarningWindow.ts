import { Colour, flexible, label, LayoutDirection } from "openrct2-flexui";
import type { OpenWindow } from "openrct2-flexui";
import { openPopupWindow } from "./popupWindows";
import { colouredButton } from "./ColouredButton";

export function openNewerPluginVersionWarningWindow(savedVersion: string, currentVersion: string, downloadURL: string): void
{
	if (typeof ui === "undefined")
	{
		return;
	}

	let handle: OpenWindow | undefined;
	handle = openPopupWindow("newer-plugin-version-warning", {
		title: "Newer Fireworks Plugin Version",
		width: 400,
		height: 142,
		padding: 8,
		position: "center",
		colours: [Colour.BordeauxRedDark, Colour.Grey],
		direction: LayoutDirection.Vertical,
		content: [
			label({ text: `{WHITE}This park was saved with the Fireworks plugin version: ${savedVersion}.` }),
			label({ text: `{WHITE}This installation of the Fireworks plugin is ${currentVersion}{WHITE}.` }),
			label({ text: `{WHITE}An attempt has been made to load, but some or all features may be broken.` }),
			label({ text: `{WHITE}Download the new version from\n${downloadURL}`, height: 28 }),
			flexible({
				direction: LayoutDirection.Horizontal,
				content: [
                    label({ text: '', width: '1w'}),
					colouredButton({
						text: "Okay",
						width: 70,
						height: 22,
                        colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
						onClick: () => handle?.close(),
					}),
                    label({ text: '', width: '1w'}),
				]
			}),
		]
	});
}