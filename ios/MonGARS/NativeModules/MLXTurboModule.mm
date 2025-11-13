#import "MLXTurboModule.h"
#import "MonGARS-Swift.h"
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
  __weak typeof(self) weakSelf = self;
  [[MLXBridge shared] loadModelWithId:modelId
                              options:options
                        progressBlock:^(MLXModelLoadProgress *progress) {
                          if (!weakSelf || !weakSelf->_hasListeners) {
                            return;
                          }

                          [weakSelf sendEventWithName:@"onModelLoadProgress"
                                                 body:@{
                                                   @"modelId": modelId,
                                                   @"progress": @(progress.fractionCompleted),
                                                   @"stage": progress.stage,
                                                   @"message": progress.message ?: @""
                                                 }];
                        }
                              resolve:^(NSDictionary *result) {
                                if (!weakSelf) {
                                  return;
                                }
                                weakSelf->_modelCache[modelId] = result;
                                resolve(@{
                                  @"success": @YES,
                                  @"modelId": modelId,
                                  @"cached": result[@"cached"] ?: @NO
                                });
                              }
                               reject:^(NSError *error) {
                                 reject(@"LOAD_FAILED",
                                        error.localizedDescription,
                                        error);
                               }];
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

  __weak typeof(self) weakSelf = self;
  [[MLXBridge shared] generateWithModelId:modelId
                                   prompt:prompt
                                   options:options
                               onToken:^(MLXGeneratedToken *token) {
                                 if (!weakSelf || !weakSelf->_hasListeners) {
                                   return;
                                 }
                                 [weakSelf sendEventWithName:@"onTokenGenerated"
                                                        body:@{
                                                          @"token": token.value ?: @"",
                                                          @"index": @(token.index)
                                                        }];
                               }
                              onComplete:^(NSDictionary *result) {
                                if (!weakSelf) {
                                  return;
                                }
                                resolve(result);
                              }
                                   reject:^(NSError *error) {
                                     reject(@"GENERATION_FAILED",
                                            error.localizedDescription,
                                            error);
                                   }];
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

  [[MLXBridge shared] createSessionWithModelId:modelId
                                     sessionId:sessionId
                                   systemPrompt:systemPrompt
                                       resolve:^{
                                         resolve(@{ @"success": @YES, @"sessionId": sessionId });
                                       }
                                        reject:^(NSError *error) {
                                          reject(@"SESSION_CREATE_FAILED",
                                                 error.localizedDescription,
                                                 error);
                                        }];
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
  __weak typeof(self) weakSelf = self;
  [[MLXBridge shared] respondToSessionWithId:sessionId
                                     message:message
                                     options:options
                                     onToken:^(MLXGeneratedToken *token) {
                                       if (!weakSelf || !weakSelf->_hasListeners) {
                                         return;
                                       }
                                       NSMutableDictionary *payload = [@{ @"token": token.value ?: @"", @"index": @(token.index) } mutableCopy];
                                       if (token.sessionId) {
                                         payload[@"sessionId"] = token.sessionId;
                                       }
                                       [weakSelf sendEventWithName:@"onTokenGenerated" body:payload];
                                     }
                                 onComplete:^(NSDictionary *result) {
                                   if (!weakSelf) {
                                     return;
                                   }
                                   if (weakSelf->_hasListeners) {
                                     NSMutableDictionary *payload = [result mutableCopy];
                                     payload[@"sessionId"] = sessionId;
                                     [weakSelf sendEventWithName:@"onGenerationComplete" body:payload];
                                   }
                                   resolve(result);
                                 }
                                      reject:^(NSError *error) {
                                        reject(@"CHAT_FAILED",
                                               error.localizedDescription,
                                               error);
                                      }];
}

/**
 * Get conversation history from a chat session
 * @param sessionId - Chat session identifier
 */
RCT_EXPORT_METHOD(getChatHistory:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  [[MLXBridge shared] getHistoryForSession:sessionId
                                   resolve:^(NSArray<NSDictionary *> *messages) {
                                     resolve(@{ @"messages": messages });
                                   }
                                    reject:^(NSError *error) {
                                      reject(@"HISTORY_FAILED",
                                             error.localizedDescription,
                                             error);
                                    }];
}

/**
 * Clear conversation history from a chat session
 * @param sessionId - Chat session identifier
 */
RCT_EXPORT_METHOD(clearChatHistory:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  [[MLXBridge shared] clearHistoryForSession:sessionId
                                     resolve:^{
                                       resolve(@{ @"success": @YES });
                                     }
                                      reject:^(NSError *error) {
                                        reject(@"CLEAR_FAILED",
                                               error.localizedDescription,
                                               error);
                                      }];
}

/**
 * Unload a model to free memory
 * @param modelId - Model identifier to unload
 */
RCT_EXPORT_METHOD(unloadModel:(NSString *)modelId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  [[MLXBridge shared] unloadModelWithId:modelId
                                resolve:^(NSInteger sessionsClosed) {
                                  [_modelCache removeObjectForKey:modelId];
                                  resolve(@{
                                    @"success": @YES,
                                    @"modelId": modelId,
                                    @"sessionsClosed": @(sessionsClosed)
                                  });
                                }
                                 reject:^(NSError *error) {
                                   reject(@"UNLOAD_FAILED",
                                          error.localizedDescription,
                                          error);
                                 }];
}

/**
 * Get list of recommended models for the current device
 */
RCT_EXPORT_METHOD(getRecommendedModels:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  [[MLXBridge shared] recommendedModels:^(NSDictionary *result) {
    resolve(result);
  } reject:^(NSError *error) {
    reject(@"RECOMMENDATION_FAILED",
           error.localizedDescription,
           error);
  }];
}

/**
 * Get memory usage statistics
 */
RCT_EXPORT_METHOD(getMemoryStats:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  [[MLXBridge shared] memoryStatistics:^(NSDictionary *stats) {
    resolve(stats);
  } reject:^(NSError *error) {
    reject(@"MEMORY_ERROR",
           error.localizedDescription,
           error);
  }];
}

@end
