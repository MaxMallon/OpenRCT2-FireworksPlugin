import { Colour, flexible, graphics, groupbox, label, LayoutDirection } from "openrct2-flexui";
import { pluginVersion, pluginAuthor, downloadURL, downloadURLBreak } from "../../pluginInfo";
import { customImageFor } from "../../img/images";
export function createAboutTabForEditor()
{
    return [
        groupbox({
            text: "{WHITE}Fireworks Plugin",
            content: [
                flexible({
                    direction: LayoutDirection.Vertical,
                    content: [
                        label({ text: "Created by: {BABYBLUE}" + pluginAuthor }),
                        label({ text: "Version: " + pluginVersion}),
                        label({ text: "Download: " + downloadURL }),
                        label({ text: "Built with openrct2-flexui" }),
                        label({ text: "Special Thanks: Basssiiie, Manticore_007, TimmyTuner, In_Error_Predicting_A_Fault"})
                            
                    ]
                })
            ]
        }),
        graphics({
            width: 624,
            height: 270,
            onDraw: g => {
                g.colour = Colour.Void;
                g.box(0, 0, 624, 270)
                g.image(customImageFor("banner1"), 0, 0)
                g.image(customImageFor("banner2"), 250, 0)
                g.image(customImageFor("banner3"), 500, 0);
                //Thanks In_Error!
            }
        })
    ];
}

export function createAboutTabForPlayer()
{
    return [
        groupbox({
            text: "{WHITE}Fireworks Plugin",
            content: [
                flexible({
                    direction: LayoutDirection.Vertical,
                    content: [
                        label({ text: "Created by: {BABYBLUE}" + pluginAuthor }),
                        label({ text: "Version: " + pluginVersion }),
                        label({ text: "Download: " + downloadURLBreak, height: 24 }),
                        label({ text: "Built with openrct2-flexui" }),
                        label({ text: "Special Thanks: Basssiiie, Manticore_007, \n                                         TimmyTuner, In_Error_Predicting_A_Fault", height: 24}),                        
                    ]
                })
            ]
        })
    ];
}
