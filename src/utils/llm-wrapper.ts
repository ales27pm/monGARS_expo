/**
 * Safe wrapper for on-device LLM that prevents native module crashes
 * In Vibecode/development, this returns stub implementations
 * In production (after EAS build), this loads the real implementation
 */

// Check if we're in a development/Vibecode environment
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

/**
 * Get the LLM instance - returns null in development to prevent crashes
 */
export async function getOnDeviceLLM() {
  if (isDevelopment) {
    // In development, return null to prevent native module loading
    return null;
  }

  try {
    // In production, dynamically load the real implementation
    const { getGlobalLLM } = await import("./on-device-llm");
    return getGlobalLLM();
  } catch (error) {
    console.warn("[LLM Wrapper] Failed to load native module:", error);
    return null;
  }
}

/**
 * Check if on-device LLM is available
 */
export function isLLMAvailable(): boolean {
  return !isDevelopment;
}
