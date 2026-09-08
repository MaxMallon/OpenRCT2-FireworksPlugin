import { flexible, groupbox, label, LayoutDirection } from "openrct2-flexui";
import { pluginVersion, pluginAuthor, downloadURL, downloadURLBreak } from "../../pluginInfo";
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
                        label({ text: "Special Thanks: Basssiiie, Manticore_007, TimmyTuner"})
                            
                    ]
                })
            ]
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
                        label({ text: "Special Thanks: Basssiiie, Manticore_007, \n                                         TimmyTuner", height: 24})
                            
                    ]
                })
            ]
        })
    ];
}
