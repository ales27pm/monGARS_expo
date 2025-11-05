/**
 * Privacy-First UI Components
 * Visual indicators for offline status, model loading, etc.
 */

import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface OfflineIndicatorProps {
  isOffline: boolean;
  modelLoaded: boolean;
}

/**
 * Shows offline/online status and model state
 */
export function OfflineIndicator({ isOffline, modelLoaded }: OfflineIndicatorProps) {
  return (
    <View className="flex-row items-center justify-center bg-green-500/10 px-4 py-2 rounded-full">
      <View className={`w-2 h-2 rounded-full mr-2 ${isOffline ? "bg-green-500" : "bg-gray-400"}`} />

      <Text className="text-xs font-medium text-gray-700">
        {isOffline ? (
          <Text>
            <Ionicons name="shield-checkmark" size={12} color="#10b981" />
            {" "}Offline & Private
          </Text>
        ) : (
          <Text>
            <Ionicons name="cloud" size={12} color="#9ca3af" />
            {" "}Online Mode
          </Text>
        )}
      </Text>

      {modelLoaded && isOffline && (
        <View className="ml-2">
          <Ionicons name="checkmark-circle" size={14} color="#10b981" />
        </View>
      )}
    </View>
  );
}

export interface ModelDownloadProgressProps {
  modelName: string;
  progress: number;
  downloadedMB: number;
  totalMB: number;
  speed?: number;
}

/**
 * Shows model download progress
 */
export function ModelDownloadProgress({
  modelName,
  progress,
  downloadedMB,
  totalMB,
  speed,
}: ModelDownloadProgressProps) {
  const speedMBps = speed ? (speed / (1024 * 1024)).toFixed(1) : null;

  return (
    <View className="bg-white p-4 rounded-lg shadow-sm">
      <Text className="font-semibold text-gray-900 mb-2">
        Downloading {modelName}
      </Text>

      {/* Progress bar */}
      <View className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <View
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>

      {/* Stats */}
      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-gray-600">
          {downloadedMB.toFixed(0)} / {totalMB.toFixed(0)} MB
        </Text>

        <View className="flex-row items-center">
          {speedMBps && (
            <Text className="text-xs text-gray-600 mr-2">
              {speedMBps} MB/s
            </Text>
          )}
          <Text className="text-xs font-medium text-blue-600">
            {progress.toFixed(0)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

export interface PrivacyBadgeProps {
  variant?: "minimal" | "detailed";
}

/**
 * Badge indicating privacy features
 */
export function PrivacyBadge({ variant = "minimal" }: PrivacyBadgeProps) {
  if (variant === "minimal") {
    return (
      <View className="flex-row items-center bg-green-50 px-3 py-1.5 rounded-full">
        <Ionicons name="lock-closed" size={12} color="#10b981" />
        <Text className="text-xs font-medium text-green-700 ml-1.5">
          Private
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-green-50 border border-green-200 p-4 rounded-lg">
      <View className="flex-row items-center mb-2">
        <Ionicons name="shield-checkmark" size={20} color="#10b981" />
        <Text className="font-semibold text-green-900 ml-2">
          Privacy-First AI
        </Text>
      </View>

      <View className="space-y-1">
        <PrivacyFeature
          icon="lock-closed"
          text="All processing on-device"
        />
        <PrivacyFeature
          icon="eye-off"
          text="No data sent to cloud"
        />
        <PrivacyFeature
          icon="airplane"
          text="Works 100% offline"
        />
      </View>
    </View>
  );
}

function PrivacyFeature({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="flex-row items-center py-1">
      <Ionicons name={icon as any} size={14} color="#10b981" />
      <Text className="text-xs text-green-800 ml-2">{text}</Text>
    </View>
  );
}

export interface ModelInfoCardProps {
  modelName: string;
  sizeInMB: number;
  quantization: string;
  isLoaded: boolean;
  isRecommended?: boolean;
  description?: string;
  onDownload?: () => void;
  onLoad?: () => void;
  onDelete?: () => void;
}

/**
 * Card showing model information and actions
 */
export function ModelInfoCard({
  modelName,
  sizeInMB,
  quantization,
  isLoaded,
  isRecommended,
  description,
  onDownload,
  onLoad,
  onDelete,
}: ModelInfoCardProps) {
  return (
    <View className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">{modelName}</Text>
          {isRecommended && (
            <View className="bg-blue-50 px-2 py-0.5 rounded mt-1 self-start">
              <Text className="text-xs text-blue-700 font-medium">
                Recommended
              </Text>
            </View>
          )}
        </View>

        {isLoaded && (
          <View className="bg-green-100 px-2 py-1 rounded">
            <Text className="text-xs font-medium text-green-700">Loaded</Text>
          </View>
        )}
      </View>

      {description && (
        <Text className="text-sm text-gray-600 mb-3">{description}</Text>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-3">
          <View className="flex-row items-center">
            <Ionicons name="download-outline" size={14} color="#6b7280" />
            <Text className="text-xs text-gray-600 ml-1">
              {sizeInMB.toFixed(0)} MB
            </Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="cube-outline" size={14} color="#6b7280" />
            <Text className="text-xs text-gray-600 ml-1">{quantization}</Text>
          </View>
        </View>

        <View className="flex-row space-x-2">
          {!isLoaded && onDownload && (
            <Text
              className="text-sm font-medium text-blue-600"
              onPress={onDownload}
            >
              Download
            </Text>
          )}

          {isLoaded && onLoad && (
            <Text
              className="text-sm font-medium text-green-600"
              onPress={onLoad}
            >
              Use
            </Text>
          )}

          {isLoaded && onDelete && (
            <Text
              className="text-sm font-medium text-red-600"
              onPress={onDelete}
            >
              Delete
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export interface MemoryStatsCardProps {
  totalMemories: number;
  storageSize: number;
  conversationCount: number;
  onClear?: () => void;
}

/**
 * Shows memory/vector storage statistics
 */
export function MemoryStatsCard({
  totalMemories,
  storageSize,
  conversationCount,
  onClear,
}: MemoryStatsCardProps) {
  const storageMB = (storageSize / (1024 * 1024)).toFixed(1);

  return (
    <View className="bg-white border border-gray-200 rounded-lg p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="font-semibold text-gray-900">Semantic Memory</Text>
        {onClear && (
          <Text
            className="text-sm font-medium text-red-600"
            onPress={onClear}
          >
            Clear All
          </Text>
        )}
      </View>

      <View className="space-y-2">
        <StatRow
          icon="library"
          label="Total Memories"
          value={totalMemories.toLocaleString()}
        />
        <StatRow
          icon="save"
          label="Storage Used"
          value={`${storageMB} MB`}
        />
        <StatRow
          icon="chatbubbles"
          label="Conversations"
          value={conversationCount.toString()}
        />
      </View>
    </View>
  );
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <View className="flex-row items-center">
        <Ionicons name={icon as any} size={16} color="#6b7280" />
        <Text className="text-sm text-gray-700 ml-2">{label}</Text>
      </View>
      <Text className="text-sm font-medium text-gray-900">{value}</Text>
    </View>
  );
}
