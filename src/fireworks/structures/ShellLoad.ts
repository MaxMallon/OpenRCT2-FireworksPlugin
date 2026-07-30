import { Load } from "./Load";

export class ShellLoad {
    public static readonly explodeAtEnd = -1;

    constructor(
        public loadName: string,
        public timeTillExplode: number = ShellLoad.explodeAtEnd, //Time since launch of shot.
        public particle: CrashedVehicleParticle | undefined = undefined,
        public runtimeLoad?: Load // Not persisted; used by the player for anonymous/inline loads
    ) { }

    toParkData(): any {
        return {
            className: "ShellLoad",
            loadName: this.loadName,
            timeTillExplode: this.timeTillExplode
        };
    }

    static fromParkData(shellLoad: any): ShellLoad {
        return new ShellLoad(String(shellLoad?.loadName ?? ""), shellLoad?.timeTillExplode ?? ShellLoad.explodeAtEnd);
    }

}