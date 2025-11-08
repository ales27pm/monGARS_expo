# MLX Turbo Module - On-Device LLM Inference

The MLX Turbo Module provides access to Apple's MLX framework for running large language models directly on iOS devices using Apple Silicon. This enables privacy-preserving, low-latency AI inference without requiring network connectivity or server costs.

## Features

- 🚀 **On-Device Inference** - Run LLMs locally on iPhone/iPad with Apple Silicon
- 🔒 **Privacy First** - No data sent to servers, all processing on-device
- ⚡ **Metal GPU Acceleration** - Optimized for Apple's unified memory architecture
- 💾 **Memory Efficient** - Support for 4-bit and 8-bit quantized models
- 🔄 **Streaming Tokens** - Real-time token generation with callbacks
- 💬 **Chat Sessions** - Maintain conversation history across messages
- 📦 **100+ Models** - Access mlx-community models from HuggingFace
- 🌐 **Offline Capable** - Works without internet after model download

## Requirements

### iOS Configuration

- **iOS Version**: 16.0+
- **Device**: iPhone/iPad with Apple Silicon (A14 or later recommended)
- **Memory**: 2-8GB available depending on model size
- **Xcode Capability**: Enable "Increased Memory Limit" in signing & capabilities

### Project Setup

Add the MLX Swift package to your iOS project:

1. In Xcode, go to **File → Add Package Dependencies**
2. Enter URL: `https://github.com/ml-explore/mlx-swift-examples`
3. Select branch: `main`
4. Add **MLXLLM** package to your target

## Supported Models

### Recommended Models by Device Memory

#### 2-4GB Devices (iPhone 12/13, iPad Air 4)
- **Qwen 2.5 0.5B** (400MB) - Fastest, works everywhere
- **Qwen 2.5 1.5B** (1.1GB) - Good balance

#### 4-6GB Devices (iPhone 14/15, iPad Pro M1)
- **Qwen 2.5 3B** (2.1GB) - High quality, efficient
- **Llama 3.2 3B** (2.0GB) - Meta's mobile model
- **Phi 3.5 Mini** (2.4GB) - Microsoft's compact model

#### 6GB+ Devices (iPhone 15 Pro, iPad Pro M2)
- **Qwen 2.5 7B** (4.2GB) - Excellent quality
- **Gemma 2 9B** (5.8GB) - Google's powerful model

### Model Naming Convention

Models on HuggingFace follow this pattern:
```
mlx-community/{model-name}-{size}-{quantization}
```

Examples:
- `mlx-community/Qwen2.5-1.5B-Instruct-4bit`
- `mlx-community/Llama-3.2-3B-Instruct-4bit`
- `mlx-community/gemma-2-2b-it-4bit`

## Usage

### 1. Check Device Compatibility

```typescript
import { MLXModule } from "@/native-modules";

// Get recommended models for this device
const { deviceMemoryGB, recommended } = await MLXModule.getRecommendedModels();

console.log(`Device has ${deviceMemoryGB}GB RAM`);
recommended.forEach(model => {
  console.log(`${model.name} - ${model.size} - ${model.description}`);
});
```

### 2. Load a Model

```typescript
// Load a model (downloads if needed)
const result = await MLXModule.loadModel(
  "mlx-community/Qwen2.5-1.5B-Instruct-4bit"
);

if (result.success) {
  console.log("Model loaded:", result.modelId);
  if (result.cached) {
    console.log("Loaded from cache");
  }
}
```

**Note**: First load will download the model (~1-5GB). Subsequent loads use cached files.

### 3. Single-Turn Text Generation

```typescript
// Generate text from a prompt
const response = await MLXModule.generate(
  "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
  "Explain quantum computing in simple terms",
  {
    temperature: 0.7,
    maxTokens: 300,
    topP: 0.9
  }
);

console.log(response.text);
console.log(`Generated ${response.tokensGenerated} tokens in ${response.timeElapsed}ms`);
```

### 4. Chat with Conversation History

```typescript
// Create a chat session
await MLXModule.createChatSession(
  "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
  "my-chat",
  "You are a helpful AI assistant specialized in programming."
);

// Send messages (context is maintained)
const response1 = await MLXModule.chatRespond(
  "my-chat",
  "What is React Native?",
  { maxTokens: 200 }
);

const response2 = await MLXModule.chatRespond(
  "my-chat",
  "How do I create a custom hook?",
  { maxTokens: 300 }
);

// Get conversation history
const { messages } = await MLXModule.getChatHistory("my-chat");
console.log(`Chat has ${messages.length} messages`);
```

### 5. Streaming Token Generation

```typescript
import { MLXEventEmitter } from "@/native-modules";

// Set up token listener
const tokenListener = MLXEventEmitter.addListener(
  "onTokenGenerated",
  (event) => {
    // Update UI with each token as it arrives
    console.log("Token:", event.token);
    // Append to text display: setDisplayText(prev => prev + event.token)
  }
);

const completeListener = MLXEventEmitter.addListener(
  "onGenerationComplete",
  (event) => {
    console.log("Generation complete!");
    console.log(`Generated ${event.tokensGenerated} tokens in ${event.timeElapsed}ms`);
  }
);

// Generate with streaming enabled
await MLXModule.chatRespond(
  "my-chat",
  "Write a story about a robot",
  { stream: true, maxTokens: 500 }
);

// Clean up listeners when done
tokenListener.remove();
completeListener.remove();
```

### 6. Memory Management

```typescript
// Check memory usage
const stats = await MLXModule.getMemoryStats();
console.log(`Using ${stats.usedMemoryMB}MB`);
console.log(`${stats.modelsLoaded} models loaded`);
console.log(`${stats.activeSessions} active chat sessions`);

// Unload model when done to free memory
const result = await MLXModule.unloadModel(
  "mlx-community/Qwen2.5-1.5B-Instruct-4bit"
);
console.log(`Closed ${result.sessionsClosed} sessions`);
```

## Generation Parameters

### Temperature (0.0-1.0)
Controls randomness in generation:
- **0.0-0.3**: Deterministic, focused responses
- **0.4-0.7**: Balanced creativity and coherence (recommended)
- **0.8-1.0**: More creative, less predictable

### Top P (0.0-1.0)
Nucleus sampling parameter:
- **0.9**: Good default, balances diversity
- **0.95**: More diverse outputs
- **0.8**: More focused outputs

### Max Tokens
Maximum number of tokens to generate:
- **100-200**: Short answers
- **300-500**: Detailed responses
- **1000+**: Long-form content

### Repeat Penalty (1.0-2.0)
Penalizes repetition:
- **1.0**: No penalty
- **1.1-1.2**: Recommended default
- **1.5+**: Strong penalty against repetition

## Complete Example: AI Chat Assistant

```typescript
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { MLXModule, MLXEventEmitter } from "@/native-modules";

export default function MLXChatScreen() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");

  const MODEL_ID = "mlx-community/Qwen2.5-1.5B-Instruct-4bit";
  const SESSION_ID = "main-chat";

  useEffect(() => {
    loadModel();

    // Set up streaming listeners
    const tokenListener = MLXEventEmitter.addListener(
      "onTokenGenerated",
      (event) => {
        setCurrentResponse(prev => prev + event.token);
      }
    );

    const completeListener = MLXEventEmitter.addListener(
      "onGenerationComplete",
      (event) => {
        setMessages(prev => [...prev, event.fullText]);
        setCurrentResponse("");
        setStreaming(false);
      }
    );

    return () => {
      tokenListener.remove();
      completeListener.remove();
      MLXModule.unloadModel(MODEL_ID);
    };
  }, []);

  const loadModel = async () => {
    try {
      await MLXModule.loadModel(MODEL_ID);
      await MLXModule.createChatSession(
        MODEL_ID,
        SESSION_ID,
        "You are a helpful AI assistant."
      );
      setModelLoaded(true);
    } catch (error) {
      console.error("Failed to load model:", error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, `You: ${userMessage}`]);
    setInput("");
    setStreaming(true);

    try {
      await MLXModule.chatRespond(SESSION_ID, userMessage, {
        stream: true,
        maxTokens: 500,
        temperature: 0.7
      });
    } catch (error) {
      console.error("Generation failed:", error);
      setStreaming(false);
    }
  };

  return (
    <View className="flex-1 p-4">
      {!modelLoaded ? (
        <Text>Loading model...</Text>
      ) : (
        <>
          <ScrollView className="flex-1 mb-4">
            {messages.map((msg, i) => (
              <Text key={i} className="mb-2">{msg}</Text>
            ))}
            {currentResponse && (
              <Text className="mb-2 text-blue-600">
                Assistant: {currentResponse}
              </Text>
            )}
          </ScrollView>

          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 border p-2 rounded"
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              editable={!streaming}
            />
            <Pressable
              className="bg-blue-500 px-4 py-2 rounded"
              onPress={sendMessage}
              disabled={streaming}
            >
              <Text className="text-white">Send</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
```

## Performance Tips

### 1. Model Selection
- Start with smaller models (0.5B-1.5B) for testing
- Use 4-bit quantization for best memory/quality balance
- Monitor memory usage with `getMemoryStats()`

### 2. Generation Settings
- Lower `maxTokens` for faster responses
- Use `temperature: 0.7` as a good default
- Enable streaming for better UX on long responses

### 3. Memory Management
- Unload models when switching between different models
- Clear chat history periodically for long conversations
- Monitor `usedMemoryMB` and unload if approaching limits

### 4. User Experience
- Show loading state during model download (first time)
- Display token streaming for real-time feedback
- Provide model size info before download
- Handle errors gracefully (out of memory, etc.)

## Troubleshooting

### "Model not loading"
- Check device has enough free memory
- Ensure "Increased Memory Limit" is enabled in Xcode
- Verify MLX Swift package is properly installed
- Check internet connection for first download

### "Out of memory during generation"
- Switch to a smaller model
- Reduce `maxTokens` parameter
- Unload other models/sessions
- Restart app to clear memory

### "Generation is slow"
- Expected on first run (model loading)
- Ensure device isn't thermal throttling
- Try a smaller model for faster inference
- Check if running in debug mode (release is faster)

## Current Implementation Status

⚠️ **Note**: This module currently provides the interface and architecture for MLX integration, but requires Swift implementation to be fully functional. The native methods return "NOT_IMPLEMENTED" errors.

### To Complete Implementation:

1. Create Swift bridge file connecting Objective-C++ to MLX Swift
2. Implement model loading with `LLMModelFactory.shared.loadContainer()`
3. Implement inference with `MLXLMCommon.generate()`
4. Implement `ChatSession` wrapper for conversation management
5. Add event emission for streaming tokens
6. Test with various models and devices

The TypeScript interface is production-ready and the architecture is designed for optimal performance once the Swift bridge is implemented.

## References

- [MLX Swift Documentation](https://github.com/ml-explore/mlx-swift)
- [MLX Swift Examples](https://github.com/ml-explore/mlx-swift-examples)
- [Apple MLX Framework](https://opensource.apple.com/projects/mlx/)
- [WWDC 2025: Explore LLM on Apple Silicon](https://developer.apple.com/videos/play/wwdc2025/298/)
- [MLX Community Models](https://huggingface.co/mlx-community)
