import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import OnDeviceMLDemo from "./src/screens/OnDeviceMLDemo";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project.
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

/**
 * Privacy-First On-Device ML App
 *
 * Features:
 * - 100% offline AI inference with llama.rn
 * - Semantic memory with vector embeddings
 * - RAG (Retrieval-Augmented Generation)
 * - Privacy-first: all data stays on device
 * - No cloud API calls required
 * - Model downloads from HuggingFace
 * - Context management for conversations
 */

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <OnDeviceMLDemo />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
