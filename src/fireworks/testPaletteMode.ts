import { store } from "openrct2-flexui";
import { loadDefaultPalette, restorePalette } from "./helpers";
import { isFireworksActivityInProgress } from "./fireworksEffectsPlayer";

//Functionality in debugger to switch palette to default and back for easier readability in editor

/** Whether test-palette mode is toggled on in the debugger. */
export const testPaletteModeEnabled = store(false);

let editorOpen = false;
let pendingRestoreTicksLeft = -1;
let pendingRestoreSubscription: IDisposable | undefined;

function cancelPendingRestore(): void {
	pendingRestoreSubscription?.dispose();
	pendingRestoreSubscription = undefined;
	pendingRestoreTicksLeft = -1;
}

export function setTestPaletteModeEnabled(enabled: boolean): void {
	if (testPaletteModeEnabled.get() === enabled) {
		return;
	}
	testPaletteModeEnabled.set(enabled);
	cancelPendingRestore();
	if (!editorOpen) {
		return;
	}
	if (enabled) {
		loadDefaultPalette();
	} else {
		restorePalette();
	}
}

/** Called when the fireworks editor window opens. */
export function notifyEditorOpened(): void {
	editorOpen = true;
	if (testPaletteModeEnabled.get()) {
		loadDefaultPalette();
	}
}

/** Called when the fireworks editor window closes. */
export function notifyEditorClosed(): void {
	editorOpen = false;
	cancelPendingRestore();
	if (testPaletteModeEnabled.get()) {
		restorePalette();
	}
}

/**
 * Switches to the real (saved) palette for the given number of ticks so a test
 * plays with the true in-game colours, then reverts to the default editing palette.
 */
export function beginPaletteTest(durationTicks: number): void {
	if (!testPaletteModeEnabled.get() || !editorOpen) {
		return;
	}

	cancelPendingRestore();
	restorePalette();

	pendingRestoreTicksLeft = Math.max(1, Math.ceil(durationTicks));
	pendingRestoreSubscription = context.subscribe("interval.tick", () => {
		pendingRestoreTicksLeft--;
		if (pendingRestoreTicksLeft <= 0) {
			cancelPendingRestore();
			if (testPaletteModeEnabled.get() && editorOpen) {
				loadDefaultPalette();
			}
		}
	});
}

/**
 * Switches to the real (saved) palette and reverts to the default editing palette once
 * nothing is left playing. Used for sequences/shows, where the last scheduled item is not
 * necessarily the last thing still visible (e.g. an earlier long-lasting fountain effect).
 */
export function beginPaletteTestUntilIdle(): void {
	if (!testPaletteModeEnabled.get() || !editorOpen) {
		return;
	}

	cancelPendingRestore();
	restorePalette();

	const marginTicks = 80; // 2s at 40 fps, covers the final particles after the queues empty
	let quietTicks = 0;

	pendingRestoreSubscription = context.subscribe("interval.tick", () => {
		if (!testPaletteModeEnabled.get() || !editorOpen) {
			cancelPendingRestore();
			return;
		}
		if (isFireworksActivityInProgress()) {
			quietTicks = 0;
			return;
		}
		quietTicks++;
		if (quietTicks < marginTicks) {
			return;
		}
		cancelPendingRestore();
		loadDefaultPalette();
	});
}
