/**
 * useLLMChat Hook - React hook for LLM chat
 *
 * Note: This implementation uses direct fetch API calls to OpenAI
 * for better React Native compatibility
 */

import { useCallback, useEffect, useMemo, useState } from "react";

export interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface UseMlxChatOptions {
  modelUrl?: string;
  modelName?: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  randomSeed?: number;
  systemPrompt?: string;
}

export function useMlxChat(options?: UseMlxChatOptions) {
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(100);
  const [downloadStatus, setDownloadStatus] = useState<"not_downloaded" | "downloading" | "downloaded" | "error">(
    "downloaded",
  );

  /**
   * Initialize the chat (using OpenAI API with fetch)
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log("[useMlxChat] Initializing with fetch API - v2.0");
        // Check if OpenAI API key is available
        const apiKey = process.env.EXPO_PUBLIC_MONGARS_OPENAI_API_KEY;
        if (!apiKey) {
          setError("OpenAI API key not configured. Please contact support.");
          setIsReady(false);
          return;
        }

        setIsReady(true);
        setDownloadStatus("downloaded");
        setDownloadProgress(100);
        console.log("[useMlxChat] Initialization complete - using fetch API");
      } catch (e: any) {
        const errorMsg = e?.message ?? "Failed to initialize chat";
        setError(errorMsg);
        setIsReady(false);
      }
    };

    initialize();
  }, []);

  /**
   * Build the complete prompt with history
   */
  const buildMessages = useCallback(
    (userMessage: string) => {
      const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

      // Add system prompt if provided
      if (options?.systemPrompt) {
        messages.push({ role: "system", content: options.systemPrompt });
      }

      // Add conversation history
      for (const turn of history) {
        messages.push({ role: turn.role as "user" | "assistant" | "system", content: turn.content });
      }

      // Add current user message
      messages.push({ role: "user", content: userMessage });

      return messages;
    },
    [history, options?.systemPrompt],
  );

  /**
   * Send a message and get a streaming response
   */
  const send = useCallback(
    async (userMessage: string): Promise<string> => {
      if (!isReady) {
        throw new Error("Chat not ready yet");
      }

      setIsSending(true);
      setError(null);
      setCurrentResponse("");

      try {
        // Add user message to history
        const userTurn: ChatTurn = {
          role: "user",
          content: userMessage,
          timestamp: Date.now(),
        };
        setHistory((prev) => [...prev, userTurn]);

        // Build messages with history
        const messages = buildMessages(userMessage);

        // Use fetch directly for better React Native compatibility
        const apiKey = process.env.EXPO_PUBLIC_MONGARS_OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("OpenAI API key not configured");
        }

        console.log("[useMlxChat] Sending request to OpenAI API via fetch...");

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: options?.maxTokens ?? 512,
            temperature: options?.temperature ?? 0.7,
          }),
        });

        console.log("[useMlxChat] Received response, status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || `API error: ${response.status}`;
          console.error("[useMlxChat] API error:", errorMsg);
          throw new Error(errorMsg);
        }

        const data = await response.json();
        const fullResponse = data.choices[0]?.message?.content || "";
        console.log("[useMlxChat] Successfully received response, length:", fullResponse.length);
        setCurrentResponse(fullResponse);

        // Add assistant response to history
        const assistantTurn: ChatTurn = {
          role: "assistant",
          content: fullResponse.trim(),
          timestamp: Date.now(),
        };
        setHistory((prev) => [...prev, assistantTurn]);

        setCurrentResponse("");
        return fullResponse.trim();
      } catch (e: any) {
        const errorMsg = e?.message ?? String(e);
        setError(errorMsg);
        throw e;
      } finally {
        setIsSending(false);
      }
    },
    [isReady, buildMessages, options?.maxTokens, options?.temperature],
  );

  /**
   * Stop current generation
   */
  const stop = useCallback(() => {
    setIsSending(false);
  }, []);

  /**
   * Reset conversation history
   */
  const reset = useCallback(() => {
    setHistory([]);
    setCurrentResponse("");
    setError(null);
  }, []);

  /**
   * Add a system message
   */
  const addSystemMessage = useCallback((content: string) => {
    const systemTurn: ChatTurn = {
      role: "system",
      content,
      timestamp: Date.now(),
    };
    setHistory((prev) => [...prev, systemTurn]);
  }, []);

  return useMemo(
    () => ({
      ready: isReady,
      busy: isSending,
      history,
      error,
      currentResponse,
      downloadStatus,
      downloadProgress,
      downloadError: downloadStatus === "error" ? error : null,
      send,
      stop,
      reset,
      addSystemMessage,
      isDownloading: downloadStatus === "downloading",
      isReady,
    }),
    [
      isReady,
      isSending,
      history,
      error,
      currentResponse,
      downloadStatus,
      downloadProgress,
      send,
      stop,
      reset,
      addSystemMessage,
    ],
  );
}
