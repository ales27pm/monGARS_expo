/**
 * On-Device LLM Inference with llama.rn
 * Privacy-first, fully offline language model
 *
 * Supports GGUF models from HuggingFace
 */

import { initLlama, LlamaContext, convertJsonSchemaToGrammar } from "llama.rn";
import * as FileSystem from "expo-file-system";

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
export const RECOMMENDED_MODELS: ModelConfig[] = [
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

export class OnDeviceLLM {
  private context: LlamaContext | null = null;
  private modelPath: string | null = null;
  private modelConfig: ModelConfig | null = null;
  private isInitialized: boolean = false;

  /**
   * Check if a model is already downloaded
   */
  async isModelDownloaded(config: ModelConfig): Promise<boolean> {
    const path = this.getModelPath(config);
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  }

  /**
   * Download a model from HuggingFace
   */
  async downloadModel(
    config: ModelConfig,
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<string> {
    const url = `https://huggingface.co/${config.repo}/resolve/main/${config.filename}`;
    const localPath = this.getModelPath(config);

    // Check if already downloaded
    if (await this.isModelDownloaded(config)) {
      console.log("Model already downloaded:", localPath);
      return localPath;
    }

    // Ensure directory exists
    const directory = FileSystem.documentDirectory + "models/";
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

    // Create download resumable
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localPath,
      {},
      (downloadProgress) => {
        const progress: ModelDownloadProgress = {
          totalBytes: downloadProgress.totalBytesExpectedToWrite,
          downloadedBytes: downloadProgress.totalBytesWritten,
          progress:
            (downloadProgress.totalBytesWritten /
              downloadProgress.totalBytesExpectedToWrite) *
            100,
        };

        onProgress?.(progress);
      }
    );

    // Download
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
      /** Number of GPU layers (0 = CPU only, 99 = all layers) */
      gpuLayers?: number;

      /** Context size (default 2048) */
      contextSize?: number;

      /** Use memory lock (recommended for mobile) */
      useMemoryLock?: boolean;
    } = {}
  ): Promise<void> {
    const { gpuLayers = 99, contextSize = 2048, useMemoryLock = true } = options;

    // Check if model is downloaded
    const modelPath = this.getModelPath(config);
    const isDownloaded = await this.isModelDownloaded(config);

    if (!isDownloaded) {
      throw new Error(
        "Model not downloaded. Call downloadModel() first."
      );
    }

    // Initialize llama.rn
    this.context = await initLlama({
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
    if (!this.context || !this.isInitialized) {
      throw new Error("Model not initialized. Call initializeModel() first.");
    }

    const {
      maxTokens = 512,
      temperature = 0.7,
      stop = [],
      stream = false,
      onToken,
    } = options;

    // Format prompt with system message if provided
    const fullPrompt = options.systemPrompt
      ? `<|system|>\n${options.systemPrompt}\n<|user|>\n${prompt}\n<|assistant|>\n`
      : prompt;

    if (stream && onToken) {
      // Streaming inference
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
          // Handle streaming token
          const token = data.token;
          result += token;
          onToken(token);
        }
      );

      return result.trim();
    } else {
      // Non-streaming inference
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
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options: InferenceOptions = {}
  ): Promise<string> {
    // Format messages into prompt
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
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.isInitialized = false;
      console.log("Model released from memory");
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
    const downloaded: ModelConfig[] = [];

    for (const model of RECOMMENDED_MODELS) {
      if (await this.isModelDownloaded(model)) {
        downloaded.push(model);
      }
    }

    return downloaded;
  }

  /**
   * Get local path for a model
   */
  private getModelPath(config: ModelConfig): string {
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
