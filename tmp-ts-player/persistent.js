export var launchSites = {};
export var editLoad = undefined;
export var loadList = [];
export var shellLoadToEdit = undefined;
export var shellToEdit = undefined;
export var shellList = [];
export var fountainToEdit = undefined;
export var fountainList = [];
export var editSequence = undefined;
export var sequenceList = [];
export var editShow = undefined;
export var shotShow = [];
export var fireworkTicks = 0;
export function getEditLoad() {
    return editLoad;
}
export function setEditLoad(value) {
    editLoad = value;
}
export function getLoadList() {
    return loadList;
}
export function setLoadList(value) {
    loadList = value;
}
export function tick() {
    fireworkTicks++;
}
