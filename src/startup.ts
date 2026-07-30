import { showFireworksWindow } from "./ui/fireworksEditorWindow";
import { isShowPlaying, loadParkState, saveParkState, showPositionTarget, getHasSeenTutorial, setHasSeenTutorial } from "./fireworks/persistent";
import { initCustomSprites } from "./img/images";
import { AddNewsMessage, RemoveNewsMessageIfMessageCorrect } from "./fireworks/helpers";
import { initPlayerCallbacks } from "./fireworks/fireworksEffectsPlayer";
import { initShowPlayerCallbacks, isShowProgrammeRunning } from "./fireworks/showPlayer";
import { openTutorialWindow } from "./ui/tutorialWindow";

let wereSpecialColourSchemesEnabled: boolean = false;
function onClickMenuItem()
{
	showFireworksWindow();
}

export function toggleSpecialColourSchemes(on: boolean = true)
{
	if (typeof cheats !== "undefined")
	{
		if (on){
		wereSpecialColourSchemesEnabled = cheats.allowSpecialColourSchemes;
		cheats.allowSpecialColourSchemes = true;
		}
		else
			cheats.allowSpecialColourSchemes = wereSpecialColourSchemesEnabled;
	}
}

const GetPluginMessage : string = "This park has been made with a Fireworks Show currently playing, made with the Fireworks Plugin. Please download the plugin to view the show at: ";
let removeMessageAgain: any;
function addParkMessage()
{
	if (isShowPlaying) {
		AddNewsMessage(GetPluginMessage, showPositionTarget);
		removeMessageAgain = context.subscribe("interval.tick", () => {
			RemoveNewsMessageIfMessageCorrect(GetPluginMessage);
			removeMessageAgain.dispose();
			removeMessageAgain = undefined;
		});
	}
}

export function startup()
{
	initCustomSprites();
	initPlayerCallbacks();
	initShowPlayerCallbacks();
	loadParkState();

	if (typeof context !== "undefined")
	{
		context.subscribe("map.change", () => loadParkState());
		context.subscribe("map.save", () => saveParkState());
		context.subscribe("map.save", () => addParkMessage());
	}

	if (typeof ui !== "undefined")
	{
		ui.registerMenuItem("Fireworks", () => onClickMenuItem());
	}
	RemoveNewsMessageIfMessageCorrect(GetPluginMessage);
	if (!isShowProgrammeRunning())
	{
		if (!getHasSeenTutorial())
		{
			showFireworksWindow();
			openTutorialWindow();
			setHasSeenTutorial(true);
		}
	}
}