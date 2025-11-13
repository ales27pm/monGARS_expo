/**
 * On-Device LLM controller that dynamically targets Apple's MLX runtime on iOS
 * while preserving the existing llama.rn fallback for other platforms.
 */

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";

import MLXModule, { MLXEventEmitter } from "../native-modules/MLXModule";

// Type definitions for llama.rn (to avoid importing the module at startup)
type LlamaContext = {
  completion: (options: any, callback?: (data: any) => void) => Promise<any>;
  embedding: (text: string) => Promise<{ embedding: number[] }>;
  release: () => Promise<void>;
  stopCompletion?: () => Promise<void>;
};

type LlamaModule = {
  initLlama: (options: any) => Promise<LlamaContext>;
  convertJsonSchemaToGrammar?: (schema: any) => string | Promise<string>;
};

const isIosMLX = Platform.OS === "ios";

// Lazy-load llama.rn to avoid NativeEventEmitter error on startup
let llamaModule: any = null;
let loadAttempted = false;
let loadError: Error | null = null;

async function getLlamaModule(): Promise<LlamaModule> {
  if (isIosMLX) {
    throw new Error("llama.rn backend disabled on iOS when MLX is available");
  }

  if (llamaModule) {
    return llamaModule as LlamaModule;
  }

  if (loadAttempted && loadError) {
    throw loadError;
  }

  loadAttempted = true;

  try {
    llamaModule = await import("llama.rn");
    return llamaModule as LlamaModule;
  } catch (error: any) {
    loadError = new Error(
      "llama.rn native module is not available. " +
        "This is expected in development/Vibecode environment. " +
        "The module will work after building with EAS Build. " +
        `Original error: ${error?.message || error}`,
    );
    console.warn("[OnDeviceLLM] Native module not available:", error?.message || error);
    throw loadError;
  }
}

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

export interface InferenceOptions {
  /** System prompt */
  systemPrompt?: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Temperature (0-2, default 0.7) */
  temperature?: number;

  /** Stop sequences */
  stop?: string[];

  /** Stream tokens as they are generated */
  stream?: boolean;

  /** Callback for streaming */
  onToken?: (token: string) => void;

  /** nucleus sampling */
  topP?: number;

  /** top-k sampling */
  topK?: number;

  /** repetition penalty */
  repeatPenalty?: number;
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

// Pre-configured models optimized for MLX runtime (used primarily for metadata)
export const RECOMMENDED_MODELS: ModelConfig[] = [
  {
    name: "Qwen2.5 0.5B Instruct",
    repo: "mlx-community/Qwen2.5-0.5B-Instruct-4bit",
    filename: "Qwen2.5-0.5B-Instruct-4bit",
    quantization: "4bit",
    sizeInMB: 450,
    recommended: true,
    description: "Fastest, smallest MLX model tuned for mobile devices.",
  },
  {
    name: "Qwen2.5 1.5B Instruct",
    repo: "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
    filename: "Qwen2.5-1.5B-Instruct-4bit",
    quantization: "4bit",
    sizeInMB: 1100,
    recommended: true,
    description: "Balanced quality and speed for on-device reasoning.",
  },
  {
    name: "Llama 3.2 1B Instruct",
    repo: "mlx-community/Llama-3.2-1B-Instruct-4bit",
    filename: "Llama-3.2-1B-Instruct-4bit",
    quantization: "4bit",
    sizeInMB: 900,
    recommended: false,
    description: "Meta's compact MLX port ideal for coding helpers.",
  },
  {
    name: "Qwen2.5 3B Instruct",
    repo: "mlx-community/Qwen2.5-3B-Instruct-4bit",
    filename: "Qwen2.5-3B-Instruct-4bit",
    quantization: "4bit",
    sizeInMB: 2200,
    recommended: false,
    description: "Premium quality with deeper context understanding.",
  },
];

export class OnDeviceLLM {
  private context: LlamaContext | null = null;
  private modelPath: string | null = null;
  private modelConfig: ModelConfig | null = null;
  private isInitialized: boolean = false;
  private sessionId: string | null = null;

  /**
   * Check if a model is already downloaded
   */
  async isModelDownloaded(config: ModelConfig): Promise<boolean> {
    if (isIosMLX) {
      // MLX downloads the model on-demand into its Hub cache.
      return true;
    }

    const path = this.getModelPath(config);
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  }

  /**
   * Download a model from HuggingFace (non-MLX fallback only)
   */
  async downloadModel(config: ModelConfig, onProgress?: (progress: ModelDownloadProgress) => void): Promise<string> {
    if (isIosMLX) {
      // MLX handles downloads internally; just trigger a load.
      await MLXModule.loadModel(config.repo);
      return config.repo;
    }

    const url = `https://huggingface.co/${config.repo}/resolve/main/${config.filename}`;
    const localPath = this.getModelPath(config);

    if (await this.isModelDownloaded(config)) {
      console.log("Model already downloaded:", localPath);
      return localPath;
    }

    const directory = FileSystem.documentDirectory + "models/";
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

    const downloadResumable = FileSystem.createDownloadResumable(url, localPath, {}, (downloadProgress) => {
      const progress: ModelDownloadProgress = {
        totalBytes: downloadProgress.totalBytesExpectedToWrite,
        downloadedBytes: downloadProgress.totalBytesWritten,
        progress: downloadProgress.totalBytesExpectedToWrite
          ? (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
          : 0,
      };

      onProgress?.(progress);
    });

    const result = await downloadResumable.downloadAsync();

    if (!result) {
      throw new Error("Download failed");
    }

    console.log("Model downloaded to:", result.uri);
    return result.uri;
  }

  /**
   * Initialize the model for inference
   */
  async initializeModel(
    config: ModelConfig,
    options: {
      gpuLayers?: number;
      contextSize?: number;
      useMemoryLock?: boolean;
      systemPrompt?: string;
    } = {},
  ): Promise<void> {
    if (isIosMLX) {
      await MLXModule.loadModel(config.repo);
      const sessionId = this.sessionId ?? `mlx-session-${Date.now()}`;
      await MLXModule.createChatSession(config.repo, sessionId, options.systemPrompt);
      this.sessionId = sessionId;
      this.modelConfig = config;
      this.isInitialized = true;
      return;
    }

    const { gpuLayers = 99, contextSize = 2048, useMemoryLock = true } = options;

    const modelPath = this.getModelPath(config);
    const isDownloaded = await this.isModelDownloaded(config);

    if (!isDownloaded) {
      throw new Error("Model not downloaded. Call downloadModel() first.");
    }

    const llama = await getLlamaModule();

    this.context = await llama.initLlama({
      model: modelPath,
      use_mlock: useMemoryLock,
      n_ctx: contextSize,
      n_gpu_layers: gpuLayers,
    });

    this.modelPath = modelPath;
    this.modelConfig = config;
    this.isInitialized = true;

    console.log("Model initialized successfully");
  }

  /**
   * Generate text completion
   */
  async complete(prompt: string, options: InferenceOptions = {}): Promise<string> {
    if (isIosMLX) {
      if (!this.modelConfig) {
        throw new Error("Model not initialized. Call initializeModel() first.");
      }

      const { maxTokens = 512, temperature = 0.7 } = options;

      const listeners: { remove: () => void }[] = [];

      if (options.stream && options.onToken) {
        const tokenListener = MLXEventEmitter.addListener("onTokenGenerated", (event) => {
          if (!event?.token) {
            return;
          }

          options.onToken?.(event.token as string);
        });

        listeners.push(tokenListener);
      }

      try {
        const result = await MLXModule.generate(this.modelConfig.repo, prompt, {
          maxTokens,
          temperature,
          topP: options.topP,
          topK: options.topK,
          repeatPenalty: options.repeatPenalty,
          stream: options.stream,
        });

        return result.text.trim();
      } finally {
        listeners.forEach((listener) => listener.remove());
      }
    }

    if (!this.context || !this.isInitialized) {
      throw new Error("Model not initialized. Call initializeModel() first.");
    }

    const { maxTokens = 512, temperature = 0.7, stop = [], stream = false, onToken } = options;

    const fullPrompt = options.systemPrompt
      ? `<|system|>\n${options.systemPrompt}\n<|user|>\n${prompt}\n<|assistant|>\n`
      : prompt;

    if (stream && onToken) {
      let result = "";

      const stopTokens = [...stop, "<|end|>", "</s>"];

      await this.context.completion(
        {
          prompt: fullPrompt,
          n_predict: maxTokens,
          temperature,
          stop: stopTokens,
        },
        (data) => {
          const token = data.token;
          result += token;
          onToken(token);
        },
      );

      return result.trim();
    } else {
      const response = await this.context.completion({
        prompt: fullPrompt,
        n_predict: maxTokens,
        temperature,
        stop: [...stop, "<|end|>", "</s>"],
      });

      return response.text.trim();
    }
  }

  /**
   * Chat-style inference (maintains conversation context)
   */
  async chat(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    options: InferenceOptions = {},
  ): Promise<string> {
    if (isIosMLX) {
      if (!this.modelConfig || !this.sessionId) {
        throw new Error("Model not initialized. Call initializeModel() first.");
      }

      const lastUserMessage = [...messages].reverse().find((msg) => msg.role === "user");
      if (!lastUserMessage) {
        throw new Error("No user message provided for chat inference");
      }

      const listeners: { remove: () => void }[] = [];

      if (options.stream && options.onToken) {
        const tokenListener = MLXEventEmitter.addListener("onTokenGenerated", (event) => {
          if (!event?.token) {
            return;
          }

          if (event.sessionId && event.sessionId !== this.sessionId) {
            return;
          }

          options.onToken?.(event.token as string);
        });

        listeners.push(tokenListener);
      }

      try {
        const result = await MLXModule.chatRespond(this.sessionId, lastUserMessage.content, {
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          topP: options.topP,
          topK: options.topK,
          repeatPenalty: options.repeatPenalty,
          stream: options.stream,
        });

        return result.text.trim();
      } finally {
        listeners.forEach((listener) => listener.remove());
      }
    }

    // Build llama-compatible prompt
    let prompt = "";

    for (const message of messages) {
      if (message.role === "system") {
        prompt += `<|system|>\n${message.content}\n`;
      } else if (message.role === "user") {
        prompt += `<|user|>\n${message.content}\n`;
      } else if (message.role === "assistant") {
        prompt += `<|assistant|>\n${message.content}\n`;
      }
    }

    prompt += "<|assistant|>\n";

    return this.complete(prompt, options);
  }

  /**
   * Generate embeddings (if model supports it)
   */
  async embed(text: string): Promise<number[]> {
    if (isIosMLX) {
      throw new Error("MLX embeddings are not yet supported");
    }

    if (!this.context || !this.isInitialized) {
      throw new Error("Model not initialized. Call initializeModel() first.");
    }

    const embeddings = await this.context.embedding(text);
    return embeddings.embedding;
  }

  /**
   * Release model from memory
   */
  async release(): Promise<void> {
    if (isIosMLX) {
      if (this.modelConfig) {
        try {
          await MLXModule.unloadModel(this.modelConfig.repo);
        } catch (error) {
          console.warn("[OnDeviceLLM] Failed to unload MLX model", error);
        }
      }
      this.sessionId = null;
      this.isInitialized = false;
      this.modelConfig = null;
      return;
    }

    if (this.context) {
      await this.context.release();
      this.context = null;
      this.isInitialized = false;
      console.log("Model released from memory");
    }
  }

  async stop(): Promise<void> {
    if (isIosMLX) {
      try {
        await MLXModule.stop();
      } catch (error) {
        console.warn("[OnDeviceLLM] Failed to stop MLX generation", error);
      }
      return;
    }

    if (this.context && typeof this.context.stopCompletion === "function") {
      try {
        await this.context.stopCompletion?.();
      } catch (error) {
        console.warn("[OnDeviceLLM] Failed to stop llama generation", error);
      }
    }
  }

  /**
   * Get model info
   */
  getModelInfo() {
    return {
      isInitialized: this.isInitialized,
      modelPath: this.modelPath,
      modelConfig: this.modelConfig,
    };
  }

  /**
   * Delete a downloaded model
   */
  async deleteModel(config: ModelConfig): Promise<void> {
    if (isIosMLX) {
      // Hub caches are managed by MLX; nothing to delete directly.
      return;
    }

    const path = this.getModelPath(config);

    if (await this.isModelDownloaded(config)) {
      await FileSystem.deleteAsync(path);
      console.log("Model deleted:", path);
    }
  }

  /**
   * List all downloaded models
   */
  async listDownloadedModels(): Promise<ModelConfig[]> {
    if (isIosMLX) {
      return RECOMMENDED_MODELS;
    }

    const downloaded: ModelConfig[] = [];

    for (const model of RECOMMENDED_MODELS) {
      if (await this.isModelDownloaded(model)) {
        downloaded.push(model);
      }
    }

    return downloaded;
  }

  async resetSession(systemPrompt?: string): Promise<void> {
    if (isIosMLX) {
      if (!this.modelConfig || !this.sessionId) {
        return;
      }

      await MLXModule.clearChatHistory(this.sessionId);
      await MLXModule.createChatSession(this.modelConfig.repo, this.sessionId, systemPrompt);
    }
  }

  /**
   * Get local path for a model
   */
  private getModelPath(config: ModelConfig): string {
    if (isIosMLX) {
      return `${FileSystem.documentDirectory ?? ""}mlx/${config.filename}`;
    }

    return FileSystem.documentDirectory + "models/" + config.filename;
  }

  /**
   * Get estimated memory usage for a model
   */
  getEstimatedMemoryUsage(config: ModelConfig): number {
    // Rough estimate: model size + 512MB for context
    return config.sizeInMB + 512;
  }
}

/**
 * Singleton instance for global use
 */
let globalLLM: OnDeviceLLM | null = null;

export function getGlobalLLM(): OnDeviceLLM {
  if (!globalLLM) {
    globalLLM = new OnDeviceLLM();
  }
  return globalLLM;
}

export function setGlobalLLM(instance: OnDeviceLLM | null): void {
  globalLLM = instance;
}
