import {
    absolute,
    Bindable,
    button,
    compute,
    graphics,
    isStore,
    read,
    store,
    WidgetCreator,
    FlexiblePosition
} from "openrct2-flexui";

export interface ColouredButtonParams {
    text: Bindable<string>;
    colour: number;
    colourDark: number;
    colourLight: number;
    width: number;
    height: number;
    disabled?: Bindable<boolean>;
    pressed?: Bindable<boolean>;
    visibility?: Bindable<"visible" | "none">;
    onClick: () => void;
}

export function colouredButton(params: ColouredButtonParams): WidgetCreator<FlexiblePosition>
{
    const { text, colour, colourDark, colourLight, width, height, disabled, pressed, visibility, onClick } = params;
    const visStore = isStore(visibility) ? visibility : store(visibility ?? "visible");
    return absolute({
        width: compute(visStore, v => v === "none" ? 0 : width),
        height: compute(visStore, v => v === "none" ? 0 : height),
        content: [
            graphics({
                x: 0, y: 0,
                width: "100%", height: "100%",
                onDraw: g =>
                {
                    if (read(visibility ?? "visible") === "none") {
                        return;
                    }
                    const isPressed = read(pressed ?? false);
                    const isDisabled = read(disabled ?? false);

                    g.colour = isPressed ? isDisabled ? colourDark : colourLight : colourDark;
                    g.box(0, 0, width, height);
                    if (!isDisabled){
                        g.colour = isPressed ? colourDark : colourLight;
                        g.box(0, 0, width-2, height-2);
                        g.colour = colour;
                        g.box(1, 1, width-3, height-3);
                    }
                    const t = read(text);
                    const size = g.measureText(t);
                    g.text(t, Math.floor(width / 2 - size.width / 2), Math.floor(height / 2 - size.height / 2));
                }
            }),
            button({
                x: 0, y: 0,
                width: "100%", height: "100%",
                text: text,
                image: 2100000000,
                border: false,
                disabled,
                visibility,
                onClick
            })
        ]
    });
}
