import {
    button,
    compute,
    label,
    OpenWindow,
    store,
    tabwindow,
    Colour,
    tab
} from "openrct2-flexui";
import {
    getActiveShowName,
    StopShowProgramme,
    TimeTillNextShow
} from "../fireworks/showPlayer";
import { customImageFor } from "../img/images";
import { setMainWindowColours } from "./windowState";
import { createAboutTab } from "./tabs/aboutTab";
import { toggleSpecialColourSchemes } from "../startup";
import { getHasSeenTutorial, setHasSeenTutorial } from "../fireworks/persistent";
import { openTutorialWindow } from "./tutorialWindow";

// ---- State ----
const statusRevision = store(0);
let tickCounter        = 0;
let statusSubscription: IDisposable | undefined;
let playingWindowDef:   { open(model: void): unknown } | undefined;
let playingHandle:      OpenWindow | undefined;

/** Registered by fireworksEditorWindow so Stop can switch back to the editor. */
let showEditorCallback: (() => void) | undefined;

export function setShowEditorCallback(fn: () => void): void
{
    showEditorCallback = fn;
}

// ---- Ticker – updates labels once per real second (~40 ticks) ----

function startTicker(): void
{
    if (statusSubscription) return;
    tickCounter = 0;
    statusSubscription = context.subscribe("interval.tick", () =>
    {
        tickCounter++;
        if (tickCounter >= 40)
        {
            tickCounter = 0;
            statusRevision.set(statusRevision.get() + 1);
        }
    });
}

function stopTicker(): void
{
    statusSubscription?.dispose();
    statusSubscription = undefined;
}

// ---- Window definition (created once, opened/closed as needed) ----

function getPlayingWindowDef(): { open(model: void): unknown }
{
    if (playingWindowDef) return playingWindowDef;


    playingWindowDef = tabwindow({
        title: "Fireworks - Playing Show Programme",
        width: 310,
        height: 170,
        padding: 10,
        position: "center",
		colours: [Colour.DarkBlue, Colour.Black],
        onClose: () =>
        {
            stopTicker();
            playingHandle = undefined;
            toggleSpecialColourSchemes(false)
        },
        startingTab: 0,
		tabs: [
			tab({
				onOpen: () => { setMainWindowColours([Colour.DarkBlue, Colour.Black]); },
				image: 	customImageFor("showTab"),
				content: [
                    label({ text: compute(statusRevision, () => `Playing show programme: ${getActiveShowName()}`) }),
                    label({ text: compute(statusRevision, () => `Next show: ${TimeTillNextShow()}`) }),
                    label({ text: "" }),
                    button({
                        text: "Stop",
                        width: "1w",
                        height: 38,
                        onClick: () =>
                        {
                            StopShowProgramme();
                            closeFireworksShowPlayingWindow();
                            showEditorCallback?.();
                            if (!getHasSeenTutorial())
                            {
                                openTutorialWindow();
                                setHasSeenTutorial(true);
                            }
                        }
                    })
                ]
			}),
			tab({
				onOpen: () => { setMainWindowColours([Colour.DarkBlue, Colour.Grey])},
				image: { frameBase: 5367, frameCount: 8, frameDuration: 4 },
				content: createAboutTab()
			})
		]
    });

    return playingWindowDef;
}

// ---- Public API ----

export function showFireworksShowPlayingWindow(): void
{
    if (typeof ui === "undefined") return;
    startTicker();
    // Force a fresh status update when opening
    statusRevision.set(statusRevision.get() + 1);
    playingHandle = getPlayingWindowDef().open(undefined) as unknown as OpenWindow;
}

export function closeFireworksShowPlayingWindow(): void
{
    stopTicker();
    playingHandle?.close();
    playingHandle = undefined;
}
