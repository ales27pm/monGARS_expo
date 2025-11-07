/**
 * Chat Screen
 * On-device AI chat interface
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useModelStore } from "../state/modelStore";
import FeatureUnavailableModal from "./FeatureUnavailableModal";

export default function ChatScreen() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [inputText, setInputText] = useState("");
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Model store
  const activeModel = useModelStore((s) => s.activeModel);
  const isModelDownloaded = useModelStore((s) => s.isModelDownloaded);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Check if model is selected
    if (!activeModel) {
      setShowFeatureModal(true);
      return;
    }

    // Check if model is downloaded
    if (activeModel && !isModelDownloaded(activeModel)) {
      setShowFeatureModal(true);
      return;
    }

    // In Vibecode/development environment, native modules aren't available
    // Show the feature unavailable modal
    setShowFeatureModal(true);
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
                    activeModel ? "bg-blue-500" : "bg-gray-400"
                  }`}
                />
                <Text className="text-xs text-gray-600">
                  {activeModel ? "Model selected" : "No model"}
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
                On-Device AI Chat
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-2 px-8">
                {activeModel
                  ? "Native modules required for chat. Build with EAS to enable."
                  : "Select a model in the Models tab to get started"}
              </Text>

              {activeModel && (
                <View className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 mx-8">
                  <Text className="text-sm text-blue-900 text-center">
                    <Ionicons name="information-circle" size={16} color="#1e40af" />
                    {" Tap send to see more info"}
                  </Text>
                </View>
              )}
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
              />
            </View>

            <View
              className={`w-10 h-10 rounded-full items-center justify-center ${
                inputText.trim()
                  ? "bg-blue-500"
                  : "bg-gray-300"
              }`}
            >
              <Text
                onPress={handleSendMessage}
                disabled={!inputText.trim()}
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

      {/* Feature Unavailable Modal */}
      <FeatureUnavailableModal
        visible={showFeatureModal}
        onClose={() => setShowFeatureModal(false)}
      />
    </KeyboardAvoidingView>
  );
}
