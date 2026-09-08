/**
 * Central registry for secondary (popup) windows.
 *
 * Every popup window should be opened through one of these helpers so that:
 *  - each popup can only exist once at a time (re-opening just refocuses it);
 *  - an optional group can be shared by several popups so that only one member
 *    of the group can be open at a time (opening a different one is ignored).
 */

import { tabwindow, window } from "openrct2-flexui";
import type { OpenWindow, TabWindowParams, WindowParams } from "openrct2-flexui";

const openPopups = new Map<string, OpenWindow>();
const popupGroup = new Map<string, string>();
const groupToKey = new Map<string, string>();
/** Groups where opening a different member closes the currently open one. */
const switchableGroups = new Set<string>();

function makePopupOnClose(key: string, group: string | undefined, userOnClose: (() => void) | undefined): () => void
{
	return () =>
	{
		openPopups.delete(key);
		popupGroup.delete(key);
		if (group !== undefined && groupToKey.get(group) === key)
		{
			groupToKey.delete(group);
		}
		userOnClose?.();
	};
}

/** Declares a group whose members replace one another when opened. */
export function makePopupGroupSwitchable(group: string): void
{
	switchableGroups.add(group);
}

function claimPopup(key: string, group?: string): OpenWindow | null | undefined
{
	const existing = openPopups.get(key);
	if (existing)
	{
		existing.focus();
		return existing;
	}

	if (group !== undefined)
	{
		const openKey = groupToKey.get(group);
		if (openKey !== undefined && openKey !== key && openPopups.has(openKey))
		{
			const other = openPopups.get(openKey)!;
			if (!switchableGroups.has(group))
			{
				other.focus();
				return undefined;
			}
			other.close();
		}
	}

	return null;
}

function registerPopup(key: string, handle: OpenWindow, group?: string): void
{
	openPopups.set(key, handle);
	if (group !== undefined)
	{
		popupGroup.set(key, group);
		groupToKey.set(group, key);
	}
}

/** Returns whether the popup with the given key is currently open. */
export function isPopupOpen(key: string): boolean
{
	return openPopups.has(key);
}

/** Opens a popup window, focusing an existing instance with the same key. */
export function openPopupWindow(key: string, params: WindowParams, group?: string): OpenWindow | undefined
{
	const claimed = claimPopup(key, group);
	if (claimed !== null)
	{
		return claimed;
	}

	const handle = window({
		...params,
		onClose: makePopupOnClose(key, group, params.onClose)
	}).open(undefined);

	registerPopup(key, handle, group);
	return handle;
}

/** Same as `openPopupWindow`, but for tab windows. */
export function openPopupTabWindow(key: string, params: TabWindowParams, group?: string): OpenWindow | undefined
{
	const claimed = claimPopup(key, group);
	if (claimed !== null)
	{
		return claimed;
	}

	const handle = tabwindow({
		...params,
		onClose: makePopupOnClose(key, group, params.onClose)
	}).open(undefined);

	registerPopup(key, handle, group);
	return handle;
}

/**
 * Opens a popup via a custom factory (used when the window needs the handle
 * during construction, e.g. buttons that close the window).
 *
 * The factory receives the `onClose` that must be wired into the window params
 * so the registration is released on close. The factory must return the opened
 * window handle.
 */
export function openPopupCustom(
	key: string,
	factory: (onClose: () => void) => OpenWindow,
	group?: string
): OpenWindow | undefined
{
	const claimed = claimPopup(key, group);
	if (claimed !== null)
	{
		return claimed;
	}

	let handle: OpenWindow | undefined;
	const onClose = makePopupOnClose(key, group, undefined);
	handle = factory(onClose);

	registerPopup(key, handle, group);
	return handle;
}

