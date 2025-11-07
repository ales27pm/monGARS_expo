/**
 * Settings Screen
 * App settings and memory management
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Modal,
  Switch,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MemoryStatsCard } from "../components/PrivacyUI";
import { vectorStore } from "../utils/vector-store";
import { useModelStore } from "../state/modelStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
              <View className="flex-1 bg-gray-200 rounded-lg overflow-hidden">
                <Text
                  onPress={onClose}
                  className="text-gray-700 font-semibold text-center py-3"
                >
                  {cancelText}
                </Text>
              </View>
            )}
            <View
              className={`flex-1 rounded-lg overflow-hidden ${
                isDestructive ? "bg-red-500" : "bg-blue-500"
              }`}
            >
              <Text
                onPress={() => {
                  if (onConfirm) {
                    onConfirm();
                  }
                  onClose();
                }}
                className="text-white font-semibold text-center py-3"
              >
                {confirmText}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const [memoryStats, setMemoryStats] = useState({
    totalMemories: 0,
    storageSize: 0,
    conversationCount: 0,
  });

  // Settings state
  const [autoSaveConversations, setAutoSaveConversations] = useState(true);
  const [enableVectorMemory, setEnableVectorMemory] = useState(true);
  const [contextSize, setContextSize] = useState(2048);
  const [maxTokens, setMaxTokens] = useState(512);
  const [temperature, setTemperature] = useState(0.7);
  const [gpuLayers, setGpuLayers] = useState(99);

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

  const activeModel = useModelStore((s) => s.activeModel);

  // Load memory stats
  useEffect(() => {
    loadMemoryStats();
    loadSettings();
  }, []);

  const loadMemoryStats = () => {
    const stats = vectorStore.getStats();
    setMemoryStats({
      totalMemories: stats.totalEmbeddings,
      storageSize: stats.storageSize,
      conversationCount: stats.conversationCount,
    });
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem("app-settings");
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setAutoSaveConversations(settings.autoSaveConversations ?? true);
        setEnableVectorMemory(settings.enableVectorMemory ?? true);
        setContextSize(settings.contextSize ?? 2048);
        setMaxTokens(settings.maxTokens ?? 512);
        setTemperature(settings.temperature ?? 0.7);
        setGpuLayers(settings.gpuLayers ?? 99);
      }
    } catch (error) {
      console.log("Failed to load settings:", error);
    }
  };

  const saveSettings = async () => {
    try {
      const settings = {
        autoSaveConversations,
        enableVectorMemory,
        contextSize,
        maxTokens,
        temperature,
        gpuLayers,
      };
      await AsyncStorage.setItem("app-settings", JSON.stringify(settings));
    } catch (error) {
      console.log("Failed to save settings:", error);
    }
  };

  // Save settings whenever they change
  useEffect(() => {
    saveSettings();
  }, [autoSaveConversations, enableVectorMemory, contextSize, maxTokens, temperature, gpuLayers]);

  const handleClearMemory = () => {
    setModal({
      visible: true,
      title: "Clear All Memory",
      message:
        "This will delete all stored embeddings and conversation history. This action cannot be undone.",
      isDestructive: true,
      onConfirm: () => {
        vectorStore.clearAll();
        setMemoryStats({
          totalMemories: 0,
          storageSize: 0,
          conversationCount: 0,
        });
        setModal({
          visible: true,
          title: "Memory Cleared",
          message: "All conversation memory has been deleted.",
        });
      },
    });
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 py-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Settings
          </Text>
          <Text className="text-gray-600">
            Manage your app settings and data
          </Text>
        </View>

        {/* Active Model */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Active Model
          </Text>

          <View className="bg-white rounded-lg border border-gray-200 p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">
                  {activeModel ? activeModel.name : "No model selected"}
                </Text>
                {activeModel && (
                  <Text className="text-sm text-gray-600 mt-1">
                    {activeModel.quantization} • {activeModel.sizeInMB}MB
                  </Text>
                )}
              </View>
              <Ionicons
                name={activeModel ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={activeModel ? "#10b981" : "#d1d5db"}
              />
            </View>
          </View>
        </View>

        {/* Memory Stats */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Memory & Storage
          </Text>

          <MemoryStatsCard
            totalMemories={memoryStats.totalMemories}
            storageSize={memoryStats.storageSize}
            conversationCount={memoryStats.conversationCount}
            onClear={handleClearMemory}
          />
        </View>

        {/* Model Settings */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Model Configuration
          </Text>

          <View className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-medium text-gray-900">
                  GPU Layers
                </Text>
                <Text className="text-sm text-gray-600">{gpuLayers}</Text>
              </View>
              <Text className="text-xs text-gray-500 mb-2">
                Higher values use more GPU (faster inference, more battery usage)
              </Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => setGpuLayers(Math.max(0, gpuLayers - 10))}
                  className="bg-gray-200 px-3 py-1 rounded-lg"
                >
                  <Text className="text-gray-700 font-medium">-</Text>
                </Pressable>
                <View className="flex-1 bg-gray-100 rounded-lg px-3 py-2">
                  <Text className="text-center text-gray-900">{gpuLayers} layers</Text>
                </View>
                <Pressable
                  onPress={() => setGpuLayers(Math.min(99, gpuLayers + 10))}
                  className="bg-blue-500 px-3 py-1 rounded-lg"
                >
                  <Text className="text-white font-medium">+</Text>
                </Pressable>
              </View>
            </View>

            <View className="mb-4 pt-4 border-t border-gray-200">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-medium text-gray-900">
                  Context Size
                </Text>
                <Text className="text-sm text-gray-600">{contextSize}</Text>
              </View>
              <Text className="text-xs text-gray-500 mb-2">
                Maximum conversation context (higher = more memory usage)
              </Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => setContextSize(512)}
                  className={`flex-1 px-3 py-2 rounded-lg ${contextSize === 512 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${contextSize === 512 ? "text-white" : "text-gray-700"}`}>512</Text>
                </Pressable>
                <Pressable
                  onPress={() => setContextSize(1024)}
                  className={`flex-1 px-3 py-2 rounded-lg ${contextSize === 1024 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${contextSize === 1024 ? "text-white" : "text-gray-700"}`}>1024</Text>
                </Pressable>
                <Pressable
                  onPress={() => setContextSize(2048)}
                  className={`flex-1 px-3 py-2 rounded-lg ${contextSize === 2048 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${contextSize === 2048 ? "text-white" : "text-gray-700"}`}>2048</Text>
                </Pressable>
                <Pressable
                  onPress={() => setContextSize(4096)}
                  className={`flex-1 px-3 py-2 rounded-lg ${contextSize === 4096 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${contextSize === 4096 ? "text-white" : "text-gray-700"}`}>4096</Text>
                </Pressable>
              </View>
            </View>

            <View className="mb-4 pt-4 border-t border-gray-200">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-medium text-gray-900">
                  Max Tokens
                </Text>
                <Text className="text-sm text-gray-600">{maxTokens}</Text>
              </View>
              <Text className="text-xs text-gray-500 mb-2">
                Maximum response length
              </Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => setMaxTokens(128)}
                  className={`flex-1 px-3 py-2 rounded-lg ${maxTokens === 128 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${maxTokens === 128 ? "text-white" : "text-gray-700"}`}>128</Text>
                </Pressable>
                <Pressable
                  onPress={() => setMaxTokens(256)}
                  className={`flex-1 px-3 py-2 rounded-lg ${maxTokens === 256 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${maxTokens === 256 ? "text-white" : "text-gray-700"}`}>256</Text>
                </Pressable>
                <Pressable
                  onPress={() => setMaxTokens(512)}
                  className={`flex-1 px-3 py-2 rounded-lg ${maxTokens === 512 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${maxTokens === 512 ? "text-white" : "text-gray-700"}`}>512</Text>
                </Pressable>
                <Pressable
                  onPress={() => setMaxTokens(1024)}
                  className={`flex-1 px-3 py-2 rounded-lg ${maxTokens === 1024 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${maxTokens === 1024 ? "text-white" : "text-gray-700"}`}>1024</Text>
                </Pressable>
              </View>
            </View>

            <View className="pt-4 border-t border-gray-200">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-medium text-gray-900">
                  Temperature
                </Text>
                <Text className="text-sm text-gray-600">{temperature.toFixed(1)}</Text>
              </View>
              <Text className="text-xs text-gray-500 mb-2">
                Controls randomness (lower = more focused, higher = more creative)
              </Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => setTemperature(0.1)}
                  className={`flex-1 px-3 py-2 rounded-lg ${temperature === 0.1 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${temperature === 0.1 ? "text-white" : "text-gray-700"}`}>0.1</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTemperature(0.5)}
                  className={`flex-1 px-3 py-2 rounded-lg ${temperature === 0.5 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${temperature === 0.5 ? "text-white" : "text-gray-700"}`}>0.5</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTemperature(0.7)}
                  className={`flex-1 px-3 py-2 rounded-lg ${temperature === 0.7 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${temperature === 0.7 ? "text-white" : "text-gray-700"}`}>0.7</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTemperature(1.0)}
                  className={`flex-1 px-3 py-2 rounded-lg ${temperature === 1.0 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${temperature === 1.0 ? "text-white" : "text-gray-700"}`}>1.0</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTemperature(1.5)}
                  className={`flex-1 px-3 py-2 rounded-lg ${temperature === 1.5 ? "bg-blue-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-center font-medium ${temperature === 1.5 ? "text-white" : "text-gray-700"}`}>1.5</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* App Settings */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            App Settings
          </Text>

          <View className="bg-white rounded-lg border border-gray-200">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <View className="flex-1 mr-3">
                <Text className="text-base font-medium text-gray-900 mb-1">
                  Auto-save Conversations
                </Text>
                <Text className="text-xs text-gray-600">
                  Automatically save chat history
                </Text>
              </View>
              <Switch
                value={autoSaveConversations}
                onValueChange={setAutoSaveConversations}
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={autoSaveConversations ? "#3b82f6" : "#f4f4f5"}
              />
            </View>

            <View className="flex-row items-center justify-between p-4">
              <View className="flex-1 mr-3">
                <Text className="text-base font-medium text-gray-900 mb-1">
                  Enable Vector Memory
                </Text>
                <Text className="text-xs text-gray-600">
                  Use embeddings for better context recall
                </Text>
              </View>
              <Switch
                value={enableVectorMemory}
                onValueChange={setEnableVectorMemory}
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={enableVectorMemory ? "#3b82f6" : "#f4f4f5"}
              />
            </View>
          </View>
        </View>

        {/* Privacy Information */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Privacy & Security
          </Text>

          <View className="bg-white rounded-lg border border-gray-200 p-4">
            <View className="flex-row items-start mb-3">
              <Ionicons name="shield-checkmark" size={24} color="#10b981" />
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium text-gray-900 mb-1">
                  100% On-Device
                </Text>
                <Text className="text-sm text-gray-600">
                  All AI processing happens locally. No data is sent to the cloud.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start mb-3">
              <Ionicons name="cloud-offline" size={24} color="#10b981" />
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium text-gray-900 mb-1">
                  Offline Capable
                </Text>
                <Text className="text-sm text-gray-600">
                  Works without an internet connection after models are downloaded.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <Ionicons name="lock-closed" size={24} color="#10b981" />
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium text-gray-900 mb-1">
                  Private by Design
                </Text>
                <Text className="text-sm text-gray-600">
                  Your conversations are stored locally with encryption.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* About */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            About
          </Text>

          <View className="bg-white rounded-lg border border-gray-200 p-4">
            <View className="mb-3">
              <Text className="text-sm text-gray-600 mb-1">Version</Text>
              <Text className="text-base font-medium text-gray-900">1.0.0</Text>
            </View>

            <View className="mb-3">
              <Text className="text-sm text-gray-600 mb-1">Framework</Text>
              <Text className="text-base font-medium text-gray-900">
                Expo SDK 53 + React Native 0.76.7
              </Text>
            </View>

            <View>
              <Text className="text-sm text-gray-600 mb-1">LLM Runtime</Text>
              <Text className="text-base font-medium text-gray-900">
                llama.rn (llama.cpp)
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="items-center py-6">
          <Ionicons name="heart" size={24} color="#ef4444" />
          <Text className="text-xs text-gray-500 text-center mt-2">
            Built with Vibecode
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
    </View>
  );
}
