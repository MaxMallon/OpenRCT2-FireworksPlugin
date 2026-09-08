import { Colour, compute, label, LayoutDirection, store, flexible, groupbox, type OpenWindow } from "openrct2-flexui";
import { getMainWindowPosition } from "./windowState";
import { openPopupWindow } from "./popupWindows";
import {
    spawnedParticlesCount,
    launchedShotsCount,
    delayedShotsCount,
    skippedShotsCount,
    skippedParticlesCount,
    ResetCounts
} from "../fireworks/particleSpawner";
import { colouredButton } from "./ColouredButton";
import { loadDefaultPalette, restorePalette, canRestorePalette } from "../fireworks/helpers";
import { testPaletteModeEnabled, setTestPaletteModeEnabled } from "../fireworks/testPaletteMode";

const particleCount = store(0);
const miscEntityCount = store(0);
const spawnedCount = store(0);
const launchedCount = store(0);
const delayedCount = store(0);
const skippedShotsStore = store(0);
const skippedParticlesStore = store(0);
const canRestorePaletteStore = store(false);

let tickSubscription: { dispose(): void } | undefined;
function openDebuggerExplanationWindow(): void {
	const mainPos = getMainWindowPosition();
	const position = mainPos ? { x: mainPos.x + 40, y: mainPos.y + 40 } : "center" as const;
	let handle: OpenWindow | undefined;

	handle = openPopupWindow("debugger-info", {
		title: "Fireworks Debugger Info",
		width: 334,
		height: "auto",
		padding: 8,
		position,
		direction: LayoutDirection.Vertical,
		content: [
			label({ text: "ParticleCount is current number of crashed vehicle\nparticles. This excludes other particle types.\nTotal particle budget is 3200.", height: 36, width: "1w" }),
			label({ text: "MiscEntityCount is current number of all other\nmisc entities. Total particle budget is 3200.", height: 36, width: "1w" }),
			label({ text: "Attempted Particles is number of particles that have\nbeen attemped to make.", height: 28, width: "1w" }),
			label({ text: "Skipped Particles is number of particles were attempted\nto spawn but failed due to the limit being hit.", height: 28, width: "1w" }),
			label({ text: "Attempted Fireworks Lit is the number of shells and\nground effects set off.", height: 28, width: "1w" }),
			label({ text: "Delayed Fireworks is the number of shells that were\n delayed a tick due to the limit being hit.", height: 28, width: "1w" }),
			label({ text: "Skipped Fireworks is the number of shells that were\n skipped due to the limit being hit.", height: 28, width: "1w" }),
			label({ text: "", height: 10, width: "1w" }),

            label({ text:   "Some custom palettes can make the editor hard to use.\n" +
                            "Use the default and restore palette buttons to\n" +
                            "manually easily switch between the default, and the\n" +
                            "park's true palette.", height: 40, width: "1w" }),
			label({ text: "", height: 10, width: "1w" }),
            label({ text:   "The Auto Switch Palletes button auto sets the\n " +
                            "palette to the default when the editor is\n" +
                            "open, and back to the park's true palette during\n" +
                            "tests and when the editor is closed.", height: 40, width: "1w" }),
			flexible({
				direction: LayoutDirection.Horizontal,
				height: 14,
				content: [
					label({ text: "", width: "1w" }),
					colouredButton({
						text: "Close",
						width: 70,
						height: 22,
						colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
						onClick: () => handle?.close()
					}),
					label({ text: "", width: "1w" }),
				]
			}),
            label({ text: "", height: 8 }),
		]
	});
}

const miscEntityTypes: EntityType[] = [
    "balloon",
    "crash_splash",
    "duck",
    "explosion_cloud",
    "explosion_flare",
    "jumping_fountain_snow",
    "jumping_fountain_water",
    "litter",
    "money_effect",
    "steam_particle"
];

function countMiscEntities(): number {
    let total = 0;
    for (const type of miscEntityTypes) {
        // guard individually so one unsupported type doesn't zero out the whole count
        try {
            total += map.getAllEntities(type).length;
        }
        catch (error) {
            console.log(`Fireworks: failed to count entities of type '${type}': ${error}`);
        }
    }
    return total;
}

function startTracking(): void {
    if (tickSubscription) return;
    tickSubscription = context.subscribe("interval.tick", () => {
        particleCount.set(map.getAllEntities("crashed_vehicle_particle").length);
        miscEntityCount.set(countMiscEntities());
        spawnedCount.set(spawnedParticlesCount);
        launchedCount.set(launchedShotsCount);
        delayedCount.set(delayedShotsCount);
        skippedShotsStore.set(skippedShotsCount);
        skippedParticlesStore.set(skippedParticlesCount);
        canRestorePaletteStore.set(canRestorePalette());
    });
}

function stopTracking(): void {
    if (tickSubscription) {
        tickSubscription.dispose();
        tickSubscription = undefined;
    }
}

export function openDebuggerWindow(): void {
    if (isDebuggerOpen()) {
        return;
    }

    const mainPos = getMainWindowPosition();
    const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;

    const particleCountText = compute(particleCount, count => {
        const colour = count < 2500 ? "{GREEN}" : count < 3000 ? "{YELLOW}" : "{RED}";
        return `{WHITE}ParticleCount: ${colour}${count}`;
    });

    const miscEntityCountText = compute(miscEntityCount, count => {
        const colour = count < 500 ? "{GREEN}" : count < 1000 ? "{YELLOW}" : "{RED}";
        return `{WHITE}Other Misc Entities: ${colour}${count}`;
    });

    canRestorePaletteStore.set(canRestorePalette());

    openPopupWindow("debugger", {
        title: "Fireworks Debugger",
        width: 250,
        height: "auto",
		colours: [Colour.Black, Colour.OliveDark],
        padding: 8,
        position,
        onClose: () => {
            stopTracking();
        },
        direction: LayoutDirection.Vertical,
        content: [
            label({ text: "{RED}Warning: The debug window may cause lag." }),
            label({ text: particleCountText }),
            label({ text: miscEntityCountText }),
            label({ text: compute(spawnedCount, n => `{WHITE}Attempted Particles: {WHITE}${n}`) }),
            label({ text: compute(skippedParticlesStore, n => `{WHITE}Skipped Particles: {WHITE}${n}`) }),
            label({ text: compute(launchedCount, n => `{WHITE}Attempted Fireworks Lit: {WHITE}${n}`) }),
            label({ text: compute(delayedCount, n => `{WHITE}Delayed Fireworks: {WHITE}${n}`) }),
            label({ text: compute(skippedShotsStore, n => `{WHITE}Skipped Fireworks: {WHITE}${n}`) }),
            flexible({
                direction: LayoutDirection.Horizontal,
                height: 22,
                content: [
                    label({ text: "", width: "1w" }),
                    colouredButton({
                        text: "{WHITE}Reset Counts", width: 120, height: 22,
                        colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
                        onClick: () => ResetCounts()
                    }),
                    label({ text: "", width: "1w" }),
                    colouredButton({
                        text: "?", width: 22, height: 22,
                        colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
                        onClick: () => openDebuggerExplanationWindow()
                    }),
                    label({ text: "", width: "1w" }),
                ]
            }),
            groupbox({
                text: "Palette Options",
                width: "1w",
                height: 68,
                direction: LayoutDirection.Vertical,
                content: [
                    flexible({
                        direction: LayoutDirection.Horizontal,
                        content: [
                            colouredButton({
                                text: "{WHITE}Default Palette", width: 110, height: 22,
                                colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
                                onClick: () => {
                                    loadDefaultPalette();
                                    canRestorePaletteStore.set(canRestorePalette());
                                }
                            }),
                            colouredButton({
                                text: "{WHITE}Restore Palette", width: 110, height: 22,
                                colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White,
                                disabled: compute(canRestorePaletteStore, c => !c),
                                onClick: () => {
                                    restorePalette();
                                    canRestorePaletteStore.set(canRestorePalette());
                                }
                            }),
                        ]
                    }),
                    colouredButton({
                        text: compute(testPaletteModeEnabled, enabled => enabled ? "{WHITE}Auto Switch Palettes: {GREEN}ON" : "{WHITE}Auto Switch Palettes: OFF"),
                        width: 224, height: 22,
                        colour: Colour.Void, colourDark: Colour.Black, colourLight: Colour.Grey,
                        pressed: testPaletteModeEnabled,
                        onClick: () => setTestPaletteModeEnabled(!testPaletteModeEnabled.get())
                    })
                ]
            })
        ]
    });
    startTracking();
}

function isDebuggerOpen(): boolean {
    return tickSubscription !== undefined;
}
