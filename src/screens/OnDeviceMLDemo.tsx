/**
 * On-Device ML Demo Screen
 * Showcases privacy-first AI capabilities
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  OfflineIndicator,
  ModelDownloadProgress,
  PrivacyBadge,
  ModelInfoCard,
  MemoryStatsCard,
} from "../components/PrivacyUI";

import { RECOMMENDED_MODELS, ModelConfig, ModelDownloadProgress as DownloadProgress } from "../types/models";

import { vectorStore } from "../utils/vector-store";
import { useModelStore } from "../state/modelStore";
import type { OnDeviceLLM } from "../utils/on-device-llm";
import { createConversationId } from "../utils/conversation";
import { getErrorMessage } from "../utils/errors";

// Custom Modal Component
interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  backdropClassName?: string;
  containerClassName?: string;
  confirmButtonClassName?: string;
  cancelButtonClassName?: string;
}

const mergeClassNames = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" ");

function CustomModal({
  visible,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "OK",
  cancelText = "Cancel",
  isDestructive = false,
  backdropClassName,
  containerClassName,
  confirmButtonClassName,
  cancelButtonClassName,
}: CustomModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const backdropClasses = mergeClassNames("flex-1 bg-black/50 justify-center items-center px-6", backdropClassName);
  const containerClasses = mergeClassNames("bg-white rounded-2xl p-6 w-full max-w-sm", containerClassName);
  const cancelClasses = mergeClassNames("flex-1 bg-gray-200 py-3 rounded-lg items-center", cancelButtonClassName);
  const confirmClasses = mergeClassNames(
    `flex-1 py-3 rounded-lg items-center ${isDestructive ? "bg-red-500" : "bg-blue-500"}`,
    confirmButtonClassName,
  );

  const handleConfirmPress = useCallback(() => {
    if (!onConfirm) {
      onClose();
      return;
    }

    try {
      const maybePromise = onConfirm();
      if (maybePromise && typeof (maybePromise as PromiseLike<void>).then === "function") {
        setIsConfirming(true);
        Promise.resolve(maybePromise)
          .catch((error: unknown) => console.warn("[OnDeviceMLDemo] Modal confirm failed", error))
          .finally(() => {
            setIsConfirming(false);
            onClose();
          });
      } else {
        onClose();
      }
    } catch (error) {
      console.error("[OnDeviceMLDemo] Modal confirm threw", error);
      onClose();
    }
  }, [onClose, onConfirm]);

  const handleCancelPress = useCallback(() => {
    if (!isConfirming) {
      onClose();
    }
  }, [isConfirming, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className={backdropClasses}>
        <View className={containerClasses}>
          <Text className="text-xl font-bold text-gray-900 mb-2">{title}</Text>
          <Text className="text-gray-600 mb-6">{message}</Text>

          <View className="flex-row gap-3">
            {onConfirm && (
              <Pressable onPress={handleCancelPress} disabled={isConfirming} className={cancelClasses}>
                <Text className="text-gray-700 font-semibold">{cancelText}</Text>
              </Pressable>
            )}
            <Pressable onPress={handleConfirmPress} disabled={isConfirming} className={confirmClasses}>
              {isConfirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">{confirmText}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function OnDeviceMLDemo() {
  const [isOffline, setIsOffline] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const resetConversationState = useCallback(() => {
    setMessages([]);
    setInputText("");
    setIsGenerating(false);
    conversationIdRef.current = null;
    setActiveConversationId(null);
  }, []);

  const ensureConversationId = useCallback(() => {
    if (!conversationIdRef.current) {
      const seed = selectedModel?.filename ?? selectedModel?.repo ?? undefined;
      const generatedId = createConversationId(seed);
      conversationIdRef.current = generatedId;
      setActiveConversationId(generatedId);
    }

    return conversationIdRef.current as string;
  }, [selectedModel]);

  // Memory state
  const [memoryStats, setMemoryStats] = useState({
    totalMemories: 0,
    storageSize: 0,
    conversationCount: 0,
  });

  // Modal state
  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void | Promise<void>;
    isDestructive?: boolean;
    confirmText?: string;
    cancelText?: string;
  }>({
    visible: false,
    title: "",
    message: "",
  });

  // Model store integration
  const activeModel = useModelStore((s) => s.activeModel);
  const downloadModel = useModelStore((s) => s.downloadModel);
  const deleteModelFromStore = useModelStore((s) => s.deleteModel);
  const isModelDownloaded = useModelStore((s) => s.isModelDownloaded);
  const checkDownloadedModels = useModelStore((s) => s.checkDownloadedModels);

  // LLM instance - lazy loaded only when needed
  const [llm, setLlm] = useState<OnDeviceLLM | null>(null);
  const llmRef = useRef<OnDeviceLLM | null>(null);

  const ensureLlmInstance = useCallback(async (): Promise<OnDeviceLLM> => {
    if (llmRef.current) {
      return llmRef.current;
    }

    try {
      const { getGlobalLLM } = await import("../utils/on-device-llm");
      const llmInstance = getGlobalLLM();
      llmRef.current = llmInstance;
      setLlm(llmInstance);
      return llmInstance;
    } catch (error) {
      console.error("[OnDeviceMLDemo] Failed to load on-device LLM module", error);
      throw error;
    }
  }, [setLlm]);

  // Check network status - disabled to avoid NativeEventEmitter error
  // NetInfo requires native module initialization
  useEffect(() => {
    // Network detection is disabled for now
    // Will be re-enabled when NetInfo native module is properly initialized
    setIsOffline(false);
  }, []);

  useEffect(() => {
    return () => {
      const instance = llmRef.current;
      if (!instance) {
        return;
      }

      llmRef.current = null;
      void instance
        .release()
        .catch((error) => console.debug("[OnDeviceMLDemo] Failed to release model on unmount", error));
    };
  }, []);

  // Load memory stats
  useEffect(() => {
    let isActive = true;

    const refreshStats = async () => {
      try {
        await vectorStore.waitUntilReady();
        const stats = vectorStore.getStats();
        if (isActive) {
          setMemoryStats({
            totalMemories: stats.totalEmbeddings,
            storageSize: stats.storageSize,
            conversationCount: stats.conversationCount,
          });
        }
      } catch (error) {
        console.warn("Unable to load vector memory stats:", error);
      }
    };

    refreshStats();

    return () => {
      isActive = false;
    };
  }, [messages]);

  // Check downloaded models on mount
  useEffect(() => {
    checkDownloadedModels();
  }, [checkDownloadedModels]);

  // Sync selectedModel with activeModel from store
  useEffect(() => {
    if (activeModel) {
      setSelectedModel(activeModel);
      // Check if model is loaded in LLM instance (only if llm is initialized)
      if (llm) {
        const modelInfo = llm.getModelInfo();
        setIsModelLoaded(modelInfo.isInitialized && modelInfo.modelConfig?.filename === activeModel.filename);
      }
    }
  }, [activeModel, llm]);

  const handleDownloadModel = async (model: ModelConfig) => {
    try {
      setIsDownloading(true);
      setSelectedModel(model);

      // Download model using the model store
      await downloadModel(model, (progress) => {
        setDownloadProgress(progress);
      });

      setModal({
        visible: true,
        title: "Download Complete",
        message: `${model.name} has been downloaded successfully. You can now load it for inference.`,
      });
    } catch (error) {
      setModal({
        visible: true,
        title: "Download Failed",
        message: `Failed to download ${model.name}: ${getErrorMessage(error)}`,
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleLoadModel = async (model: ModelConfig) => {
    try {
      // Check if model is downloaded first
      if (!isModelDownloaded(model)) {
        setModal({
          visible: true,
          title: "Model Not Downloaded",
          message: "Please download the model before loading it.",
        });
        return;
      }

      let instance: OnDeviceLLM;
      try {
        instance = await ensureLlmInstance();
      } catch {
        setModal({
          visible: true,
          title: "Module Not Available",
          message:
            "On-device LLM module is not available in this environment. It will work after building with EAS Build.",
        });
        return;
      }

      // Release any currently loaded model
      if (isModelLoaded) {
        await instance.release();
        setIsModelLoaded(false);
      }

      // Show loading state
      setModal({
        visible: true,
        title: "Loading Model",
        message: `Initializing ${model.name}... This may take a moment.`,
      });

      // Initialize the model
      await instance.initializeModel(model, {
        gpuLayers: 99, // Use GPU acceleration
        contextSize: 2048,
        useMemoryLock: true,
      });

      setIsModelLoaded(true);
      setSelectedModel(model);

      setModal({
        visible: true,
        title: "Model Loaded",
        message: `${model.name} is ready for inference! Start chatting below.`,
      });
      resetConversationState();
    } catch (error) {
      setModal({
        visible: true,
        title: "Load Failed",
        message: `Failed to load ${model.name}: ${getErrorMessage(error)}`,
      });
      setIsModelLoaded(false);
    }
  };

  const handleDeleteModel = async (model: ModelConfig) => {
    setModal({
      visible: true,
      title: "Delete Model",
      message: `Are you sure you want to delete ${model.name}? This will free up ${model.sizeInMB}MB of storage.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          // Release model if it's currently loaded
          const instance = llmRef.current;
          if (instance && isModelLoaded && selectedModel?.filename === model.filename) {
            await instance.release();
            setIsModelLoaded(false);
            setSelectedModel(null);
            resetConversationState();
          }

          await deleteModelFromStore(model);

          setModal({
            visible: true,
            title: "Model Deleted",
            message: `${model.name} has been removed from your device.`,
          });
        } catch (error) {
          setModal({
            visible: true,
            title: "Delete Failed",
            message: `Failed to delete ${model.name}: ${getErrorMessage(error)}`,
          });
        }
      },
    });
  };

  const handleSendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput) return;
    const instance = llmRef.current;
    if (!isModelLoaded || !instance) {
      setModal({
        visible: true,
        title: "No Model Loaded",
        message: "Please download and load a model before chatting.",
      });
      return;
    }

    const userMessage = trimmedInput;
    const conversationIdAtSend = ensureConversationId();
    const isCurrentConversation = () => conversationIdRef.current === conversationIdAtSend;
    setInputText("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsGenerating(true);

    try {
      // Get response from on-device LLM
      const response = await instance.chat(
        [
          ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: userMessage },
        ],
        {
          maxTokens: 512,
          temperature: 0.7,
        },
      );

      if (!isCurrentConversation()) {
        console.info("[OnDeviceMLDemo] Dropping assistant response for stale conversation", conversationIdAtSend);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: response }]);

      // Store in vector memory for RAG
      try {
        const [userEmbedding, assistantEmbedding] = await Promise.all([
          instance.embed(userMessage),
          instance.embed(response),
        ]);

        if (!isCurrentConversation()) {
          console.info("[OnDeviceMLDemo] Skipping memory persistence for stale conversation", conversationIdAtSend);
          return;
        }

        // Store both in vector store
        await vectorStore.addEmbedding({
          text: userMessage,
          vector: userEmbedding,
          timestamp: Date.now(),
          metadata: {
            role: "user",
            conversationId: conversationIdAtSend,
          },
        });

        await vectorStore.addEmbedding({
          text: response,
          vector: assistantEmbedding,
          timestamp: Date.now(),
          metadata: {
            role: "assistant",
            conversationId: conversationIdAtSend,
          },
        });
      } catch (embeddingError) {
        // Silently fail if embeddings don't work - chat still works
        console.warn("Failed to generate embeddings:", embeddingError);
      }
    } catch (error) {
      if (!isCurrentConversation()) {
        console.info("[OnDeviceMLDemo] Ignoring failure for stale conversation", conversationIdAtSend);
        return;
      }

      setModal({
        visible: true,
        title: "Generation Failed",
        message: `Failed to generate response: ${getErrorMessage(error)}`,
      });
      // Remove the user message if generation failed
      setMessages((prev) => {
        if (prev.length === 0) {
          return prev;
        }
        const next = [...prev];
        if (next[next.length - 1]?.role === "user") {
          next.pop();
        }
        return next;
      });
    } finally {
      if (isCurrentConversation()) {
        setIsGenerating(false);
      }
    }
  };

  const handleClearMemory = () => {
    setModal({
      visible: true,
      title: "Clear All Memory",
      message: "This will delete all stored embeddings and conversations. This action cannot be undone.",
      isDestructive: true,
      onConfirm: async () => {
        try {
          resetConversationState();
          await vectorStore.waitUntilReady();
          vectorStore.clearAll();
          setMemoryStats({
            totalMemories: 0,
            storageSize: 0,
            conversationCount: 0,
          });
        } catch (error) {
          console.warn("Failed to clear vector memory:", error);
          setModal({
            visible: true,
            title: "Memory Cleanup Failed",
            message: "Unable to clear saved memories. Please try again after restarting the app.",
          });
        }
      },
    });
  };

  const handleNewConversationPress = () => {
    if (messages.length === 0) {
      resetConversationState();
      return;
    }

    setModal({
      visible: true,
      title: "Start New Conversation",
      message:
        "This clears the on-screen chat history and starts a fresh semantic memory thread. Previously saved embeddings remain accessible.",
      onConfirm: () => {
        resetConversationState();
      },
      confirmText: "Start Fresh",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1 px-4 py-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Privacy-First AI</Text>
          <Text className="text-gray-600 mb-4">100% offline, on-device inference with semantic memory</Text>

          <View className="flex-row items-center space-x-2">
            <OfflineIndicator isOffline={isOffline} modelLoaded={isModelLoaded} />
            <PrivacyBadge variant="minimal" />
          </View>
        </View>

        {/* Privacy Info */}
        <PrivacyBadge variant="detailed" />

        {/* Download Progress */}
        {isDownloading && downloadProgress && selectedModel && (
          <View className="my-4">
            <ModelDownloadProgress
              modelName={selectedModel.name}
              progress={downloadProgress.progress}
              downloadedMB={downloadProgress.downloadedBytes / (1024 * 1024)}
              totalMB={downloadProgress.totalBytes / (1024 * 1024)}
              speed={downloadProgress.speed}
            />
          </View>
        )}

        {/* Model Selection */}
        <View className="mt-6 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Available Models</Text>

          {RECOMMENDED_MODELS.map((model) => (
            <ModelInfoCard
              key={model.filename}
              modelName={model.name}
              sizeInMB={model.sizeInMB}
              quantization={model.quantization}
              isLoaded={isModelLoaded && selectedModel?.filename === model.filename}
              isDownloaded={isModelDownloaded(model)}
              isRecommended={model.recommended}
              description={model.description}
              onDownload={() => handleDownloadModel(model)}
              onLoad={() => handleLoadModel(model)}
              onDelete={() => handleDeleteModel(model)}
            />
          ))}
        </View>

        {/* Chat Interface */}
        {isModelLoaded && (
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-lg font-semibold text-gray-900">Offline Chat</Text>
                {activeConversationId && (
                  <Text className="text-xs text-gray-500" selectable>
                    Conversation ID: {activeConversationId}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={handleNewConversationPress}
                className="flex-row items-center bg-gray-200 px-3 py-2 rounded-lg"
              >
                <Ionicons name="refresh" size={16} color="#1d4ed8" />
                <Text className="text-sm text-blue-700 font-semibold ml-2">New Chat</Text>
              </Pressable>
            </View>

            <View className="bg-white rounded-lg border border-gray-200 p-4 mb-3 min-h-[200px]">
              {messages.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                  <Text className="text-gray-500 text-center mt-2">Start a conversation</Text>
                  <Text className="text-gray-400 text-xs text-center mt-1">All processing happens on your device</Text>
                </View>
              ) : (
                <ScrollView className="flex-1">
                  {messages.map((msg, idx) => (
                    <View key={idx} className={`mb-3 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <View
                        className={`px-4 py-2 rounded-lg max-w-[80%] ${
                          msg.role === "user" ? "bg-blue-500" : "bg-gray-100"
                        }`}
                      >
                        <Text className={`text-sm ${msg.role === "user" ? "text-white" : "text-gray-900"}`}>
                          {msg.content}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {isGenerating && (
                    <View className="items-start mb-3">
                      <View className="bg-gray-100 px-4 py-3 rounded-lg">
                        <ActivityIndicator size="small" color="#3b82f6" />
                      </View>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>

            {/* Input */}
            <View className="flex-row items-center space-x-2">
              <TextInput
                className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                placeholder="Type your message..."
                placeholderTextColor="#9ca3af"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!isGenerating}
              />

              <Pressable
                className={`w-12 h-12 rounded-lg items-center justify-center ${
                  inputText.trim() && !isGenerating ? "bg-blue-500" : "bg-gray-300"
                }`}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || isGenerating}
              >
                <Ionicons name="send" size={20} color="white" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Memory Stats */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Memory Statistics</Text>

          <MemoryStatsCard
            totalMemories={memoryStats.totalMemories}
            storageSize={memoryStats.storageSize}
            conversationCount={memoryStats.conversationCount}
            onClear={handleClearMemory}
          />
        </View>

        {/* Footer */}
        <View className="items-center py-6">
          <Text className="text-xs text-gray-500 text-center">
            All AI processing happens on your device.{"\n"}
            Your data never leaves your phone.
          </Text>
        </View>
      </ScrollView>

      {/* Custom Modal */}
      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal({ ...modal, visible: false })}
        onConfirm={modal.onConfirm}
        isDestructive={modal.isDestructive}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />
    </SafeAreaView>
  );
}
