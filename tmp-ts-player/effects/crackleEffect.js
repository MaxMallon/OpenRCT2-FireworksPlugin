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
import { Effect, EffectType, tileSize, counterGravity1sec, zScaleOffset } from "../structures";
import { AddFireworkToCrackle, SpawnLight } from "../player";
var CrackleEffect = /** @class */ (function (_super) {
    __extends(CrackleEffect, _super);
    function CrackleEffect(size, physicalSize, delay, colour, extraLongevity, fullDuration, timeLeft, posOri, addedSelf) {
        if (fullDuration === void 0) { fullDuration = extraLongevity + 8 * physicalSize; }
        if (timeLeft === void 0) { timeLeft = fullDuration; }
        if (posOri === void 0) { posOri = { x: 0, y: 0, z: 0 }; }
        if (addedSelf === void 0) { addedSelf = false; }
        var _this = _super.call(this, EffectType.Crackle, size, physicalSize, 0, 0) || this;
        _this.delay = delay;
        _this.colour = colour;
        _this.fullDuration = fullDuration;
        _this.timeLeft = timeLeft;
        _this.posOri = posOri;
        _this.addedSelf = addedSelf;
        return _this;
    }
    CrackleEffect.prototype.Make = function (posOri, _velocity) {
        if (!this.addedSelf) {
            AddFireworkToCrackle(this);
            this.addedSelf = true;
        }
        this.posOri = posOri;
        for (var j = 0; j < 2 * this.physicalSize; j++) {
            var theta = Math.random() * 2 * Math.PI;
            var phi = Math.acos(2 * Math.random() - 1);
            var x3 = Math.sin(phi) * Math.cos(theta);
            var y3 = Math.sin(phi) * Math.sin(theta);
            var z3 = Math.cos(phi);
            var x = posOri.x + x3 * tileSize * this.physicalSize * 0.8 * (((this.fullDuration - this.timeLeft) + this.delay) / (this.delay + this.fullDuration));
            var y = posOri.y + y3 * tileSize * this.physicalSize * 0.8 * (((this.fullDuration - this.timeLeft) + this.delay) / (this.delay + this.fullDuration));
            var z = posOri.z + z3 * tileSize * this.physicalSize * 0.8 * (((this.fullDuration - this.timeLeft) + this.delay) / (this.delay + this.fullDuration)) * zScaleOffset;
            x -= 0.5 * ((this.fullDuration - this.timeLeft) + this.delay);
            y -= 0.5 * ((this.fullDuration - this.timeLeft) + this.delay);
            z += this.delay * 2.5;
            SpawnLight({ x: x, y: y, z: z }, { x: 0, y: 0, z: counterGravity1sec }, this.colour, this.colour, 5);
        }
        return undefined;
    };
    return CrackleEffect;
}(Effect));
export { CrackleEffect };
