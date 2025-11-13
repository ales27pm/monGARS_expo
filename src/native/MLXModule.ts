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
  stream?: boolean;
  onToken?: (token: string) => void;
  systemPrompt?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
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
  private abortController: AbortController | null = null;

  private get defaultChatModel(): string {
    return process.env.EXPO_PUBLIC_MONGARS_OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
  }

  private get defaultBaseUrl(): string {
    const base = process.env.EXPO_PUBLIC_MONGARS_OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
    return base.replace(/\/$/, "");
  }

  private resolveApiKey(options?: GenerateOptions): string {
    const apiKey = options?.apiKey?.trim() || process.env.EXPO_PUBLIC_MONGARS_OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "[LLMModule] OpenAI API key missing. Set EXPO_PUBLIC_MONGARS_OPENAI_API_KEY in your environment to use the fallback backend.",
      );
    }
    return apiKey;
  }

  private resolveBaseUrl(options?: GenerateOptions): string {
    const baseUrl = options?.baseUrl?.trim() || this.config?.baseUrl?.trim() || this.defaultBaseUrl;
    return baseUrl.replace(/\/$/, "");
  }

  private resolveModel(options?: GenerateOptions): string {
    const fallbackModel = process.env.EXPO_PUBLIC_MONGARS_OPENAI_COMPLETIONS_MODEL?.trim();
    return options?.model?.trim() || this.config?.chatModel?.trim() || fallbackModel || this.defaultChatModel;
  }

  private buildMessages(prompt: string, systemPrompt?: string) {
    const messages: { role: "system" | "user"; content: string }[] = [];
    if (systemPrompt && systemPrompt.trim().length > 0) {
      messages.push({ role: "system", content: systemPrompt.trim() });
    }
    messages.push({ role: "user", content: prompt });
    return messages;
  }

  private extractTextFromResponse(data: any): string {
    const choice = data?.choices?.[0];
    if (!choice) {
      return "";
    }

    const message = choice.message?.content ?? choice.text;
    if (typeof message === "string") {
      return message.trim();
    }

    if (Array.isArray(message)) {
      return message
        .map((part) => {
          if (typeof part === "string") {
            return part;
          }
          if (part && typeof part === "object" && "text" in part) {
            return String((part as any).text ?? "");
          }
          return "";
        })
        .join("")
        .trim();
    }

    return "";
  }

  private async extractError(response: Response): Promise<string> {
    try {
      const payload = await response.json();
      const detail = payload?.error?.message || payload?.message;
      return detail ? `${response.status} ${detail}` : `${response.status}`;
    } catch {
      const text = await response.text().catch(() => "");
      return text ? `${response.status} ${text}` : `${response.status}`;
    }
  }

  private async processStreamResponse(response: Response, onToken: (token: string) => void): Promise<string> {
    const body = response.body as ReadableStream<Uint8Array> | null;
    if (!body || typeof body.getReader !== "function") {
      console.warn("[LLMModule] Streaming unsupported in this environment. Falling back to buffered response.");
      const fallbackText = await response.text();
      if (fallbackText) {
        onToken(fallbackText);
      }
      return fallbackText;
    }

    const reader = body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulated = "";
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (!value) {
          continue;
        }

        buffer += decoder.decode(value, { stream: true });

        let separatorIndex = buffer.indexOf("\n\n");
        while (separatorIndex !== -1) {
          const eventChunk = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);
          separatorIndex = buffer.indexOf("\n\n");

          const lines = eventChunk
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          for (const line of lines) {
            if (!line.startsWith("data:")) {
              continue;
            }

            const payload = line.replace(/^data:\s*/, "");
            if (!payload || payload === "[DONE]") {
              if (payload === "[DONE]") {
                await reader.cancel().catch(() => undefined);
              }
              separatorIndex = -1;
              break;
            }

            try {
              const parsed = JSON.parse(payload);
              const delta: string = parsed?.choices?.[0]?.delta?.content || "";
              if (delta) {
                accumulated += delta;
                onToken(delta);
              }
            } catch (error) {
              console.warn("[LLMModule] Failed to parse streaming chunk:", error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return accumulated.trim();
  }

  private async performCompletion(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const modelIdentifier = this.modelId;
    if (!modelIdentifier) {
      throw new Error("[LLMModule] Model not loaded. Call load() before generate().");
    }

    const apiKey = this.resolveApiKey(options);
    const baseUrl = this.resolveBaseUrl(options);
    const model = this.resolveModel(options);

    const controller = new AbortController();
    this.abortController?.abort();
    this.abortController = controller;

    const requestBody: Record<string, any> = {
      model,
      messages: this.buildMessages(prompt, options.systemPrompt),
      temperature: options.temperature ?? this.config?.temperature ?? MODEL_CONFIG.temperature,
      max_tokens: options.maxTokens ?? this.config?.maxTokens ?? MODEL_CONFIG.maxTokens ?? 512,
    };

    if (typeof options.randomSeed === "number") {
      requestBody.seed = options.randomSeed;
    }

    const shouldStream = Boolean(options.stream && typeof options.onToken === "function");
    if (shouldStream) {
      requestBody.stream = true;
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const reason = await this.extractError(response);
        throw new Error(`[LLMModule] OpenAI request failed: ${reason}`);
      }

      if (shouldStream && options.onToken) {
        const streamedText = await this.processStreamResponse(response, options.onToken);
        this.abortController = null;
        if (!streamedText && !response.body) {
          // If streaming failed, retry without streaming
          const fallbackText = await this.performCompletion(prompt, { ...options, stream: false, onToken: undefined });
          options.onToken(fallbackText);
          return fallbackText;
        }
        return streamedText;
      }

      const data = await response.json();
      this.abortController = null;
      return this.extractTextFromResponse(data);
    } catch (error) {
      this.abortController = null;
      if ((error as any)?.name === "AbortError") {
        throw new Error("Generation aborted");
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

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
      chatModel: this.defaultChatModel,
      baseUrl: this.defaultBaseUrl,
      ...(typeof modelIdOrConfig === "object" && modelIdOrConfig ? modelIdOrConfig : {}),
    };

    this.modelId = modelId;

    return { id: modelId };
  }

  /**
   * Generate text from a prompt
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    return this.performCompletion(prompt, options);
  }

  /**
   * Start streaming generation
   */
  async startStream(prompt: string, options?: GenerateOptions): Promise<void> {
    if (!options?.onToken || typeof options.onToken !== "function") {
      throw new Error("startStream requires an onToken callback.");
    }

    await this.performCompletion(prompt, { ...options, stream: true });
  }

  /**
   * Reset the model state
   */
  reset(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  /**
   * Unload the model
   */
  unload(): void {
    this.modelId = null;
    this.config = null;
    this.abortController?.abort();
    this.abortController = null;
  }

  /**
   * Stop generation
   */
  stop(): void {
    this.abortController?.abort();
    this.abortController = null;
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
