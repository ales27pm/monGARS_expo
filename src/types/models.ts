import { Platform } from "react-native";

/**
 * Type definitions for on-device ML models
 * This file contains only types, no imports from native modules
 */

export interface ModelConfig {
  /** Model name (for display) */
  name: string;

  /** HuggingFace repository ID */
  repo: string;

  /** Filename in the repository */
  filename: string;

  /** Quantization level (Q4_0, Q4_K_M, Q5_K_M, etc.) */
  quantization: string;

  /** Estimated size in MB */
  sizeInMB: number;

  /** Recommended for device capabilities */
  recommended?: boolean;

  /** Description */
  description?: string;
}

export interface ModelDownloadProgress {
  /** Total bytes to download */
  totalBytes: number;

  /** Bytes downloaded so far */
  downloadedBytes: number;

  /** Progress percentage (0-100) */
  progress: number;

  /** Download speed in bytes/sec */
  speed?: number;
}

// Pre-configured models optimized for mobile
const IOS_MODELS: ModelConfig[] = [
  {
    name: "Qwen2.5 0.5B Instruct",
    repo: "mlx-community/Qwen2.5-0.5B-Instruct-4bit",
    filename: "Qwen2.5-0.5B-Instruct-4bit",
    quantization: "4bit",
    sizeInMB: 450,
    recommended: true,
    description: "Fastest MLX-compatible assistant for on-device inference.",
  },
  {
    name: "Qwen2.5 1.5B Instruct",
    repo: "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
    filename: "Qwen2.5-1.5B-Instruct-4bit",
    quantization: "4bit",
    sizeInMB: 1100,
    recommended: true,
    description: "Balanced quality and speed for most modern iOS devices.",
  },
  {
    name: "Llama 3.2 1B Instruct",
    repo: "mlx-community/Llama-3.2-1B-Instruct-4bit",
    filename: "Llama-3.2-1B-Instruct-4bit",
    quantization: "4bit",
    sizeInMB: 900,
    recommended: false,
    description: "Meta's compact assistant tuned for MLX on Apple Silicon.",
  },
  {
    name: "Qwen2.5 3B Instruct",
    repo: "mlx-community/Qwen2.5-3B-Instruct-4bit",
    filename: "Qwen2.5-3B-Instruct-4bit",
    quantization: "4bit",
    sizeInMB: 2200,
    recommended: false,
    description: "Premium reasoning quality for devices with 6GB+ RAM.",
  },
];

const DEFAULT_MODELS: ModelConfig[] = [
  {
    name: "Llama 3.2 1B Instruct",
    repo: "ggml-org/Llama-3.2-1B-Instruct-GGUF",
    filename: "Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    quantization: "Q4_K_M",
    sizeInMB: 730,
    recommended: true,
    description: "Best balance of quality and speed for most devices",
  },
  {
    name: "Qwen2 0.5B Instruct",
    repo: "Qwen/Qwen2-0.5B-Instruct-GGUF",
    filename: "qwen2-0_5b-instruct-q4_k_m.gguf",
    quantization: "Q4_K_M",
    sizeInMB: 326,
    recommended: true,
    description: "Fastest, smallest - great for older devices",
  },
  {
    name: "SmolLM2 1.7B Instruct",
    repo: "HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF",
    filename: "smollm2-1.7b-instruct-q4_k_m.gguf",
    quantization: "Q4_K_M",
    sizeInMB: 1100,
    recommended: false,
    description: "Higher quality, requires more RAM",
  },
  {
    name: "Phi-3 Mini 3.8B",
    repo: "microsoft/Phi-3-mini-4k-instruct-gguf",
    filename: "Phi-3-mini-4k-instruct-q4.gguf",
    quantization: "Q4_0",
    sizeInMB: 2300,
    recommended: false,
    description: "Highest quality, requires 6GB+ RAM",
  },
];

export const RECOMMENDED_MODELS: ModelConfig[] = Platform.OS === "ios" ? IOS_MODELS : DEFAULT_MODELS;
