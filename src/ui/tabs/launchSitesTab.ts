import { absolute, box, button, Colour, compute, flexible, graphics, label, LayoutDirection, listview, store, textbox, viewport } from "openrct2-flexui";
import { groupbox } from "openrct2-flexui";
import { numberInputSpinner } from "../numberInputSpinner";
import { launchSites, launchSitesRevision, setLaunchSites } from "../../fireworks/persistent";
import { customImageFor } from "../../img/images";
import { findLaunchSiteUsages, removeLaunchSiteUsages } from "../../fireworks/usageChecker";
import { openUsageWarningWindow } from "../usageWarningWindow";
import { LaunchSite } from "../../fireworks/structures/LaunchSite";
import { colouredButton } from "../ColouredButton";
import { SerializedLaunchSiteEditorState } from "../../fireworks/parkStorage";
import { confirmDiscardChanges } from "../discardChangesWindow";

const DEFAULT_LAUNCH_SITE_EDITOR = {
	name: "",
	x: 0,
	y: 0,
	z: 0,
	entityId: undefined as number | undefined,
	selectedIndex: undefined as number | undefined
};

const launchSiteX = store(DEFAULT_LAUNCH_SITE_EDITOR.x);
const launchSiteY = store(DEFAULT_LAUNCH_SITE_EDITOR.y);
const launchSiteZ = store(DEFAULT_LAUNCH_SITE_EDITOR.z);
const launchSiteName = store(DEFAULT_LAUNCH_SITE_EDITOR.name);
const launchSiteEntityId = store<number | undefined>(DEFAULT_LAUNCH_SITE_EDITOR.entityId);
const selectedLaunchSiteIndex = store<number | undefined>(DEFAULT_LAUNCH_SITE_EDITOR.selectedIndex);
const tickCounter = store(0);
const launchSiteDisplayPosition = compute(
	launchSiteX,
	launchSiteY,
	launchSiteZ,
	launchSiteEntityId,
	tickCounter,
	(x, y, z, entityId) => {
		if (typeof entityId === "number") {
			const entityCoords = getEntityCoords(entityId);
			if (entityCoords) {
				return { x: entityCoords.x + x, y: entityCoords.y + y, z: entityCoords.z + z };
			}
		}
		return { x, y, z };
	}
);
export const pickerToolId = "Fireworks_Site_Selection";
const pickerToolActive = store(false);

function deactivatePickerTool() {
	if (typeof ui === "undefined") {
		return;
	}

	const uiApi = ui as any;
	const activeTool = uiApi.tool;
	if (activeTool && typeof activeTool.cancel === "function") {
		activeTool.cancel();
		return;
	}

	if (typeof uiApi.cancelTool === "function") {
		uiApi.cancelTool();
	}
	pickerToolActive.set(false);
}

function getTileHeight(x: number, y: number) {
	if (typeof map === "undefined") {
		return undefined;
	}

	const tile = map.getTile(Math.floor(x / 32), Math.floor(y / 32));
	for (const element of tile.elements) {
		if (element.type === "surface") {
			return element.baseHeight * 8;
		}
	}

	return undefined;
}

function onPickSiteButtonClick() {
	if (typeof ui === "undefined") {
		return;
	}

	const uiApi = ui as any;
	if (uiApi.tool && uiApi.tool.id === pickerToolId) {
		deactivatePickerTool();
		return;
	}

	pickerToolActive.set(true);
	uiApi.activateTool({
		id: pickerToolId,
		cursor: "cross_hair",
		onFinish: () => pickerToolActive.set(false),
		onDown: (event: any) => {
			const coords = event?.mapCoords ?? event?.coords ?? event?.location ?? event?.tile ?? event?.position;
			const entityId = event?.entityId ?? event?.entity?.id ?? event?.entity?.entityId;

			if (typeof entityId === "number") {
				// Set offsets to 0 when entity is selected
				launchSiteX.set(0);
				launchSiteY.set(0);
				launchSiteZ.set(0);
				launchSiteEntityId.set(entityId);
			}
			else if (coords && typeof coords.x === "number" && typeof coords.y === "number") {
				// Use absolute coords when no entity
				launchSiteX.set(coords.x + 16);
				launchSiteY.set(coords.y + 16);
				const zFromEvent = typeof coords.z === "number" ? coords.z : undefined;
				const zFromTile = getTileHeight(coords.x, coords.y);
				launchSiteZ.set(zFromEvent ?? zFromTile ?? launchSiteZ.get());
				launchSiteEntityId.set(undefined);
			}

			deactivatePickerTool();
		}
	});
}

function getEntityCoords(entityId: number | undefined) {
	if (typeof entityId !== "number" || typeof map === "undefined") {
		return undefined;
	}

	const entity = map.getEntity(entityId);
	if (entity && typeof entity.x === "number" && typeof entity.y === "number" && typeof entity.z === "number") {
		return { x: entity.x, y: entity.y, z: entity.z };
	}

	return undefined;
}

function addLaunchSite() {
	const name = launchSiteName.get().trim();
	const entityId = launchSiteEntityId.get();

	const generateNextSiteName = (): string => {
		let index = 1;
		while (true) {
			const candidate = `Site ${index}`;
			let exists = false;
			for (let i = 0; i < launchSites.length; i++) {
				if (launchSites[i].name === candidate) {
					exists = true;
					break;
				}
			}

			if (!exists) {
				return candidate;
			}

			index++;
		}
	};

	// Get coordinates from entity if available, otherwise use static coords
	let x = launchSiteX.get();
	let y = launchSiteY.get();
	let z = launchSiteZ.get();

	if (typeof entityId === "number") {
		const entityCoords = getEntityCoords(entityId);
		if (entityCoords) {
			x = entityCoords.x;
			y = entityCoords.y;
			z = entityCoords.z;
		}
	}

	// If no name provided, generate the next available default name.
	const finalName = name || generateNextSiteName();

	// Store offsets if entity, otherwise absolute coords
	const storeX = typeof entityId === "number" ? launchSiteX.get() : x;
	const storeY = typeof entityId === "number" ? launchSiteY.get() : y;
	const storeZ = typeof entityId === "number" ? launchSiteZ.get() : z;

	const siteIndex = (() => {
		for (let i = 0; i < launchSites.length; i++) {
			if (launchSites[i].name === finalName) {
				return i;
			}
		}
		return -1;
	})();
	if (siteIndex >= 0) {
		// Update existing site
		const updatedSites = [...launchSites];
		updatedSites[siteIndex] = new LaunchSite(finalName, { x: storeX, y: storeY, z: storeZ }, entityId);
		setLaunchSites(updatedSites);
	}
	else {
		// Add new site
		setLaunchSites([...launchSites, new LaunchSite(finalName, { x: storeX, y: storeY, z: storeZ }, entityId)]);
	}
}

function deleteSelectedLaunchSite() {
	const selectedIndex = selectedLaunchSiteIndex.get();
	if (typeof selectedIndex !== "number") {
		return;
	}
	if (selectedIndex < 0 || selectedIndex >= launchSites.length) {
		selectedLaunchSiteIndex.set(undefined);
		return;
	}

	const site = launchSites[selectedIndex];
	const usages = findLaunchSiteUsages(site.name);

	const doDelete = () => {
		setLaunchSites(launchSites.filter((_, index) => index !== selectedIndex));
		selectedLaunchSiteIndex.set(undefined);
	};

	if (usages.length > 0) {
		openUsageWarningWindow(
			`Launch site "${site.name}"`,
			usages,
			doDelete,
			() => {
				removeLaunchSiteUsages(site.name);
				doDelete();
			}
		);
		return;
	}

	doDelete();
}

export function getLaunchSiteEditorState(): SerializedLaunchSiteEditorState {
	return {
		launchSite: new LaunchSite(
			launchSiteName.get(),
			{ x: launchSiteX.get(), y: launchSiteY.get(), z: launchSiteZ.get() },
			launchSiteEntityId.get()
		).toParkData()
	};
}

export function restoreLaunchSiteEditorState(state?: SerializedLaunchSiteEditorState): void {
	if (!state || !state.launchSite) {
		resetLaunchSiteEditor();
		return;
	}
	const site = LaunchSite.fromParkData(state.launchSite);
	launchSiteName.set(site.name);
	launchSiteX.set(site.position.x);
	launchSiteY.set(site.position.y);
	launchSiteZ.set(site.position.z);
	launchSiteEntityId.set(site.entityId);
	selectedLaunchSiteIndex.set(DEFAULT_LAUNCH_SITE_EDITOR.selectedIndex);
}

export function resetLaunchSiteEditor(): void {
	launchSiteName.set(DEFAULT_LAUNCH_SITE_EDITOR.name);
	launchSiteX.set(DEFAULT_LAUNCH_SITE_EDITOR.x);
	launchSiteY.set(DEFAULT_LAUNCH_SITE_EDITOR.y);
	launchSiteZ.set(DEFAULT_LAUNCH_SITE_EDITOR.z);
	launchSiteEntityId.set(DEFAULT_LAUNCH_SITE_EDITOR.entityId);
	selectedLaunchSiteIndex.set(DEFAULT_LAUNCH_SITE_EDITOR.selectedIndex);
}

export function isLaunchSiteEditorDirty(): boolean {
	const currentName = launchSiteName.get().trim();
	const currentX = launchSiteX.get();
	const currentY = launchSiteY.get();
	const currentZ = launchSiteZ.get();
	const currentEntityId = launchSiteEntityId.get();

	if (!currentName) {
		return currentX !== DEFAULT_LAUNCH_SITE_EDITOR.x ||
			currentY !== DEFAULT_LAUNCH_SITE_EDITOR.y ||
			currentZ !== DEFAULT_LAUNCH_SITE_EDITOR.z ||
			currentEntityId !== DEFAULT_LAUNCH_SITE_EDITOR.entityId;
	}

	const saved = launchSites.find(s => s.name === currentName);
	if (!saved) {
		return true;
	}

	return saved.position.x !== currentX ||
		saved.position.y !== currentY ||
		saved.position.z !== currentZ ||
		saved.entityId !== currentEntityId;
}

function loadLaunchSite(index: number) {
	const site = launchSites[index];
	if (!site) {
		return;
	}

	launchSiteName.set(site.name);
	launchSiteX.set(site.position.x);
	launchSiteY.set(site.position.y);
	launchSiteZ.set(site.position.z);
	launchSiteEntityId.set(site.entityId);
	selectedLaunchSiteIndex.set(index);
}

function unfollowEntity() {
	const entityId = launchSiteEntityId.get();
	if (typeof entityId !== "number") {
		return;
	}

	// Get the entity's current absolute position
	const entityCoords = getEntityCoords(entityId);
	if (entityCoords) {
		// Convert offsets to absolute coordinates
		launchSiteX.set(entityCoords.x + launchSiteX.get());
		launchSiteY.set(entityCoords.y + launchSiteY.get());
		launchSiteZ.set(entityCoords.z + launchSiteZ.get());
	}

	// Clear the entity ID
	launchSiteEntityId.set(undefined);
}

function moveByDirection(direction: "up" | "down" | "left" | "right"): void {
	const step = 1;
	const rotation: number = (typeof ui !== "undefined" && ui.mainViewport)
		? (((ui.mainViewport.rotation % 4) + 4) % 4)
		: 0;

	// Base deltas at rotation 0: up=(-1,-1), down=(+1,+1), left=(-1,+1), right=(+1,-1)
	const baseDeltas: Record<string, [number, number]> = {
		up: [-1, -1],
		down: [+1, +1],
		left: [+1, -1],
		right: [-1, +1]
	};

	let [dx, dy] = baseDeltas[direction];

	// Each 90° clockwise camera rotation maps (dx, dy) → (-dy, dx)
	for (let i = 0; i < rotation; i++) {
		const tmp = dx;
		dx = -dy;
		dy = tmp;
	}

	launchSiteX.set(launchSiteX.get() + dx * step);
	launchSiteY.set(launchSiteY.get() + dy * step);
}

function clearCurrentSite() {
	resetLaunchSiteEditor();
}

export function createLaunchSitesTab() {
	let tickUnsubscribe: any;

	// Setup/teardown for interval.tick subscription based on entityId
	const setupTickSubscription = () => {
		if (tickUnsubscribe) {
			tickUnsubscribe.dispose();
			tickUnsubscribe = undefined;
		}

		if (launchSiteEntityId.get() !== undefined && typeof context !== "undefined") {
			tickUnsubscribe = context.subscribe("interval.tick", () => {
				// Increment tick counter to trigger recomputation of launchSiteDisplayPosition
				tickCounter.set(tickCounter.get() + 1);
			});
		}
	};

	// Subscribe to entityId changes
	launchSiteEntityId.subscribe(() => setupTickSubscription());
	setupTickSubscription();

	return flexible({
		content: [
			groupbox({
				text: "Launch Sites",
				content: [
					flexible({
						direction: LayoutDirection.Horizontal,
						content: [
							box({
								width: 300,
								height: "1w",
								padding: 6,
								text: "Current site",
								content: flexible({
									direction: LayoutDirection.Vertical,
									height: 290,
									content: [
										textbox({
											text: launchSiteName,
											onChange: value => launchSiteName.set(value),
											width: 240,
											maxLength: 64
										}),
										flexible({
											direction: LayoutDirection.Horizontal,
											content: [
												colouredButton({
													text: "{WHITE}Add Site",
													width: 70, height: 18,
                                                    colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen,
													onClick: addLaunchSite
												}),
												colouredButton({
													text: "{WHITE}New",
													width: 70, height: 18,
                                                    colour: Colour.LightBlue, colourDark: Colour.DarkBlue, colourLight: Colour.IcyBlue,
													onClick: () => confirmDiscardChanges(isLaunchSiteEditorDirty, clearCurrentSite)
												}),
												colouredButton({
													text: "{WHITE}Delete Site",
													width: 70, height: 18,
                                                    colour: Colour.SaturatedRed, colourDark: Colour.BordeauxRedDark, colourLight: Colour.BrightRed,
													onClick: deleteSelectedLaunchSite
												})
											]
										}),
										colouredButton({
											text: "Pick on map",
											width: 120, height: 18,
                                            colour: Colour.OliveDark, colourDark: Colour.GrassGreenDark, colourLight: Colour.OliveGreen,
											pressed: pickerToolActive,
											onClick: onPickSiteButtonClick
										}),
										flexible({
											direction: LayoutDirection.Horizontal,
											content: [
												label({
													text: compute(launchSiteEntityId, value => value === undefined ? "Entity: none" : `Entity: ${value}`)
												}),
												colouredButton({
													text: "Unfollow",
													width: 70, height: 18,
                                                    colour: Colour.OliveDark, colourDark: Colour.GrassGreenDark, colourLight: Colour.OliveGreen,
													onClick: unfollowEntity
												})
											]
										}),
										flexible({
											direction: LayoutDirection.Horizontal,
											content: [groupbox({
												text: compute(launchSiteEntityId, value => value === undefined ? "Coordinates" : "Offset from entity"),
												content: [
													numberInputSpinner({
														labelText: "X",
														labelWidth: 20,
														valueStore: launchSiteX,
														onChange: value => launchSiteX.set(value),
														width: 110,
														step: 1,
														minimum: -10000,
														maximum: 10000
													}),
													numberInputSpinner({
														labelText: "Y",
														labelWidth: 20,
														valueStore: launchSiteY,
														onChange: value => launchSiteY.set(value),
														width: 110,
														step: 1,
														minimum: -10000,
														maximum: 10000
													}),
													numberInputSpinner({
														labelText: "Z",
														labelWidth: 20,
														valueStore: launchSiteZ,
														onChange: value => launchSiteZ.set(value),
														width: 110,
														step: 1,
														minimum: -1000,
														maximum: 1000
													})
												]
											}),
											absolute({
											width: 100,
											height: 80,
											content: [
												button({
													x: 48, y: 0,
													image: "arrow_up",
													border: true,
													text: "^",
													width: 25,
													height: 25,
													onClick: moveByDirection.bind(null, "up")
												}),
												button({
													x: 75, y: 28,
													text: ">",
													border: true,
													image: customImageFor("arrowRight"),
													width: 25,
													height: 25,
													onClick: moveByDirection.bind(null, "right")
												}),
												button({
													x: 48, y: 28,
													border: true,
													image: "locate",
													width: 25,
													height: 25,
													onClick: () => { ui.mainViewport.scrollTo({ x: launchSiteX.get(), y: launchSiteY.get(), z: launchSiteZ.get() }) }
												}),
												button({
													x: 20, y: 28,
													text: "<",
													border: true,
													image: customImageFor("arrowLeft"),
													width: 25,
													height: 25,
													onClick: moveByDirection.bind(null, "left")
												}),
												button({
													x: 48, y: 55,
													image: "arrow_down",
													border: true,
													text: "V",
													width: 25,
													height: 25,
													onClick: moveByDirection.bind(null, "down")
												}),
											]
											})
										]
										}),

										absolute({
											width: "1w",
											height: 140,
											content: [
												viewport({
													x: 70, y: 10,
													target: launchSiteDisplayPosition,
													zoom: -1,
													width: 140,
													height: 140
												}),
												graphics({
													x: 60, y: 0,
													width: 160,
													height: 160,
													onDraw: g => {
														const cx = 80;
														const cy = 80;
														const arm = 160;
														g.colour = Colour.White;
														g.box(cx - 2, cy - arm, 4, 2 * arm);
														g.box(cx - arm, cy - 2, 2 * arm, 4);
													}
												})
											]
										})
									]
								})
							}),
							box({
								width: 280,
								height: "1w",
								text: "Defined Launch Sites",
								padding: 6,
								content: flexible({
									direction: LayoutDirection.Vertical,
									content: [
										listview({
											items: compute(launchSitesRevision, () => launchSites.map(site => [`${site.name}`, `${site.position.x}`, `${site.position.y}`, `${site.position.z}`, site.entityId === undefined ? "-" : `${site.entityId}`])),
											columns: [
												{ header: "Name", width: "2w" },
												{ header: "X", width: "1w" },
												{ header: "Y", width: "1w" },
												{ header: "Z", width: "1w" },
												{ header: "Entity", width: "1w" }
											],
											width: 260,
											height: "1w",
											canSelect: true,
											selectedCell: compute(selectedLaunchSiteIndex, idx => idx === undefined ? null : { row: idx, column: 0 }),
											onClick: row => confirmDiscardChanges(isLaunchSiteEditorDirty, () => loadLaunchSite(row))
										})
									]
								})
							})
						]
					})
				]
			})
		]
	});
}
