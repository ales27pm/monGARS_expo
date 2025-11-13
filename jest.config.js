const path = require('node:path');

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.[tj]sx?$": [
      "babel-jest",
      {
        configFile: path.resolve(__dirname, 'babel.config.js'),
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(expo(nent)?|@expo(nent)?/.+|@expo/.+|react-native|@react-native/.+)/)',
  ],
  moduleNameMapper: {
    "^expo-file-system$": "<rootDir>/__mocks__/expo-file-system.ts",
    "^expo-device$": "<rootDir>/__mocks__/expo-device.ts",
    "^expo-crypto$": "<rootDir>/__mocks__/expo-crypto.ts",
    "^expo-secure-store$": "<rootDir>/__mocks__/expo-secure-store.ts",
    "^react-native$": "<rootDir>/__mocks__/react-native.ts",
  },
};
