/**
 * ChatInterface - Main chat UI component for the offline LLM app
 * Adapted from offLLM for Expo
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMlxChat, ChatTurn } from "../hooks/useMlxChat";

export default function ChatInterface() {
  const [inputText, setInputText] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const {
    busy,
    history,
    error: chatError,
    currentResponse,
    downloadStatus,
    downloadProgress,
    send,
    reset,
    isDownloading,
    isReady,
  } = useMlxChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [history, currentResponse]);

  const handleSend = async () => {
    if (!inputText.trim() || busy || !isReady) return;

    const message = inputText.trim();
    setInputText("");

    try {
      await send(message);
    } catch (e: any) {
      // Error is already set in the hook's state and displayed to user
      console.error("[ChatInterface] Send failed:", e?.message || String(e));
      console.error("[ChatInterface] Error stack:", e?.stack);
    }
  };

  const handleReset = () => {
    reset();
  };

  const renderMessage = (turn: ChatTurn, index: number) => {
    const isUser = turn.role === "user";

    return (
      <View key={`${turn.timestamp}-${index}`} className={`mb-4 ${isUser ? "items-end" : "items-start"}`}>
        <View
          className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`}
        >
          <Text className={`text-base ${isUser ? "text-white" : "text-gray-900 dark:text-white"}`}>{turn.content}</Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
          {new Date(turn.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  // Show loading/downloading state
  if (isDownloading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mt-4">Initializing...</Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
            Setting up your AI assistant
          </Text>
          {downloadStatus === "downloading" && (
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Downloading models ({Math.round(downloadProgress)}%)
            </Text>
          )}
          {downloadStatus === "error" && (
            <Text className="text-xs text-red-500 dark:text-red-300 mt-3">
              Failed to download required assets. Please check your connection and retry.
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Show initializing state
  if (!isReady) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mt-4">Loading...</Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">Preparing your AI assistant</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">AI Chat Assistant v2</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {isReady ? "Ready • Fetch API" : downloadStatus === "error" ? "Initialization error" : "Initializing..."}
            </Text>
          </View>
          <Pressable onPress={handleReset} className="bg-red-500 rounded-full px-4 py-2 active:opacity-70">
            <Text className="text-white font-semibold text-sm">Reset</Text>
          </Pressable>
        </View>

        {/* Error Display */}
        {chatError && (
          <View className="bg-red-100 dark:bg-red-900/30 px-4 py-3 border-b border-red-200 dark:border-red-800">
            <Text className="text-red-800 dark:text-red-200 text-sm">{chatError}</Text>
          </View>
        )}

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardDismissMode="on-drag"
        >
          {history.length === 0 && !currentResponse ? (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
              <Text className="text-lg text-gray-500 dark:text-gray-400 mt-4 text-center">
                Start a conversation with your
                {"\n"}
                AI assistant
              </Text>
            </View>
          ) : (
            <>
              {history.map((turn, index) => renderMessage(turn, index))}
              {currentResponse && (
                <View className="mb-4 items-start">
                  <View className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-200 dark:bg-gray-700">
                    <Text className="text-base text-gray-900 dark:text-white">
                      {currentResponse}
                      <Text className="text-blue-500">▌</Text>
                    </Text>
                  </View>
                </View>
              )}
              {busy && !currentResponse && (
                <View className="mb-4 items-start">
                  <View className="rounded-2xl px-4 py-3 bg-gray-200 dark:bg-gray-700">
                    <ActivityIndicator size="small" color="#3b82f6" />
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Input Area */}
        <View
          className="border-t border-gray-200 dark:border-gray-700 px-4 bg-white dark:bg-gray-900"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-center py-3 gap-2">
            <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor="#9ca3af"
                className="flex-1 text-base text-gray-900 dark:text-white py-3"
                multiline
                maxLength={500}
                editable={!busy && isReady}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
            </View>
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || busy || !isReady}
              className={`w-12 h-12 rounded-full items-center justify-center ${
                !inputText.trim() || busy || !isReady
                  ? "bg-gray-300 dark:bg-gray-700"
                  : "bg-blue-500 active:bg-blue-600"
              }`}
            >
              {busy ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
