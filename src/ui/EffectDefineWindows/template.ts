import { button, horizontal, label, LayoutDirection, type FlexibleLayoutContainer, type OpenWindow, window } from "openrct2-flexui";
import { getMainWindowPosition } from "../windowState";

export interface EffectWindowTemplateOptions
{
	title: string;
	width: number;
	height: number;
	content: FlexibleLayoutContainer;
	saveText: string;
	onSave: () => void;
	onClose?: () => void;
}

export function openEffectWindow(options: EffectWindowTemplateOptions): OpenWindow
{
	let handle: OpenWindow | undefined;
	const mainPos = getMainWindowPosition();
	const position = mainPos ? { x: mainPos.x + 20, y: mainPos.y + 20 } : "center" as const;
	const template = window({
		title: options.title,
		width: options.width,
		height: "auto",
		padding: 8,
		position,
		onClose: () => options.onClose?.(),
		direction: LayoutDirection.Vertical,
		content: [
			...options.content,
			horizontal({
				height: 14,
				content: [
					label({ text: "", width: "1w" }),
					button({
						text: "Cancel",
						width: 70,
						onClick: () => handle?.close()
					}),
					button({
						text: options.saveText,
						width: 110,
						onClick: () => {
							options.onSave();
							handle?.close();
						}
					})
				]
			})
		]
	});

	handle = template.open();
	return handle;
}
