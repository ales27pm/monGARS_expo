import { NativeModules, NativeEventEmitter } from "react-native";

// Model and Configuration Types
export interface MLXModelOptions {
  temperature?: number; // 0.0-1.0, default: 0.7
  topP?: number; // 0.0-1.0, default: 0.9
  topK?: number; // default: 40
  maxTokens?: number; // default: 512
  repeatPenalty?: number; // default: 1.1
  stream?: boolean; // Enable token streaming, default: false
}

export interface MLXModel {
  id: string;
  name: string;
  size: string;
  description: string;
}

export interface MLXLoadModelResult {
  success: boolean;
  modelId: string;
  cached?: boolean;
}

export interface MLXGenerateResult {
  text: string;
  tokensGenerated: number;
  timeElapsed: number;
}

export interface MLXChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface MLXMemoryStats {
  usedMemoryMB: number;
  totalMemoryGB: number;
  modelsLoaded: number;
  activeSessions: number;
}

// Event Types
export interface MLXTokenEvent {
  sessionId?: string;
  token: string;
  index: number;
}

export interface MLXGenerationCompleteEvent {
  sessionId?: string;
  fullText: string;
  tokensGenerated: number;
  timeElapsed: number;
}

export interface MLXModelLoadProgressEvent {
  modelId: string;
  progress: number; // 0.0-1.0
  stage: "downloading" | "loading" | "initializing";
  message: string;
}

/**
 * MLX Turbo Module for On-Device LLM Inference
 *
 * Provides access to Apple's MLX framework for running large language models
 * directly on iOS devices using Apple Silicon.
 *
 * Key Features:
 * - Load quantized models (4-bit, 8-bit) optimized for mobile
 * - Streaming token generation with real-time callbacks
 * - Chat session management with conversation history
 * - Memory-efficient inference using Apple's unified memory
 * - Offline inference with no network requirements
 *
 * Supported Models:
 * - Qwen 2.5 (0.5B, 1.5B, 3B, 7B, 14B - 4bit quantized)
 * - Llama 3.2 (1B, 3B - 4bit quantized)
 * - Phi 3.5 mini (3.8B - 4bit quantized)
 * - Gemma 2 (2B, 9B - 4bit quantized)
 * - 100+ models from mlx-community on HuggingFace
 *
 * Requirements:
 * - iOS 16.0+
 * - MLX Swift framework via Swift Package Manager
 * - Sufficient device memory (2-8GB depending on model)
 * - "Increased Memory Limit" capability enabled in Xcode
 *
 * @example
 * ```typescript
 * // Load a model
 * await MLXModule.loadModel("mlx-community/Qwen2.5-1.5B-Instruct-4bit");
 *
 * // Generate text
 * const result = await MLXModule.generate(
 *   "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
 *   "What is quantum computing?",
 *   { temperature: 0.7, maxTokens: 200 }
 * );
 *
 * // Create a chat session
 * await MLXModule.createChatSession(
 *   "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
 *   "my-session",
 *   "You are a helpful AI assistant."
 * );
 *
 * // Chat with streaming
 * MLXEventEmitter.addListener("onTokenGenerated", (event) => {
 *   console.log("Token:", event.token);
 * });
 *
 * await MLXModule.chatRespond(
 *   "my-session",
 *   "Tell me about the solar system",
 *   { stream: true, maxTokens: 500 }
 * );
 * ```
 */
interface MLXTurboModuleType {
  /**
   * Load a model from HuggingFace
   * Downloads and initializes the model for inference
   *
   * @param modelId - Model identifier (e.g., "mlx-community/Qwen2.5-1.5B-Instruct-4bit")
   * @param options - Optional configuration for the model
   * @returns Promise with load result
   *
   * @example
   * const result = await MLXModule.loadModel("mlx-community/Qwen2.5-0.5B-Instruct-4bit");
   * console.log("Model loaded:", result.modelId);
   */
  loadModel(
    modelId: string,
    options?: MLXModelOptions
  ): Promise<MLXLoadModelResult>;

  /**
   * Generate text from a prompt using a loaded model
   *
   * @param modelId - Previously loaded model identifier
   * @param prompt - Input text prompt
   * @param options - Generation options (temperature, maxTokens, etc.)
   * @returns Promise with generated text
   *
   * @example
   * const result = await MLXModule.generate(
   *   "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
   *   "Explain machine learning in simple terms",
   *   { temperature: 0.8, maxTokens: 300 }
   * );
   * console.log(result.text);
   */
  generate(
    modelId: string,
    prompt: string,
    options?: MLXModelOptions
  ): Promise<MLXGenerateResult>;

  /**
   * Create a chat session with conversation history
   * Maintains context across multiple messages
   *
   * @param modelId - Previously loaded model identifier
   * @param sessionId - Unique identifier for this chat session
   * @param systemPrompt - Optional system prompt to guide model behavior
   * @returns Promise with success status
   *
   * @example
   * await MLXModule.createChatSession(
   *   "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
   *   "coding-assistant",
   *   "You are an expert software developer who writes clean, efficient code."
   * );
   */
  createChatSession(
    modelId: string,
    sessionId: string,
    systemPrompt?: string
  ): Promise<{ success: boolean; sessionId: string }>;

  /**
   * Send a message in a chat session
   * The model maintains conversation history automatically
   *
   * @param sessionId - Chat session identifier
   * @param message - User message
   * @param options - Generation options
   * @returns Promise with assistant's response
   *
   * @example
   * const response = await MLXModule.chatRespond(
   *   "coding-assistant",
   *   "Write a function to check if a number is prime",
   *   { temperature: 0.7 }
   * );
   */
  chatRespond(
    sessionId: string,
    message: string,
    options?: MLXModelOptions
  ): Promise<MLXGenerateResult>;

  /**
   * Get conversation history from a chat session
   *
   * @param sessionId - Chat session identifier
   * @returns Promise with array of messages
   *
   * @example
   * const history = await MLXModule.getChatHistory("my-session");
   * console.log("Messages:", history.messages.length);
   */
  getChatHistory(sessionId: string): Promise<{ messages: MLXChatMessage[] }>;

  /**
   * Clear conversation history from a chat session
   * Keeps the session active but removes all messages
   *
   * @param sessionId - Chat session identifier
   * @returns Promise with success status
   */
  clearChatHistory(sessionId: string): Promise<{ success: boolean }>;

  /**
   * Unload a model to free memory
   * Closes all chat sessions using this model
   *
   * @param modelId - Model identifier to unload
   * @returns Promise with unload result
   *
   * @example
   * const result = await MLXModule.unloadModel("mlx-community/Qwen2.5-1.5B-Instruct-4bit");
   * console.log("Sessions closed:", result.sessionsClosed);
   */
  unloadModel(modelId: string): Promise<{
    success: boolean;
    modelId: string;
    sessionsClosed: number;
  }>;

  /**
   * Get list of recommended models for the current device
   * Automatically detects device memory and suggests appropriate models
   *
   * @returns Promise with device info and recommended models
   *
   * @example
   * const { deviceMemoryGB, recommended } = await MLXModule.getRecommendedModels();
   * console.log(`Device has ${deviceMemoryGB}GB RAM`);
   * console.log("Recommended models:", recommended.map(m => m.name));
   */
  getRecommendedModels(): Promise<{
    deviceMemoryGB: number;
    recommended: MLXModel[];
  }>;

  /**
   * Get memory usage statistics
   * Useful for monitoring app performance and deciding when to unload models
   *
   * @returns Promise with memory statistics
   *
   * @example
   * const stats = await MLXModule.getMemoryStats();
   * console.log(`Using ${stats.usedMemoryMB}MB with ${stats.modelsLoaded} models loaded`);
   */
  getMemoryStats(): Promise<MLXMemoryStats>;
}

const { MLXTurboModule } = NativeModules;

/**
 * Event emitter for MLX events
 * Subscribe to token generation and model loading progress
 *
 * Events:
 * - onTokenGenerated: Emitted for each token during streaming generation
 * - onGenerationComplete: Emitted when generation finishes
 * - onModelLoadProgress: Emitted during model download/initialization
 */
export const MLXEventEmitter = new NativeEventEmitter(MLXTurboModule);

export default MLXTurboModule as MLXTurboModuleType;
