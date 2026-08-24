import { launchSites, saveParkState } from "./persistent";
import { LaunchSite } from "./structures/LaunchSite";
import { getMainWindowBounds } from "../ui/windowState";

export function syncLaunchSites(sites: Array<{ name: string; position: CoordsXYZ; entityId?: number }>): void
{
	launchSites.splice(0, launchSites.length);

	for (const site of sites)
	{
		const normalizedName = normalizeLaunchSiteName(site.name);
		if (!normalizedName)
		{
			continue;
		}

		launchSites.push(new LaunchSite(normalizedName, site.position, site.entityId));
	}

	saveParkState();
}

export function getLaunchSiteByName(name: string): LaunchSite | undefined
{
    const normalizedName = normalizeLaunchSiteName(name);
    if (!normalizedName)
    {
        return undefined;
    }
    for (const site of launchSites) {
        if (site.name === normalizedName) return site;
    }
    return undefined;
    }

export function resolveLaunchSitePosition(position: string | CoordsXYZ): CoordsXYZ | undefined
{
	if (typeof position !== "string")
	{
		return position;
	}
	const launchSite =  getLaunchSiteByName(position);
	if (!launchSite)
	{
		return undefined;
	}
	if (launchSite.entityId == undefined)
		return launchSite.position;
	else{
		let ent = map.getEntity(launchSite.entityId);
		if (ent)
			return { x: ent.x + launchSite.position.x, y: ent.y + launchSite.position.y, z: ent.z + launchSite.position.z };
		return launchSite.position;
	}
}


function normalizeLaunchSiteName(name: string): string
{
	return name.trim();
}

export function registerLaunchSite(name: string, position: CoordsXYZ): void
{
	const normalizedName = normalizeLaunchSiteName(name);
	if (!normalizedName)
	{
		return;
	}

	launchSites.push(new LaunchSite(normalizedName, position, undefined));
	saveParkState();
}

export function unregisterLaunchSite(name: string): void
{
	const normalizedName = normalizeLaunchSiteName(name);
	if (!normalizedName)
	{
		return;
	}
    let i = 0;
     for (; i < launchSites.length; ++i){
        const site = launchSites[i];
        if (site.name === normalizedName) break;
    }
	if (i !== launchSites.length) {
		launchSites.splice(i, 1);
	}

	saveParkState();
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


export const zScaleOffset = 1.1;
export const tilePerSecond = 49427; //measured/from c++ code, velocity needed to travel 1 tile in 1 second roughly
export const counterGravity1sec = 40 * 5041; //measured/from c++ code, upwards velocity needed to counter gravity's effects for 1 second
export const tileSize = 32;

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