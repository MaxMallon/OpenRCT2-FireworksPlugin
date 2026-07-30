var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { Colour, store } from "openrct2-flexui";
var LoadColours = /** @class */ (function () {
    function LoadColours(colourList, sequenceName, pattern, namedColours) {
        if (colourList === void 0) { colourList = []; }
        if (sequenceName === void 0) { sequenceName = ""; }
        if (pattern === void 0) { pattern = ""; }
        if (namedColours === void 0) { namedColours = {}; }
        this.colourList = colourList;
        this.sequenceName = sequenceName;
        this.pattern = pattern;
        this.namedColours = namedColours;
    }
    LoadColours.prototype.readNamedColour = function (name, index) {
        if (index === void 0) { index = 0; }
        if (this.namedColours[name] !== undefined) {
            return this.namedColours[name];
        }
        if (index < this.colourList.length && this.colourList[index] !== undefined) {
            return this.colourList[index];
        }
        console.log("LoadColours: missing colour key '".concat(name, "', using Colour.Invisible."));
        return Colour.Invisible;
    };
    LoadColours.prototype.writeColour = function (value, index) {
        if (index === void 0) { index = 0; }
        if (index >= this.colourList.length) {
            this.colourList.length = index + 1;
        }
        this.colourList[index] = value;
    };
    LoadColours.prototype.writeNamedColour = function (name, value, index) {
        if (index === void 0) { index = 0; }
        this.namedColours[name] = value;
        this.writeColour(value, index);
    };
    LoadColours.prototype.getColour = function (name) {
        return this.readNamedColour(name);
    };
    LoadColours.prototype.setColour = function (name, value) {
        this.writeNamedColour(name, value);
    };
    return LoadColours;
}());
export { LoadColours };
var ShellColours = /** @class */ (function () {
    function ShellColours(headColour, trail1Colour, trail2Colour) {
        if (headColour === void 0) { headColour = Colour.BrightYellow; }
        if (trail1Colour === void 0) { trail1Colour = Colour.DarkOrange; }
        if (trail2Colour === void 0) { trail2Colour = Colour.DarkOrange; }
        this.headColour = headColour;
        this.trail1Colour = trail1Colour;
        this.trail2Colour = trail2Colour;
    }
    return ShellColours;
}());
export { ShellColours };
var ColourSequence = /** @class */ (function () {
    function ColourSequence(name, colours) {
        this.name = name;
        this.colours = colours;
    }
    return ColourSequence;
}());
export { ColourSequence };
export var maxColourSequenceLength = 10;
export var colourSequences = store([
    new ColourSequence("Rainbow", [Colour.BrightRed, Colour.LightOrange, Colour.BrightYellow, Colour.BrightGreen, Colour.LightBlue, Colour.BrightPurple]),
    new ColourSequence("Fire", [Colour.BrightRed, Colour.DarkOrange, Colour.BrightYellow, Colour.DarkOrange, Colour.BordeauxRed]),
    new ColourSequence("Sunset", [Colour.BordeauxRed, Colour.SalmonPink, Colour.LightOrange, Colour.BrightYellow, Colour.DarkOrange])
]);
export function getColourSequenceByName(name) {
    var normalizedName = name.trim();
    var sequences = colourSequences.get();
    for (var index = 0; index < sequences.length; index++) {
        var item = sequences[index];
        if (item.name === normalizedName) {
            return __spreadArray([], item.colours, true);
        }
    }
    return undefined;
}
export function GetConfiguredColourSequence(sequenceName) {
    return getColourSequenceByName(sequenceName);
}
