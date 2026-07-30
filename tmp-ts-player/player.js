var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { Colour } from "openrct2-flexui";
import { Load, Sequence, SequenceEntry, Shell, ShellLoad, Show, Firework } from "./structures";
import { counterGravity1sec } from "./helpers";
import { LoadColours, ShellColours } from "./ColourStructures";
import { fireworkTicks, tick } from "./persistent";
var FireworksToBeShot = []; //list of fireworks to be shot up
var FireworksToExplode = []; //fireworks in air, counting down to explode
var FireworksToTrail = []; //fireworks in air leaving a trail
var FireworksToCrackle = []; //exploded fireworks in air that produce crackle 
function normalizeFrame(value) {
    if (!isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.floor(value));
}
function cloneCoords(coords) {
    return { x: coords.x, y: coords.y, z: coords.z };
}
function cloneLoadColours(colours) {
    return new LoadColours(__spreadArray([], colours.colourList, true), colours.sequenceName, colours.pattern, __assign({}, colours.namedColours));
}
function cloneEffect(effect) {
    var clonedEffect = Object.create(Object.getPrototypeOf(effect));
    for (var key in effect) {
        if (Object.prototype.hasOwnProperty.call(effect, key)) {
            clonedEffect[key] = effect[key];
        }
    }
    clonedEffect.colours = cloneLoadColours(effect.colours);
    return clonedEffect;
}
function cloneLoad(load) {
    return new Load(load.effects.map(cloneEffect));
}
function cloneShellLoad(load) {
    return new ShellLoad(cloneLoad(load.load), load.timeTillExplode);
}
function cloneShellColours(colours) {
    return new ShellColours(colours.headColour, colours.trail1Colour, colours.trail2Colour);
}
function cloneShell(shell) {
    var position = typeof shell.position === "string" ? shell.position : cloneCoords(shell.position);
    return new Shell(shell.name, cloneShellLoad(shell.load), shell.ascendEffects.map(cloneShellLoad), shell.headType, shell.trail, position, cloneShellColours(shell.shellColours), shell.timeTillStall, cloneCoords(shell.velocity), shell.delay, shell.angleX, shell.angleY, shell.factorySource);
}
function cloneFirework(firework) {
    if (firework instanceof Shell) {
        return cloneShell(firework);
    }
    var clonedFirework = Object.create(Object.getPrototypeOf(firework));
    for (var key in firework) {
        if (Object.prototype.hasOwnProperty.call(firework, key)) {
            clonedFirework[key] = firework[key];
        }
    }
    return clonedFirework;
}
function cloneSequenceEntry(entry) {
    if (entry.item instanceof Sequence) {
        return new SequenceEntry(cloneSequence(entry.item), entry.timeTillLight, entry.cumulativeTimeTillLight);
    }
    return new SequenceEntry(cloneFirework(entry.item), entry.timeTillLight, entry.cumulativeTimeTillLight);
}
function cloneSequence(sequence) {
    var cloned = sequence instanceof Show
        ? new Show(sequence.startMessage, sequence.name, [])
        : new Sequence(sequence.name, []);
    cloned.timeTillStart = sequence.timeTillStart;
    cloned.cumulativeTimeTillStart = sequence.cumulativeTimeTillStart;
    cloned.items = sequence.items.map(cloneSequenceEntry);
    return cloned;
}
function collectShotsInRange(sequence, startTime, endTime, collected) {
    for (var index = 0; index < sequence.items.length; index++) {
        var entry = sequence.items[index];
        var item = entry.item;
        if (item instanceof Firework) {
            if (entry.cumulativeTimeTillLight >= startTime && entry.cumulativeTimeTillLight <= endTime) {
                collected.push(entry);
            }
            continue;
        }
        collectShotsInRange(item, startTime, endTime, collected);
    }
}
function flattenScheduledEntryToShots(entry, cumulativeOverride) {
    var absoluteCumulativeTime = cumulativeOverride === undefined
        ? normalizeFrame(entry.cumulativeTimeTillLight)
        : normalizeFrame(cumulativeOverride);
    if (entry.item instanceof Firework) {
        return [new SequenceEntry(cloneFirework(entry.item), 0, absoluteCumulativeTime)];
    }
    var sequence = entry.item;
    var sequenceOffset = absoluteCumulativeTime - normalizeFrame(sequence.cumulativeTimeTillStart);
    var flattenedEntries = [];
    for (var index = 0; index < sequence.items.length; index++) {
        var child = sequence.items[index];
        var childAbsoluteTime = normalizeFrame(child.cumulativeTimeTillLight + sequenceOffset);
        var childShots = flattenScheduledEntryToShots(child, childAbsoluteTime);
        for (var shotIndex = 0; shotIndex < childShots.length; shotIndex++) {
            flattenedEntries.push(childShots[shotIndex]);
        }
    }
    return flattenedEntries;
}
function sortAndNormalizeShotQueue() {
    FireworksToBeShot.sort(function (left, right) { return left.cumulativeTimeTillLight - right.cumulativeTimeTillLight; });
    var previousCumulativeTime = 0;
    for (var index = 0; index < FireworksToBeShot.length; index++) {
        var entry = FireworksToBeShot[index];
        entry.cumulativeTimeTillLight = normalizeFrame(entry.cumulativeTimeTillLight);
        entry.timeTillLight = Math.max(0, entry.cumulativeTimeTillLight - previousCumulativeTime);
        previousCumulativeTime = entry.cumulativeTimeTillLight;
    }
}
export function AddFireworkToExplode(load) {
    FireworksToExplode.push(load);
}
export function AddFireworkToTrail(colours, particle, timeLeft) {
    FireworksToTrail.push({ colours: colours, particle: particle, timeLeft: timeLeft });
}
export function AddFireworkToCrackle(crackle) {
    FireworksToCrackle.push(crackle);
}
export function LoadFireworks(fireworks, startTime, endTime) {
    if (startTime === void 0) { startTime = 0; }
    if (endTime === void 0) { endTime = Number.MAX_VALUE; }
    if (fireworks instanceof Shell) {
        var copiedShot = cloneShell(fireworks);
        FireworksToBeShot = [new SequenceEntry(copiedShot, 0, 0)];
        return;
    }
    var normalizedStartTime = normalizeFrame(startTime);
    var normalizedEndTime = normalizeFrame(endTime);
    if (normalizedEndTime < normalizedStartTime) {
        FireworksToBeShot = [];
        return;
    }
    var copiedRoot = cloneSequence(fireworks);
    copiedRoot.recalculateCumulativeTimes(copiedRoot.cumulativeTimeTillStart);
    var shotsInRange = [];
    collectShotsInRange(copiedRoot, normalizedStartTime, normalizedEndTime, shotsInRange);
    shotsInRange.sort(function (left, right) { return left.cumulativeTimeTillLight - right.cumulativeTimeTillLight; });
    var previousTime = normalizedStartTime;
    FireworksToBeShot = shotsInRange.map(function (entry) {
        var shotTime = normalizeFrame(entry.cumulativeTimeTillLight);
        var copiedShot = cloneFirework(entry.item);
        var copiedEntry = new SequenceEntry(copiedShot, shotTime - previousTime, shotTime - normalizedStartTime);
        previousTime = shotTime;
        return copiedEntry;
    });
    sortAndNormalizeShotQueue();
}
export function AddFireworksToBeShot(fireworks, startTime, endTime) {
    if (startTime === void 0) { startTime = 0; }
    if (endTime === void 0) { endTime = Number.MAX_VALUE; }
    if (fireworks instanceof Shell) {
        LoadFireworks(fireworks);
        return;
    }
    LoadFireworks(fireworks, startTime, endTime);
}
//Spawn a light for fireworks
export function SpawnLight(pos, velocity, colour0, colour1, time, frame) {
    var boom = map.createEntity("crashed_vehicle_particle", pos);
    if (boom) {
        boom.timeToLive = time;
        boom.acceleration = velocity;
        boom.colours = { body: colour0, trim: colour1 };
        if (frame !== undefined) {
            boom.frame = frame;
        }
        else {
            boom.frame = Math.floor(Math.random() * 6);
        }
        return boom;
    }
    return null;
}
//spawn big ball of lights, return center one.
export function SpawnLightCluster(pos, velocity, colour, time, width) {
    var shot = SpawnLight(pos, velocity, colour, colour, time); //middle
    if (colour !== Colour.Invisible) {
        SpawnLight({ x: pos.x + width, y: pos.y, z: pos.z }, velocity, colour, colour, time - 4 + Math.random() * 8);
        SpawnLight({ x: pos.x - width, y: pos.y, z: pos.z }, velocity, colour, colour, time - 4 + Math.random() * 8);
        SpawnLight({ x: pos.x, y: pos.y + width, z: pos.z }, velocity, colour, colour, time - 4 + Math.random() * 8);
        SpawnLight({ x: pos.x, y: pos.y - width, z: pos.z }, velocity, colour, colour, time - 4 + Math.random() * 8);
        SpawnLight({ x: pos.x, y: pos.y, z: pos.z + width }, velocity, colour, colour, time - 4 + Math.random() * 8);
        SpawnLight({ x: pos.x, y: pos.y, z: pos.z - width }, velocity, colour, colour, time - 4 + Math.random() * 8);
    }
    return shot;
}

var loopSubscription;
var isShowPlaying = false;
export function Play(testShot) {
    if (testShot === void 0) { testShot = false; }
    if (!isShowPlaying) {
        loopSubscription = context.subscribe("interval.tick", FireWorksLoop);
    }
    if (testShot)
        isShowPlaying = true;
}
export function Pause() {
    isShowPlaying = false;
}
export function Stop() {
    FireworksToBeShot = [];
    FireworksToExplode = [];
    FireworksToTrail = [];
    FireworksToCrackle = [];
    if (loopSubscription) {
        loopSubscription.dispose();
        loopSubscription = undefined;
        isShowPlaying = false;
    }
}
export function MakeLaunchedFireworks() {
    for (var i = 0; i < FireworksToExplode.length; i++) {
        var firework = FireworksToExplode[i];
        firework.timeTillExplode--;
        if (firework.timeTillExplode <= 0) {
            firework.Explode();
            FireworksToExplode.splice(i, 1);
            i--;
        }
    }
}
export function MakeContinousFireworks() {
    for (var i = 0; i < FireworksToTrail.length; i++) {
        var firework = FireworksToTrail[i];
        firework.timeLeft--;
        if (firework.timeLeft > 40)
            SpawnLight({ x: firework.particle.x + Math.random() * 6 - 3, y: firework.particle.y + Math.random() * 6 - 3, z: firework.particle.z + Math.random() * 6 - 3 }, { x: 0, y: 0, z: counterGravity1sec }, firework.colours.trail1Colour, firework.colours.trail2Colour, 40);
        if (firework.timeLeft == 0) {
            FireworksToTrail.splice(i, 1);
            i--;
        }
    }
    for (var i = 0; i < FireworksToCrackle.length; i++) {
        var crackle = FireworksToCrackle[i];
        if (crackle.delay > 0)
            crackle.delay--;
        else {
            crackle.timeLeft--;
            crackle.Make(crackle.posOri, { x: 0, y: 0, z: counterGravity1sec });
            if (crackle.timeLeft == 0) {
                FireworksToCrackle.splice(i, 1);
                i--;
            }
        }
    }
}
export function RunShowOrSequence() {
    while (FireworksToBeShot.length > 0 && fireworkTicks >= FireworksToBeShot[0].cumulativeTimeTillLight) {
        var scheduledEntry = FireworksToBeShot.shift();
        if (scheduledEntry.item instanceof Sequence) {
            var expandedShots = flattenScheduledEntryToShots(scheduledEntry);
            for (var index = 0; index < expandedShots.length; index++) {
                FireworksToBeShot.push(expandedShots[index]);
            }
            sortAndNormalizeShotQueue();
            continue;
        }
        var succes = scheduledEntry.item.Light();
        if (!succes) {
            return;
        }
    }
    tick();
    if (FireworksToBeShot.length == 0) {
        FireworksReset();
    }
}
//Main loop that makes fireworks work
export function FireWorksLoop() {
    MakeLaunchedFireworks();
    MakeContinousFireworks();
    if (isShowPlaying)
        RunShowOrSequence();
}
var FireworksReset = function () {
    /*FireworksToBeShot = FireWorksSequence.slice();
    fireworkTicks = -40 * 120;*/
};
