const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/dist/metro");

const config = getDefaultConfig(__dirname);

// This is the line that sends the "Data" to NativeWind
module.exports = withNativeWind(config, { input: "./global.css" });