/**
 * On-Device ML Demo Screen
 * Showcases privacy-first AI capabilities
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  OfflineIndicator,
  ModelDownloadProgress,
  PrivacyBadge,
  ModelInfoCard,
  MemoryStatsCard,
} from "../components/PrivacyUI";

import {
  RECOMMENDED_MODELS,
  ModelConfig,
  ModelDownloadProgress as DownloadProgress,
} from "../types/models";

import { vectorStore } from "../utils/vector-store";
import { useModelStore } from "../state/modelStore";

// Custom Modal Component
interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

function CustomModal({
  visible,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "OK",
  cancelText = "Cancel",
  isDestructive = false,
}: CustomModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <Text className="text-xl font-bold text-gray-900 mb-2">{title}</Text>
          <Text className="text-gray-600 mb-6">{message}</Text>

          <View className="flex-row gap-3">
            {onConfirm && (
              <Pressable
                onPress={onClose}
                className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
              >
                <Text className="text-gray-700 font-semibold">{cancelText}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                if (onConfirm) {
                  onConfirm();
                }
                onClose();
              }}
              className={`flex-1 py-3 rounded-lg items-center ${
                isDestructive ? "bg-red-500" : "bg-blue-500"
              }`}
            >
              <Text className="text-white font-semibold">{confirmText}</Text>
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
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
    onConfirm?: () => void;
    isDestructive?: boolean;
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
  const [llm, setLlm] = useState<any>(null);

  // Check network status - disabled to avoid NativeEventEmitter error
  // NetInfo requires native module initialization
  useEffect(() => {
    // Network detection is disabled for now
    // Will be re-enabled when NetInfo native module is properly initialized
    setIsOffline(false);
  }, []);

  // Load memory stats
  useEffect(() => {
    const stats = vectorStore.getStats();
    setMemoryStats({
      totalMemories: stats.totalEmbeddings,
      storageSize: stats.storageSize,
      conversationCount: stats.conversationCount,
    });
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
        setIsModelLoaded(
          modelInfo.isInitialized &&
            modelInfo.modelConfig?.filename === activeModel.filename
        );
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
        message: `Failed to download ${model.name}: ${error}`,
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

      // Lazy-load the OnDeviceLLM class only when needed
      if (!llm) {
        try {
          const { getGlobalLLM } = await import("../utils/on-device-llm");
          const llmInstance = getGlobalLLM();
          setLlm(llmInstance);
        } catch (error) {
          setModal({
            visible: true,
            title: "Module Not Available",
            message: "On-device LLM module is not available in this environment. It will work after building with EAS Build.",
          });
          return;
        }
      }

      // Release any currently loaded model
      if (isModelLoaded && llm) {
        await llm.release();
        setIsModelLoaded(false);
      }

      // Show loading state
      setModal({
        visible: true,
        title: "Loading Model",
        message: `Initializing ${model.name}... This may take a moment.`,
      });

      // Initialize the model
      await llm.initializeModel(model, {
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
    } catch (error) {
      setModal({
        visible: true,
        title: "Load Failed",
        message: `Failed to load ${model.name}: ${error}`,
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
          if (
            isModelLoaded &&
            selectedModel?.filename === model.filename
          ) {
            await llm.release();
            setIsModelLoaded(false);
            setSelectedModel(null);
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
            message: `Failed to delete ${model.name}: ${error}`,
          });
        }
      },
    });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    if (!isModelLoaded || !llm) {
      setModal({
        visible: true,
        title: "No Model Loaded",
        message: "Please download and load a model before chatting.",
      });
      return;
    }

    const userMessage = inputText.trim();
    setInputText("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsGenerating(true);

    try {
      // Get response from on-device LLM
      const response = await llm.chat(
        [
          ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: userMessage },
        ],
        {
          maxTokens: 512,
          temperature: 0.7,
        }
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);

      // Store in vector memory for RAG
      try {
        // Generate embeddings for the conversation
        const userEmbedding = await llm.embed(userMessage);
        const assistantEmbedding = await llm.embed(response);

        // Store both in vector store
        await vectorStore.addEmbedding({
          text: userMessage,
          vector: userEmbedding,
          timestamp: Date.now(),
          metadata: {
            role: "user",
            conversationId: Date.now().toString(),
          },
        });

        await vectorStore.addEmbedding({
          text: response,
          vector: assistantEmbedding,
          timestamp: Date.now(),
          metadata: {
            role: "assistant",
            conversationId: Date.now().toString(),
          },
        });
      } catch (embeddingError) {
        // Silently fail if embeddings don't work - chat still works
        console.log("Failed to generate embeddings:", embeddingError);
      }
    } catch (error) {
      setModal({
        visible: true,
        title: "Generation Failed",
        message: `Failed to generate response: ${error}`,
      });
      // Remove the user message if generation failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearMemory = () => {
    setModal({
      visible: true,
      title: "Clear All Memory",
      message:
        "This will delete all stored embeddings and conversations. This action cannot be undone.",
      isDestructive: true,
      onConfirm: () => {
        vectorStore.clearAll();
        setMemoryStats({
          totalMemories: 0,
          storageSize: 0,
          conversationCount: 0,
        });
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1 px-4 py-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Privacy-First AI
          </Text>
          <Text className="text-gray-600 mb-4">
            100% offline, on-device inference with semantic memory
          </Text>

          <View className="flex-row items-center space-x-2">
            <OfflineIndicator
              isOffline={isOffline}
              modelLoaded={isModelLoaded}
            />
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
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Available Models
          </Text>

          {RECOMMENDED_MODELS.map((model) => (
            <ModelInfoCard
              key={model.filename}
              modelName={model.name}
              sizeInMB={model.sizeInMB}
              quantization={model.quantization}
              isLoaded={
                isModelLoaded && selectedModel?.filename === model.filename
              }
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
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Offline Chat
            </Text>

            <View className="bg-white rounded-lg border border-gray-200 p-4 mb-3 min-h-[200px]">
              {messages.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                  <Ionicons
                    name="chatbubbles-outline"
                    size={48}
                    color="#d1d5db"
                  />
                  <Text className="text-gray-500 text-center mt-2">
                    Start a conversation
                  </Text>
                  <Text className="text-gray-400 text-xs text-center mt-1">
                    All processing happens on your device
                  </Text>
                </View>
              ) : (
                <ScrollView className="flex-1">
                  {messages.map((msg, idx) => (
                    <View
                      key={idx}
                      className={`mb-3 ${msg.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <View
                        className={`px-4 py-2 rounded-lg max-w-[80%] ${
                          msg.role === "user"
                            ? "bg-blue-500"
                            : "bg-gray-100"
                        }`}
                      >
                        <Text
                          className={`text-sm ${msg.role === "user" ? "text-white" : "text-gray-900"}`}
                        >
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
                  inputText.trim() && !isGenerating
                    ? "bg-blue-500"
                    : "bg-gray-300"
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
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Memory Statistics
          </Text>

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
      />
    </SafeAreaView>
  );
}
