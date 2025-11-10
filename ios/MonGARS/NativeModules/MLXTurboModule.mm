#import "MLXTurboModule.h"
#import <React/RCTLog.h>

/**
 * MLX Turbo Module for On-Device LLM Inference
 *
 * This module provides access to Apple's MLX framework for running
 * large language models directly on iOS devices using Apple Silicon.
 *
 * Features:
 * - Load quantized models (4-bit, 8-bit) optimized for mobile
 * - Streaming token generation with real-time callbacks
 * - Chat session management with conversation history
 * - Memory-efficient inference using Apple's unified memory
 * - Offline inference with no network requirements
 *
 * Supported Models:
 * - Qwen 2.5 (0.5B, 1.5B, 3B, 7B, 14B - 4bit quantized)
 * - Llama 3.2 (1B, 3B - 4bit quantized)
 * - Phi 3.5 mini (3.8B - 4bit quantized)
 * - Gemma 2 (2B, 9B - 4bit quantized)
 * - And 100+ models from mlx-community on HuggingFace
 *
 * Requirements:
 * - iOS 16.0+
 * - MLX Swift framework
 * - Sufficient device memory (2-8GB depending on model)
 * - Increased Memory Limit capability in Xcode
 *
 * Note: This module requires Swift interop and the MLXLLM package
 * to be added to your project via Swift Package Manager.
 */

@implementation MLXTurboModule {
  // Store model state and session data
  NSMutableDictionary *_modelCache;
  NSMutableDictionary *_chatSessions;
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    _modelCache = [NSMutableDictionary dictionary];
    _chatSessions = [NSMutableDictionary dictionary];
    _hasListeners = NO;
  }
  return self;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"onTokenGenerated", @"onGenerationComplete", @"onModelLoadProgress"];
}

- (void)startObserving {
  _hasListeners = YES;
}

- (void)stopObserving {
  _hasListeners = NO;
}

/**
 * Load a model from HuggingFace
 * @param modelId - Model identifier (e.g., "mlx-community/Qwen3-4B-4bit")
 * @param options - Optional configuration (maxTokens, temperature, etc.)
 */
RCT_EXPORT_METHOD(loadModel:(NSString *)modelId
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Check if model is already loaded
  if (_modelCache[modelId]) {
    resolve(@{
      @"success": @YES,
      @"modelId": modelId,
      @"cached": @YES
    });
    return;
  }

  // This is a placeholder implementation
  // In production, this would call Swift code via a bridge to:
  // 1. Use LLMModelFactory.shared.loadContainer(configuration: modelConfiguration)
  // 2. Download model files if needed (with progress callbacks)
  // 3. Load weights from .safetensors files
  // 4. Initialize the model architecture

  reject(@"NOT_IMPLEMENTED",
         @"MLX module requires Swift interop. Add MLXLLM package via Swift Package Manager and implement Swift bridge.",
         nil);
}

/**
 * Generate text from a prompt
 * @param modelId - Previously loaded model identifier
 * @param prompt - Input text prompt
 * @param options - Generation options (temperature, topP, maxTokens, etc.)
 */
RCT_EXPORT_METHOD(generate:(NSString *)modelId
                  prompt:(NSString *)prompt
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (!_modelCache[modelId]) {
    reject(@"MODEL_NOT_LOADED",
           [NSString stringWithFormat:@"Model '%@' not loaded. Call loadModel first.", modelId],
           nil);
    return;
  }

  // Extract options with defaults
  float temperature = options[@"temperature"] ? [options[@"temperature"] floatValue] : 0.7f;
  float topP = options[@"topP"] ? [options[@"topP"] floatValue] : 0.9f;
  NSInteger maxTokens = options[@"maxTokens"] ? [options[@"maxTokens"] integerValue] : 512;
  BOOL stream = options[@"stream"] ? [options[@"stream"] boolValue] : NO;

  // This would call Swift MLXLMCommon.generate() with token callbacks
  // For streaming: emit "onTokenGenerated" events as tokens arrive
  // For non-streaming: accumulate and return full response

  reject(@"NOT_IMPLEMENTED",
         @"MLX inference requires Swift implementation with MLXLLM package.",
         nil);
}

/**
 * Create a chat session with conversation history
 * @param modelId - Previously loaded model identifier
 * @param sessionId - Unique identifier for this chat session
 * @param systemPrompt - Optional system prompt for chat behavior
 */
RCT_EXPORT_METHOD(createChatSession:(NSString *)modelId
                  sessionId:(NSString *)sessionId
                  systemPrompt:(NSString *)systemPrompt
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (!_modelCache[modelId]) {
    reject(@"MODEL_NOT_LOADED",
           [NSString stringWithFormat:@"Model '%@' not loaded. Call loadModel first.", modelId],
           nil);
    return;
  }

  // This would create a ChatSession instance:
  // let session = ChatSession(model: loadedModel)
  // if let systemPrompt = systemPrompt {
  //   session.setSystemPrompt(systemPrompt)
  // }

  reject(@"NOT_IMPLEMENTED",
         @"Chat session requires Swift ChatSession implementation.",
         nil);
}

/**
 * Send a message in a chat session
 * @param sessionId - Chat session identifier
 * @param message - User message
 * @param options - Generation options
 */
RCT_EXPORT_METHOD(chatRespond:(NSString *)sessionId
                  message:(NSString *)message
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (!_chatSessions[sessionId]) {
    reject(@"SESSION_NOT_FOUND",
           [NSString stringWithFormat:@"Chat session '%@' not found.", sessionId],
           nil);
    return;
  }

  // This would call:
  // let response = try await chatSession.respond(to: message)
  // Then emit tokens via events if streaming is enabled

  reject(@"NOT_IMPLEMENTED",
         @"Chat respond requires Swift ChatSession.respond() implementation.",
         nil);
}

/**
 * Get conversation history from a chat session
 * @param sessionId - Chat session identifier
 */
RCT_EXPORT_METHOD(getChatHistory:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (!_chatSessions[sessionId]) {
    reject(@"SESSION_NOT_FOUND",
           [NSString stringWithFormat:@"Chat session '%@' not found.", sessionId],
           nil);
    return;
  }

  // Return the message history from the chat session
  reject(@"NOT_IMPLEMENTED",
         @"Chat history requires Swift implementation.",
         nil);
}

/**
 * Clear conversation history from a chat session
 * @param sessionId - Chat session identifier
 */
RCT_EXPORT_METHOD(clearChatHistory:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (!_chatSessions[sessionId]) {
    reject(@"SESSION_NOT_FOUND",
           [NSString stringWithFormat:@"Chat session '%@' not found.", sessionId],
           nil);
    return;
  }

  // Clear the chat session history
  reject(@"NOT_IMPLEMENTED",
         @"Clear history requires Swift implementation.",
         nil);
}

/**
 * Unload a model to free memory
 * @param modelId - Model identifier to unload
 */
RCT_EXPORT_METHOD(unloadModel:(NSString *)modelId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (!_modelCache[modelId]) {
    resolve(@{@"success": @YES, @"message": @"Model not loaded"});
    return;
  }

  // Remove from cache and release memory
  [_modelCache removeObjectForKey:modelId];

  // Also remove any chat sessions using this model
  NSMutableArray *sessionsToRemove = [NSMutableArray array];
  for (NSString *sessionId in _chatSessions) {
    NSDictionary *session = _chatSessions[sessionId];
    if ([session[@"modelId"] isEqualToString:modelId]) {
      [sessionsToRemove addObject:sessionId];
    }
  }
  for (NSString *sessionId in sessionsToRemove) {
    [_chatSessions removeObjectForKey:sessionId];
  }

  resolve(@{
    @"success": @YES,
    @"modelId": modelId,
    @"sessionsClosed": @(sessionsToRemove.count)
  });
}

/**
 * Get list of recommended models for the current device
 */
RCT_EXPORT_METHOD(getRecommendedModels:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Get device memory and recommend appropriate models
  NSProcessInfo *processInfo = [NSProcessInfo processInfo];
  unsigned long long physicalMemory = processInfo.physicalMemory;
  double memoryGB = physicalMemory / (1024.0 * 1024.0 * 1024.0);

  NSMutableArray *recommended = [NSMutableArray array];

  // Recommend models based on available memory
  if (memoryGB >= 8) {
    [recommended addObject:@{
      @"id": @"mlx-community/Qwen2.5-7B-Instruct-4bit",
      @"name": @"Qwen 2.5 7B",
      @"size": @"4.2 GB",
      @"description": @"High-quality 7B model, 4-bit quantized"
    }];
  }

  if (memoryGB >= 4) {
    [recommended addObject:@{
      @"id": @"mlx-community/Qwen2.5-3B-Instruct-4bit",
      @"name": @"Qwen 2.5 3B",
      @"size": @"2.1 GB",
      @"description": @"Balanced performance and efficiency"
    }];
    [recommended addObject:@{
      @"id": @"mlx-community/Llama-3.2-3B-Instruct-4bit",
      @"name": @"Llama 3.2 3B",
      @"size": @"2.0 GB",
      @"description": @"Meta's efficient mobile model"
    }];
  }

  // Always recommend smallest models
  [recommended addObject:@{
    @"id": @"mlx-community/Qwen2.5-1.5B-Instruct-4bit",
    @"name": @"Qwen 2.5 1.5B",
    @"size": @"1.1 GB",
    @"description": @"Fast and memory-efficient"
  }];
  [recommended addObject:@{
    @"id": @"mlx-community/Qwen2.5-0.5B-Instruct-4bit",
    @"name": @"Qwen 2.5 0.5B",
    @"size": @"0.4 GB",
    @"description": @"Smallest model, works on all devices"
  }];

  resolve(@{
    @"deviceMemoryGB": @(memoryGB),
    @"recommended": recommended
  });
}

/**
 * Get memory usage statistics
 */
RCT_EXPORT_METHOD(getMemoryStats:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Get current memory usage
  struct mach_task_basic_info info;
  mach_msg_type_number_t size = MACH_TASK_BASIC_INFO_COUNT;
  kern_return_t kerr = task_info(mach_task_self(),
                                 MACH_TASK_BASIC_INFO,
                                 (task_info_t)&info,
                                 &size);

  if (kerr == KERN_SUCCESS) {
    double usedMemoryMB = info.resident_size / (1024.0 * 1024.0);

    NSProcessInfo *processInfo = [NSProcessInfo processInfo];
    unsigned long long physicalMemory = processInfo.physicalMemory;
    double totalMemoryGB = physicalMemory / (1024.0 * 1024.0 * 1024.0);

    resolve(@{
      @"usedMemoryMB": @(usedMemoryMB),
      @"totalMemoryGB": @(totalMemoryGB),
      @"modelsLoaded": @(_modelCache.count),
      @"activeSessions": @(_chatSessions.count)
    });
  } else {
    reject(@"MEMORY_ERROR", @"Failed to get memory info", nil);
  }
}

@end
