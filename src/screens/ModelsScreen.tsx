/**
 * Models Screen
 * Manage and download AI models
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  OfflineIndicator,
  ModelDownloadProgress,
  PrivacyBadge,
  ModelInfoCard,
} from "../components/PrivacyUI";

import {
  RECOMMENDED_MODELS,
  ModelConfig,
  ModelDownloadProgress as DownloadProgress,
} from "../types/models";

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

export default function ModelsScreen() {
  const [isOffline, setIsOffline] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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
  const setActiveModel = useModelStore((s) => s.setActiveModel);

  // Check network status
  useEffect(() => {
    setIsOffline(false);
  }, []);

  // Check downloaded models on mount
  useEffect(() => {
    checkDownloadedModels();
  }, [checkDownloadedModels]);

  // Sync selectedModel with activeModel from store
  useEffect(() => {
    if (activeModel) {
      setSelectedModel(activeModel);
    }
  }, [activeModel]);

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
        message: `${model.name} has been downloaded successfully. Go to the Chat tab to use it.`,
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
          message: "Please download the model first.",
        });
        return;
      }

      // Set as active model
      setActiveModel(model);

      setModal({
        visible: true,
        title: "Model Selected",
        message: `${model.name} is now active. Go to the Chat tab to start chatting.`,
      });
    } catch (error) {
      setModal({
        visible: true,
        title: "Selection Failed",
        message: `Failed to select ${model.name}: ${error}`,
      });
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

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 py-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            AI Models
          </Text>
          <Text className="text-gray-600 mb-4">
            Download and manage on-device AI models
          </Text>

          <View className="flex-row items-center space-x-2">
            <OfflineIndicator
              isOffline={isOffline}
              modelLoaded={!!activeModel}
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
              isLoaded={activeModel?.filename === model.filename}
              isDownloaded={isModelDownloaded(model)}
              isRecommended={model.recommended}
              description={model.description}
              onDownload={() => handleDownloadModel(model)}
              onLoad={() => handleLoadModel(model)}
              onDelete={() => handleDeleteModel(model)}
            />
          ))}
        </View>

        {/* Footer */}
        <View className="items-center py-6">
          <Ionicons name="shield-checkmark" size={32} color="#10b981" />
          <Text className="text-xs text-gray-500 text-center mt-2">
            All models run entirely on your device.{"\n"}
            No data is sent to the cloud.
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
