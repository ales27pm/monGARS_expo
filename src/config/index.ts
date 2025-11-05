import Constants from "expo-constants";

/**
 * Get environment variable value
 * Works with Expo's Constants.expoConfig.extra
 */
export function getEnv(key: string): string | undefined {
  // Check Expo Constants first
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }

  // Fallback to process.env for compatibility
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }

  return undefined;
}
