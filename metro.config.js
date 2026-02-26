const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Required for Firebase SDK to resolve the correct React Native bundle
// Without 'react-native' condition, Metro picks the browser ESM build
// which uses browser APIs (window, etc.) unavailable in Hermes.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
    'require',
    'default',
    'react-native',
];

module.exports = config;
