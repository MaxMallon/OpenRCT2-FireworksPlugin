import { t } from "../localization";
﻿import { Colour, tab, tabwindow } from "openrct2-flexui";
import { toggleSpecialColourSchemes } from "../startup";
import { setMainWindowHandle, setMainWindowColours, setMainWindowSize } from "./windowState";
import { createLaunchSitesTab, getLaunchSiteEditorState, resetLaunchSiteEditor, restoreLaunchSiteEditorState } from "./tabs/launchSitesTab";
import { createConfigTab, getColourSequenceEditorState, resetColourSequenceEditor, restoreColourSequenceEditorState } from "./tabs/configTab";
import { createAboutTabForEditor } from "./tabs/aboutTab";
import { createLoadsTab, getLoadEditorState, resetLoadEditor, restoreLoadEditorState } from "./tabs/loadsTab";
import { createSequenceTab, getSequenceEditorState, resetSequenceEditor, restoreSequenceEditorState } from "./tabs/sequenceTab";
import { createShowTab, getShowEditorState, refreshShowTabRides, resetShowEditor, restoreShowEditorState } from "./tabs/showTab";
import { collapseAscendEffectsPanel, createShellsTab, getShellEditorState, resetShellEditor, restoreShellEditorState } from "./tabs/shellTab";
import { createGroundEffectsTab, getGroundEffectEditorState, resetGroundEffectEditor, restoreGroundEffectEditorState } from "./tabs/groundEffectsTab";
import { customImageFor } from "../img/images";
import { isShowProgrammeRunning } from "../fireworks/showPlayer";
import { setShowEditorCallback, showFireworksShowPlayingWindow } from "./fireworksShowPlayingWindow";
import { notifyEditorClosed, notifyEditorOpened } from "../fireworks/testPaletteMode";
import { registerEditorCallbacks } from "../fireworks/persistent";
import { SerializedEditorStates } from "../fireworks/parkStorage";
import { Effect } from "../fireworks/structures/Effect";

registerEditorCallbacks(
	(): SerializedEditorStates => ({
		launchSite: getLaunchSiteEditorState(),
		load: getLoadEditorState(),
		shell: getShellEditorState(),
		groundEffect: getGroundEffectEditorState(),
		sequence: getSequenceEditorState(),
		show: getShowEditorState(),
		colourSequence: getColourSequenceEditorState()
	}),
	(state?: SerializedEditorStates, decodeEffect?: (effect: any) => Effect) => {
		restoreLaunchSiteEditorState(state?.launchSite);
		if (decodeEffect) {
			restoreLoadEditorState(state?.load, decodeEffect);
			restoreGroundEffectEditorState(state?.groundEffect, decodeEffect);
		} else {
			resetLoadEditor();
			resetGroundEffectEditor();
		}
		restoreShellEditorState(state?.shell);
		restoreSequenceEditorState(state?.sequence);
		restoreShowEditorState(state?.show);
		restoreColourSequenceEditorState(state?.colourSequence);
	},
	() => {
		resetLaunchSiteEditor();
		resetLoadEditor();
		resetShellEditor();
		resetGroundEffectEditor();
		resetSequenceEditor();
		resetShowEditor();
		resetColourSequenceEditor();
	}
);

let fireworksWindow: { open(model: void): unknown } | undefined;

function getFireworksWindow()
{
	if (fireworksWindow)
	{
		return fireworksWindow;
	}

	fireworksWindow = tabwindow({
		title: t("Fireworks - Editor"),
		width: 640,
		height: { value: 440, min: 440, max: 700 },
		colours: [Colour.DarkBlue, Colour.OliveDark],
		position: "center",
		padding: 8,
		startingTab: 0,
		onClose: () => { toggleSpecialColourSchemes(false); notifyEditorClosed(); },
		onOpen: () => { toggleSpecialColourSchemes(true); notifyEditorOpened(); },
		tabs: [
			tab({
				onOpen: () => setMainWindowColours([Colour.DarkBlue, Colour.OliveDark]),
				image: customImageFor("launchSiteTab"),
				onClose: () => resizeFireworksWindow(640, 440),
				content: [createLaunchSitesTab()]
			}),
			tab({
				onOpen: () => { setMainWindowColours([Colour.DarkBlue, Colour.LightBrown]); },
				image: 	customImageFor("loadTab"),
				content: createLoadsTab()
			}),
			tab({
				onOpen: () => { setMainWindowColours([Colour.DarkBlue, Colour.LightBrown]); collapseAscendEffectsPanel(); },
				onClose: () => resizeFireworksWindow(640, 425),
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
				onOpen: () => setMainWindowColours([Colour.DarkBlue, Colour.Black]),
				image: { frameBase: 5367, frameCount: 8, frameDuration: 4 },
				content: createAboutTabForEditor()
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