import { Colour, tab, tabwindow } from "openrct2-flexui";
import { toggleSpecialColourSchemes } from "../startup";
import { setMainWindowHandle, setMainWindowColours, setMainWindowSize } from "./windowState";
import { createLaunchSitesTab } from "./tabs/launchSitesTab";
import { createConfigTab } from "./tabs/configTab";
import { createAboutTab } from "./tabs/aboutTab";
import { createLoadsTab } from "./tabs/loadsTab";
import { createSequenceTab } from "./tabs/sequenceTab";
import { createShowTab, refreshShowTabRides } from "./tabs/showTab";
import { collapseAscendEffectsPanel, createShellsTab } from "./tabs/shellTab";
import { createGroundEffectsTab } from "./tabs/groundEffectsTab";
import { customImageFor } from "../img/images";
import { isShowProgrammeRunning } from "../fireworks/showPlayer";
import { setShowEditorCallback, showFireworksShowPlayingWindow } from "./fireworksShowPlayingWindow";

let fireworksWindow: { open(model: void): unknown } | undefined;

function getFireworksWindow()
{
	if (fireworksWindow)
	{
		return fireworksWindow;
	}

	fireworksWindow = tabwindow({
		title: "Fireworks - Editor",
		width: 640,
		height: { value: 420, min: 420, max: 700 },
		colours: [Colour.DarkBlue, Colour.OliveDark],
		position: "center",
		padding: 8,
		startingTab: 0,
		onClose: () => toggleSpecialColourSchemes(false),
		onOpen: () => toggleSpecialColourSchemes(true),
		tabs: [
			tab({
				onOpen: () => setMainWindowColours([Colour.DarkBlue, Colour.OliveDark]),
				image: customImageFor("launchSiteTab"),
				content: [createLaunchSitesTab()]
			}),
			tab({
				onOpen: () => { setMainWindowColours([Colour.DarkBlue, Colour.LightBrown]); },
				image: 	customImageFor("loadTab"),
				content: createLoadsTab()
			}),
			tab({
				onOpen: () => { setMainWindowColours([Colour.DarkBlue, Colour.LightBrown]); collapseAscendEffectsPanel(); },
				onClose: () => resizeFireworksWindow(640, 420),
				image: 	customImageFor("shellTab"),
				content: createShellsTab()
			}),
			tab({
				onOpen: () => { setMainWindowColours([Colour.DarkBlue, Colour.LightBrown]); },
				image: 	customImageFor("groundEffectTab"),
				content: createGroundEffectsTab()
			}),
			tab({
				onOpen: () => { setMainWindowColours([Colour.DarkBlue, Colour.DarkPurple]); resizeFireworksWindow(824, 420); },
				onClose: () => resizeFireworksWindow(640, 420),
				image: 	customImageFor("sequenceTab"),
				content: createSequenceTab()
			}),
			tab({
				onOpen: () => { setMainWindowColours([Colour.DarkBlue, Colour.Black]); refreshShowTabRides(); resizeFireworksWindow(640, 455); },
				onClose: () => resizeFireworksWindow(640, 420),
				image: 	customImageFor("showTab"),
				content: createShowTab()
			}),
			tab({
				onOpen: () => setMainWindowColours([Colour.DarkBlue, Colour.Grey]),
				image: { frameBase: 5201, frameCount: 4, frameDuration: 4 },
				content: createConfigTab()
			}),
			tab({
				onOpen: () => setMainWindowColours([Colour.DarkBlue, Colour.Grey]),
				image: { frameBase: 5367, frameCount: 8, frameDuration: 4 },
				content: createAboutTab()
			})
		]
	});

	return fireworksWindow;
}

export function resizeFireworksWindow(width: number, height: number): void
{
	setMainWindowSize(width, height);
}

function showFireworksEditorWindow(): void
{
	if (typeof ui === "undefined") return;
	setMainWindowHandle(getFireworksWindow().open(undefined));
}

/** Main entry point. Routes to the playing window if a show is active, otherwise the editor. */
export function showFireworksWindow(): void
{
	if (typeof ui === "undefined") return;
	if (isShowProgrammeRunning())
	{
		showFireworksShowPlayingWindow();
	}
	else
	{
		showFireworksEditorWindow();
	}
}

// Let the playing window know how to reopen the editor when Stop is pressed.
setShowEditorCallback(showFireworksEditorWindow);