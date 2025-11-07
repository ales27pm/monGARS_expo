/**
 * Modal to show when on-device ML features are not available
 * This happens in development/Vibecode environment before EAS build
 */

import React from "react";
import { View, Text, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface FeatureUnavailableModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FeatureUnavailableModal({
  visible,
  onClose,
}: FeatureUnavailableModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <View className="items-center mb-4">
            <View className="bg-blue-100 w-16 h-16 rounded-full items-center justify-center mb-3">
              <Ionicons name="information-circle" size={32} color="#3b82f6" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center">
              Native Module Required
            </Text>
          </View>

          <Text className="text-gray-600 text-center mb-4">
            On-device AI features require native modules that are only available
            after building the app with EAS Build.
          </Text>

          <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <Text className="text-sm text-blue-900 font-medium mb-2">
              Current Environment:
            </Text>
            <Text className="text-sm text-blue-800">
              • Vibecode Development Mode{"\n"}
              • Native modules not initialized{"\n"}
              • UI and navigation fully functional
            </Text>
          </View>

          <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <Text className="text-sm text-green-900 font-medium mb-2">
              To Enable AI Features:
            </Text>
            <Text className="text-sm text-green-800">
              1. Build app with EAS Build{"\n"}
              2. Install on physical device{"\n"}
              3. Models will work fully offline
            </Text>
          </View>

          <View className="bg-blue-500 rounded-lg overflow-hidden">
            <Text
              onPress={onClose}
              className="text-white font-semibold text-center py-3"
            >
              Got It
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
