module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/__tests__/**/*.test.ts?(x)"],
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
  transformIgnorePatterns: [
    "node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@noble/hashes))",
    "node_modules/react-native-reanimated/plugin/",
    "node_modules/@react-native/babel-preset/"
  ],
};
