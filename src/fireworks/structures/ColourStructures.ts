import { Colour } from "openrct2-flexui";

export class LoadColours
{
	constructor(
		public colourList: Colour[] = [],
		public sequenceName: string = "",
		public reverseSequence: boolean = false,
		public pattern: string = "",
		public namedColours: { [key: string]: Colour } = {}
	) {}

	private readNamedColour(name: string, index: number = 0): Colour
	{
		if (this.namedColours[name] !== undefined)
		{
			return this.namedColours[name];
		}

		if (index < this.colourList.length && this.colourList[index] !== undefined)
		{
			return this.colourList[index];
		}

		console.log(`LoadColours: missing colour key '${name}', using Colour.Invisible.`);
		return Colour.Invisible;
	}

	private writeColour(value: Colour, index: number = 0): void
	{
		if (index >= this.colourList.length)
		{
			this.colourList.length = index + 1;
		}

		this.colourList[index] = value;
	}

	private writeNamedColour(name: string, value: Colour, index: number = 0): void
	{
		this.namedColours[name] = value;
		this.writeColour(value, index);
	}

	getColour(name: string): Colour
	{
		return this.readNamedColour(name);
	}

	setColour(name: string, value: Colour): void
	{
		this.writeNamedColour(name, value);
	}

	toParkData(): any
	{
		return {
			className: "LoadColours",
			colourList: [...this.colourList],
			sequenceName: this.sequenceName,
			reverseSequence: this.reverseSequence,
			pattern: this.pattern,
			namedColours: { ...this.namedColours }
		};
	}

	static fromParkData(colours: any): LoadColours
	{
		return new LoadColours(
			[...(colours?.colourList ?? [])],
			colours?.sequenceName ?? "",
			colours?.reverseSequence ?? false,
			colours?.pattern ?? "",
			{ ...(colours?.namedColours ?? {}) }
		);
	}
}

export class ShellColours
{
	constructor(
		public headColour: Colour = Colour.BrightYellow,
		public trail1Colour: Colour = Colour.DarkOrange,
		public trail2Colour: Colour = Colour.DarkOrange,
	) {}

	toParkData(): any
	{
		return {
			className: "ShellColours",
			headColour: this.headColour,
			trail1Colour: this.trail1Colour,
			trail2Colour: this.trail2Colour
		};
	}

	static fromParkData(colours: any): ShellColours
	{
		return new ShellColours(
			colours?.headColour ?? Colour.Invisible,
			colours?.trail1Colour ?? Colour.Invisible,
			colours?.trail2Colour ?? Colour.Invisible
		);
	}
}

export class ColourSequence
{
	constructor(
		public name: string,
		public colours: Colour[]
	) {}

	toParkData(): any
	{
		return {
			className: "ColourSequence",
			name: this.name,
			colours: [...this.colours]
		};
	}

	static fromParkData(sequence: any): ColourSequence
	{
		return new ColourSequence(String(sequence?.name ?? ""), [...(sequence?.colours ?? [])]);
	}
}

export const maxColourSequenceLength = 10;

