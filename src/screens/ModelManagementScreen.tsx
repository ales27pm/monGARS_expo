import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useModelStore } from "../state/modelStore";
import { ModelConfig } from "../types/models";
import { modelDownloadService } from "../services/modelDownloadService";

export default function ModelManagementScreen() {
  const availableModels = useModelStore((s) => s.availableModels);
  const activeModel = useModelStore((s) => s.activeModel);
  const setActiveModel = useModelStore((s) => s.setActiveModel);
  const downloadModel = useModelStore((s) => s.downloadModel);
  const deleteModel = useModelStore((s) => s.deleteModel);
  const cancelDownload = useModelStore((s) => s.cancelDownload);
  const isModelDownloaded = useModelStore((s) => s.isModelDownloaded);
  const getDownloadProgress = useModelStore((s) => s.getDownloadProgress);
  const checkDownloadedModels = useModelStore((s) => s.checkDownloadedModels);

  const [totalStorage, setTotalStorage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeModels();
  }, []);

  const initializeModels = async () => {
    setLoading(true);
    await checkDownloadedModels();
    const storage = await modelDownloadService.getTotalStorageUsed();
    setTotalStorage(storage);
    setLoading(false);
  };

  const handleDownload = async (model: ModelConfig) => {
    try {
      await downloadModel(model);
      Alert.alert("Success", `${model.name} downloaded successfully!`);
      await initializeModels();
    } catch (error) {
      Alert.alert(
        "Download Failed",
        `Failed to download ${model.name}. Please try again.`
      );
    }
  };

  const handleDelete = (model: ModelConfig) => {
    Alert.alert(
      "Delete Model",
      `Are you sure you want to delete ${model.name}? This will free up ${model.sizeInMB}MB of storage.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteModel(model);
            await initializeModels();
          },
        },
      ]
    );
  };

  const handleSelectModel = (model: ModelConfig) => {
    if (!isModelDownloaded(model)) {
      Alert.alert(
        "Model Not Downloaded",
        "Please download this model first before selecting it.",
        [{ text: "OK" }]
      );
      return;
    }
    setActiveModel(model);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-4 text-gray-600">Loading models...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        {/* Header Stats */}
        <View className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Model Library
          </Text>
          <Text className="text-gray-600 mb-4">
            Download and manage on-device AI models
          </Text>
          <View className="flex-row items-center justify-between pt-4 border-t border-gray-100">
            <View>
              <Text className="text-sm text-gray-500">Storage Used</Text>
              <Text className="text-lg font-semibold text-gray-900">
                {formatBytes(totalStorage)}
              </Text>
            </View>
            <View>
              <Text className="text-sm text-gray-500">Active Model</Text>
              <Text className="text-lg font-semibold text-gray-900">
                {activeModel ? activeModel.name.split(" ")[0] : "None"}
              </Text>
            </View>
          </View>
        </View>

        {/* Model List */}
        <Text className="text-lg font-bold text-gray-900 mb-3 px-1">
          Available Models
        </Text>

        {availableModels.map((model) => {
          const downloaded = isModelDownloaded(model);
          const progress = getDownloadProgress(model);
          const isActive = activeModel?.filename === model.filename;

          return (
            <ModelCard
              key={model.filename}
              model={model}
              downloaded={downloaded}
              isActive={isActive}
              progress={progress}
              onDownload={() => handleDownload(model)}
              onDelete={() => handleDelete(model)}
              onSelect={() => handleSelectModel(model)}
              onCancel={() => cancelDownload(model)}
            />
          );
        })}

        {/* Clear All Button */}
        {totalStorage > 0 && (
          <Pressable
            onPress={() => {
              Alert.alert(
                "Clear All Models",
                "Are you sure you want to delete all downloaded models?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                      await modelDownloadService.clearAllModels();
                      setActiveModel(null);
                      await initializeModels();
                    },
                  },
                ]
              );
            }}
            className="bg-red-50 rounded-xl p-4 mt-4 mb-8 active:opacity-70"
          >
            <Text className="text-red-600 font-semibold text-center">
              Clear All Models
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

interface ModelCardProps {
  model: ModelConfig;
  downloaded: boolean;
  isActive: boolean;
  progress: any;
  onDownload: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onCancel: () => void;
}

function ModelCard({
  model,
  downloaded,
  isActive,
  progress,
  onDownload,
  onDelete,
  onSelect,
  onCancel,
}: ModelCardProps) {
  const isDownloading = progress !== null;

  return (
    <Pressable
      onPress={onSelect}
      className={`bg-white rounded-2xl p-4 mb-3 shadow-sm active:opacity-70 ${
        isActive ? "border-2 border-blue-500" : ""
      }`}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-lg font-bold text-gray-900">
              {model.name}
            </Text>
            {model.recommended && (
              <View className="bg-blue-100 px-2 py-0.5 rounded-full">
                <Text className="text-xs font-semibold text-blue-700">
                  Recommended
                </Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-gray-600">{model.description}</Text>
        </View>
        {isActive && (
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        )}
      </View>

      {/* Model Info */}
      <View className="flex-row items-center gap-4 mb-3">
        <View className="flex-row items-center gap-1">
          <Text className="text-xs text-gray-500">Size:</Text>
          <Text className="text-xs font-semibold text-gray-700">
            {model.sizeInMB} MB
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs text-gray-500">Quant:</Text>
          <Text className="text-xs font-semibold text-gray-700">
            {model.quantization}
          </Text>
        </View>
      </View>

      {/* Download Progress */}
      {isDownloading && (
        <View className="mb-3">
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-blue-500"
              style={{ width: `${progress.progress}%` }}
            />
          </View>
          <Text className="text-xs text-gray-600 mt-1">
            {progress.progress.toFixed(1)}% - Downloading...
          </Text>
        </View>
      )}

      {/* Actions */}
      <View className="flex-row gap-2">
        {!downloaded && !isDownloading && (
          <Pressable
            onPress={onDownload}
            className="flex-1 bg-blue-500 rounded-xl py-3 px-4 flex-row items-center justify-center gap-2 active:opacity-70"
          >
            <Ionicons name="download-outline" size={18} color="white" />
            <Text className="text-white font-semibold">Download</Text>
          </Pressable>
        )}

        {isDownloading && (
          <Pressable
            onPress={onCancel}
            className="flex-1 bg-gray-200 rounded-xl py-3 px-4 flex-row items-center justify-center gap-2 active:opacity-70"
          >
            <Text className="text-gray-700 font-semibold">Cancel</Text>
          </Pressable>
        )}

        {downloaded && !isDownloading && (
          <>
            <Pressable
              onPress={onSelect}
              className={`flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center gap-2 active:opacity-70 ${
                isActive ? "bg-green-500" : "bg-blue-500"
              }`}
            >
              {isActive ? (
                <Ionicons name="checkmark-circle" size={18} color="white" />
              ) : (
                <Ionicons name="ellipse-outline" size={18} color="white" />
              )}
              <Text className="text-white font-semibold">
                {isActive ? "Active" : "Select"}
              </Text>
            </Pressable>

            <Pressable
              onPress={onDelete}
              className="bg-red-50 rounded-xl py-3 px-4 flex-row items-center justify-center active:opacity-70"
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </Pressable>
          </>
        )}
      </View>
    </Pressable>
  );
}
