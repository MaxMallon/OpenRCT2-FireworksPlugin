import { button, compute, flexible, groupbox, label, LayoutDirection, listview, store } from "openrct2-flexui";
import { BigBouqetEffect } from "../../fireworks/structures/effects/burstEffects/bigBouqetEffect";
import { cloneLoad, cloneShellLoad } from "../../fireworks/loadHelpers";
import { applyLoadColoursEditor, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, normalizePatternSelection } from "./shared";
import { openBigBouqetLoadSelectionWindow } from "./bigBouqetLoadSelectionWindow";
import { openEffectWindow } from "./template";
import { GetLoadByName, getLoadList } from "../../fireworks/persistent";
import { Effect } from "../../fireworks/structures/Effect";
import { ShellLoad } from "../../fireworks/structures/ShellLoad";

interface BigBouqetSizePreset {
	label: string;
	subSize: number;
	subPhysicalSize: number;
	physicalSize: number;
	numberSubShots: number;
	extraLongevity: number;
}

function cloneSubLoads(subLoads: ShellLoad[]): ShellLoad[]
{
	return subLoads.map(cloneShellLoad);
}

function showError(title: string, message: string): void
{
	if (typeof ui !== "undefined" && typeof ui.showError === "function")
	{
		ui.showError(title, message);
	}
}

export function openBigBouqetEffectWindow(effect: BigBouqetEffect | undefined, onSave: (effect: Effect) => void, onClose?: () => void, isEditing: boolean = effect !== undefined): void
{
	const subSize = store(effect?.subSize ?? 32);
	const subPhysicalSize = store(effect?.subPhysicalSize ?? 1.8);
	const physicalSize = store(effect?.physicalSize ?? 8);
	const numberSubShots = store(effect?.numberSubShots ?? 30);
	const extraLongevity = store(effect?.extraLongevity ?? 10);
	const sizePresets: BigBouqetSizePreset[] = [
		{ label: "S", subSize: 	50, subPhysicalSize: 3, physicalSize: 3, numberSubShots: 3, extraLongevity: 50 },
		{ label: "M", subSize: 40, subPhysicalSize: 2.2, physicalSize: 5, numberSubShots: 10, extraLongevity: 30 },
		{ label: "L", subSize: 32, subPhysicalSize: 1.8, physicalSize: 8, numberSubShots: 30, extraLongevity: 10 },
		{ label: "XL", subSize: 20, subPhysicalSize: 1.5, physicalSize: 10, numberSubShots: 60, extraLongevity: 0 }
	];

	const applyPreset = (preset: BigBouqetSizePreset): void => {
		subSize.set(preset.subSize);
		subPhysicalSize.set(preset.subPhysicalSize);
		physicalSize.set(preset.physicalSize);
		numberSubShots.set(preset.numberSubShots);
		extraLongevity.set(preset.extraLongevity);
	};
	const colours = createLoadColoursEditor(effect?.colours, ["heads", "colour1", "colour2", "colour3", "colour4", "colour5", "colour6"]);
	const subLoads = store(cloneSubLoads(effect?.subLoads ?? []));
	const selectedSubLoadIndex = store<number | undefined>(undefined);
	const patternOptions = ["mono-colour-spheres", "mono-colour-stars", "duo-colour-spheres", "duo-colour-stars", "custom-load"];
	const pattern = normalizePatternSelection(colours.pattern, patternOptions);
	const colourRows = createNamedColourPickerRows(pattern, colours, [
		{ key: "heads", label: "Heads", visibleOn: patternOptions },
		{ key: "colour1", label: "Colour 1", visibleOn: ["mono-colour-spheres", "mono-colour-stars", "duo-colour-spheres", "duo-colour-stars"] },
		{ key: "colour2", label: "Colour 2", visibleOn: ["mono-colour-spheres", "mono-colour-stars", "duo-colour-spheres", "duo-colour-stars"] },
		{ key: "colour3", label: "Colour 3", visibleOn: ["mono-colour-spheres", "mono-colour-stars", "duo-colour-spheres", "duo-colour-stars"] },
		{ key: "colour4", label: "Colour 4", visibleOn: ["mono-colour-spheres", "mono-colour-stars", "duo-colour-spheres", "duo-colour-stars"] },
		{ key: "colour5", label: "Colour 5", visibleOn: ["mono-colour-spheres", "mono-colour-stars", "duo-colour-spheres", "duo-colour-stars"] },
		{ key: "colour6", label: "Colour 6", visibleOn: ["mono-colour-spheres", "mono-colour-stars", "duo-colour-spheres", "duo-colour-stars"] }
	]);
	let handle: { close: () => void } | undefined;
	let isReopening = false;

	const reopenForPatternChange = (): void => {
		applyLoadColoursEditor(colours);
		isReopening = true;
		handle?.close();
		openBigBouqetEffectWindow(new BigBouqetEffect(subSize.get(), subPhysicalSize.get(), physicalSize.get(), numberSubShots.get(), extraLongevity.get(), colours.colours, cloneSubLoads(subLoads.get())), onSave, onClose, isEditing);
	};

	const addCustomLoad = (): void => {
		if (subLoads.get().length >= 4)
		{
			showError("Too many loads", "A shell of shells effect can use at most 4 custom loads.");
			return;
		}

		const selectedLoadNames = subLoads.get().map(load => load.loadName.trim());
		openBigBouqetLoadSelectionWindow(getLoadList().map(load => cloneLoad(load)), selectedLoadNames, load => {
			const nextLoads = [...subLoads.get(), new ShellLoad(load.name, ShellLoad.explodeAtEnd)];
			subLoads.set(nextLoads);
			selectedSubLoadIndex.set(nextLoads.length - 1);
		});
	};

	const removeSelectedLoad = (): void => {
		const selectedIndex = selectedSubLoadIndex.get();
		if (typeof selectedIndex !== "number")
		{
			return;
		}

		subLoads.set(subLoads.get().filter((_, index) => index !== selectedIndex));
		selectedSubLoadIndex.set(undefined);
	};

	handle = openEffectWindow({
		title: "Shell of Shells Effect",
		width: 380,
		height: 330,
		saveText: isEditing ? "Update Effect" : "Add Effect",
		onClose: () => {
			if (isReopening)
			{
				isReopening = false;
				return;
			}

			onClose?.();
		},
		content: [
			createPatternDropdownRow(colours.pattern, patternOptions, reopenForPatternChange),
			createNumberRow("Sub Shell Density", subSize, 15, 60),
			createNumberRow("Sub Shell Size", subPhysicalSize, 1, 3, 0.1),
			createNumberRow("Size", physicalSize, 3, 10, 0.25),
			createNumberRow("Sub Shells", numberSubShots, 3, 70),
			createNumberRow("Extra Longevity", extraLongevity, 0, 100),
			flexible({
				direction: LayoutDirection.Horizontal,
				height: 14,
				content: [
					label({ text: "Preset", width: 140, height: 14 }),
					...sizePresets.map(preset => button({
						text: preset.label,
						width: 28,
						onClick: () => applyPreset(preset)
					}))
				]
			}),
			...colourRows,
			...(pattern === "custom-load" ? [
				groupbox({
					text: "Custom Loads",
					height: 184,
					content: [
						listview({
							items: compute(subLoads, loads => loads.map(load => [load.loadName, GetLoadByName(load.loadName)?.GetSpriteString() ?? ""])),
							columns: [
								{ header: "Load", width: "3w" },
								{ header: "Icons", width: "2w" },
							],
							width: 340,
							height: 140,
							canSelect: true,
							selectedCell: compute(selectedSubLoadIndex, index => index === undefined ? null : { row: index, column: 0 }),
							onClick: row => selectedSubLoadIndex.set(row)
						}),
						flexible({
							direction: LayoutDirection.Horizontal,
							height: 14,
							content: [
								button({ text: "Add Load", width: 90, onClick: addCustomLoad }),
								button({ text: "Remove Load", width: 100, onClick: removeSelectedLoad }),
								label({ text: compute(subLoads, loads => `${loads.length}/4`), width: 60 })
							]
						})
					]
				})
			] : [])
		],
		onSave: () => {
			if (pattern === "custom-load" && subLoads.get().length === 0)
			{
				showError("Invalid custom loads", "A custom-load shell of shells effect needs at least one load.");
				return;
			}

			applyLoadColoursEditor(colours);
			onSave(new BigBouqetEffect(subSize.get(), subPhysicalSize.get(), physicalSize.get(), numberSubShots.get(), extraLongevity.get(), colours.colours, cloneSubLoads(subLoads.get())));
		}
	});
}
