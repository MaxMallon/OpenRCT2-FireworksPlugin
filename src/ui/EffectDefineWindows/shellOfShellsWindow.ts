import { Colour, compute, flexible, groupbox, label, LayoutDirection, listview, store } from "openrct2-flexui";
import { ShellOfShellsEffect } from "../../fireworks/structures/effects/burstEffects/shellOfShellsEffect";
import { cloneLoad, cloneShellLoad } from "../../fireworks/cloneHelpers";
import { openShellOfShellsLoadSelectionWindow as openShellOfShellsLoadSelectionWindow } from "./shellOfShellsSelectionWindow";
import { applyLoadColoursEditor, createEffectSizePresetRow, createLoadColoursEditor, createNamedColourPickerRows, createNumberRow, createPatternDropdownRow, ExplanationParagraph, normalizePatternSelection, openEffectWindow } from "./effectWindowTemplate";
import { GetLoadByName, getLoadList } from "../../fireworks/persistent";
import { Effect } from "../../fireworks/structures/Effect";
import { ShellLoad } from "../../fireworks/structures/ShellLoad";
import { colouredButton } from "../ColouredButton";

const explanation: ExplanationParagraph[] = [
	{ text: "A shell containing smaller shells. The smaller shells are shot outwards\nand each explode their own loads.", height: 40 },
	{ term: "Loads", description: "The type of sub-shells to use", height: 14 },
	{ term: "   mono-colour-spheres", description: "Spheres of solid colours using Colour 1-6", height: 14 },
	{ term: "   mono-colour-stars", description: "Stars of solid colours using Colour 1-6", height: 14 },
	{ term: "   duo-colour-spheres", description: "Spheres of two colours mixed using random\ncombinations of Colour 1-6", height: 28 },
	{ term: "   duo-colour-stars", description: "Spheres of two colours mixed using random\ncombinations of Colour 1-6", height: 28 },
	{ term: "   custom-load", description: "Select up to four of your own saved loads.\nYou cannot select loads with 'shell-of-shells'\neffects as subshells themselves.", height: 36 },
	{ term: "Sub Shell Density", description: "Affects number of particles of sub shells", height: 14 },
	{ term: "Sub Shell Size", description: "Affects physical size of sub shells", height: 14 },
	{ term: "Size", description: "Physical Size over which sub shells are\nlaunched", height: 28 },
	{ term: "Sub Shells", description: "Exact number of sub shells", height: 14 },
	{ term: "Extra Longevity", description: "Additional persistence in ticks before\nsub shells explode", height: 28 },
	{ term: "Heads", description: "Colour of the the launched subshells", height: 14 },
];

interface ShellOfShellsSizePreset {
	label: string;
	subSize: number;
	subPhysicalSize: number;
	physicalSize: number;
	numberSubShots: number;
	extraLongevity: number;
}

function showError(title: string, message: string): void
{
	if (typeof ui !== "undefined" && typeof ui.showError === "function")
	{
		ui.showError(title, message);
	}
}

export function openShellOfShellsEffectWindow(effect: ShellOfShellsEffect | undefined, onSave: (effect: Effect) => void, onClose?: () => void, isEditing: boolean = effect !== undefined): void
{
	const subSize = store(effect?.subSize ?? 32);
	const subPhysicalSize = store(effect?.subPhysicalSize ?? 1.8);
	const physicalSize = store(effect?.physicalSize ?? 8);
	const numberSubShots = store(effect?.numberSubShots ?? 30);
	const extraLongevity = store(effect?.extraLongevity ?? 10);
	const sizePresets: ShellOfShellsSizePreset[] = [
		{ label: "S", subSize: 	50, subPhysicalSize: 3, physicalSize: 3, numberSubShots: 3, extraLongevity: 50 },
		{ label: "M", subSize: 40, subPhysicalSize: 2.2, physicalSize: 5, numberSubShots: 10, extraLongevity: 30 },
		{ label: "L", subSize: 32, subPhysicalSize: 1.8, physicalSize: 8, numberSubShots: 30, extraLongevity: 10 },
		{ label: "XL", subSize: 20, subPhysicalSize: 1.5, physicalSize: 10, numberSubShots: 60, extraLongevity: 0 }
	];

	const applyPreset = (preset: ShellOfShellsSizePreset): void => {
		subSize.set(preset.subSize);
		subPhysicalSize.set(preset.subPhysicalSize);
		physicalSize.set(preset.physicalSize);
		numberSubShots.set(preset.numberSubShots);
		extraLongevity.set(preset.extraLongevity);
	};
	const colours = createLoadColoursEditor(effect?.colours, ["heads", "colour1", "colour2", "colour3", "colour4", "colour5", "colour6"]);
	const subLoads = store((effect?.subLoads ?? []).map(cloneShellLoad));
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
		openShellOfShellsEffectWindow(new ShellOfShellsEffect(subSize.get(), subPhysicalSize.get(), physicalSize.get(), numberSubShots.get(), extraLongevity.get(), colours.colours, subLoads.get().map(cloneShellLoad)), onSave, onClose, isEditing);
	};

	const addCustomLoad = (): void => {
		if (subLoads.get().length >= 4)
		{
			showError("Too many loads", "A shell of shells effect can use at most 4 custom loads.");
			return;
		}

		const selectedLoadNames = subLoads.get().map(load => load.loadName.trim());
		openShellOfShellsLoadSelectionWindow(getLoadList().map(load => cloneLoad(load)), selectedLoadNames, load => {
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
		height: 340,
		saveText: isEditing ? "Update Effect" : "Add Effect",
		explanation,
		onClose: () => {
			if (isReopening)
			{
				isReopening = false;
				return;
			}

			onClose?.();
		},
		content: [
			createPatternDropdownRow(colours.pattern, patternOptions, reopenForPatternChange, "Loads"),
			createNumberRow("Sub Shell Density", subSize, 15, 60),
			createNumberRow("Sub Shell Size", subPhysicalSize, 1, 3, 0.1),
			createNumberRow("Size", physicalSize, 3, 10, 0.25),
			createNumberRow("Sub Shells", numberSubShots, 3, 70),
			createNumberRow("Extra Longevity", extraLongevity, 0, 100),
			createEffectSizePresetRow(sizePresets, applyPreset),
			...colourRows,
			...(pattern === "custom-load" ? [
				groupbox({
					text: "Custom Loads",
					height: 194,
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
							height: 22,
							content: [
								colouredButton({ text: "{WHITE}Add Load", width: 90, height: 22, colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen, onClick: addCustomLoad }),
								colouredButton({ text: "{WHITE}Remove Load", width: 100, height: 22, colour: Colour.SaturatedRed, colourDark: Colour.BordeauxRedDark, colourLight: Colour.BrightRed, onClick: removeSelectedLoad }),
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
			onSave(new ShellOfShellsEffect(subSize.get(), subPhysicalSize.get(), physicalSize.get(), numberSubShots.get(), extraLongevity.get(), colours.colours, subLoads.get().map(cloneShellLoad)));
		}
	});
}
