import { Colour } from "openrct2-flexui";
export let spawnedParticlesCount: number = 0;
export let launchedShotsCount: number = 0;
export let delayedShotsCount: number = 0;
export let skippedShotsCount: number = 0;
export let skippedParticlesCount: number = 0;

//Spawn a light for fireworks
export function SpawnLight(
    pos: CoordsXYZ,
    velocity: CoordsXYZ,
    colour0: Colour,
    colour1: Colour,
    time: number,
    frame?: number
): CrashedVehicleParticle | null {
    const boom = map.createEntity("crashed_vehicle_particle", pos) as CrashedVehicleParticle | null;
    if (boom) {
        spawnedParticlesCount++;    
        boom.timeToLive = Math.max(1, Math.floor(time));
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
    skippedParticlesCount++;
    return null;
}

//spawn big ball of lights, return center one.
export function SpawnLightCluster(
    pos: CoordsXYZ,
    velocity: CoordsXYZ,
    colour: Colour,
    time: number,
    width: number
): CrashedVehicleParticle | null {
    const shot = SpawnLight(pos, velocity, colour, colour, time); //middle
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

export function ResetCounts(): void {
    spawnedParticlesCount = 0;
    launchedShotsCount = 0;
    delayedShotsCount = 0;
    skippedShotsCount = 0;
    skippedParticlesCount = 0;
}

export function IncrementDelayedShotsCount(): void {
    delayedShotsCount++;
}
export function IncrementSkippedShotsCount(): void {
    skippedShotsCount++;
}
export function IncrementLaunchedShotsCount(): void {
    launchedShotsCount++;
}