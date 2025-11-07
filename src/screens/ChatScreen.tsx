/**
 * Chat Screen
 * On-device AI chat interface
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useModelStore } from "../state/modelStore";
import { vectorStore } from "../utils/vector-store";

// Custom Modal Component
interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  confirmText?: string;
}

function CustomModal({
  visible,
  title,
  message,
  onClose,
  confirmText = "OK",
}: CustomModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <Text className="text-xl font-bold text-gray-900 mb-2">{title}</Text>
          <Text className="text-gray-600 mb-6">{message}</Text>

          <View className="bg-blue-500 rounded-lg overflow-hidden">
            <Text
              onPress={onClose}
              className="text-white font-semibold text-center py-3"
            >
              {confirmText}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Modal state
  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: "",
    message: "",
  });

  // Model store
  const activeModel = useModelStore((s) => s.activeModel);
  const isModelDownloaded = useModelStore((s) => s.isModelDownloaded);

  // LLM instance - lazy loaded
  const [llm, setLlm] = useState<any>(null);

  // DON'T automatically load LLM on mount - wait for user to explicitly load model in Models tab
  // This prevents NativeEventEmitter errors when native modules aren't ready yet

  const loadLLM = async () => {
    try {
      const { getGlobalLLM } = await import("../utils/on-device-llm");
      const llmInstance = getGlobalLLM();
      setLlm(llmInstance);

      // Check if model needs to be initialized
      if (activeModel) {
        const modelInfo = llmInstance.getModelInfo();
        if (!modelInfo.isInitialized || modelInfo.modelConfig?.filename !== activeModel.filename) {
          // Initialize the model
          await llmInstance.initializeModel(activeModel, {
            gpuLayers: 99,
            contextSize: 2048,
            useMemoryLock: true,
          });
          setIsModelLoaded(true);
        } else {
          setIsModelLoaded(true);
        }
      }
    } catch (error) {
      setModal({
        visible: true,
        title: "Module Not Available",
        message: "On-device LLM module is not available yet. This will work after building the app.",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    if (!activeModel) {
      setModal({
        visible: true,
        title: "No Model Selected",
        message: "Please select a model in the Models tab first.",
      });
      return;
    }

    if (!isModelDownloaded(activeModel)) {
      setModal({
        visible: true,
        title: "Model Not Downloaded",
        message: "Please download the model in the Models tab first.",
      });
      return;
    }

    // Try to load LLM if not already loaded
    if (!llm) {
      try {
        await loadLLM();
        if (!llm && !isModelLoaded) {
          return; // loadLLM will show error modal
        }
      } catch (error) {
        return; // loadLLM will show error modal
      }
    }

    const userMessage = inputText.trim();
    setInputText("");
    Keyboard.dismiss();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsGenerating(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

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

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Store in vector memory for RAG
      try {
        const userEmbedding = await llm.embed(userMessage);
        const assistantEmbedding = await llm.embed(response);

        const conversationId = Date.now().toString();

        await vectorStore.addEmbedding({
          text: userMessage,
          vector: userEmbedding,
          timestamp: Date.now(),
          metadata: {
            role: "user",
            conversationId,
          },
        });

        await vectorStore.addEmbedding({
          text: response,
          vector: assistantEmbedding,
          timestamp: Date.now(),
          metadata: {
            role: "assistant",
            conversationId,
          },
        });
      } catch (embeddingError) {
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

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <View className="flex-1">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                {activeModel ? activeModel.name : "No Model Selected"}
              </Text>
              <View className="flex-row items-center mt-1">
                <View
                  className={`w-2 h-2 rounded-full mr-2 ${
                    isModelLoaded ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <Text className="text-xs text-gray-600">
                  {isModelLoaded ? "Ready" : "Not loaded"}
                </Text>
              </View>
            </View>

            {messages.length > 0 && (
              <Text
                onPress={handleClearChat}
                className="text-blue-500 text-sm font-medium"
              >
                Clear
              </Text>
            )}
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {messages.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons
                name="chatbubbles-outline"
                size={64}
                color="#d1d5db"
              />
              <Text className="text-gray-500 text-center mt-4 text-lg">
                Start a conversation
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-2 px-8">
                {activeModel
                  ? "All processing happens on your device"
                  : "Select a model in the Models tab to get started"}
              </Text>
            </View>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <View
                  key={idx}
                  className={`mb-4 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <View
                    className={`px-4 py-3 rounded-2xl max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-blue-500"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-base ${msg.role === "user" ? "text-white" : "text-gray-900"}`}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              ))}

              {isGenerating && (
                <View className="items-start mb-4">
                  <View className="bg-white border border-gray-200 px-4 py-4 rounded-2xl">
                    <ActivityIndicator size="small" color="#3b82f6" />
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Input */}
        <View className="bg-white border-t border-gray-200 px-4 py-3">
          <View className="flex-row items-end space-x-2">
            <View className="flex-1 bg-gray-100 rounded-2xl px-4 py-2">
              <TextInput
                className="text-base text-gray-900 max-h-24"
                placeholder="Type your message..."
                placeholderTextColor="#9ca3af"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
                editable={!isGenerating}
              />
            </View>

            <View
              className={`w-10 h-10 rounded-full items-center justify-center ${
                inputText.trim() && !isGenerating
                  ? "bg-blue-500"
                  : "bg-gray-300"
              }`}
            >
              <Text
                onPress={handleSendMessage}
                disabled={!inputText.trim() || isGenerating}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color="white"
                />
              </Text>
            </View>
          </View>

          <Text className="text-xs text-gray-500 text-center mt-2">
            <Ionicons name="shield-checkmark" size={12} color="#10b981" />
            {" All data stays on your device"}
          </Text>
        </View>
      </View>

      {/* Custom Modal */}
      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal({ ...modal, visible: false })}
      />
    </KeyboardAvoidingView>
  );
}
