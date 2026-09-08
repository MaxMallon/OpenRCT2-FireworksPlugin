import { startup } from "./startup";
import { pluginVersion, pluginName, pluginAuthor } from "./pluginInfo";

registerPlugin({
	name: pluginName,
	version: pluginVersion,
	authors: [ pluginAuthor ],
	type: "remote",
	licence: "MIT",
	/**
	 * This field determines which OpenRCT2 API version to use. It's best to always use the
	 * latest release version, unless you want to use specific versions from a newer develop
	 * version.
	 * @see https://github.com/OpenRCT2/OpenRCT2/blob/v0.5.0/src/openrct2/scripting/ScriptEngine.h#L45
	 */
	targetApiVersion: 122,
	main: startup,
});