import { isKorean, localizedMetric, t } from "../localization";
import { Colour, flexible, label, LayoutDirection, tab } from "openrct2-flexui";
import { customImageFor } from "../img/images";
import { openPopupTabWindow } from "./popupWindows";

function tutorialLabel(text: string, englishHeight: number)
{
    const koreanHeight = text.split("\n").filter(line => line.trim().length > 0).length * 15 + 4;
    return label({ text, height: isKorean() ? koreanHeight : englishHeight, width: "1w" });
}

function createTutorialAboutTab() {
    const a1 =
        t("Thank you for downloading the Fireworks plugin by MaxArceus!\n\nThis plugin allows you to create and manage fireworks shows in your park,\nproviding awide range of features and customization options.\n");
    const a2 =
        t("The process can be quite daunting at first but this tutorial will guide you\nthrough the basics and help you get started with creating your own fireworks\ndisplays.\n\nThe tabs in this tutorial correspond to the tabs in the main Fireworks Editor\nwindow and will provide you with an overview of each section and its");
    const a3 =
        t("functionality. \nHandily enough, the tabs are in the order that you will likely want to use them,\nso you can follow along with the tutorial as you explore the plugin.\n\n");
    const a4 =
        t("Everything is saved in the park file and can be shared with anyone who also\nhas the plugin. You can also open the parks without plugin safely but the\nfireworks will not work then of course.");
    const a5 =
        t("Before we begin, one word of advice, be aware that a proper fireworks show\ntakes a lot of time and patience to set up correctly, and also that the results\nare well worth the wait!\n\nSee you in the next tab!");
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                tutorialLabel(a1, 40),
                tutorialLabel(a2, 56),
                tutorialLabel(a3, 40),
                tutorialLabel(a4, 40),
                tutorialLabel(a5, 40),
            ]
        })
    ];
}

function createTutorialLaunchSitesTab() {
    const ls1 =
        t("Before you can start creating fireworks, you will need to set up the launch\nsites in the park.\n\nLaunch sites are the locations from which you can fire the fireworks,\nthink of them as the big cardboard boxes with tubes that you might have\n");
    const ls2 =
        t("seen on New Year's Eve and other similar celebrations.\n\nOn the left panel you can see the options to define a new launch site while\nthe panel on the right shows the list of already defined launch sites.\n\n");
    const ls3 =
        t("When you make a new launch site don't forget to pick a good name. If you\ndon't pick names, you'll just end up with a list of 'Site 1', 'Site 2' etc.,\nwhich isn't the clearest for finding back which is which later.\n\n");
    const ls4 =
        t("The launch sites can be placed either on a fixed location, or be attached to\nan entity, such a ride vehicle. The Pick On Map button allows you to select a\nlocation in the park by clicking, or selecting the entity by clicking on it.\n\n");
    const ls5 =
        t("If you do not click on an entity, the location will be set to the middle of\nthe tile at the land surface height. You can use the XYZ spinners and arrow\nbuttons to fine tune the location.\n\n");
    const ls6 =
        t("If you accidentally clicked an entity or no longer wish it to be linked,\nthe unfollow button will detach the launch site from the entity. When you\ndo follow an entity, the coordinates can be set to be relative to the entity,\nsuch as '20 units above'.");
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                tutorialLabel(ls1, 48),
                tutorialLabel(ls2, 40),
                tutorialLabel(ls3, 40),
                tutorialLabel(ls4, 40),
                tutorialLabel(ls5, 40),
                tutorialLabel(ls6, 40),
            ]
        })
    ];
}

function createTutorialLoadsTab() {
    const lo1 =
        t("Now the fun begins! This is where you can define the loads for in shells,\nwhich will likely be the bulk of your show.\nA load is a collection of effects that will be fired upwards together in a shell,\nto create more complex effects in the sky.\n\n");
    const lo2 =
        t("Much like the launch sites tab, the left panel is where you can define a new\nload, while the right panel shows the list of already defined loads, with an\nadditional search-field now as this list is likely to grow large. Once again,\n");
    const lo3 =
        t("remember to name your items for your own sake!\n\nWith the add-effect dropdown you can add various effects to the load. Each\nwill spawn their own window with shape, size and colour settings for that\nspecific effect. Each effect window has a '?' button for explanations.\n\n");
    const lo4 =
        t("The listview will show you the various effects you've added in a load. Of\ncourse you'll want to test out how it looks, which is precisely what the\nTest Load button is for.\n\n");
    const lo5 =
        t("Beware of adding too many, or too large effects to a load as there's a hard\ncap of 3200 misc entities in the park, which includes things besides\nfireworks, such as balloons and money effects.\n\n");
    const lo6 =
        t("Keep that in mind when creating your loads, and fireworks in general as it's\nvery easy to hit that limit.\n\nTo help keep track of what the firework is doing, the plugin has a debug\n");
    const lo7 =
        t("button that opens window listing the current number of particles and various\nother useful stats.\nAnother useful thing to know is untracked particles with the invisible colour\nwill not be spawned at all, to save the budget.\n\nYou can remove unwanted effects with the delete mode, which works similar \nto the 'quick fire staff'.");
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                tutorialLabel(lo1, 40),
                tutorialLabel(lo2, 26),
                tutorialLabel(lo3, 48),
                tutorialLabel(lo4, 40),
                tutorialLabel(lo5, 26),
                tutorialLabel(lo6, 36),
                tutorialLabel(lo7, 40),
            ]
        })
    ];
}

function createTutorialShellsTab() {
    const sh1 =
        t("In the shells tab it's time to actually launch a load from a launch site,\nhow exciting!\n\nYou know the drill by now, left is the editor, right is the list, and give\nyour shells proper names!\n\n");
    const sh2 =
        t("A shell NEEDS a load, as what are you even firing otherwise. The main load\ncan be selected with the button, and be chosen from the loads you've\npreviously defined.\n\n");
    const sh3 =
        t("A shell can also have additional loads, 'Ascend Loads', which will be set off\non the way up with a certain delay. This is optional, and only recommended for\nthe largest of main loads and high up shells, if you're going for realism\nanyway.\n\n");
    const sh4 =
        t("A shell needs to be assigned to a launch site, from where it will be fired.\n\nAt the bottom of the left panel you will find several settings that\ndetermine how the shell is fired.\n\n");
    const sh5 =
        t("It's possible for the shell to leave a trail, the colours of which can be\nchosen as well as how thick and dense it is. The colour of the shell itself\ncan be chosen, too.");
    const sh6 =
        t("Small shells are represented by a single particle, but for bigger shells you\nmay want to use the 'Big head type' to instead have a small cluster of\nparticle represent the shell.\n\n");
    const sh7 =
        t("By default shells fire straight up but you can choose to fire them at an\nangle using Tilt and Azimuth. Tilt is the angle from straight up (0) to 45\ndegrees diagonally up, and azimuth is the direction in which the shell will\nbe fired in degrees.\n\n");
    const sh8 =
        t("Lastly, the shell will be given a height, and delay. In most cases these\nshould be the same, (the sync check keeps them in sync), but you may choose\nto separate them. Height is how many game ticks it takes the shell to reach\n");
    const sh9 =
        t("its max height before falling back down, basically it's the launch speed,\nwhile delay is how long until the main load is set off.\nThe random value will randomly adjust the trajectory params by a percentage.\nThere are some preset buttons to give a quick preset for the launch params,\nthey do not affect the loads.");
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                tutorialLabel(sh1, 48),
                tutorialLabel(sh2, 40),
                tutorialLabel(sh3, 46),
                tutorialLabel(sh4, 36),
                tutorialLabel(sh5, 26),
                tutorialLabel(sh6, 40),
                tutorialLabel(sh7, 40),
                tutorialLabel(sh8, 26),
                tutorialLabel(sh9, 40),
            ]
        })
    ];
}

function createTutorialGroundEffectsTab() {
    const ge1 =
        t("While shells form the spectacle of any given show, ground effects form the\nsupporting backbone role, like the bassist in band. The ground effects tab is\nsimilar to both shells and loads.\n\n Left is the editor, right is the list. Remember to name your ground effects.\n\n");
    const ge2 =
        t("Since ground effects are not fired up, you can add effects directly in a\nground effect and assign a launch site to them. The effects available here\ndiffer from the ones in loads as these ones are suited for lighting on the\nground.\n\n");
    const ge3 =
        t("Unlike shells, which pop once and are over then, some ground effects can\nlast a while, continuously emitting sparks.\nMuch like in the previous tabs, you can call the debugger, test out what\nyou made, and delete unwanted effects.");
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                tutorialLabel(ge1, 56),
                tutorialLabel(ge2, 46),
                tutorialLabel(ge3, 40),
            ]
        })
    ];
}

function createTutorialSequenceTab() {
    const seq1 =
        t("Sequences are the very core of this plugin.\n\nThe basic concept is quite easy, it's just a list of shells and ground effects\nto be lit at a certain time\nHowever, sequences can also contain other sequences to build up parts of\nyour show, and reuse certain combinations more easily.\n\n");
    const seq2 =
        t("(A sequence cannot contain itself.)\n\nOnce more the left panel is the editor, and the right panel the list.\nNaming is still important, even here.\n\nYou begin your first sequence by adding a shell or ground effect.");
    const seq3 =
        t("You will notice three input fields and two different 'add' buttons, as well as\ntwo little 'lock' checkmarks above sequence listview.\nThis can get tricky, so read carefully.\n\nYou can either add items AT a certain time, or some delay AFTER a certain item\nalready in the list.\n\n");
    const seq4 =
        t("If the index field is left empty, it will simply take the last item of the list.\nThe time fields both work with the format of '2m30s20t', two minutes,\n30 seconds, 20 ticks, or any combination of those.\nYou could just say '60 ticks' for 1.5 seconds,'1m' for 1 minute for example,\nor simply '0' to fire it simultaneously with the previous.");
    const seq5 =
        t("Say you already have a short list of items, and the last item is at 10s.\nNow you add an item 2s after the last, it will naturally be at 12s.\nNow say you add another item AT 11s afterwards.\nNow the behaviour of the lock will become important, as it determines\nwhether the time values, or the delay values are kept true.");
    const seq6 =
        t("If you lock the delay, since the last item was at 12s, and had a delay\nof 2 seconds, it will see that there's now the new item at 11 seconds,\nand so a delay of 2 seconds from there will shift the time to 13 seconds.\nHad you added it with the lock on time, the item would have stayed at\n12 seconds, and had its delay updated to 1 second.");
    const seq7 =
        t("This allows to either insert and shift the rest of the sequence forward,\nor insert and merge. If you add an item after another item with a delay greater\nthan an already existing item after the index you're adding after, that is\npossible, but it will mean your new item does not appear directly after the\nindex you selected, but rather wherever it fits chronologically.");
    const seq8 = 
        t("Since sequences have a duration, when you add one to another sequence, you\ncan choose how the 'add after' button should behave for it.\nA future item can either be added after the very start of the sub-sequence,\nor after the last item of the sub-sequence.\nIn the listview this is indicated with the 'Next After' column.");
    const seq9 = 
        t("It's always possible to add items to fire during a sub-sequence through the\n'add at' button however. If sub sequence was set to be 'next after end', and you\ninsert something in the middle, essentially you get a negative delay time.\nAs this would look confusing, it will instead say 0. \n\n");
    const seq10 =  
        t("Lastly there's a button to fully expand or collapse the sequence tree.\nIt's possible but not recommended to edit in the expanded view, but it can be\nuseful to get a better grasp on what sequences in sequences in sequences in..\nlook like when in the actual show.");
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                tutorialLabel(seq1, 56),
                tutorialLabel(seq2, 56),
                tutorialLabel(seq3, 56),
                tutorialLabel(seq4, 56),
                tutorialLabel(seq5, 50),
                tutorialLabel(seq6, 50),
                tutorialLabel(seq7, 50),
                tutorialLabel(seq8, 50),
                tutorialLabel(seq9, 44),
                tutorialLabel(seq10, 44),
            ]
        })
    ];
}

function createTutorialShowTab() {
    const show1 =
        t("Congrats on making it all the way here! Unless you skipped, that is, then\nyou need to go back!\n\nThe hard work is done. A show is basically a sequence with some extra bells\nand whistles.\n\n");
    const show2 =
        t("One final time, the left panel is the editor, and right the list of shows,\nand whether they're active.\nThe show needs a sequence, the master-sequence if you will.\n\n");
    const show3 =
        t("A show is basically a recurring sequence, where you set the schedule to\ncertain days of the year, or repeating it monthly, weekly (or even daily?),\nor simply every so many minutes.\n\n");
    const show4 =
        t("About 1 minute, or 5 in game days before a show starts, a news message will\nappear, and another one as the show begins. Their messages are customizable,\nhow fun! Leaving them empty will skip them.\n\n");
    const show5 =
        t("When a show starts, it can be made to be synced up with a ride's music.\nSelect a ride from the list, and right as the show starts, it will start\nplaying its ride music from the start, assuming the ride is opened and not\nbroken down.\n\n");
    const show6 =
        t("Normally when a sequence fails to launch a shell due to the particle limit\nhaving been hit, it will delay the shell a frame, until it can be fired\nagain. This interruption would break the music syncronisation, so for a\n");
    const show7 =
        t("show you can choose to instead skip failed effects entirely. Of course,\nit's best to design  your show to not hit the limit to begin with.\n\nTo test the music-sync specifally, you can use the 'Test Show Now' button.\n");
    const show8 =
        t("Once you're ready to start your show(s) select them one by one in the list,\nand enabled them with the 'Selected Show: Disabled/Enabled' button.\nA green Y will appear next to the show indicating it is enabled.\nThen all that's left is to press the big 'Start Show Programme' button.\nDoing this will close the editor and instead open the show-playing window,\n");
    const show9 =
        t("where you can see when the scheduled shows, and of course the stop button,\nto go back to the editor.");
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                tutorialLabel(show1, 50),
                tutorialLabel(show2, 30),
                tutorialLabel(show3, 30),
                tutorialLabel(show4, 30),
                tutorialLabel(show5, 40),
                tutorialLabel(show6, 26),
                tutorialLabel(show7, 36),
                tutorialLabel(show8, 46),
                tutorialLabel(show9, 40),
            ]
        })
    ];
}

function createTutorialConfigTab() {
    const cfg1 =
        t("This final tab is the configuration tab. In here you can create\nColour-sequences, which are used by some effects such as the spray burst.\nThe plugin comes preloaded with a bunch, but you're free to adjust or \nremove them, and encouraged to create your own.\n\n");
    const cfg2 =
        t("Define the colours from left to right, pick a name, and be sure to set the\nnumber correctly.\n\nOn the right you will find several buttons. You may delete all defined data,\nwhich does exactly what it says.\n\n");
    const cfg3 =
        t("You can also export and import data, which allows you to move your creations\nto other parks. Of course, the launch sites will not match up between parks\nand may land underground, or in the air.\n\n");
    const cfg4 =
        t("Lastly there's the tutorial button, which opens the very window you're\ncurrently reading. You can always open it up again for some help!");
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                tutorialLabel(cfg1, 40),
                tutorialLabel(cfg2, 50),
                tutorialLabel(cfg3, 30),
                tutorialLabel(cfg4, 40),
            ]
        })
    ];
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tutorialWindowHandle: any;

export function resizeTutorialWindow(width: number, height: number): void {
    const native = tutorialWindowHandle?.D;
    if (native) {
        native.minHeight = height;
        native.maxHeight = height;
        native.minWidth = width;
        native.maxWidth = width;
        native.width = width;
        native.height = height;
        native.minWidth = width; //Without doing it double, it doesn't work.
        native.maxWidth = width;        
        native.minHeight = height;
        native.maxHeight = height;
    }
}

export function openTutorialWindow(): void {
    if (typeof ui === "undefined") return;

    tutorialWindowHandle = openPopupTabWindow("tutorial", {
        title: t("Fireworks - Tutorial"),
        width: localizedMetric(420, 620),
        height: localizedMetric(330, 371),
        colours: [Colour.DarkBlue, Colour.OliveDark],
        position: "center",
        padding: 8,
        startingTab: 0,
        tabs: [
            tab({
                onOpen: () => {resizeTutorialWindow(localizedMetric(420, 620), localizedMetric(330, 371)) },
                image: { frameBase: 5367, frameCount: 8, frameDuration: 4 },
                content: createTutorialAboutTab()
            }),
            tab({
                onOpen: () => { resizeTutorialWindow(localizedMetric(420, 620), localizedMetric(350, 363))},
                image: customImageFor("launchSiteTab"),
                content: createTutorialLaunchSitesTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(localizedMetric(420, 620), localizedMetric(380, 452)) },
                image: customImageFor("loadTab"),
                content: createTutorialLoadsTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(localizedMetric(420, 620), localizedMetric(440, 511)) },
                image: customImageFor("shellTab"),
                content: createTutorialShellsTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(localizedMetric(420, 620), localizedMetric(220, 232)) },
                image: customImageFor("groundEffectTab"),
                content: createTutorialGroundEffectsTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(localizedMetric(420, 620), localizedMetric(610, 678)) },
                image: customImageFor("sequenceTab"),
                content: createTutorialSequenceTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(localizedMetric(420, 620), localizedMetric(410, 490)) },
                image: customImageFor("showTab"),
                content: createTutorialShowTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(localizedMetric(420, 620), localizedMetric(250, 265)) },
                image: { frameBase: 5201, frameCount: 4, frameDuration: 4 },
                content: createTutorialConfigTab()
            }),
        ]
    });
}
