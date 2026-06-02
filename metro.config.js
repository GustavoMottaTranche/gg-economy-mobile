const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for .sql files (for drizzle migrations)
// Remove sql from assetExts and add to sourceExts so it's treated as a module
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'sql');
config.resolver.sourceExts.push('sql');

// Exclude android/build directories inside node_modules from Metro's file watcher
// These are stale Gradle build artifacts that crash the watcher
config.watcher = {
  ...config.watcher,
  additionalExts: config.watcher?.additionalExts || [],
};
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : config.resolver.blockList ? [config.resolver.blockList] : []),
  /node_modules\/.*\/android\/build\/.*/,
];

module.exports = config;
