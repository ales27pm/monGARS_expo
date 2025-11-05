import { getEnv } from "./index";

/**
 * Default model configuration for expo-llm-mediapipe
 * Using Gemma 2B quantized model for optimal on-device performance
 */
export const MODEL_CONFIG = {
  // MediaPipe compatible models (use .bin format, not GGUF)
  modelName: getEnv("MODEL_NAME") || "gemma-1.1-2b-it-gpu-int4.bin",
  modelUrl:
    getEnv("MODEL_URL") ||
    "https://huggingface.co/google/gemma-2b-it-gpu-int4/resolve/main/gemma-1.1-2b-it-gpu-int4.bin",

  // Generation parameters
  maxTokens: parseInt(getEnv("MAX_TOKENS") || "1024", 10),
  temperature: parseFloat(getEnv("TEMPERATURE") || "0.7"),
  topK: parseInt(getEnv("TOP_K") || "40", 10),
  randomSeed: parseInt(getEnv("RANDOM_SEED") || "42", 10),

  // Download settings
  checksum: getEnv("MODEL_CHECKSUM"),
};
