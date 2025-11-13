/**
 * Chat Screen
 * On-device AI chat interface
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useModelStore } from "../state/modelStore";
import { useMlxChat } from "../hooks/useMlxChat";
import { isNativeModuleUnavailableError } from "../utils/nativeModuleError";
import { configureSemanticMemoryEmbedding, getGlobalMemory, SemanticMemory } from "../utils/semantic-memory";
import { ContextEngineer } from "../services/contextEngineer";
import { PROMPT_TEMPLATES, type Message as ContextMessage } from "../utils/context-management";

// Custom Modal Component
interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

function CustomModal({ visible, title, message, onClose }: CustomModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <Text className="text-xl font-bold text-gray-900 mb-2">{title}</Text>
          <Text className="text-gray-600 mb-6">{message}</Text>

          <View className="bg-blue-500 rounded-lg overflow-hidden">
            <Text onPress={onClose} className="text-white font-semibold text-center py-3">
              OK
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Settings state
  const [settings, setSettings] = useState({
    contextSize: 2048,
    maxTokens: 512,
    temperature: 0.7,
    gpuLayers: 99,
    enableVectorMemory: true,
  });

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
  const [chatMode, setChatMode] = useState<"native" | "cloud">("native");
  const [fallbackActivated, setFallbackActivated] = useState(false);
  const [memory, setMemory] = useState<SemanticMemory | null>(null);
  const conversationIdRef = useRef<string>(`${Date.now()}`);
  const contextEngineerRef = useRef<ContextEngineer | null>(null);

  const {
    ready: cloudReady,
    send: sendCloudMessage,
    busy: cloudBusy,
    error: cloudError,
  } = useMlxChat({
    maxTokens: settings.maxTokens,
    temperature: settings.temperature,
    mode: "cloud-only",
    allowCloudFallback: false,
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    let isMounted = true;

    getGlobalMemory()
      .then((instance) => {
        if (isMounted) {
          setMemory(instance);
        }
      })
      .catch((error) => {
        console.error("[ChatScreen] Failed to initialize semantic memory:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (memory) {
      contextEngineerRef.current = new ContextEngineer({ memory });
    } else {
      contextEngineerRef.current = null;
    }
  }, [memory]);

  useEffect(() => {
    if (chatMode === "native" && llm) {
      configureSemanticMemoryEmbedding({ type: "on-device", llm }).catch((error) =>
        console.error("[ChatScreen] Failed to enable on-device semantic memory:", error),
      );
    } else if (chatMode === "cloud") {
      configureSemanticMemoryEmbedding({ type: "cloud" }).catch((error) =>
        console.error("[ChatScreen] Failed to enable cloud semantic memory:", error),
      );
    }
  }, [chatMode, llm]);

  useEffect(() => {
    if (chatMode === "cloud") {
      setIsGenerating(cloudBusy);
    }
  }, [chatMode, cloudBusy]);

  useEffect(() => {
    if (chatMode === "cloud" && cloudError) {
      setModal({
        visible: true,
        title: "Cloud Chat Error",
        message: cloudError,
      });
    }
  }, [chatMode, cloudError]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem("app-settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({
          contextSize: parsed.contextSize ?? 2048,
          maxTokens: parsed.maxTokens ?? 512,
          temperature: parsed.temperature ?? 0.7,
          gpuLayers: parsed.gpuLayers ?? 99,
          enableVectorMemory: parsed.enableVectorMemory ?? true,
        });
      }
    } catch (error) {
      console.log("Failed to load settings:", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendWithCloud = async (userMessage: string): Promise<string | null> => {
    if (!cloudReady) {
      setModal({
        visible: true,
        title: "Cloud Chat Not Ready",
        message: cloudError ?? "Cloud fallback is not ready yet. Check your OpenAI API key configuration.",
      });
      return null;
    }

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    scrollToBottom();
    setIsGenerating(true);

    try {
      const response = await sendCloudMessage(userMessage);
      setMessages((prev) => [...prev, { role: "assistant", content: response.trim() }]);
      scrollToBottom();
      return response.trim();
    } catch (error) {
      const message = (error as Error | null | undefined)?.message ?? String(error);
      setModal({
        visible: true,
        title: "Generation Failed",
        message: `Failed to generate response: ${message}`,
      });
      setMessages((prev) => prev.slice(0, -1));
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const loadLLM = async (): Promise<any | null> => {
    try {
      if (!activeModel) {
        throw new Error("No model selected");
      }

      const { getGlobalLLM } = await import("../utils/on-device-llm");
      const llmInstance = getGlobalLLM();

      // Check if model needs to be initialized
      const modelInfo = llmInstance.getModelInfo();
      const needsInit = !modelInfo.isInitialized || modelInfo.modelConfig?.filename !== activeModel.filename;

      if (needsInit) {
        // Show loading state
        setIsModelLoaded(false);

        // Initialize the model with settings
        console.log("Initializing model with settings:", {
          gpuLayers: settings.gpuLayers,
          contextSize: settings.contextSize,
          model: activeModel.filename,
        });

        await llmInstance.initializeModel(activeModel, {
          gpuLayers: settings.gpuLayers,
          contextSize: settings.contextSize,
          useMemoryLock: true,
        });

        console.log("Model initialized successfully");
        setIsModelLoaded(true);
      } else {
        console.log("Model already initialized");
        setIsModelLoaded(true);
      }

      setChatMode("native");
      setLlm(llmInstance);
      try {
        await configureSemanticMemoryEmbedding({ type: "on-device", llm: llmInstance });
      } catch (configurationError) {
        console.error("[ChatScreen] Failed to configure semantic memory for on-device mode:", configurationError);
      }
      return llmInstance;
    } catch (error) {
      console.error("Failed to load LLM:", error);
      setIsModelLoaded(false);

      if (isNativeModuleUnavailableError(error)) {
        setChatMode("cloud");
        try {
          await configureSemanticMemoryEmbedding({ type: "cloud" });
        } catch (configurationError) {
          console.error("[ChatScreen] Failed to configure semantic memory for cloud fallback:", configurationError);
        }

        if (!fallbackActivated) {
          setFallbackActivated(true);
          setModal({
            visible: true,
            title: "Using Cloud Fallback",
            message:
              "The on-device AI module is not available in this build. We'll automatically use the secure cloud fallback (GPT-4o mini) so you can keep testing. Build a native binary with EAS or Xcode to enable on-device inference.",
          });
        }

        return null;
      }

      const message = (error as Error | null | undefined)?.message || "Failed to initialize model.";
      setModal({
        visible: true,
        title: "Native Module Not Available",
        message,
      });
      throw error;
    }
  };

  const handleSendMessage = async () => {
    const userMessage = inputText.trim();
    if (!userMessage) {
      return;
    }

    setInputText("");
    Keyboard.dismiss();
    const conversationId = conversationIdRef.current;

    const persistConversation = async (assistantResponse: string, source: "native" | "cloud") => {
      if (!settings.enableVectorMemory || !assistantResponse) {
        return;
      }

      try {
        const memoryInstance = memory ?? (await getGlobalMemory().catch(() => null));
        if (memoryInstance) {
          if (!memory) {
            setMemory(memoryInstance);
          }
          await memoryInstance.addConversationMessage(userMessage, "user", conversationId);
          await memoryInstance.addConversationMessage(assistantResponse, "assistant", conversationId);
        }
      } catch (embeddingError) {
        console.log(`Failed to store ${source} conversation in semantic memory:`, embeddingError);
      }
    };

    if (chatMode === "cloud") {
      const response = await sendWithCloud(userMessage);

      if (response) {
        await persistConversation(response, "cloud");
      }

      return;
    }

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
    let llmInstance = llm;
    if (!llmInstance) {
      try {
        llmInstance = await loadLLM();
      } catch {
        return; // loadLLM will show error modal
      }
    }

    if (!llmInstance) {
      const response = await sendWithCloud(userMessage);
      if (response) {
        await persistConversation(response, "cloud");
      }
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    scrollToBottom();
    setIsGenerating(true);

    try {
      const conversationMessages: ContextMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ];

      let engineeredMessages: ContextMessage[] = conversationMessages;

      if (settings.enableVectorMemory) {
        const engineer = contextEngineerRef.current;
        if (engineer) {
          try {
            const engineered = await engineer.engineerContext(userMessage, conversationMessages, {
              conversationId,
              systemPrompt: PROMPT_TEMPLATES.ragAssistant,
            });
            if (engineered.messages.length > 0) {
              engineeredMessages = engineered.messages;
            }
          } catch (contextError) {
            console.warn("[ChatScreen] Context engineering failed:", contextError);
          }
        }
      }

      const normalizedMessages = engineeredMessages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      // Get response from on-device LLM
      const response = await llmInstance.chat(normalizedMessages, {
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
      });

      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      scrollToBottom();

      // Store in semantic memory for RAG
      await persistConversation(response, "native");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setModal({
        visible: true,
        title: "Generation Failed",
        message: `Failed to generate response: ${errorMessage}`,
      });
      // Remove the user message if generation failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    conversationIdRef.current = `${Date.now()}`;
  };

  const statusIndicatorColor =
    chatMode === "cloud"
      ? cloudReady
        ? "bg-blue-500"
        : "bg-amber-500"
      : isModelLoaded
        ? "bg-green-500"
        : "bg-gray-400";

  const statusIndicatorLabel =
    chatMode === "cloud"
      ? cloudReady
        ? "Cloud fallback"
        : "Cloud unavailable"
      : isModelLoaded
        ? "Ready"
        : "Not loaded";

  const modelTitle =
    chatMode === "cloud" ? "Cloud Fallback · GPT-4o mini" : activeModel ? activeModel.name : "No Model Selected";

  const footerIcon: keyof typeof Ionicons.glyphMap = chatMode === "cloud" ? "cloud-outline" : "shield-checkmark";
  const footerIconColor = chatMode === "cloud" ? "#3b82f6" : "#10b981";
  const footerMessage =
    chatMode === "cloud" ? " Cloud fallback uses your OpenAI API key." : " All data stays on your device";

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
              <Text className="text-lg font-semibold text-gray-900">{modelTitle}</Text>
              <View className="flex-row items-center mt-1">
                <View className={`w-2 h-2 rounded-full mr-2 ${statusIndicatorColor}`} />
                <Text className="text-xs text-gray-600">{statusIndicatorLabel}</Text>
              </View>
              {chatMode === "cloud" && (
                <Text className="text-[11px] text-gray-500 mt-1">
                  On-device llama.rn is unavailable in this build. Using GPT-4o mini via secure cloud fallback.
                </Text>
              )}
            </View>

            {messages.length > 0 && (
              <Text onPress={handleClearChat} className="text-blue-500 text-sm font-medium">
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
              <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
              <Text className="text-gray-500 text-center mt-4 text-lg">Start a conversation</Text>
              {chatMode === "cloud" ? (
                <View className="mt-4 px-8">
                  <Text className="text-gray-400 text-sm text-center mb-3">
                    Cloud fallback is active. Responses are generated with GPT-4o mini through your configured OpenAI
                    account.
                  </Text>
                  <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <View className="flex-row items-start">
                      <Ionicons name="cloud-outline" size={20} color="#3b82f6" />
                      <View className="flex-1 ml-2">
                        <Text className="text-blue-900 font-semibold mb-1">
                          Build a native binary to restore offline mode
                        </Text>
                        <Text className="text-blue-800 text-xs">
                          Compile with EAS or Xcode to bundle llama.rn and run fully on-device. Until then, cloud
                          inference keeps the chat usable for preview builds.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : activeModel ? (
                <View className="mt-4 px-8">
                  <Text className="text-gray-400 text-sm text-center mb-3">All processing happens on your device</Text>
                  {!isModelLoaded && (
                    <View className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <View className="flex-row items-start">
                        <Ionicons name="warning" size={20} color="#f59e0b" />
                        <View className="flex-1 ml-2">
                          <Text className="text-amber-900 font-semibold mb-1">Build Required</Text>
                          <Text className="text-amber-800 text-xs">
                            On-device AI requires a compiled iOS build. Vibecode preview cannot run native modules.
                            Build with EAS or Xcode to test inference.
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <Text className="text-gray-400 text-sm text-center mt-2 px-8">
                  Select a model in the Models tab to get started
                </Text>
              )}
            </View>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <View key={idx} className={`mb-4 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <View
                    className={`px-4 py-3 rounded-2xl max-w-[85%] ${
                      msg.role === "user" ? "bg-blue-500" : "bg-white border border-gray-200"
                    }`}
                  >
                    <Text className={`text-base ${msg.role === "user" ? "text-white" : "text-gray-900"}`}>
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
                inputText.trim() && !isGenerating ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <Text onPress={handleSendMessage} disabled={!inputText.trim() || isGenerating}>
                <Ionicons name="send" size={20} color="white" />
              </Text>
            </View>
          </View>

          <Text className="text-xs text-gray-500 text-center mt-2">
            <Ionicons name={footerIcon} size={12} color={footerIconColor} />
            {footerMessage}
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
