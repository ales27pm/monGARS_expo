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
  Alert,
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

  const handleDownloadModel = async (model: ModelConfig) => {
    try {
      setIsDownloading(true);
      setSelectedModel(model);

      // Simulate download progress for demo
      Alert.alert(
        "Demo Mode",
        "Model download is not yet implemented. This requires llama.rn native module to be fully initialized.\n\nTo enable:\n1. Models will be downloaded via GitHub Actions\n2. Or implement in-app download when native modules are ready",
        [{ text: "OK" }]
      );

      setIsDownloading(false);
      setDownloadProgress(null);
    } catch (error) {
      Alert.alert("Download Failed", `Failed to download model: ${error}`);
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleLoadModel = async (model: ModelConfig) => {
    Alert.alert(
      "Demo Mode",
      "Model loading requires llama.rn native module.\n\nThis will be available after:\n1. Downloading models via GitHub Actions\n2. Building with EAS Build\n\nThe UI and architecture are complete and ready!",
      [{ text: "OK" }]
    );
  };

  const handleDeleteModel = async (model: ModelConfig) => {
    Alert.alert(
      "Demo Mode",
      "Model management will be available when llama.rn is fully initialized.",
      [{ text: "OK" }]
    );
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsGenerating(true);

    try {
      // Simulate response for demo
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const demoResponse = "This is a demo response. Actual on-device inference will be available when llama.rn models are downloaded and loaded.\n\nThe complete implementation is ready:\n- Model downloads via GitHub Actions\n- LLM inference with llama.rn\n- Semantic memory with vector storage\n- RAG capabilities\n\nSee DEPLOYMENT.md for setup instructions!";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: demoResponse },
      ]);
    } catch (error) {
      Alert.alert("Error", `Failed to generate response: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearMemory = () => {
    Alert.alert(
      "Clear All Memory",
      "This will delete all stored embeddings and conversations. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            vectorStore.clearAll();
            setMemoryStats({
              totalMemories: 0,
              storageSize: 0,
              conversationCount: 0,
            });
          },
        },
      ]
    );
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
    </SafeAreaView>
  );
}
