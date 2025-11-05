/**
 * LLM Service for expo-llm-mediapipe
 * Adapted from offLLM's LLMService to work with MediaPipe
 */

import { Platform } from "react-native";
import { MODEL_CONFIG } from "../config/model";
import MLXModule from "../native/MLXModule";

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  randomSeed?: number;
  stream?: boolean;
  onToken?: (token: string) => void;
}

export interface PerformanceMetrics {
  totalInferenceTime: number;
  inferenceCount: number;
  averageInferenceTime: number;
}

class LLMService {
  private isWeb: boolean;
  private isReady: boolean;
  private modelPath: string | null;
  private performanceMetrics: PerformanceMetrics;

  constructor() {
    this.isWeb = Platform.OS === "web";
    this.isReady = false;
    this.modelPath = null;
    this.performanceMetrics = {
      totalInferenceTime: 0,
      inferenceCount: 0,
      averageInferenceTime: 0,
    };
  }

  /**
   * Load the configured model
   */
  async loadConfiguredModel(): Promise<boolean> {
    if (this.isWeb || this.isReady) {
      return true;
    }

    try {
      const result = await MLXModule.load();
      this.modelPath = result.id;
      this.isReady = true;
      return true;
    } catch (error) {
      console.error("[LLMService] Failed to load configured model:", error);
      return false;
    }
  }

  /**
   * Load a specific model
   */
  async loadModel(modelPath: string): Promise<any> {
    try {
      if (this.isWeb) {
        // Web simulation
        this.isReady = true;
        this.modelPath = modelPath;
        return { status: "loaded", contextSize: 4096, model: modelPath };
      }

      const result = await MLXModule.load(modelPath);
      this.isReady = true;
      this.modelPath = modelPath;
      return result;
    } catch (error) {
      console.error("[LLMService] Failed to load model:", error);
      throw error;
    }
  }

  /**
   * Generate text from a prompt
   * Note: For streaming, use the hook directly in components
   */
  async generate(
    prompt: string,
    maxTokens: number = 256,
    temperature: number = 0.7,
    options: Partial<GenerationOptions> = {}
  ): Promise<string> {
    if (!this.isWeb && !this.isReady) {
      const loaded = await this.loadConfiguredModel();
      if (!loaded) {
        throw new Error("Model not loaded");
      }
    }

    try {
      const startTime = Date.now();

      let response: string;

      if (this.isWeb) {
        // Web fallback
        response = await this.generateWeb(prompt, maxTokens, temperature);
      } else {
        // For actual generation, components should use the useLLM hook
        // This method exists for API compatibility
        throw new Error(
          "Direct generation not supported. Use useMlxChat hook in components for MediaPipe integration."
        );
      }

      const endTime = Date.now();
      const inferenceTime = endTime - startTime;

      this.performanceMetrics.totalInferenceTime += inferenceTime;
      this.performanceMetrics.inferenceCount += 1;
      this.performanceMetrics.averageInferenceTime =
        this.performanceMetrics.totalInferenceTime / this.performanceMetrics.inferenceCount;

      return response;
    } catch (error) {
      console.error("[LLMService] Generation failed:", error);
      throw error;
    }
  }

  /**
   * Web fallback generation
   */
  private async generateWeb(
    prompt: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    // Simulate generation for web
    await new Promise((resolve) => setTimeout(resolve, 500));
    return `[Web Simulation] Response to: ${prompt.substring(0, 50)}...`;
  }

  /**
   * Stop current generation
   */
  stop(): void {
    MLXModule.stop();
  }

  /**
   * Reset the model state
   */
  reset(): void {
    MLXModule.reset();
  }

  /**
   * Unload the model
   */
  async unloadModel(): Promise<void> {
    MLXModule.unload();
    this.isReady = false;
    this.modelPath = null;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Check if model is ready
   */
  isModelReady(): boolean {
    return this.isReady;
  }

  /**
   * Get current model path
   */
  getModelPath(): string | null {
    return this.modelPath;
  }
}

// Export singleton instance
export default new LLMService();
