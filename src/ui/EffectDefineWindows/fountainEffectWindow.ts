import { t } from "../../localization";
import { button, checkbox, Colour, compute, dropdown, flexible, groupbox, label, LayoutDirection, listview, store } from "openrct2-flexui";
import { FountainEffect, FountainEffectPhase } from "../../fireworks/structures/effects/EmitterEffects/fountainEffect";
import { Effect } from "../../fireworks/structures/Effect";
import { isPopupOpen } from "../popupWindows";
import { openEffectWindow, createColourPickerRow, createNumberRow, EFFECT_SUB_WINDOW_GROUP, ExplanationParagraph  } from "./effectWindowTemplate";
import { colouredButton } from "../ColouredButton";

const phaseExplanation: ExplanationParagraph[] = [
	{ term: t("Density"), description: t("Affects the number of particles"), height: 14 },
	{ term: t("Max Height"), description: t("Affects the height that the particles reach"), height: 14 },
	{ term: t("Angular Size"), description: t("The angle of the cone of particles."), height: 14 },
	{ term: t("Duration"), description: t("Number of seconds this phase lasts."), height: 14 },
	{ term: t("Colour 1-3"), description: t("Colours for the particles"), height: 14 },
	{ term: t("Crackle"), description: t("Adds a crackling spark effect to the fountain"), height: 14 },
	{ term: t("Crackle Colour"), description: t("Colour for the crackle"), height: 14 },
	];

const fountainExplanation: ExplanationParagraph[] = [
	{ text: t("A continuous spray of particles made up of one or more\nphases played back to back that gradually transition from one to the next."), height: 28 },
	{ term: t("Tilt"), description: t("The angle in the vertical plane of where\nthe particles are sprayed towards.\n0 = up, 90 = horizontal, 180 = down"), height: 36 },
	{ term: t("Azimuth"), description: t("The angle in the horizontal plane of where\nthe particles are sprayed towards."), height: 28 },
	{ term: t("Add"), description: t("Opens the window to add a new phase at\nthe end."), height: 28 },
	{ term: t("Edit"), description: t("Opens the window to edit the selected phase."), height: 14 },
	{ term: t("Clone"), description: t("Duplicates the selected phase and inserts\nit right after."), height: 28 },
	{ term: t("Delete"), description: t("Deletes the selected phase."), height: 14 },
	{ term: "^", description: t("Moves the selected phase 1 postion up."), height: 14 },
	{ term: "v", description: t("Moves the selected phase 1 postion up."), height: 14 },
	
	
];

function openFountainPhaseWindow(phase: FountainEffectPhase | undefined, onSave: (phase: FountainEffectPhase) => void, onClose?: () => void): void
{
	if (isPopupOpen(EFFECT_SUB_WINDOW_GROUP))
	{
		return;
	}
	const density = store(phase?.density ?? 2);
	const maxHeight = store(phase?.maxHeight ?? 40);
	const angularSize = store(phase?.angularSize ?? 10);
	const durationSecs = store(phase ? Math.round(phase.duration / 40) : 5);
	const colour1 = store(phase?.colour1 ?? Colour.BrightYellow);
	const colour2 = store(phase?.colour2 ?? Colour.Invisible);
	const colour3 = store(phase?.colour3 ?? Colour.Invisible);
	const crackleColour = store(phase?.crackleColour ?? Colour.White);
	const crackle = store(phase?.crackle ?? false);

	openEffectWindow({
		title: t("Fountain Phase"),
		width: 300,
		height: 360,
		saveText: phase ? t("Update Phase") : t("Add Phase"),
		popupKey: EFFECT_SUB_WINDOW_GROUP,
		explanation: phaseExplanation,
		onClose,
		content: [
			createNumberRow(t("Density"), density, 1, 5),
			createNumberRow(t("Max Height"), maxHeight, 0, 65),
			createNumberRow(t("Angular Size"), angularSize, 0, 25),
			createNumberRow(t("Duration (secs)"), durationSecs, 1, 60),
			createColourPickerRow(t("Colour 1"), colour1),
			createColourPickerRow(t("Colour 2"), colour2),
			createColourPickerRow(t("Colour 3"), colour3),
			checkbox({ text: t("Crackle"), isChecked: crackle, onChange: value => crackle.set(value) }),
			createColourPickerRow(t("Crackle Colour"), crackleColour)
		],
		onSave: () => {
			onSave(new FountainEffectPhase(
				density.get(),
				maxHeight.get(),
				colour1.get(),
				colour2.get(),
				colour3.get(),
				crackleColour.get(),
				crackle.get(),
				angularSize.get(),
				durationSecs.get() * 40
			));
		}
	});
}

interface FountainPreset {
	label: string;
	phases: FountainEffectPhase[];
}

//Fountains have some presets as examples
const fountainPresets: FountainPreset[] = [
	{
		label: t("Small Simple Fountain"),
		phases: [
			new FountainEffectPhase(2, 20, Colour.BrightYellow, Colour.LightOrange, Colour.Invisible, Colour.White, false, 8,  5 * 40),
			new FountainEffectPhase(3, 35, Colour.BrightYellow, Colour.LightOrange, Colour.Invisible, Colour.White, false, 10, 20 * 40),
			new FountainEffectPhase(3, 35, Colour.BrightYellow, Colour.LightOrange, Colour.Invisible, Colour.White, false, 10, 1 * 40),
			new FountainEffectPhase(2, 10, Colour.BrightYellow, Colour.LightOrange, Colour.Invisible, Colour.White, false, 8,  5 * 40),
		]
	},
	{
		label: t("Large Simple Fountain"),
		phases: [
			new FountainEffectPhase(3, 20, Colour.White, Colour.Grey, Colour.Grey, Colour.White, false, 10,  8 * 40),
			new FountainEffectPhase(4, 55, Colour.White, Colour.Grey, Colour.Grey, Colour.White, false, 12, 34 * 40),
			new FountainEffectPhase(4, 55, Colour.White, Colour.Grey, Colour.Grey, Colour.White, false, 12, 1 * 40),
			new FountainEffectPhase(3, 30, Colour.White, Colour.Grey, Colour.Grey, Colour.White, false, 10,  8 * 40),
		]
	},
	{
		label: t("2 Gradual Phase Fountain"),
		phases: [
			new FountainEffectPhase(3, 40, Colour.BrightRed,   Colour.Invisible, Colour.Invisible, Colour.White,      false, 10, 15 * 40),
			new FountainEffectPhase(3, 40, Colour.BrightGreen, Colour.Invisible, Colour.Invisible, Colour.White,      true,  10, 15 * 40),
			new FountainEffectPhase(3, 40, Colour.BrightGreen, Colour.Invisible, Colour.Invisible, Colour.White,      true,  1, 15 * 40),
		]
	},
	{
		label: t("3 Sharp Phase Fountain"),
		phases: [
			new FountainEffectPhase(3, 45, Colour.BrightRed,  Colour.Invisible, Colour.Invisible, Colour.White, true, 10, 15 * 40),
			new FountainEffectPhase(3, 45, Colour.BrightRed,  Colour.Invisible, Colour.Invisible, Colour.White, true, 10, 1 * 40),
			new FountainEffectPhase(3, 45, Colour.White,      Colour.Invisible, Colour.Invisible, Colour.White, true, 10, 10 * 40),
			new FountainEffectPhase(3, 45, Colour.White,      Colour.Invisible, Colour.Invisible, Colour.White, true, 10, 1 * 40),
			new FountainEffectPhase(3, 45, Colour.LightBlue,  Colour.Invisible, Colour.Invisible, Colour.White, true, 1, 15 * 40),
			new FountainEffectPhase(3, 45, Colour.LightBlue,  Colour.Invisible, Colour.Invisible, Colour.White, true, 1, 1 * 40),
		]
	}
];

export function openFountainEffectWindow(effect: FountainEffect | undefined, onSave: (effect: Effect) => void, onClose?: () => void): void
{
	const tilt = store(effect?.tilt ?? 0);
	const azimuth = store(effect?.azimuth ?? 0);
	const phases = store<FountainEffectPhase[]>(effect?.phases ? [...effect.phases] : []);
	const selectedPhaseIndex = store<number | undefined>(undefined);

	const totalDurationText = compute(phases, phaseList => {
		const totalSecs = (phaseList.reduce((sum, p) => sum + p.duration, 0) / 40).toFixed(1);
		return `Total Duration: ${totalSecs}s`;
	});

	const presetOptions = [t("Select preset"), ...fountainPresets.map(p => p.label)];
	const selectedPreset = store(0);

	const applyPreset = (index: number): void => {
		if (index === 0) return;
		const preset = fountainPresets[index - 1];
		if (!preset) return;
		phases.set([...preset.phases]);
		selectedPhaseIndex.set(undefined);
	};

	const addPhase = (): void => {
		openFountainPhaseWindow(undefined, phase => {
			const next = [...phases.get(), phase];
			phases.set(next);
			selectedPhaseIndex.set(next.length - 1);
		});
	};

	const editSelectedPhase = (): void => {
		const idx = selectedPhaseIndex.get();
		if (typeof idx !== "number") return;
		const phase = phases.get()[idx];
		if (!phase) return;
		openFountainPhaseWindow(phase, updated => {
			const next = [...phases.get()];
			next[idx] = updated;
			phases.set(next);
		});
	};

	const removeSelectedPhase = (): void => {
		const idx = selectedPhaseIndex.get();
		if (typeof idx !== "number") return;
		phases.set(phases.get().filter((_, i) => i !== idx));
		selectedPhaseIndex.set(undefined);
	};

	const cloneSelectedPhase = (): void => {
		const idx = selectedPhaseIndex.get();
		if (typeof idx !== "number") return;
		const phase = phases.get()[idx];
		if (!phase) return;
		const next = [...phases.get()];
		next.splice(idx + 1, 0, new FountainEffectPhase(
			phase.density,
			phase.maxHeight,
			phase.colour1,
			phase.colour2,
			phase.colour3,
			phase.crackleColour,
			phase.crackle,
			phase.angularSize,
			phase.duration
		));
		phases.set(next);
		selectedPhaseIndex.set(idx + 1);
	};

	const movePhaseUp = (): void => {
		const idx = selectedPhaseIndex.get();
		if (typeof idx !== "number" || idx === 0) return;
		const next = [...phases.get()];
		[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
		phases.set(next);
		selectedPhaseIndex.set(idx - 1);
	};

	const movePhaseDown = (): void => {
		const idx = selectedPhaseIndex.get();
		if (typeof idx !== "number" || idx >= phases.get().length - 1) return;
		const next = [...phases.get()];
		[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
		phases.set(next);
		selectedPhaseIndex.set(idx + 1);
	};

	openEffectWindow({
		title: t("Fountain Effect"),
		width: 360,
		height: 400,
		saveText: effect ? t("Update Effect") : t("Add Effect"),
		onClose,
		explanation: fountainExplanation,
		content: [
			flexible({
				direction: LayoutDirection.Horizontal,
				height: 14,
				content: [
					label({ text: t("Preset"), width: 140, height: 14 }),
					dropdown({
						items: presetOptions,
						selectedIndex: selectedPreset,
						onChange: index => {
						selectedPreset.set(index);
						applyPreset(index);
					},
						width: 160,
						height: 14
					})
				]
			}),
			createNumberRow(t("Tilt (0=up, 90=horiz)"), tilt, 0, 180, 2),
			createNumberRow(t("Azimuth (0=Y, 90=X)"), azimuth, -360, 360, 5),
			flexible({
				direction: LayoutDirection.Horizontal,
				height: 14,
				content: [
					label({ text: totalDurationText, height: 14 })
				]
			}),
			groupbox({
				text: t("Phases"),
				height: 200,
				content: [
					listview({
						items: compute(phases, phaseList => phaseList.map(p => [
							`${(p.duration / 40).toFixed(1)}s`,
							`${p.maxHeight}`,
							`${p.density}`,
							`${p.angularSize}`,
							p.crackle ? t("Yes") : t("No")
						])),
						columns: [
							{ header: t("Duration"), width: "1w" },
							{ header: t("Height"), width: "1w" },
							{ header: t("Density"), width: "1w" },
							{ header: t("Angular Size"), width: "1w" },
							{ header: t("Crackle"), width: "1w" }
						],
						height: 150,
						canSelect: true,
						selectedCell: compute(selectedPhaseIndex, index => index === undefined ? null : { row: index, column: 0 }),
						onClick: row => selectedPhaseIndex.set(row)
					}),
					flexible({
						direction: LayoutDirection.Horizontal,
						height: 14,
						content: [
							colouredButton({ text: t("{WHITE}Add"), width: 65, height: 28, colour: Colour.SaturatedGreen, colourDark: Colour.GrassGreenDark, colourLight: Colour.BrightGreen, onClick: addPhase }),
							colouredButton({ text: t("Edit"), width: 65, height: 28, colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White, onClick: editSelectedPhase }),
							colouredButton({ text: t("Clone"), width: 65, height: 28, colour: Colour.Grey, colourDark: Colour.Black, colourLight: Colour.White, onClick: cloneSelectedPhase }),
							colouredButton({ text: t("{WHITE}Delete"), width: 65, height: 28, colour: Colour.SaturatedRed, colourDark: Colour.BordeauxRedDark, colourLight: Colour.BrightRed, onClick: removeSelectedPhase }),
							button({ image: "arrow_up", width: 28, height: 28, onClick: movePhaseUp }),
							button({ image: "arrow_down", width: 28, height: 28, onClick: movePhaseDown })
						]
					})
				]
			})
		],
		onSave: () => {
			const totalDuration = phases.get().reduce((sum, p) => sum + p.duration, 0);
			onSave(new FountainEffect(
				phases.get(),
				tilt.get(),
				azimuth.get(),
				effect?.timeLeft ?? totalDuration,
				effect?.position ?? "",
				effect?.currentPhaseIndex ?? -1
			));
		}
	});
}

