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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MemoryStatsCard } from "../components/PrivacyUI";
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
  }, []);

  const loadMemoryStats = () => {
    const stats = vectorStore.getStats();
    setMemoryStats({
      totalMemories: stats.totalEmbeddings,
      storageSize: stats.storageSize,
      conversationCount: stats.conversationCount,
    });
  };

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
