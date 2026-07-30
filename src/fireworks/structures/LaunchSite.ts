export class LaunchSite
{
    constructor(
        public name: string, 
        public position: CoordsXYZ,
        public entityId: number | undefined
    ) {}

    toParkData(): any {
        return {
            className: "LaunchSite",
            name: this.name,
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            entityId: this.entityId
        };
    }

    static fromParkData(site: any): LaunchSite {
        const position = site?.position ?? { x: 0, y: 0, z: 0 };
        return new LaunchSite(String(site?.name ?? ""), { x: position.x, y: position.y, z: position.z }, site?.entityId);
    }
}
