import { Colour, flexible, label, LayoutDirection, tab } from "openrct2-flexui";
import { customImageFor } from "../img/images";
import { openPopupTabWindow } from "./popupWindows";


function createTutorialAboutTab() {
    const a1 =
        "Thank you for downloading the Fireworks plugin by MaxArceus!\n\n" +
        "This plugin allows you to create and manage fireworks shows in your park,\n" +
        "providing awide range of features and customization options.\n";
    const a2 =
        "The process can be quite daunting at first but this tutorial will guide you\n" +
        "through the basics and help you get started with creating your own fireworks\n" +
        "displays.\n\n" +
        "The tabs in this tutorial correspond to the tabs in the main Fireworks Editor\n" +
        "window and will provide you with an overview of each section and its";
    const a3 =
        "functionality. \n" +
        "Handily enough, the tabs are in the order that you will likely want to use them,\n" +
        "so you can follow along with the tutorial as you explore the plugin.\n\n";
    const a4 =
        "Everything is saved in the park file and can be shared with anyone who also\n" +
        "has the plugin. You can also open the parks without plugin safely but the\n" +
        "fireworks will not work then of course.";
    const a5 =
        "Before we begin, one word of advice, be aware that a proper fireworks show\n" +
        "takes a lot of time and patience to set up correctly, and also that the results\n" +
        "are well worth the wait!\n\n" +
        "See you in the next tab!";
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                label({ text: a1, height: 40, width: "1w" }),
                label({ text: a2, height: 56, width: "1w" }),
                label({ text: a3, height: 40, width: "1w" }),
                label({ text: a4, height: 40, width: "1w" }),
                label({ text: a5, height: 40, width: "1w" }),
            ]
        })
    ];
}

function createTutorialLaunchSitesTab() {
    const ls1 =
        "Before you can start creating fireworks, you will need to set up the launch\n" +
        "sites in the park.\n\n" +
        "Launch sites are the locations from which you can fire the fireworks,\n" +
        "think of them as the big cardboard boxes with tubes that you might have\n";
    const ls2 =
        "seen on New Year's Eve and other similar celebrations.\n\n" +
        "On the left panel you can see the options to define a new launch site while\n" +
        "the panel on the right shows the list of already defined launch sites.\n\n";
    const ls3 =
        "When you make a new launch site don't forget to pick a good name. If you\n" +
        "don't pick names, you'll just end up with a list of 'Site 1', 'Site 2' etc.,\n" +
        "which isn't the clearest for finding back which is which later.\n\n";
    const ls4 =
        "The launch sites can be placed either on a fixed location, or be attached to\n" +
        "an entity, such a ride vehicle. The Pick On Map button allows you to select a\n" +
        "location in the park by clicking, or selecting the entity by clicking on it.\n\n";
    const ls5 =
        "If you do not click on an entity, the location will be set to the middle of\n" +
        "the tile at the land surface height. You can use the XYZ spinners and arrow\n" +
        "buttons to fine tune the location.\n\n";
    const ls6 =
        "If you accidentally clicked an entity or no longer wish it to be linked,\n" +
        "the unfollow button will detach the launch site from the entity. When you\n" +
        "do follow an entity, the coordinates can be set to be relative to the entity,\n" +
        "such as '20 units above'.";
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                label({ text: ls1, height: 48, width: "1w" }),
                label({ text: ls2, height: 40, width: "1w" }),
                label({ text: ls3, height: 40, width: "1w" }),
                label({ text: ls4, height: 40, width: "1w" }),
                label({ text: ls5, height: 40, width: "1w" }),
                label({ text: ls6, height: 40, width: "1w" }),
            ]
        })
    ];
}

function createTutorialLoadsTab() {
    const lo1 =
        "Now the fun begins! This is where you can define the loads for in shells,\n" +
        "which will likely be the bulk of your show.\n"+
        "A load is a collection of effects that will be fired upwards together in a shell,\n" +
        "to create more complex effects in the sky.\n\n";
    const lo2 =
        "Much like the launch sites tab, the left panel is where you can define a new\n" +
        "load, while the right panel shows the list of already defined loads, with an\n" +
        "additional search-field now as this list is likely to grow large. Once again,\n";
    const lo3 =
        "remember to name your items for your own sake!\n\n" +
        "With the add-effect dropdown you can add various effects to the load. Each\n" +
        "will spawn their own window with shape, size and colour settings for that\n" +
        "specific effect. Each effect window has a '?' button for explanations.\n\n";
    const lo4 =
        "The listview will show you the various effects you've added in a load. Of\n" +
        "course you'll want to test out how it looks, which is precisely what the\n" +
        "Test Load button is for.\n\n";
    const lo5 =
        "Beware of adding too many, or too large effects to a load as there's a hard\n" +
        "cap of 3200 misc entities in the park, which includes things besides\n" +
        "fireworks, such as balloons and money effects.\n\n";
    const lo6 =
        "Keep that in mind when creating your loads, and fireworks in general as it's\n" +
        "very easy to hit that limit.\n\n" +
        "To help keep track of what the firework is doing, the plugin has a debug\n";
    const lo7 =
        "button that opens window listing the current number of particles and various\n" +
        "other useful stats.\n" +
        "Another useful thing to know is untracked particles with the invisible colour\n" +
        "will not be spawned at all, to save the budget.\n\n" +
        "You can remove unwanted effects with the delete mode, which works similar \n" +
        "to the 'quick fire staff'.";
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                label({ text: lo1, height: 40, width: "1w" }),
                label({ text: lo2, height: 26, width: "1w" }),
                label({ text: lo3, height: 48, width: "1w" }),
                label({ text: lo4, height: 40, width: "1w" }),
                label({ text: lo5, height: 26, width: "1w" }),
                label({ text: lo6, height: 36, width: "1w" }),
                label({ text: lo7, height: 40, width: "1w" }),
            ]
        })
    ];
}

function createTutorialShellsTab() {
    const sh1 =
        "In the shells tab it's time to actually launch a load from a launch site,\n" +
        "how exciting!\n\n" +
        "You know the drill by now, left is the editor, right is the list, and give\n" +
        "your shells proper names!\n\n";
    const sh2 =
        "A shell NEEDS a load, as what are you even firing otherwise. The main load\n" +
        "can be selected with the button, and be chosen from the loads you've\n" +
        "previously defined.\n\n";
    const sh3 =
        "A shell can also have additional loads, 'Ascend Loads', which will be set off\n" +
        "on the way up with a certain delay. This is optional, and only recommended for\n" +
        "the largest of main loads and high up shells, if you're going for realism\n" +
        "anyway.\n\n";
    const sh4 =
        "A shell needs to be assigned to a launch site, from where it will be fired.\n\n" +
        "At the bottom of the left panel you will find several settings that\n" +
        "determine how the shell is fired.\n\n";
    const sh5 =
        "It's possible for the shell to leave a trail, the colours of which can be\n" +
        "chosen as well as how thick and dense it is. The colour of the shell itself\n" +
        "can be chosen, too.";
    const sh6 =
        "Small shells are represented by a single particle, but for bigger shells you\n" +
        "may want to use the 'Big head type' to instead have a small cluster of\n" +
        "particle represent the shell.\n\n";
    const sh7 =
        "By default shells fire straight up but you can choose to fire them at an\n" +
        "angle using Tilt and Azimuth. Tilt is the angle from straight up (0) to 45\n" +
        "degrees diagonally up, and azimuth is the direction in which the shell will\n" +
        "be fired in degrees.\n\n";
    const sh8 =
        "Lastly, the shell will be given a height, and delay. In most cases these\n" +
        "should be the same, (the sync check keeps them in sync), but you may choose\n" +
        "to separate them. Height is how many game ticks it takes the shell to reach\n";
    const sh9 =
        "its max height before falling back down, basically it's the launch speed,\n" +
        "while delay is how long until the main load is set off.\n"+
        "The random value will randomly adjust the trajectory params by a percentage.\n" +
        "There are some preset buttons to give a quick preset for the launch params,\n"+
        "they do not affect the loads.";
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                label({ text: sh1, height: 48, width: "1w" }),
                label({ text: sh2, height: 40, width: "1w" }),
                label({ text: sh3, height: 46, width: "1w" }),
                label({ text: sh4, height: 36, width: "1w" }),
                label({ text: sh5, height: 26, width: "1w" }),
                label({ text: sh6, height: 40, width: "1w" }),
                label({ text: sh7, height: 40, width: "1w" }),
                label({ text: sh8, height: 26, width: "1w" }),
                label({ text: sh9, height: 40, width: "1w" }),
            ]
        })
    ];
}

function createTutorialGroundEffectsTab() {
    const ge1 =
        "While shells form the spectacle of any given show, ground effects form the\n" +
        "supporting backbone role, like the bassist in band. The ground effects tab is\n" +
        "similar to both shells and loads.\n\n"+
        " Left is the editor, right is the list. Rmember to name your ground effects.\n\n";
    const ge2 =
        "Since ground effects are not fired up, you can add effects directly in a\n" +
        "ground effect and assign a launch site to them. The effects available here\n" +
        "differ from the ones in loads as these ones are suited for lighting on the\n" +
        "ground.\n\n";
    const ge3 =
        "Unlike shells, which pop once and are over then, some ground effects can\n" +
        "last a while, continuously emitting sparks.\n" +
        "Much like in the previous tabs, you can call the debugger, test out what\n" +
        "you made, and delete unwanted effects.";
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                label({ text: ge1, height: 56, width: "1w" }),
                label({ text: ge2, height: 46, width: "1w" }),
                label({ text: ge3, height: 40, width: "1w" }),
            ]
        })
    ];
}

function createTutorialSequenceTab() {
    const seq1 =
        "Sequences are the very core of this plugin.\n\n" +
        "The basic concept is quite easy, it's just a list of shells and ground effects\n" +
        "to be lit at a certain time\n" +
        "However, sequences can also contain other sequences to build up parts of\n" +
        "your show, and reuse certain combinations more easily.\n\n";
    const seq2 =
        "(A sequence cannot contain itself.)\n\n" +
        "Once more the left panel is the editor, and the right panel the list.\n" +
        "Naming is still important, even here.\n\n" +
        "You begin your first sequence by adding a shell or ground effect.";
    const seq3 =
        "You will notice three input fields and two different 'add' buttons, as well as\n" +
        "two little 'lock' checkmarks above sequence listview.\n" +
        "This can get tricky, so read carefully.\n\n" +
        "You can either add items AT a certain time, or some delay AFTER a certain item\n" +
        "already in the list.\n\n";
    const seq4 =
        "If the index field is left empty, it will simply take the last item of the list.\n" +
        "The time fields both work with the format of '2m30s20t', two minutes,\n" +
        "30 seconds, 20 ticks, or any combination of those.\n"+
        "You could just say '60 ticks' for 1.5 seconds,'1m' for 1 minute for example,\n" +
        "or simply '0' to fire it simultaneously with the previous.";
    const seq5 =
        "Say you already have a short list of items, and the last item is at 10s.\n" +
        "Now you add an item 2s after the last, it will naturally be at 12s.\n" +
        "Now say you add another item AT 11s afterwards.\n" + 
        "Now the behaviour of the lock will become important, as it determines\n" +
        "whether the time values, or the delay values are kept true.";
    const seq6 =
        "If you lock the delay, since the last item was at 12s, and had a delay\n" +
        "of 2 seconds, it will see that there's now the new item at 11 seconds,\n" +
        "and so a delay of 2 seconds from there will shift the time to 13 seconds.\n" +
        "Had you added it with the lock on time, the item would have stayed at\n" +
        "12 seconds, and had its delay updated to 1 second.";
    const seq7 =
        "This allows to either insert and shift the rest of the sequence forward,\n" +
        "or insert and merge. If you add an item after another item with a delay greater\n"+
        "than an already existing item after the index you're adding after, that is\n" +
        "possible, but it will mean your new item does not appear directly after the\n"+
        "index you selected, but rather wherever it fits chronologically.";
    const seq8 = 
        "Since sequences have a duration, when you add one to another sequence, you\n"+
        "can choose how the 'add after' button should behave for it.\n" +
        "A future item can either be added after the very start of the sub-sequence,\n"+
        "or after the last item of the sub-sequence.\n" +
        "In the listview this is indicated with the 'Next After' column.";
    const seq9 = 
        "It's always possible to add items to fire during a sub-sequence through the\n" +
        "'add at' button however. If sub sequence was set to be 'next after end', and you\n" +
        "insert something in the middle, essentially you get a negative delay time.\n"+
        "As this would look confusing, it will instead say 0. \n\n";
    const seq10 =  
        "Lastly there's a button to fully expand or collapse the sequence tree.\n" +
        "It's possible but not recommended to edit in the expanded view, but it can be\n" +
        "useful to get a better grasp on what sequences in sequences in sequences in..\n"+
        "look like when in the actual show.";
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                label({ text: seq1, height: 56, width: "1w" }),
                label({ text: seq2, height: 56, width: "1w" }),
                label({ text: seq3, height: 56, width: "1w" }),
                label({ text: seq4, height: 56, width: "1w" }),
                label({ text: seq5, height: 50, width: "1w" }),
                label({ text: seq6, height: 50, width: "1w" }),
                label({ text: seq7, height: 50, width: "1w" }),
                label({ text: seq8, height: 50, width: "1w" }),
                label({ text: seq9, height: 44, width: "1w" }),
                label({ text: seq10, height: 44, width: "1w" }),
            ]
        })
    ];
}

function createTutorialShowTab() {
    const show1 =
        "Congrats on making it all the way here! Unless you skipped, that is, then\n" +
        "you need to go back!\n\n" +
        "The hard work is done. A show is basically a sequence with some extra bells\n" +
        "and whistles.\n\n";
    const show2 =
        "One final time, the left panel is the editor, and right the list of shows,\n" +
        "and whether they're active.\n" +
        "The show needs a sequence, the master-sequence if you will.\n\n";
    const show3 =
        "A show is basically a recurring sequence, where you set the schedule to\n" +
        "certain days of the year, or repeating it monthly, weekly (or even daily?),\n" +
        "or simply every so many minutes.\n\n";
    const show4 =
        "About 1 minute, or 5 in game days before a show starts, a news message will\n" +
        "appear, and another one as the show begins. Their messages are customizable,\n" +
        "how fun! Leaving them empty will skip them.\n\n";
    const show5 =
        "When a show starts, it can be made to be synced up with a ride's music.\n" +
        "Select a ride from the list, and right as the show starts, it will start\n" +
        "playing its ride music from the start, assuming the ride is opened and not\n" +
        "broken down.\n\n";
    const show6 =
        "Normally when a sequence fails to launch a shell due to the particle limit\n" +
        "having been hit, it will delay the shell a frame, until it can be fired\n" +
        "again. This interruption would break the music syncronisation, so for a\n";
    const show7 =
        "show you can choose to instead skip failed effects entirely. Of course,\n" +
        "it's best to design  your show to not hit the limit to begin with.\n\n" +
        "To test the music-sync specifally, you can use the 'Test Show Now' button.\n";
    const show8 =
        "Once you're ready to start your show(s) select them one by one in the list,\n" +
        "and enabled them with the 'Selected Show: Disabled/Enabled' button.\n" +
        "A green Y will appear next to the show indicating it is enabled.\n" +
        "Then all that's left is to press the big 'Start Show Programme' button.\n" +
        "Doing this will close the editor and instead open the show-playing window,\n";
    const show9 =
        "where you can see when the scheduled shows, and of course the stop button,\n" +
        "to go back to the editor.";
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                label({ text: show1, height: 50, width: "1w" }),
                label({ text: show2, height: 30, width: "1w" }),
                label({ text: show3, height: 30, width: "1w" }),
                label({ text: show4, height: 30, width: "1w" }),
                label({ text: show5, height: 40, width: "1w" }),
                label({ text: show6, height: 26, width: "1w" }),
                label({ text: show7, height: 36, width: "1w" }),
                label({ text: show8, height: 46, width: "1w" }),
                label({ text: show9, height: 40, width: "1w" }),
            ]
        })
    ];
}

function createTutorialConfigTab() {
    const cfg1 =
        "This final tab is the configuration tab. In here you can create\n" +
        "Colour-sequences, which are used by some effects such as the spray burst.\n" +
        "The plugin comes preloaded with a bunch, but you're free to adjust or \n" +
        "remove them, and encouraged to create your own.\n\n";
    const cfg2 =
        "Define the colours from left to right, pick a name, and be sure to set the\n" +
        "number correctly.\n\n" +
        "On the right you will find several buttons. You may delete all defined data,\n" +
        "which does exactly what it says.\n\n";
    const cfg3 =
        "You can also export and import data, which allows you to move your creations\n" +
        "to other parks. Of course, the launch sites will not match up between parks\n" +
        "and may land underground, or in the air.\n\n";
    const cfg4 =
        "Lastly there's the tutorial button, which opens the very window you're\n" +
        "currently reading. You can always open it up again for some help!";
    return [
        flexible({
            direction: LayoutDirection.Vertical,
            content: [
                label({ text: cfg1, height: 40, width: "1w" }),
                label({ text: cfg2, height: 50, width: "1w" }),
                label({ text: cfg3, height: 30, width: "1w" }),
                label({ text: cfg4, height: 40, width: "1w" }),
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
        title: "Fireworks - Tutorial",
        width: 420,
        height: 330,
        colours: [Colour.DarkBlue, Colour.OliveDark],
        position: "center",
        padding: 8,
        startingTab: 0,
        tabs: [
            tab({
                onOpen: () => {resizeTutorialWindow(420, 330) },
                image: { frameBase: 5367, frameCount: 8, frameDuration: 4 },
                content: createTutorialAboutTab()
            }),
            tab({
                onOpen: () => { resizeTutorialWindow(420, 350)},
                image: customImageFor("launchSiteTab"),
                content: createTutorialLaunchSitesTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(420, 380) },
                image: customImageFor("loadTab"),
                content: createTutorialLoadsTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(420, 440) },
                image: customImageFor("shellTab"),
                content: createTutorialShellsTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(420, 220) },
                image: customImageFor("groundEffectTab"),
                content: createTutorialGroundEffectsTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(420, 610) },
                image: customImageFor("sequenceTab"),
                content: createTutorialSequenceTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(420, 410) },
                image: customImageFor("showTab"),
                content: createTutorialShowTab()
            }),
            tab({
                onOpen: () => {resizeTutorialWindow(420, 250) },
                image: { frameBase: 5201, frameCount: 4, frameDuration: 4 },
                content: createTutorialConfigTab()
            }),
        ]
    });
}