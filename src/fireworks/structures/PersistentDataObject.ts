//Base class for anything that needs to be saved in file
export abstract class PersistentDataObject {
    abstract readonly className: string;

    toParkData(): any {
        return {
            ...this,
            className: this.className
        };
    }
}
