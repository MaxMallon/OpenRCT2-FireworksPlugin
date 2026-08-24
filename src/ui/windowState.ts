/**
 * Holds a reference to the main fireworks window handle so that secondary
 * windows can be positioned relative to it without creating circular imports.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mainWindowHandle: any;

export function setMainWindowHandle(handle: unknown): void {
    mainWindowHandle = handle;
}

/**
 * Returns the current screen position of the main fireworks window by reading
 * the internal native window reference exposed by openrct2-flexui (`.D`).
 * Returns undefined if the window is not currently open.
 */
export function getMainWindowPosition(): { x: number; y: number } | undefined {
    const native = mainWindowHandle?.D;
    if (!native) return undefined;
    return { x: native.x as number, y: native.y as number };
}

export function getMainWindowBounds(): { x: number; y: number; width: number; height: number } | undefined {
    const native = mainWindowHandle?.D;
    if (!native) return undefined;
    return { x: native.x as number, y: native.y as number, width: native.width as number, height: native.height as number };
}

/**
 * Sets the colours of the main fireworks window by writing directly to the
 * internal native window reference exposed by openrct2-flexui (`.D`).
 * Has no effect if the window is not currently open.
 */
export function setMainWindowColours(colours: [number, number]): void {
    const native = mainWindowHandle?.D;
    if (native) native.colours = colours;
}

export function setMainWindowSize(width: number, height: number): void {
    const native = mainWindowHandle?.D;
    if (native) {
        native.minHeight = height;
        native.minWidth = width;
        native.maxWidth = width;
        native.width = width;
        native.minWidth = width; //Without doing it double, it doesn't work.
        native.maxWidth = width;
        native.height = height;
    }
}

/**
 * Closes the main editor/playing window regardless of which one is currently open.
 */
export function closeMainWindow(): void
{
    mainWindowHandle?.close?.();
}
