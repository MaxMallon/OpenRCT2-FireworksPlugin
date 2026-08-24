import { flexible, groupbox, label, LayoutDirection } from "openrct2-flexui";
import { pluginVersion, pluginAuthor } from "../../pluginInfo";
export function createAboutTab()
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
                        label({ text: "https://github.com/MaxMallon/OpenRCT2-FireworksPlugin" }),
                        label({ text: "Built with openrct2-flexui" }),
                        label({ text: "Special Thanks: Basssiiie, Manticore_007, TimmyTuner"})
                            
                    ]
                })
            ]
        })
    ];
}
