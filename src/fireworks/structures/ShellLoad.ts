import { Load } from "./Load";
import { PersistentDataObject } from "./PersistentDataObject";

export class ShellLoad extends PersistentDataObject {
    readonly className: string = "ShellLoad";
    public static readonly explodeAtEnd = -1;

    constructor(
        public loadName: string,
        public timeTillExplode: number = ShellLoad.explodeAtEnd, //Time since launch of shot.
        public particle: CrashedVehicleParticle | undefined = undefined,
        public runtimeLoad?: Load // Not persisted; used by the player for anonymous/inline loads
    ) {
        super();
    }

    override toParkData(): any {
        return {
            ...super.toParkData(),
            particle: undefined,
            runtimeLoad: undefined
        };
    }

    static fromParkData(shellLoad: any): ShellLoad {
        return new ShellLoad(String(shellLoad?.loadName ?? ""), shellLoad?.timeTillExplode ?? ShellLoad.explodeAtEnd);
    }

}