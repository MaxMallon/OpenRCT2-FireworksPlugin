var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { GetConfiguredColourSequence, ShellColours } from "./ColourStructures";
import { AddFireworkToExplode, AddFireworkToTrail, SpawnLight, SpawnLightCluster } from "./player";
import { counterGravity1sec, DegreeToRad, resolveLaunchSitePosition } from "./helpers";
export var EffectType;
(function (EffectType) {
    EffectType["Star"] = "star";
    EffectType["Burst"] = "burst";
    EffectType["Sphere"] = "sphere";
    EffectType["Crackle"] = "crackle";
    EffectType["Pict"] = "pict";
    EffectType["Ring"] = "ring";
    EffectType["Spray"] = "spray";
    EffectType["SprayFan"] = "sprayfan";
    EffectType["CometFan"] = "cometfan";
    EffectType["BigBouqet"] = "bigbouqet";
    EffectType["MicroBurst"] = "microburst";
    EffectType["Unknown"] = "unknown";
})(EffectType || (EffectType = {}));
var Effect = /** @class */ (function () {
    function Effect(type, size, physicalSize, extraLongevity, colours) {
        this.type = type;
        this.size = size;
        this.physicalSize = physicalSize;
        this.extraLongevity = extraLongevity;
        this.colours = colours;
    }
    Effect.prototype.Make = function (_posOri, _velocity) {
        return undefined;
    };
    Effect.prototype.LoadColoursFromSequence = function (sequenceName) {
        var resolvedSequenceName = (sequenceName !== null && sequenceName !== void 0 ? sequenceName : this.colours.sequenceName).trim();
        if (!resolvedSequenceName) {
            return;
        }
        var sequenceColours = GetConfiguredColourSequence(resolvedSequenceName);
        if (sequenceColours) {
            this.colours.colourList = sequenceColours;
        }
    };
    return Effect;
}());
export { Effect };
var Load = /** @class */ (function () {
    function Load(effects, name) {
        if (effects === void 0) { effects = []; }
        if (name === void 0) { name = ""; }
        this.effects = effects;
        this.name = name;
    }
    Load.prototype.Explode = function (posOri, velocity) {
        this.effects.forEach(function (effect) {
            effect.Make(posOri, velocity);
        });
    };
    return Load;
}());
export { Load };
export var ShotHeadType;
(function (ShotHeadType) {
    ShotHeadType["Big"] = "big";
    ShotHeadType["Small"] = "small";
})(ShotHeadType || (ShotHeadType = {}));
var ShellLoad = /** @class */ (function () {
    function ShellLoad(load, timeTillExplode, //Time since launch of shot.
    particle) {
        if (timeTillExplode === void 0) { timeTillExplode = ShellLoad.explodeAtEnd; }
        if (particle === void 0) { particle = undefined; }
        this.load = load;
        this.timeTillExplode = timeTillExplode;
        this.particle = particle;
    }
    ShellLoad.prototype.Explode = function () {
        this.load.Explode({ x: this.particle.x, y: this.particle.y, z: this.particle.z }, { x: this.particle.acceleration.x, y: this.particle.acceleration.y, z: this.particle.acceleration.z });
    };
    ShellLoad.explodeAtEnd = -1;
    return ShellLoad;
}());
export { ShellLoad };
var FireworkTrail = /** @class */ (function () {
    function FireworkTrail(colours, particle, timeLeft, density, width) {
        this.colours = colours;
        this.particle = particle;
        this.timeLeft = timeLeft;
        this.density = density;
        this.width = width;
    }
    return FireworkTrail;
}());
export { FireworkTrail };
export var ShellFactorySource;
(function (ShellFactorySource) {
    ShellFactorySource["Direct"] = "direct";
    ShellFactorySource["Ground"] = "ground";
    ShellFactorySource["Burst"] = "burst";
})(ShellFactorySource || (ShellFactorySource = {}));
var Firework = /** @class */ (function () {
    function Firework(name) {
        this.name = name;
    }
    Firework.prototype.Light = function () {
        return false;
    };
    return Firework;
}());
export { Firework };
var Shell = /** @class */ (function (_super) {
    __extends(Shell, _super);
    function Shell(name, load, ascendEffects, headType, trail, position, shellColours, timeTillStall, velocity, delay, //Time for crackle to start.
    angleX, angleY, factorySource) {
        if (name === void 0) { name = ""; }
        if (ascendEffects === void 0) { ascendEffects = []; }
        if (headType === void 0) { headType = ShotHeadType.Big; }
        if (trail === void 0) { trail = false; }
        if (position === void 0) { position = ""; }
        if (shellColours === void 0) { shellColours = new ShellColours(); }
        if (timeTillStall === void 0) { timeTillStall = 0; }
        if (velocity === void 0) { velocity = { x: 0, y: 0, z: 0 }; }
        if (delay === void 0) { delay = 0; }
        if (angleX === void 0) { angleX = 0; }
        if (angleY === void 0) { angleY = 0; }
        if (factorySource === void 0) { factorySource = ShellFactorySource.Direct; }
        var _this = _super.call(this, name) || this;
        _this.load = load;
        _this.ascendEffects = ascendEffects;
        _this.headType = headType;
        _this.trail = trail;
        _this.position = position;
        _this.shellColours = shellColours;
        _this.timeTillStall = timeTillStall;
        _this.velocity = velocity;
        _this.delay = delay;
        _this.angleX = angleX;
        _this.angleY = angleY;
        _this.factorySource = factorySource;
        return _this;
    }
    Shell.fromGround = function (name, load, ascendEffects, headType, trail, position, shellColours, timeTillStall, delay, angleX, angleY) {
        if (name === void 0) { name = ""; }
        if (ascendEffects === void 0) { ascendEffects = []; }
        if (headType === void 0) { headType = ShotHeadType.Big; }
        if (trail === void 0) { trail = false; }
        if (position === void 0) { position = ""; }
        if (shellColours === void 0) { shellColours = new ShellColours(); }
        if (timeTillStall === void 0) { timeTillStall = 0; }
        if (delay === void 0) { delay = 0; }
        if (angleX === void 0) { angleX = 0; }
        if (angleY === void 0) { angleY = 0; }
        return new Shell(name, load, ascendEffects, headType, trail, position, shellColours, timeTillStall, { x: 0, y: 0, z: 0 }, delay, angleX, angleY, ShellFactorySource.Ground);
    };
    Shell.fromBurst = function (name, load, ascendEffects, headType, trail, position, shellColours, velocity, delay) {
        if (name === void 0) { name = ""; }
        if (ascendEffects === void 0) { ascendEffects = []; }
        if (headType === void 0) { headType = ShotHeadType.Big; }
        if (trail === void 0) { trail = false; }
        if (position === void 0) { position = ""; }
        if (shellColours === void 0) { shellColours = new ShellColours(); }
        if (velocity === void 0) { velocity = { x: 0, y: 0, z: 0 }; }
        if (delay === void 0) { delay = 0; }
        return new Shell(name, load, ascendEffects, headType, trail, position, shellColours, 0, velocity, delay, 0, 0, ShellFactorySource.Burst);
    };
    Shell.prototype.CalculateVelocityVector = function () {
        this.angleX = DegreeToRad(this.angleX);
        this.angleY = DegreeToRad(this.angleY);
        var speed = this.timeTillStall / 20 * counterGravity1sec;
        var vx = Math.sin(this.angleX) * speed;
        var vy = Math.sin(this.angleY) * speed;
        var vz = Math.cos(this.angleX) * Math.cos(this.angleY) * speed;
        if (vx > 0)
            vx *= 1.4;
        if (vy > 0)
            vy *= 1.4;
        this.velocity = { x: vx, y: vy, z: vz };
    };
    //Launch the shot
    Shell.prototype.Light = function () {
        var particle;
        var pos = resolveLaunchSitePosition(this.position);
        if (this.factorySource == ShellFactorySource.Ground)
            this.CalculateVelocityVector();
        if (!pos)
            return false;
        if (this.headType == ShotHeadType.Small)
            particle = SpawnLight(pos, this.velocity, this.shellColours.headColour, this.shellColours.headColour, this.delay + 1);
        else if (this.headType == ShotHeadType.Big)
            particle = SpawnLightCluster(pos, this.velocity, this.shellColours.headColour, this.delay + 1, 5);
        if (!particle)
            return false;
        if (this.trail)
            AddFireworkToTrail(this.shellColours, particle, this.delay);
        for (var i = 0; i < this.ascendEffects.length; i++) {
            this.ascendEffects[i].particle = particle;
            if (this.ascendEffects[i].timeTillExplode == ShellLoad.explodeAtEnd)
                this.ascendEffects[i].timeTillExplode = particle.timeToLive - 1;
            AddFireworkToExplode(this.ascendEffects[i]);
        }
        AddFireworkToExplode(this.load);
        return true;
    };
    return Shell;
}(Firework));
export { Shell };
var Fountain = /** @class */ (function (_super) {
    __extends(Fountain, _super);
    function Fountain(name) {
        if (name === void 0) { name = ""; }
        return _super.call(this, name) || this;
    }
    return Fountain;
}(Firework));
export { Fountain };
var SequenceEntry = /** @class */ (function () {
    function SequenceEntry(item, timeTillLight, //Frames after the previous shot in the sequence before this one is launched
    cumulativeTimeTillLight //Frames since the start of the root sequence/show.
    ) {
        if (timeTillLight === void 0) { timeTillLight = 0; }
        if (cumulativeTimeTillLight === void 0) { cumulativeTimeTillLight = 0; }
        this.item = item;
        this.timeTillLight = timeTillLight;
        this.cumulativeTimeTillLight = cumulativeTimeTillLight;
    }
    return SequenceEntry;
}());
export { SequenceEntry };
var Sequence = /** @class */ (function () {
    function Sequence(name, items, timeTillStart, //Frames after the previous sequence in the show before this one is launched
    cumulativeTimeTillStart //Frames since the start of the root sequence/show.
    ) {
        if (items === void 0) { items = []; }
        if (timeTillStart === void 0) { timeTillStart = 0; }
        if (cumulativeTimeTillStart === void 0) { cumulativeTimeTillStart = 0; }
        this.name = name;
        this.items = items;
        this.timeTillStart = timeTillStart;
        this.cumulativeTimeTillStart = cumulativeTimeTillStart;
        this.recalculateCumulativeTimes(this.cumulativeTimeTillStart);
    }
    Sequence.normalizeFrameDelay = function (value) {
        if (!isFinite(value)) {
            return 0;
        }
        return Math.max(0, Math.floor(value));
    };
    Sequence.getEntryAbsoluteStartTime = function (owner, index) {
        if (index <= 0) {
            return owner.cumulativeTimeTillStart;
        }
        return owner.items[index - 1].cumulativeTimeTillLight;
    };
    Sequence.clampInsertIndex = function (index, length) {
        if (!isFinite(index)) {
            return length;
        }
        return Math.min(Math.max(0, Math.floor(index)), length);
    };
    Sequence.prototype.applyEntryCumulativeTime = function (entry, absoluteTime) {
        entry.cumulativeTimeTillLight = absoluteTime;
        if (!(entry.item instanceof Sequence)) {
            return;
        }
        entry.item.timeTillStart = entry.timeTillLight;
        entry.item.cumulativeTimeTillStart = absoluteTime;
        entry.item.recalculateCumulativeTimesFromIndex(0);
    };
    Sequence.prototype.getEndCumulativeTime = function () {
        var endTime = this.cumulativeTimeTillStart;
        for (var index = 0; index < this.items.length; index++) {
            var entry = this.items[index];
            if (!(entry.item instanceof Sequence)) {
                if (entry.cumulativeTimeTillLight > endTime) {
                    endTime = entry.cumulativeTimeTillLight;
                }
                continue;
            }
            var nestedEndTime = entry.item.getEndCumulativeTime();
            if (nestedEndTime > endTime) {
                endTime = nestedEndTime;
            }
        }
        return endTime;
    };
    Sequence.prototype.resolveInsertedEntryTimeTillShot = function (insertIndex, timeTillShot, timeReference) {
        var normalizedTimeTillShot = Sequence.normalizeFrameDelay(timeTillShot);
        if (timeReference !== InsertTimeReference.PreviousSequenceEnd || insertIndex <= 0) {
            return normalizedTimeTillShot;
        }
        var previousEntry = this.items[insertIndex - 1];
        if (!(previousEntry.item instanceof Sequence)) {
            return normalizedTimeTillShot;
        }
        var previousSequenceStart = previousEntry.cumulativeTimeTillLight;
        var previousSequenceEnd = previousEntry.item.getEndCumulativeTime();
        var previousSequenceDuration = Math.max(0, previousSequenceEnd - previousSequenceStart);
        return normalizedTimeTillShot + previousSequenceDuration;
    };
    Sequence.prototype.recalculateCumulativeTimesFromIndex = function (startIndex) {
        var normalizedStartIndex = Sequence.clampInsertIndex(startIndex, this.items.length);
        var previousTime = Sequence.getEntryAbsoluteStartTime(this, normalizedStartIndex);
        for (var index = normalizedStartIndex; index < this.items.length; index++) {
            var entry = this.items[index];
            entry.timeTillLight = Sequence.normalizeFrameDelay(entry.timeTillLight);
            var absoluteTime = previousTime + entry.timeTillLight;
            this.applyEntryCumulativeTime(entry, absoluteTime);
            previousTime = absoluteTime;
        }
    };
    Sequence.prototype.recalculateCumulativeTimes = function (startTime) {
        if (startTime === void 0) { startTime = this.cumulativeTimeTillStart; }
        this.cumulativeTimeTillStart = Sequence.normalizeFrameDelay(startTime);
        this.recalculateCumulativeTimesFromIndex(0);
    };
    Sequence.prototype.addShotAt = function (shot, index) {
        var insertIndex = Sequence.clampInsertIndex(index, this.items.length);
        var entry = new SequenceEntry(shot, 0);
        this.items.splice(insertIndex, 0, entry);
        this.recalculateCumulativeTimesFromIndex(insertIndex);
        return entry;
    };
    Sequence.prototype.addItemAt = function (item, timeTillShot, index, timeReference) {
        if (timeReference === void 0) { timeReference = InsertTimeReference.PreviousEntryStart; }
        var insertIndex = Sequence.clampInsertIndex(index, this.items.length);
        this.recalculateCumulativeTimesFromIndex(0);
        var resolvedTimeTillShot = this.resolveInsertedEntryTimeTillShot(insertIndex, timeTillShot, timeReference);
        var entry = new SequenceEntry(item, resolvedTimeTillShot);
        this.items.splice(insertIndex, 0, entry);
        this.recalculateCumulativeTimesFromIndex(insertIndex);
        return entry;
    };
    Sequence.prototype.removeItemAt = function (index) {
        if (index < 0 || index >= this.items.length) {
            return undefined;
        }
        var removed = this.items.splice(index, 1)[0];
        this.recalculateCumulativeTimesFromIndex(index);
        return removed;
    };
    return Sequence;
}());
export { Sequence };
var Show = /** @class */ (function (_super) {
    __extends(Show, _super);
    function Show(startMessage, name, items) {
        if (items === void 0) { items = []; }
        var _this = _super.call(this, name, items) || this;
        _this.startMessage = startMessage;
        return _this;
    }
    return Show;
}(Sequence));
export { Show };
export var InsertTimeReference;
(function (InsertTimeReference) {
    InsertTimeReference["PreviousEntryStart"] = "previous-entry-start";
    InsertTimeReference["PreviousSequenceEnd"] = "previous-sequence-end";
})(InsertTimeReference || (InsertTimeReference = {}));
export function recalculateCumulativeTimesFromIndex(owner, startIndex) {
    owner.recalculateCumulativeTimesFromIndex(startIndex);
}
export function recalculateCumulativeTimes(owner, startTime) {
    if (startTime === void 0) { startTime = 0; }
    owner.recalculateCumulativeTimes(startTime);
}
export function ticksToTimeString(ticks) {
    var normalizedTicks = isFinite(ticks) ? Math.max(0, Math.floor(ticks)) : 0;
    var totalSeconds = Math.floor(normalizedTicks / 40);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    var ticksRemainder = normalizedTicks % 40;
    var pad = function (num, length) {
        var text = num.toString();
        return text.length >= length ? text : Array(length - text.length + 1).join("0") + text;
    };
    return "".concat(pad(minutes, 2), "m").concat(pad(seconds, 2), "s").concat(pad(ticksRemainder, 2), "t");
}
export function addShotToSequenceAt(sequence, shot, index) {
    return sequence.addShotAt(shot, index);
}
export function addItemToSequenceAt(sequence, item, timeTillShot, index, timeReference) {
    if (timeReference === void 0) { timeReference = InsertTimeReference.PreviousEntryStart; }
    return sequence.addItemAt(item, timeTillShot, index, timeReference);
}
export function addItemToShowAt(show, item, timeTillShot, index, timeReference) {
    if (timeReference === void 0) { timeReference = InsertTimeReference.PreviousEntryStart; }
    return addItemToSequenceAt(show, item, timeTillShot, index, timeReference);
}
export function removeItemFromSequenceAt(sequence, index) {
    return sequence.removeItemAt(index);
}
export function removeItemFromShowAt(show, index) {
    return removeItemFromSequenceAt(show, index);
}
