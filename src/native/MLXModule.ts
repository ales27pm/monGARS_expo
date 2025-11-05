/**
 * LLM Module Fallback for Expo (No Native Modules)
 *
 * IMPORTANT: True on-device LLM inference requires native code (Swift/Kotlin)
 * which is not available in Expo managed workflow.
 *
 * This implementation provides the same interface but uses OpenAI API as backend.
 * The architecture and UI remain identical, making it easy to swap backends later.
 */

import { MODEL_CONFIG } from "../config/model";

export type GenerateOptions = {
  topK?: number;
  temperature?: number;
  maxTokens?: number;
  randomSeed?: number;
};

export type LLMModel = {
  id: string;
  name: string;
  isReady: boolean;
};

/**
 * Mock LLM wrapper that provides the same interface
 * Uses OpenAI API for actual inference
 */
class LLMModuleFallback {
  private modelId: string | null = null;
  private config: any = null;

  /**
   * Load a model (prepares configuration)
   */
  async load(modelIdOrConfig?: string | Partial<any>): Promise<{ id: string }> {
    const modelId = typeof modelIdOrConfig === "string" ? modelIdOrConfig : MODEL_CONFIG.modelName;

    this.config = {
      modelUrl: MODEL_CONFIG.modelUrl,
      modelName: MODEL_CONFIG.modelName,
      maxTokens: MODEL_CONFIG.maxTokens,
      temperature: MODEL_CONFIG.temperature,
      topK: MODEL_CONFIG.topK,
      randomSeed: MODEL_CONFIG.randomSeed,
    };

    this.modelId = modelId;

    return { id: modelId };
  }

  /**
   * Generate text from a prompt
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    throw new Error(
      "Direct generation not supported. Use the useLLMChat hook instead."
    );
  }

  /**
   * Start streaming generation
   */
  async startStream(prompt: string, options?: GenerateOptions): Promise<void> {
    throw new Error(
      "Direct streaming not supported. Use the useLLMChat hook instead."
    );
  }

  /**
   * Reset the model state
   */
  reset(): void {
    console.log("[LLMModule] Reset called");
  }

  /**
   * Unload the model
   */
  unload(): void {
    this.modelId = null;
    this.config = null;
  }

  /**
   * Stop generation
   */
  stop(): void {
    console.log("[LLMModule] Stop called");
  }

  /**
   * Get current model config
   */
  getConfig(): any {
    return this.config;
  }

  /**
   * Check if model is loaded
   */
  isLoaded(): boolean {
    return this.config !== null;
  }
}

// Export singleton instance
export const MLXModule = new LLMModuleFallback();
export default MLXModule;
