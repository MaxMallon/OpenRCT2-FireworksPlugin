import { getMainWindowBounds } from "../ui/windowState";

//contains random helpers for bits and bobs


let storedWaterIdentifier: string | undefined = undefined;

function getLoadedWaterIdentifier(): string | undefined
{
	const currentWater = objectManager.getObject("water", 0);
	return currentWater ? currentWater.identifier : undefined;
}

export function loadDefaultPalette(): void
{
	// Only capture the original water once, so repeated calls don't overwrite it with the palette's own identifier.
	if (storedWaterIdentifier === undefined)
	{
		storedWaterIdentifier = getLoadedWaterIdentifier();
	}

	if (getLoadedWaterIdentifier() === "rct2.water.wtrcyan")
	{
		return;
	}

	objectManager.unload("water", 0);
	objectManager.load("rct2.water.wtrcyan");
}

export function restorePalette(): void
{
	if (!storedWaterIdentifier || getLoadedWaterIdentifier() === storedWaterIdentifier)
	{
		return;
	}

	objectManager.unload("water", 0);
	objectManager.load(storedWaterIdentifier);
}

export function canRestorePalette(): boolean
{
	return storedWaterIdentifier !== undefined && getLoadedWaterIdentifier() !== storedWaterIdentifier;
}

export function AddNewsMessage(message: string, target: number): void
{
	let messageDesc: ParkMessageDesc = { type: "attraction", text: message, subject: target };
    park.postMessage(messageDesc);
}

export function RemoveNewsMessageIfMessageCorrect( message: string): void
{
	for (var pm = park.messages.length; pm > 0; pm--) { 
		if (park.messages[pm-1].text === message) {
			park.messages[pm-1].remove();
			return;
		}
	}
}

export function ticksToTimeString(ticks: number): string
{
	const normalizedTicks = isFinite(ticks) ? Math.max(0, Math.floor(ticks)) : 0;
	const totalSeconds = Math.floor(normalizedTicks / 40);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	const ticksRemainder = normalizedTicks % 40;
	const pad = (num: number, length: number) => {
		const text = num.toString();
		return text.length >= length ? text : Array(length - text.length + 1).join("0") + text;
	};
	return `${pad(minutes, 2)}m${pad(seconds, 2)}s${pad(ticksRemainder, 2)}t`;
}


export const zScaleOffset = 1.1; //The z-scale units seem slightly smaller than the XY, for some reason. This offsets it roughly again. 
export const tilePerSecond = 49427; //measured/from c++ code, velocity needed to travel 1 tile in 1 second roughly
export const counterGravity1sec = 40 * 5041; //measured/from c++ code, upwards velocity needed to counter gravity's effects for 1 second
export const tileSize = 32; //Units of movement per tile

//Transform degrees to radians
export function DegreeToRad(angle: number): number {
	return angle * Math.PI / 180;
}

export function isEditorWindowObscuringCenter(): boolean {
	const bounds = getMainWindowBounds();
	if (!bounds) return false;

	const screenCenterX = ui.width / 2;
	const screenCenterY = ui.height / 2;

	return bounds.x < screenCenterX && bounds.x + bounds.width > screenCenterX &&
	       bounds.y < screenCenterY && bounds.y + bounds.height > screenCenterY;
}

export function GetFireworkTestLocation(height: number) : CoordsXY{
	var pos = ui.mainViewport.getCentrePosition();
	let newx = pos.x;
	let newy = pos.y;
	switch(ui.mainViewport.rotation){		
		case 0:
			newx += height;
			newy += height;
		break;
		case 1:					
			newx -= height;
			newy += height;
		break;
		case 2:					
			newx -= height;
			newy -= height;
		break;
		case 3:
			newx += height;
			newy -= height;
		break;		
	}
	return {x: newx, y: newy};
}