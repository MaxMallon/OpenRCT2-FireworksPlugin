import { Colour, compute, label, LayoutDirection, store, window } from "openrct2-flexui";
import { getMainWindowPosition } from "./windowState";
import {
    spawnedParticlesCount,
    launchedShotsCount,
    delayedShotsCount,
    skippedShotsCount,
    skippedParticlesCount
} from "../fireworks/particleSpawner";

const particleCount = store(0);
const spawnedCount = store(0);
const launchedCount = store(0);
const delayedCount = store(0);
const skippedShotsStore = store(0);
const skippedParticlesStore = store(0);

let tickSubscription: { dispose(): void } | undefined;
let windowHandle: { close(): void } | undefined;

function startTracking(): void {
    if (tickSubscription) return;
    tickSubscription = context.subscribe("interval.tick", () => {
        particleCount.set(map.getAllEntities("crashed_vehicle_particle").length);
        spawnedCount.set(spawnedParticlesCount);
        launchedCount.set(launchedShotsCount);
        delayedCount.set(delayedShotsCount);
        skippedShotsStore.set(skippedShotsCount);
        skippedParticlesStore.set(skippedParticlesCount);
    });
}

function stopTracking(): void {
    if (tickSubscription) {
        tickSubscription.dispose();
        tickSubscription = undefined;
    }
}

export function openDebuggerWindow(): void {
    if (windowHandle) {
        return;
    }

    const mainPos = getMainWindowPosition();
    const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;

    const particleCountText = compute(particleCount, count => {
        const colour = count < 2500 ? "{GREEN}" : count < 3000 ? "{YELLOW}" : "{RED}";
        return `{WHITE}ParticleCount: ${colour}${count}`;
    });

    const win = window({
        title: "Fireworks Debugger",
        width: 250,
        height: "auto",
		colours: [Colour.Black, Colour.OliveDark],
        padding: 8,
        position,
        onClose: () => {
            stopTracking();
            windowHandle = undefined;
        },
        direction: LayoutDirection.Vertical,
        content: [
            label({ text: "{RED}Warning: The debug window may cause lag." }),
            label({ text: particleCountText }),
            label({ text: compute(spawnedCount,          n => `{WHITE}Attempted Particles: {WHITE}${n}`) }),
            label({ text: compute(skippedParticlesStore, n => `{WHITE}Skipped Particles: {WHITE}${n}`) }),
            label({ text: compute(launchedCount,         n => `{WHITE}Attempted Fireworks Lit: {WHITE}${n}`) }),
            label({ text: compute(delayedCount,          n => `{WHITE}Delayed Fireworks: {WHITE}${n}`) }),
            label({ text: compute(skippedShotsStore,     n => `{WHITE}Skipped Fireworks: {WHITE}${n}`) }),
        ]
    });

    windowHandle = win.open();
    startTracking();
}
