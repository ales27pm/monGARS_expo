/**
 * useMlxChat Hook - Hybrid on-device (MLX) and cloud chat controller
 *
 * The hook prefers the native MLX turbo module (via llama.rn bridge) when
 * running on iOS with a downloaded model. If the native backend is not
 * available it transparently falls back to the secure cloud prompt pipeline.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { getGlobalLLM } from "../utils/on-device-llm";
import { buildChatMessages } from "../utils/chat-format";
import { useModelStore } from "../state/modelStore";
import type { ModelConfig } from "../types/models";
import type { ChatTurn } from "../types/chat";

type DownloadStatus = "not_downloaded" | "downloading" | "downloaded" | "error";
type ChatBackend = "native" | "cloud";

export interface UseMlxChatOptions {
  /** Override the active model configuration */
  modelConfig?: ModelConfig;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for generation */
  temperature?: number;
  /** Optional system prompt */
  systemPrompt?: string;
  /** Preferred operating mode */
  mode?: "native-first" | "cloud-only" | "native-only";
  /** Whether to fall back to cloud when native fails */
  allowCloudFallback?: boolean;
}

const CLOUD_COMPLETION_URL = "https://api.openai.com/v1/chat/completions";

export type { ChatTurn } from "../types/chat";

export function useMlxChat(options?: UseMlxChatOptions) {
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const historyRef = useRef<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>("not_downloaded");
  const [backend, setBackend] = useState<ChatBackend>(options?.mode === "cloud-only" ? "cloud" : "native");

  const allowFallback = options?.allowCloudFallback ?? true;
  const activeModelFromStore = useModelStore((state) => state.activeModel);
  const downloadedModels = useModelStore((state) => state.downloadedModels);

  const resolvedModel: ModelConfig | null = options?.modelConfig ?? activeModelFromStore ?? null;
  const nativeLLMRef = useRef<ReturnType<typeof getGlobalLLM> | null>(null);
  const cloudReadyRef = useRef(false);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const ensureCloudBackend = useCallback(async (): Promise<boolean> => {
    if (cloudReadyRef.current) {
      return true;
    }

    const apiKey = process.env.EXPO_PUBLIC_MONGARS_OPENAI_API_KEY;
    if (!apiKey) {
      setError("OpenAI API key not configured. Please contact support.");
      setDownloadStatus("error");
      return false;
    }

    cloudReadyRef.current = true;
    setDownloadStatus("downloaded");
    setDownloadProgress(100);
    setError(null);
    return true;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const preferredMode = options?.mode ?? "native-first";

      if (preferredMode === "cloud-only" || Platform.OS === "web") {
        const ready = await ensureCloudBackend();
        if (isMounted) {
          setBackend("cloud");
          setIsReady(ready);
        }
        return;
      }

      if (Platform.OS !== "ios") {
        // Native MLX is only supported on iOS builds. Use cloud elsewhere.
        const ready = await ensureCloudBackend();
        if (isMounted) {
          setBackend("cloud");
          setIsReady(ready);
        }
        return;
      }

      if (!resolvedModel) {
        setError("No on-device model selected. Choose a model in the Models tab.");
        if (allowFallback && preferredMode !== "native-only") {
          const ready = await ensureCloudBackend();
          if (isMounted) {
            setBackend("cloud");
            setIsReady(ready);
          }
        } else if (isMounted) {
          setIsReady(false);
          setDownloadStatus("not_downloaded");
        }
        return;
      }

      try {
        const llmInstance = getGlobalLLM();
        const isDownloaded = await llmInstance.isModelDownloaded(resolvedModel);

        if (!isDownloaded) {
          const message = `${resolvedModel.name} is not downloaded on this device.`;
          setError(message);
          setDownloadStatus("error");

          if (allowFallback && preferredMode !== "native-only") {
            const ready = await ensureCloudBackend();
            if (isMounted) {
              setBackend("cloud");
              setIsReady(ready);
            }
          } else if (isMounted) {
            setIsReady(false);
          }
          return;
        }

        setDownloadStatus("downloading");
        setDownloadProgress(0);

        await llmInstance.initializeModel(resolvedModel, {
          contextSize: options?.maxTokens ?? 512,
          gpuLayers: 99,
          useMemoryLock: true,
        });

        if (!isMounted) {
          return;
        }

        nativeLLMRef.current = llmInstance;
        setBackend("native");
        setIsReady(true);
        setDownloadStatus("downloaded");
        setDownloadProgress(100);
        setError(null);
      } catch (nativeError) {
        const message = nativeError instanceof Error ? nativeError.message : String(nativeError);
        console.error("[useMlxChat] Failed to initialize native MLX backend:", message);
        nativeLLMRef.current = null;
        setDownloadStatus("error");
        setError(message);

        if (allowFallback && (options?.mode ?? "native-first") !== "native-only") {
          const ready = await ensureCloudBackend();
          if (isMounted) {
            setBackend("cloud");
            setIsReady(ready);
          }
        } else if (isMounted) {
          setIsReady(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [resolvedModel, downloadedModels, allowFallback, ensureCloudBackend, options?.mode, options?.maxTokens]);

  const inferenceOptions = useMemo(
    () => ({
      maxTokens: options?.maxTokens ?? 512,
      temperature: options?.temperature ?? 0.7,
    }),
    [options?.maxTokens, options?.temperature],
  );

  const revertUserTurn = useCallback((userTurn: ChatTurn) => {
    setHistory((prev) => {
      const index = prev.findIndex((turn) => turn.timestamp === userTurn.timestamp && turn.role === userTurn.role);

      if (index === -1) {
        historyRef.current = prev;
        return prev;
      }

      const updated = [...prev.slice(0, index), ...prev.slice(index + 1)];
      historyRef.current = updated;
      return updated;
    });
  }, []);

  const executeCloud = useCallback(async () => {
    const ready = await ensureCloudBackend();
    if (!ready) {
      throw new Error("Cloud backend not configured");
    }

    const apiKey = process.env.EXPO_PUBLIC_MONGARS_OPENAI_API_KEY as string;
    const messages = buildChatMessages(historyRef.current, options?.systemPrompt);

    const response = await fetch(CLOUD_COMPLETION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: inferenceOptions.maxTokens,
        temperature: inferenceOptions.temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";
    const assistantTurn: ChatTurn = {
      role: "assistant",
      content: content.trim(),
      timestamp: Date.now(),
    };

    const newHistory = [...historyRef.current, assistantTurn];
    historyRef.current = newHistory;
    setHistory(newHistory);
    return assistantTurn.content;
  }, [ensureCloudBackend, inferenceOptions.maxTokens, inferenceOptions.temperature, options?.systemPrompt]);

  const executeNative = useCallback(async () => {
    const llm = nativeLLMRef.current;
    if (!llm) {
      throw new Error("Native MLX backend is not initialized");
    }

    let streamedText = "";
    setCurrentResponse("");

    const result = await llm.chat(buildChatMessages(historyRef.current, options?.systemPrompt), {
      maxTokens: inferenceOptions.maxTokens,
      temperature: inferenceOptions.temperature,
      stream: true,
      onToken: (token) => {
        streamedText += token;
        setCurrentResponse((prev) => prev + token);
      },
    });

    const finalText = (result || streamedText).trim();
    const assistantTurn: ChatTurn = {
      role: "assistant",
      content: finalText,
      timestamp: Date.now(),
    };

    const newHistory = [...historyRef.current, assistantTurn];
    historyRef.current = newHistory;
    setHistory(newHistory);
    setCurrentResponse("");
    return finalText;
  }, [inferenceOptions.maxTokens, inferenceOptions.temperature, options?.systemPrompt]);

  const send = useCallback(
    async (userMessage: string): Promise<string> => {
      const trimmed = userMessage.trim();
      if (!trimmed) {
        throw new Error("Cannot send an empty message");
      }

      if (!isReady) {
        throw new Error("Chat not ready yet");
      }

      const userTurn: ChatTurn = {
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };

      const updatedHistory = [...historyRef.current, userTurn];
      historyRef.current = updatedHistory;
      setHistory(updatedHistory);

      setIsSending(true);
      setError(null);
      setCurrentResponse("");

      try {
        if (backend === "native") {
          return await executeNative();
        }

        return await executeCloud();
      } catch (primaryError) {
        const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
        console.warn("[useMlxChat] Primary backend failed:", primaryMessage);
        setCurrentResponse("");

        if (backend === "native" && allowFallback) {
          try {
            const fallbackResult = await executeCloud();
            setBackend("cloud");
            setIsReady(true);
            return fallbackResult;
          } catch (fallbackError) {
            const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
            setError(fallbackMessage);
            revertUserTurn(userTurn);
            throw fallbackError;
          }
        }

        setError(primaryMessage);
        revertUserTurn(userTurn);
        throw primaryError;
      } finally {
        setIsSending(false);
        setCurrentResponse("");
      }
    },
    [allowFallback, backend, executeCloud, executeNative, isReady, revertUserTurn],
  );

  const stop = useCallback(() => {
    setIsSending(false);
  }, []);

  const reset = useCallback(() => {
    historyRef.current = [];
    setHistory([]);
    setCurrentResponse("");
    setError(null);
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    const systemTurn: ChatTurn = {
      role: "system",
      content,
      timestamp: Date.now(),
    };

    const newHistory = [...historyRef.current, systemTurn];
    historyRef.current = newHistory;
    setHistory(newHistory);
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
      backend,
      send,
      stop,
      reset,
      addSystemMessage,
      isDownloading: downloadStatus === "downloading",
      isReady,
    }),
    [
      addSystemMessage,
      backend,
      currentResponse,
      downloadProgress,
      downloadStatus,
      error,
      history,
      isReady,
      isSending,
      send,
      stop,
      reset,
    ],
  );
}
