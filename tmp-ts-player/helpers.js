import { launchSites } from "./persistent";
export function syncLaunchSites(sites) {
    for (var name_1 in launchSites) {
        if (Object.prototype.hasOwnProperty.call(launchSites, name_1)) {
            delete launchSites[name_1];
        }
    }
    for (var _i = 0, sites_1 = sites; _i < sites_1.length; _i++) {
        var site = sites_1[_i];
        registerLaunchSite(site.name, site.position);
    }
}
export function resolveLaunchSitePosition(position) {
    if (typeof position !== "string") {
        return position;
    }
    var launchSite = launchSites[normalizeLaunchSiteName(position)];
    if (!launchSite) {
        return undefined;
    }
    return { x: launchSite.x, y: launchSite.y, z: launchSite.z };
}
function normalizeLaunchSiteName(name) {
    return name.trim();
}
export function registerLaunchSite(name, position) {
    var normalizedName = normalizeLaunchSiteName(name);
    if (!normalizedName) {
        return;
    }
    launchSites[normalizedName] = position;
}
export function unregisterLaunchSite(name) {
    var normalizedName = normalizeLaunchSiteName(name);
    if (!normalizedName) {
        return;
    }
    delete launchSites[normalizedName];
}
export var zScaleOffset = 1.1;
export var tilePerSecond = 49427; //measured/from c++ code, velocity needed to travel 1 tile in 1 second roughly
export var counterGravity1sec = 40 * 5041; //measured/from c++ code, upwards velocity needed to counter gravity's effects for 1 second
export var tileSize = 32;
//Transform degrees to radians
export function DegreeToRad(angle) {
    return angle * Math.PI / 180;
}
