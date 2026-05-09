const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .sql files (for drizzle migrations)
// Remove sql from assetExts and add to sourceExts so it's treated as a module
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'sql');
config.resolver.sourceExts.push('sql');

module.exports = config;
