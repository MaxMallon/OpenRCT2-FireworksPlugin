# OpenRCT2 Fireworks Plugin

A plugin for OpenRCT2 that allows you create and run your own firework shows, and easily share them with others.

The plugin provides an editor for creating your own fireworks and combining them into fully timed and schedulable shows which can even be synced up with a ride's music. Your fireworks data is saved in the park, including shows that are currently playing, so parks can be shared with other players who have the plugin installed. A park with fireworks actively playing during saving will have a news message inserted to inform possible future players opening the file without the plugin that this park includes fireworks, and where to get the plugin.

The plugin is currently single-player only. Multiplayer support is not technically feasible at this time.

## Features

- Create aerial and ground-based fireworks for sequences and shows.
- Fifteen different base effects, all highly customizable
- Combine effects into larger fireworks with controls for shape, size, trajectory, and colour.
- Build reusable sequences, including sequences nested inside other sequences.
- Schedule shows by date or at repeating daily, weekly, monthly, or timed intervals.
- Synchronize a show with a ride's music.
- Save fireworks data in park files so it can travel with a park.
- Export and import fireworks data for reuse in other parks.
- Use the built-in tutorial and debugger while designing shows.
- Temporarily switch to the default colour palette when an unusual park palette makes the editor difficult to read.

## Installation

1. Make sure OpenRCT2 is up to date. The plugin requires the minimum OpenRCT2 version of 0.5.6 (which at the time of writing this isn't released yet, so the latest development version).
2. Download the `FireWorks.js` plugin file from the [latest release](https://github.com/MaxMallon/OpenRCT2-FireworksPlugin/releases).
3. Copy `FireWorks.js` into the `plugin` folder in your [OpenRCT2 user directory](#openrct2-user-directory).
4. Start OpenRCT2 and open a scenario or saved park.
5. Long-click the map icon to open the plugin list, then select **Fireworks**.

The first time you open the editor, the built-in tutorial will open automatically. It can also be opened later from the configuration tab.

## Getting Started

The plugin has two modes: **edit mode** and **play mode**.

In **edit mode**, the Fireworks Editor is available. This is where you create launch sites, effects, sequences, and shows, test your work, and configure the plugin. A new park normally opens in edit mode, and the first time you open the editor the built-in tutorial opens automatically. You can open the tutorial again at any time from the configuration tab.

In **play mode**, the editor is replaced by the show-playing window. This window is intended for parks that already have a fireworks programme configured: it shows which shows are active and when scheduled shows will run, and provides the button to stop the programme.

This distinction matters when opening somebody else's park. If the park was saved while a fireworks show programme was active, it will open in play mode and you will not see the editor. Stop the show programme from the show-playing window first; once the programme has stopped, the editor will be available again. Parks can still be opened safely by players who do not have the plugin, but the fireworks will not run for them.

When creating a show from scratch, work through the editor from left to right. The tabs follow the order in which you will usually build a show: define where fireworks launch, create the effects, combine them into shells and ground effects, arrange those items in sequences, and finally schedule the sequences as shows.

### Launch Sites

Before creating fireworks, define at least one launch site. Launch sites are the locations from which fireworks are fired, similar to the cardboard boxes with tubes used for real-world fireworks. Give each site a descriptive name so it is easy to find later instead of relying on names such as `Site 1` and `Site 2`.

Use **Pick On Map** to choose a location or attach the site to an entity such as a ride vehicle. If no entity is selected, the launch site is placed at the middle of the chosen tile at the land surface height. The coordinate controls and arrow buttons can then be used to fine-tune its position.

When a site follows an entity, its coordinates can be relative to that entity, such as a position 20 units above it. Use the unfollow control to detach a site if you selected the wrong entity or no longer want it to move with one.

### Loads

A load is a collection of effects that are fired together inside a shell. Loads are usually the main building blocks of the spectacle: each effect contributes its own shape, size, and colour settings, and several effects can be combined to make a more complex burst.

Add effects with the effect selector, then configure them in the effect window that opens. The `?` button in an effect window explains the settings for that effect. Give loads descriptive names, use **Test Load** to preview them, and remove unwanted effects with delete mode.

Keep an eye on the particle budget while building loads. Large loads with many effects can reach OpenRCT2's particle limit quickly; the debugger is available while testing to help you measure this.

### Shells

A shell launches a load from a launch site. Every shell needs a main load and a launch site. A shell can also have optional ascend loads that trigger while it is rising; these are most useful for larger shells or high-altitude effects.

Shell settings include:

- Trail colour, thickness, and density.
- Shell colour and head type.
- Tilt and azimuth for angled launches.
- Launch height and delay before the main load is triggered.
- Random variation for the launch trajectory.

Tilt is the angle away from straight up, while azimuth controls the direction around the map. Height controls how long the shell takes to reach its highest point, and delay controls how long it waits before triggering the main load. These values are normally kept synchronized, but they can be separated when a particular effect needs different launch and burst timing. The preset launch buttons provide a quick starting point and do not change the shell's loads.

### Ground Effects

Ground effects are fired directly from a launch site rather than into the sky. They are useful for supporting a show with effects at ground level, and are configured in much the same way as loads and shells: create a named item, add effects, test it, and remove unwanted effects when needed.

The available ground effects differ from the effects used in loads because they are designed for ground-level use. Some emit continuously for a period of time instead of ending after one burst.

### Sequences

A sequence is a timed list of shells and ground effects. Start by adding an item, then add later items either at an absolute time or after another item with a specified delay. Time values accept combinations such as `2m30s20t`, where `t` is a game tick. For example, `60t` is roughly 1.5 seconds and `1m` is one minute.

Sequences can contain other sequences, which makes it possible to build and reuse sections of a show. A sequence cannot contain itself. When adding an item, the index controls which existing item it follows; leaving the index empty adds it after the last item.

The time and delay locks control how existing items move when something is inserted. Locking **Delay** preserves the delay after an item and shifts later items forward when necessary. Locking **Time** preserves the absolute time and updates the affected delay instead. This makes it possible either to insert an item and move the rest of a section, or to insert one into an existing time slot without shifting the rest of the show.

Because a sequence has a duration, an item added after a nested sequence can be placed after the start or after the end of that nested sequence. Use the expanded view to inspect the complete sequence tree when needed, although editing is usually clearer in the collapsed view.

### Shows

A show is a scheduled sequence. Select the sequence to play and choose when it should run, including specific dates or repeating schedules such as daily, weekly, monthly, or every few minutes. Shows can display customizable news messages before and when they begin; leave a message blank to skip it.

Shows can also be synchronized with a ride's music. Select an operating ride and its music will start from the beginning when the show starts, provided the ride is open and not broken down. When particle limits would otherwise interrupt synchronization, a show can skip failed effects instead of delaying them. This avoids shifting the fireworks out of sync, but designing the show to stay below the particle limit is still preferable. Use **Test Show Now** to test the music synchronization.

Enable the shows you want to run in the list, then start the show programme. The show-playing window displays the active schedule and provides the button to stop the programme and return to the editor.

### Configuration

The configuration tab contains tools and settings that apply to the editor as a whole. It is also where you can create and manage colour sequences. A colour sequence is an ordered list of colours that can be reused by effects that support them, such as spray bursts. The plugin includes several colour sequences by default, but you can create your own, rename them, change the colours from left to right, adjust the number of colours, or remove sequences you no longer need.


Use the import and export controls to move your fireworks data between parks. This is useful for reusing effects, loads, shells, sequences, shows, and colour sequences. Launch sites are tied to the map and do not transfer meaningfully between parks, so imported launch sites may appear underground or in the air and should be repositioned.

The configuration tab also has the **Tutorial** button. It opens the in-game tutorial again whenever you need a reminder about a tab or workflow, even after the tutorial's automatic first opening.

## Debugger and Particle Limits

OpenRCT2 has a hard limit of 3,200 miscellaneous entities at one time. This pool is shared by the crashed-vehicle particles which form the fireworks and other effects, including balloons, litter, money effects, ducks, explosions, steam-train smoke, and water splashes.

The debugger helps keep a show within that limit. It records the number of particles attempted, successful spawns, failed spawns, and affected fireworks. Testing a firework or sequence resets the debugger and begins a new measurement. A failed shell launch is also counted as delayed or skipped according to the show's settings.

For the best results, keep loads reasonably small and account for other particle effects already active in the park. Untracked particles using the invisible colour are not spawned, which can help conserve the particle budget.

### Colour Palette Mode

Some custom park palettes make the editor difficult or impossible to read. The plugin can temporarily switch the park to the default palette while the editor is open, while remembering the park's original palette.

Palette mode can be controlled manually from the configuration tab. In automatic mode, the default palette is enabled when the editor opens and restored when you test a firework or close the editor.

## FAQ

### I cannot see any effects. What is wrong?

You may be zoomed too far out. Particles are visible only on the lower three zoom levels.

### Why are parts of my effects missing?

The park may have reached the 3,200-particle limit. Fireworks share this limit with litter, balloons, and other miscellaneous entities.

### I clicked Test, but I cannot see my load.

The editor window may be blocking the view. Move it and test again.

### How can I delay the rest of a sequence when the times are not editable?

Set the sequence lock to **Delay**, add a new item with a large delay immediately before the section you want to move, then set the lock back to **Time** and delete the temporary item. The rest of the sequence remains shifted forward. To undo the change, reverse those steps.


## (Sort of) Planned Features

- Additional firework effects.
- Sound effects.
- A non-sandbox mode with costs, ride integration, excitement bonuses, and guests gathering to watch.
- More suitable particles.
- Maybe one day multiplayer support.

## Example Park

An example park featuring a lake and a small coaster is included in the project materials when available.

## Building the Plugin

### Prerequisites

- The latest LTS version of [Node.js](https://nodejs.org/), including npm.
- A local copy of this repository.

### Setup

1. Open a terminal in the repository root.
2. Install dependencies:

	```sh
	npm install
	```

3. Build the plugin in development mode:

	```sh
	npm run build:dev
	```

The development build is readable and is written directly to the OpenRCT2 plugin folder as `FireWorks.js`.

### Build Commands

`npm run build:dev` builds a readable development version in the OpenRCT2 plugin folder.

`npm run build` creates an optimized release build in `dist/`. The release build is minified with Terser and is intended for sharing.

`npm start` watches the `src/` directory and runs the development build whenever a TypeScript or JavaScript file changes.

### Hot Reloading

OpenRCT2 supports hot reloading during development:

1. Open `config.ini` in your [OpenRCT2 user directory](#openrct2-user-directory).
2. Set `enable_hot_reloading = true`.
3. Run `npm start` from this repository.
4. Start OpenRCT2 and load a park.
5. Save a file in `src/`.

The watcher will rebuild the plugin, and OpenRCT2 will reload the changed plugin file.

## Accessing Game Logs

Game logs are useful when the plugin does not load or when you need to inspect output from `console.log`.

### Windows

Open the `openrct2.com` file in the [OpenRCT2 installation directory](#openrct2-installation-directory). If file extensions are hidden, [enable them in Windows](https://support.microsoft.com/en-us/windows/common-file-name-extensions-in-windows-da4a4430-8e76-89c5-59f7-1cdbbc75cb01) first.

### macOS

Open a terminal, navigate to the [OpenRCT2 installation directory](#openrct2-installation-directory), and run:

```sh
open OpenRCT2.app/Contents/MacOS/OpenRCT2
```

## OpenRCT2 Directories

### OpenRCT2 Installation Directory

This is where the game itself is installed.

- **Windows:** commonly `%LocalAppData%/OpenRCT2/bin/` when using the launcher, or `C:/Program Files/OpenRCT2/` when using an installer.
- **macOS:** the folder containing `OpenRCT2.app`.
- **Linux:** distribution-dependent, commonly `/usr/share/openrct2` or a mounted AppImage location.

### OpenRCT2 User Directory

This is where OpenRCT2 stores user data such as saved parks and plugins.

- **Windows:** commonly `Documents/OpenRCT2/` or `C:/Users/<YOUR NAME>/Documents/OpenRCT2/`.
- **macOS:** `/Users/<YOUR NAME>/Library/Application Support/OpenRCT2/`.
- **Linux:** commonly `/home/<YOUR NAME>/.config`, `$HOME/.config`, or the directory specified by `XDG_CONFIG_HOME`.

The user directory can also be opened from OpenRCT2 by selecting **Open custom content folder** in the menu under the red toolbox on the main screen.

## License

This project is licensed under the [MIT License](LICENSE).





[title]
OpenRCT2 Fireworks Plugin

[Oneliner]
A plugin for OpenRCT2 that allows you create and run your own firework shows, and easily share them with others.

This plugin provides an editor for creating your own fireworks and combining them into fully timed and schedulable shows which can even synced up with a ride's music. There are currently 14 different effects, each with endless customization option for size, shape and colours. Everything you make is automatically saved in the park, even actively playing shows! If you share your park with someone else, they'll see it all as long as they have the plugin too. Every park saved while fireworks are playing will save with a news message informing the park was made with fireworks and where to get the plugin, so that anyone without the plugin opening the park will know what they're missing, and how to watch it too. 
You can also save your fireworks to local storage, and import it again in a different park if you want to re-use certain fireworks you've made before!
The fireworks plugin is currently single-player only. It's not technically feasible right now to make it work on multiplayer.

[Installation]
Make sure that your OpenRCT2 version is up-to-date. You need at least version [latest].
Go to the releases page and download the file fireworks-1.0.js from release 1.0.
Save it in the plugin subfolder of your OpenRCT2 user directory.\ On Windows, this is usually at C:Users\{User}\Documents\OpenRCT2\plugin.\ 
Start OpenRCT2 and open a scenario or save. Long-click the map icon to list your plugins, and click on "Fireworks". If this is the first time that you use this plug-in when you open the editor, it will open the tutorial too.

[Tutorial]
All info of this tutorial is available in the plugin itself, too, by going to the config tab (with the gears), and clicking the tutorial button. The first time opening the editor will auto-open the tutorial as well.

The plugin has two main states, the edit mode, and play mode. If you open someone else's park who already made a fireworks show, the park will likely be in the play-mode. New files will always start in the edit mode. 
In the edit mode you can use the fireworks editor to create your own effects, sequences, and shows. The window in play mode merely shows the shows playing and when they'll next play. This tutorial is about the editor. 

Creating a fireworks show takes quite a lot of time and effort, but it's a logical set of steps.
-[Launch Sites] //basically fill this with info from the tutorialwindow
-[Loads]
-[Shells]
-[Ground Effects]
-[Sequences]
-[Shows]
-[Other]

-[Debugger]
The debugger shows you various stats about particles. The game has a hard limit of 3200 particles at a time. This includes balloons, litter, money effects, ducks, explosions, smoke puffs from steam trains, water splashes and crashed vehicle particles. For the best firework show you'll want to minimize the other categories. The count the debugger shows is only the crashed vehicle particles. 
Every time you hit test on a firework or sequence, the debugger will reset, and start keeping track of how many particles were spawned, and how often it failed to spawn one due to the limit being hit. If the particle that failed to spawn was a shell being shot up, it will also count towards either fireworks skipped, or delayed, based on the setting of the show. You can use these statistics to help keep your show under the 3200 limit. 
--Colour palettes
Some people like to create parks with impossible to use colour palettes, I would know, I'm one of them. If for whatever reason you want to use fireworks in such a park, you would face the challenge of using the editor while you possibly can't even read text at all. To circumvent this there's the option to temporarily switch to the default palette. The plugin will remember what your true palette was, and you can put it back at any time with the manual buttons. 
To make things easier, there's an automatic mode. If you enable it, it will switch to the default palette whenever the editor window is opened. It will switch back to the true palette every time you test a firework, or when you close the editor.

[FAQ]
-Pallete issue
-q why can't I see any effects? -a You may be too zoomed out to see the particles. They are only visible on the lower three zoom levels.
-q why are my effects missing parts? -a You've likely hit the particle limit. You can only have up to 3200 miscelelanious entities at a time, the particles used by fireworks share this pool with litter, balloons, and other such particles.
-q I hit test, why can't I see my load? -a Perhaps the editor window is blocking the view?
-q How can I delay the rest of a sequence if I can't edit the times? -a Set the lock to delay, enter a new element with a big delay right in front of the section you want delayed, set the lock to time, and delete the new item again. The rest of the sequence will remain shifted forwards. To undo, just do the reverse.

[Planned Features]
-More Effects
-Sounds
-non-sandbox mode, cost for fireworks, ride integration, excitment bonuses, peeps spawning to come watch
-why not multiplayer

[How to build plugin yourself]
//a shorter version of the current stuff about npm run etc


Example park: Lake with a small coaster