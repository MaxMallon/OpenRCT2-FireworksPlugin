import { button, Colour, flexible, label, LayoutDirection, listview, store, textbox, window } from "openrct2-flexui";
import type { OpenWindow } from "openrct2-flexui";
import {
	launchSites, loadMap, shellMap, groundEffectMap, sequenceMap, showMap, colourSequences,
	setLaunchSites, setLoadMap, setShellMap, setGroundEffectMap, setSequenceMap, setShotShowMap, setColourSequences
} from "../fireworks/persistent";
import { serializeParkState, deserializeParkState } from "../fireworks/parkStorage";
import { LaunchSite } from "../fireworks/structures/LaunchSite";
import { Load } from "../fireworks/structures/Load";
import { Shell, GroundEffect } from "../fireworks/structures/Firework";
import { Sequence } from "../fireworks/structures/Sequence";
import { Show } from "../fireworks/structures/Show";
import { ColourSequence } from "../fireworks/structures/ColourStructures";
import { getMainWindowPosition } from "./windowState";

const EXPORTS_KEY = "fireworks.exports";

function getStorage() {
	if (typeof context === "undefined") return undefined;
	return context.sharedStorage;
}

function loadSavedExports(): Record<string, string> {
	return getStorage()?.get<Record<string, string>>(EXPORTS_KEY) ?? {};
}

function writeSavedExports(exports: Record<string, string>): void {
	getStorage()?.set(EXPORTS_KEY, exports);
}

function serializeCurrentData(): string {
	return serializeParkState({
		launchSites,
		loadMap,
		shellMap,
		groundEffectMap,
		sequenceMap,
		shotShowMap: showMap,
		colourSequences: colourSequences.get(),
		playback: {
			ticks: 0,
			fireworkEffectsActive: false,
			interruptWhenTooManyParticles: true,
			players: [],
			showPlayer: undefined
		}
	});
}

interface ParsedData {
	launchSites: LaunchSite[];
	loadMap: Map<string, Load>;
	shellMap: Map<string, Shell>;
	groundEffectMap: Map<string, GroundEffect>;
	sequenceMap: Map<string, Sequence>;
	showMap: Map<string, Show>;
	colourSequences: ColourSequence[];
}

function parseExport(serialized: string): ParsedData | undefined {
	const result: ParsedData = {
		launchSites: [],
		loadMap: new Map(),
		shellMap: new Map(),
		groundEffectMap: new Map(),
		sequenceMap: new Map(),
		showMap: new Map(),
		colourSequences: []
	};

	const ok = deserializeParkState(serialized, {
		setLaunchSites: (sites) => { result.launchSites = sites; },
		setLoadMap: (map) => { result.loadMap = new Map(map); },
		setShellMap: (map) => { result.shellMap = new Map(map); },
		setGroundEffectMap: (map) => { result.groundEffectMap = new Map(map); },
		setSequenceMap: (map) => { result.sequenceMap = new Map(map); },
		setShotShowMap: (map) => { result.showMap = new Map(map); },
		setColourSequences: (seqs) => { result.colourSequences = seqs; },
		resetTransientState: () => {}
	});

	return ok ? result : undefined;
}

interface ConflictSummary {
	loads: number;
	shells: number;
	groundEffects: number;
	sequences: number;
	shows: number;
	colourSequences: number;
	launchSites: number;
}

function findConflicts(imported: ParsedData): ConflictSummary {
	const csNames = new Set(colourSequences.get().map(s => s.name));
	const siteNames = new Set(launchSites.map(s => s.name));
	return {
		loads: [...imported.loadMap.keys()].filter(n => loadMap.has(n)).length,
		shells: [...imported.shellMap.keys()].filter(n => shellMap.has(n)).length,
		groundEffects: [...imported.groundEffectMap.keys()].filter(n => groundEffectMap.has(n)).length,
		sequences: [...imported.sequenceMap.keys()].filter(n => sequenceMap.has(n)).length,
		shows: [...imported.showMap.keys()].filter(n => showMap.has(n)).length,
		colourSequences: imported.colourSequences.filter(s => csNames.has(s.name)).length,
		launchSites: imported.launchSites.filter(s => siteNames.has(s.name)).length,
	};
}

function hasConflicts(c: ConflictSummary): boolean {
	return c.loads + c.shells + c.groundEffects + c.sequences + c.shows + c.colourSequences + c.launchSites > 0;
}

function applyMerge(imported: ParsedData, keepNew: boolean): void {
	// Launch sites
	const siteNames = new Set(launchSites.map(s => s.name));
	const mergedSites = [...launchSites];
	for (const site of imported.launchSites) {
		if (!siteNames.has(site.name)) {
			mergedSites.push(site);
		} else if (keepNew) {
			const idx = mergedSites.findIndex(s => s.name === site.name);
			if (idx >= 0) mergedSites[idx] = site;
		}
	}
	setLaunchSites(mergedSites);

	// Loads
	const ml = new Map(loadMap);
	imported.loadMap.forEach((v, k) => { if (!ml.has(k) || keepNew) ml.set(k, v); });
	setLoadMap(ml);

	// Shells
	const ms = new Map(shellMap);
	imported.shellMap.forEach((v, k) => { if (!ms.has(k) || keepNew) ms.set(k, v); });
	setShellMap(ms);

	// Ground effects
	const mg = new Map(groundEffectMap);
	imported.groundEffectMap.forEach((v, k) => { if (!mg.has(k) || keepNew) mg.set(k, v); });
	setGroundEffectMap(mg);

	// Sequences
	const mq = new Map(sequenceMap);
	imported.sequenceMap.forEach((v, k) => { if (!mq.has(k) || keepNew) mq.set(k, v); });
	setSequenceMap(mq);

	// Shows
	const mh = new Map(showMap);
	imported.showMap.forEach((v, k) => { if (!mh.has(k) || keepNew) mh.set(k, v); });
	setShotShowMap(mh);

	// Colour sequences
	const existingCSNames = new Set(colourSequences.get().map(s => s.name));
	const mergedCS = [...colourSequences.get()];
	for (const seq of imported.colourSequences) {
		if (!existingCSNames.has(seq.name)) {
			mergedCS.push(seq);
		} else if (keepNew) {
			const idx = mergedCS.findIndex(s => s.name === seq.name);
			if (idx >= 0) mergedCS[idx] = seq;
		}
	}
	setColourSequences(mergedCS);
}

function applyOverwrite(imported: ParsedData): void {
	setLaunchSites(imported.launchSites);
	setLoadMap(imported.loadMap);
	setShellMap(imported.shellMap);
	setGroundEffectMap(imported.groundEffectMap);
	setSequenceMap(imported.sequenceMap);
	setShotShowMap(imported.showMap);
	setColourSequences(imported.colourSequences);
}

function windowPos() {
	const p = getMainWindowPosition();
	return p ? { x: p.x + 30, y: p.y + 30 } : "center" as const;
}

function openConflictWindow(_imported: ParsedData, conflicts: ConflictSummary, onResolved: (keepNew: boolean) => void): void {
	let handle: OpenWindow | undefined;

	const rows: string[][] = [
		...(conflicts.loads > 0 ? [["Loads", `${conflicts.loads}`]] : []),
		...(conflicts.shells > 0 ? [["Shells", `${conflicts.shells}`]] : []),
		...(conflicts.groundEffects > 0 ? [["Ground Effects", `${conflicts.groundEffects}`]] : []),
		...(conflicts.sequences > 0 ? [["Sequences", `${conflicts.sequences}`]] : []),
		...(conflicts.shows > 0 ? [["Shows", `${conflicts.shows}`]] : []),
		...(conflicts.colourSequences > 0 ? [["Colour Sequences", `${conflicts.colourSequences}`]] : []),
		...(conflicts.launchSites > 0 ? [["Launch Sites", `${conflicts.launchSites}`]] : []),
	];

	const listH = Math.max(30, Math.min(100, rows.length * 16 + 16));
	const totalH = 160 + listH;

	const popup = window({
		title: "Name Conflicts",
		width: 380,
		height: totalH,
		padding: 8,
		position: windowPos(),
		colours: [Colour.DarkOrange, Colour.Grey],
		direction: LayoutDirection.Vertical,
		content: [
			label({ text: "{WHITE}Some names exist in both datasets:" }),
			listview({
				items: store(rows),
				columns: [
					{ header: "Type", width: "2w" },
					{ header: "Conflicts", width: "1w" }
				],
				width: "1w",
				height: listH,
				canSelect: false
			}),
			label({ text: "" }),
			label({ text: "{WHITE}Which version would you like to keep?" }),
			flexible({
				direction: LayoutDirection.Horizontal,
				content: [
					button({
						text: "Keep existing",
						width: 110,
						height: 22,
						onClick: () => { handle?.close(); onResolved(false); }
					}),
					button({
						text: "Keep new",
						width: 80,
						height: 22,
						onClick: () => { handle?.close(); onResolved(true); }
					}),
					button({
						text: "Cancel",
						width: 70,
						height: 22,
						onClick: () => handle?.close()
					})
				]
			})
		]
	});

	handle = popup.open();
}

export function openExportWindow(): void {
	if (typeof ui === "undefined") return;

	let handle: OpenWindow | undefined;
	const exportsListStore = store<string[][]>([]);
	const nameInput = store("");

	exportsListStore.set(Object.keys(loadSavedExports()).map(n => [n]));

	const popup = window({
		title: "Export Fireworks Data",
		width: 380,
		height: 285,
		padding: 8,
		position: windowPos(),
		colours: [Colour.DarkBlue, Colour.Grey],
		direction: LayoutDirection.Vertical,
		content: [
			label({ text: "Existing exports:" }),
			listview({
				items: exportsListStore,
				columns: [{ header: "Name", width: "1w" }],
				width: "1w",
				height: 120,
				canSelect: false
			}),
			label({ text: "Save current data as:" }),
			textbox({
				text: nameInput,
				onChange: v => nameInput.set(v),
				width: "1w",
				maxLength: 64
			}),
			flexible({
				direction: LayoutDirection.Horizontal,
				content: [
					button({
						text: "Save",
						width: 80,
						height: 22,
						onClick: () => {
							const name = nameInput.get().trim();
							if (!name) return;
							const exports = loadSavedExports();
							exports[name] = serializeCurrentData();
							writeSavedExports(exports);
							handle?.close();
						}
					}),
					button({
						text: "Cancel",
						width: 70,
						height: 22,
						onClick: () => handle?.close()
					})
				]
			})
		]
	});

	handle = popup.open();
}

export function openImportWindow(): void {
	if (typeof ui === "undefined") return;

	let handle: OpenWindow | undefined;
	const exportsListStore = store<string[][]>([]);
	const selectedRow = store<{ row: number; column: number } | null>(null);
	let exportNames: string[] = [];
	let selectedName: string | undefined;

	exportNames = Object.keys(loadSavedExports());
	exportsListStore.set(exportNames.map(n => [n]));

	function getSelectedSerialized(): string | undefined {
		if (!selectedName) return undefined;
		return loadSavedExports()[selectedName];
	}

	function doOverwrite(): void {
		const serialized = getSelectedSerialized();
		if (!serialized) return;
		const imported = parseExport(serialized);
		if (!imported) return;
		handle?.close();
		applyOverwrite(imported);
	}

	function doAdd(): void {
		const serialized = getSelectedSerialized();
		if (!serialized) return;
		const imported = parseExport(serialized);
		if (!imported) return;
		const conflicts = findConflicts(imported);
		handle?.close();
		if (hasConflicts(conflicts)) {
			openConflictWindow(imported, conflicts, keepNew => applyMerge(imported, keepNew));
		} else {
			applyMerge(imported, false);
		}
	}

	function doDelete(): void {
		if (!selectedName) return;
		const exports = loadSavedExports();
		delete exports[selectedName];
		writeSavedExports(exports);
		exportNames = Object.keys(exports);
		exportsListStore.set(exportNames.map(n => [n]));
		selectedName = undefined;
		selectedRow.set(null);
	}

	const popup = window({
		title: "Import Fireworks Data",
		width: 380,
		height: 260,
		padding: 8,
		position: windowPos(),
		colours: [Colour.DarkBlue, Colour.Grey],
		direction: LayoutDirection.Vertical,
		content: [
			label({ text: "Select an export to import:" }),
			listview({
				items: exportsListStore,
				columns: [{ header: "Name", width: "1w" }],
				width: "1w",
				height: 160,
				canSelect: true,
				selectedCell: selectedRow,
				onClick: row => {
					selectedRow.set({ row, column: 0 });
					selectedName = exportNames[row];
				}
			}),
			flexible({
				direction: LayoutDirection.Horizontal,
				content: [
					button({
						text: "Import Overwrite",
						width: 120,
						height: 22,
						onClick: doOverwrite
					}),
					button({
						text: "Import Add",
						width: 90,
						height: 22,
						onClick: doAdd
					}),
					button({
						text: "Delete",
						width: 70,
						height: 22,
						onClick: doDelete
					}),
					button({
						text: "Cancel",
						width: 70,
						height: 22,
						onClick: () => handle?.close()
					})
				]
			})
		]
	});

	handle = popup.open();
}
