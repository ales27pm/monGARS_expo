import { NativeEventEmitter } from "react-native";
import * as CustomModules from "../native-modules";

/**
 * Advanced AI Agent with Enhanced Reasoning and Vector Memory
 *
 * Features:
 * - Advanced prompt engineering with few-shot examples
 * - Tool dependency resolution and parallel execution
 * - Vector memory for context management
 * - Retry logic with exponential backoff
 * - Performance monitoring and optimization
 * - Intelligent caching and memoization
 * - Error recovery and fallback strategies
 */

// ==================== TYPE DEFINITIONS ====================

interface Task {
  id: string;
  type: string;
  description: string;
  params: Record<string, any>;
  priority: number;
  dependencies?: string[];
  retries?: number;
  timeout?: number;
}

interface AgentContext {
  userIntent: string;
  availableCapabilities: ToolCapability[];
  currentLocation?: LocationData;
  deviceState?: DeviceState;
  conversationHistory: Message[];
  vectorMemory: VectorMemory[];
  sessionMetadata: SessionMetadata;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  tokens?: number;
  embedding?: number[];
}

interface ToolUse {
  tool: string;
  reason: string;
  params: Record<string, any>;
  priority: number;
  dependencies?: string[];
  expectedDuration?: number;
}

interface AgentDecision {
  reasoning: string;
  confidence: number;
  toolsToUse: ToolUse[];
  expectedOutcome: string;
  estimatedTime: number;
  fallbackStrategy?: string;
}

interface ToolCapability {
  name: string;
  category: string;
  description: string;
  requiredPermissions?: string[];
  averageDuration: number;
  reliability: number;
  dependencies?: string[];
  examples: string[];
}

interface DeviceState {
  model: string;
  systemVersion: string;
  batteryLevel: number;
  isCharging: boolean;
  isLowPowerMode: boolean;
  availableMemoryMB: number;
  networkStatus: "wifi" | "cellular" | "offline";
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface VectorMemory {
  content: string;
  embedding: number[];
  timestamp: number;
  relevance: number;
  category: string;
  metadata: Record<string, any>;
}

interface SessionMetadata {
  sessionId: string;
  startTime: number;
  toolUsageCount: Record<string, number>;
  errorCount: number;
  totalTokens: number;
  cacheHits: number;
}

interface ExecutionResult {
  success: boolean;
  tool: string;
  result?: any;
  error?: string;
  duration: number;
  retries: number;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  cacheHitRate: number;
  mostUsedTools: string[];
  errorRate: number;
}

// ==================== ADVANCED AI AGENT ====================

export class AdvancedAIAgent {
  private context: AgentContext;
  private llmClient: any;
  private toolCapabilities: Map<string, ToolCapability>;
  private executionCache: Map<string, { result: any; timestamp: number }>;
  private performanceMetrics: PerformanceMetrics;
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly VECTOR_MEMORY_SIZE = 100;

  constructor(llmClient: any, sessionId?: string) {
    this.llmClient = llmClient;
    this.toolCapabilities = this.initializeToolCapabilities();
    this.executionCache = new Map();
    this.performanceMetrics = {
      averageResponseTime: 0,
      successRate: 1.0,
      cacheHitRate: 0,
      mostUsedTools: [],
      errorRate: 0
    };

    this.context = {
      userIntent: "",
      availableCapabilities: Array.from(this.toolCapabilities.values()),
      conversationHistory: [],
      vectorMemory: [],
      sessionMetadata: {
        sessionId: sessionId || this.generateSessionId(),
        startTime: Date.now(),
        toolUsageCount: {},
        errorCount: 0,
        totalTokens: 0,
        cacheHits: 0
      }
    };
  }

  // ==================== TOOL CAPABILITY DEFINITIONS ====================

  private initializeToolCapabilities(): Map<string, ToolCapability> {
    const capabilities: ToolCapability[] = [
      // Device Features
      {
        name: "battery_level",
        category: "device",
        description: "Get current battery level and charging status",
        averageDuration: 10,
        reliability: 0.99,
        examples: ["Check battery before starting intensive task", "Monitor power status"]
      },
      {
        name: "brightness_control",
        category: "device",
        description: "Get or set screen brightness (0.0-1.0)",
        averageDuration: 15,
        reliability: 0.98,
        examples: ["Adjust brightness based on ambient light", "Dim screen to save battery"]
      },
      {
        name: "sensors_read",
        category: "device",
        description: "Read accelerometer, gyroscope, magnetometer data",
        averageDuration: 50,
        reliability: 0.95,
        examples: ["Detect device orientation", "Track movement patterns"]
      },
      {
        name: "device_info",
        category: "device",
        description: "Get device model, OS version, and capabilities",
        averageDuration: 5,
        reliability: 0.99,
        examples: ["Check device compatibility", "Get system information"]
      },
      {
        name: "flashlight_toggle",
        category: "device",
        description: "Turn flashlight on/off or set brightness",
        averageDuration: 20,
        reliability: 0.97,
        examples: ["Enable flashlight in dark", "Use as notification indicator"]
      },

      // Communication & Calendar
      {
        name: "calendar_create",
        category: "communication",
        description: "Create calendar events with reminders",
        requiredPermissions: ["calendar"],
        averageDuration: 100,
        reliability: 0.95,
        dependencies: [],
        examples: ["Schedule meeting", "Set reminder for task"]
      },
      {
        name: "camera_take_photo",
        category: "communication",
        description: "Capture photo from camera",
        requiredPermissions: ["camera"],
        averageDuration: 2000,
        reliability: 0.90,
        examples: ["Take picture of document", "Capture scene for analysis"]
      },
      {
        name: "find_contacts",
        category: "communication",
        description: "Search contacts by name or details",
        requiredPermissions: ["contacts"],
        averageDuration: 50,
        reliability: 0.96,
        examples: ["Find contact info", "Search for person by name"]
      },
      {
        name: "get_location",
        category: "communication",
        description: "Get current GPS coordinates",
        requiredPermissions: ["location"],
        averageDuration: 1000,
        reliability: 0.92,
        examples: ["Get current position", "Track location for context"]
      },
      {
        name: "send_sms",
        category: "communication",
        description: "Send SMS message",
        requiredPermissions: ["messaging"],
        averageDuration: 1500,
        reliability: 0.93,
        examples: ["Send text message", "Share info via SMS"]
      },
      {
        name: "compose_email",
        category: "communication",
        description: "Compose and send email",
        requiredPermissions: ["email"],
        averageDuration: 2000,
        reliability: 0.94,
        examples: ["Send email with attachments", "Share report via email"]
      },

      // Media
      {
        name: "pick_photo",
        category: "media",
        description: "Select photo from library",
        requiredPermissions: ["photos"],
        averageDuration: 2000,
        reliability: 0.91,
        examples: ["Choose image for processing", "Select photo to share"]
      },
      {
        name: "web_fetch",
        category: "media",
        description: "Fetch content from URL",
        averageDuration: 1000,
        reliability: 0.88,
        examples: ["Download web page", "Fetch API data"]
      },
      {
        name: "web_scrape",
        category: "media",
        description: "Scrape and parse web page content",
        averageDuration: 2000,
        reliability: 0.85,
        dependencies: ["web_fetch"],
        examples: ["Extract article text", "Parse structured data from website"]
      },

      // Advanced AI Features
      {
        name: "text_to_speech",
        category: "ai",
        description: "Convert text to spoken audio",
        averageDuration: 500,
        reliability: 0.97,
        examples: ["Read text aloud", "Provide audio feedback"]
      },
      {
        name: "speech_to_text",
        category: "ai",
        description: "Transcribe spoken audio to text",
        requiredPermissions: ["microphone"],
        averageDuration: 3000,
        reliability: 0.92,
        examples: ["Voice command input", "Transcribe voice note"]
      },
      {
        name: "ocr_recognize",
        category: "ai",
        description: "Extract text from images",
        averageDuration: 1500,
        reliability: 0.93,
        dependencies: ["camera_take_photo"],
        examples: ["Scan document", "Read text from image"]
      },
      {
        name: "haptic_feedback",
        category: "ux",
        description: "Trigger haptic feedback",
        averageDuration: 10,
        reliability: 0.99,
        examples: ["Confirm action", "Alert user"]
      },
      {
        name: "biometric_auth",
        category: "security",
        description: "Authenticate with Face ID or Touch ID",
        requiredPermissions: ["biometrics"],
        averageDuration: 2000,
        reliability: 0.96,
        examples: ["Secure sensitive action", "Verify user identity"]
      },
      {
        name: "clipboard_get",
        category: "utility",
        description: "Get text from clipboard",
        averageDuration: 5,
        reliability: 0.99,
        examples: ["Read copied text", "Get clipboard content"]
      },
      {
        name: "clipboard_set",
        category: "utility",
        description: "Copy text to clipboard",
        averageDuration: 5,
        reliability: 0.99,
        examples: ["Copy result to clipboard", "Share text via clipboard"]
      },

      // MLX AI/ML
      {
        name: "mlx_load_model",
        category: "ml",
        description: "Load LLM model for on-device inference",
        averageDuration: 5000,
        reliability: 0.90,
        examples: ["Load AI model for chat", "Initialize LLM"]
      },
      {
        name: "mlx_generate",
        category: "ml",
        description: "Generate text using loaded LLM",
        averageDuration: 3000,
        reliability: 0.92,
        dependencies: ["mlx_load_model"],
        examples: ["Generate AI response", "Create text completion"]
      },
      {
        name: "mlx_chat_session",
        category: "ml",
        description: "Create chat session with conversation history",
        averageDuration: 100,
        reliability: 0.95,
        dependencies: ["mlx_load_model"],
        examples: ["Start AI conversation", "Initialize chat with context"]
      },
      {
        name: "mlx_chat_respond",
        category: "ml",
        description: "Get response in chat session",
        averageDuration: 2500,
        reliability: 0.93,
        dependencies: ["mlx_chat_session"],
        examples: ["Continue conversation", "Ask AI question"]
      },
      {
        name: "mlx_recommended_models",
        category: "ml",
        description: "Get recommended models for device",
        averageDuration: 50,
        reliability: 0.98,
        examples: ["Find suitable AI model", "Check device compatibility"]
      }
    ];

    return new Map(capabilities.map(cap => [cap.name, cap]));
  }

  // ==================== ADVANCED REASONING ENGINE ====================

  /**
   * Main reasoning engine with enhanced prompt engineering
   */
  async analyzeAndPlan(userRequest: string): Promise<AgentDecision> {
    const startTime = Date.now();

    try {
      // 1. Update context
      this.context.userIntent = userRequest;
      this.addToConversationHistory("user", userRequest);

      // 2. Gather comprehensive device context
      const deviceState = await this.gatherDeviceContext();
      this.context.deviceState = deviceState;

      // 3. Retrieve relevant memories from vector store
      const relevantMemories = await this.retrieveRelevantMemories(userRequest);

      // 4. Build enhanced reasoning prompt with few-shot examples
      const reasoningPrompt = this.buildEnhancedReasoningPrompt(
        userRequest,
        deviceState,
        relevantMemories
      );

      // 5. Get LLM decision with structured output
      const llmResponse = await this.callLLMWithRetry(reasoningPrompt);

      // 6. Parse and validate decision
      const decision = this.parseAndValidateDecision(llmResponse);

      // 7. Optimize tool execution order (dependency resolution + parallelization)
      decision.toolsToUse = this.optimizeToolExecutionOrder(decision.toolsToUse);

      // 8. Estimate total execution time
      decision.estimatedTime = this.estimateExecutionTime(decision.toolsToUse);

      // 9. Store in vector memory
      await this.storeInVectorMemory(userRequest, decision);

      // 10. Update metrics
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration, true);

      return decision;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Reasoning failed:", errorMessage);

      this.context.sessionMetadata.errorCount++;
      this.updatePerformanceMetrics(Date.now() - startTime, false);

      // Return fallback decision
      return this.createFallbackDecision(userRequest, errorMessage);
    }
  }

  // ==================== ENHANCED PROMPT ENGINEERING ====================

  private buildEnhancedReasoningPrompt(
    userRequest: string,
    deviceState: DeviceState,
    relevantMemories: VectorMemory[]
  ): string {
    const systemPrompt = this.getEnhancedSystemPrompt();
    const fewShotExamples = this.getFewShotExamples();
    const deviceContext = this.formatDeviceContext(deviceState);
    const memoryContext = this.formatMemoryContext(relevantMemories);
    const toolReference = this.formatToolReference();

    return `${systemPrompt}

${fewShotExamples}

CURRENT CONTEXT:
${deviceContext}

${memoryContext}

AVAILABLE TOOLS:
${toolReference}

USER REQUEST: "${userRequest}"

ANALYSIS INSTRUCTIONS:
1. Understand the user's intent and break down into sub-tasks
2. Consider device constraints (battery, network, permissions)
3. Select appropriate tools based on capabilities and reliability
4. Determine dependencies and optimal execution order
5. Estimate confidence and execution time
6. Provide fallback strategy if primary approach fails

Respond with a JSON object:
{
  "reasoning": "Detailed step-by-step analysis (2-3 sentences)",
  "confidence": 0.0-1.0,
  "toolsToUse": [
    {
      "tool": "tool_name",
      "reason": "Why this specific tool",
      "params": {"param": "value"},
      "priority": 1-10,
      "dependencies": ["tool1"],
      "expectedDuration": milliseconds
    }
  ],
  "expectedOutcome": "What the user will receive",
  "estimatedTime": total_milliseconds,
  "fallbackStrategy": "Alternative approach if primary fails"
}`;
  }

  private getEnhancedSystemPrompt(): string {
    return `You are an advanced AI agent orchestrating 21 native iOS capabilities.

CORE PRINCIPLES:
- Efficiency: Minimize tool calls while maximizing effectiveness
- Reliability: Prefer reliable tools, handle failures gracefully
- Privacy: Keep sensitive operations on-device when possible
- UX: Provide haptic feedback, use TTS for confirmation
- Context: Consider battery, network, and device state

DECISION-MAKING FRAMEWORK:
1. Intent Recognition: What does the user really want?
2. Constraint Analysis: What are the limitations (battery, permissions, network)?
3. Tool Selection: Which tools achieve the goal most effectively?
4. Dependency Mapping: What must happen first?
5. Parallel Optimization: What can run simultaneously?
6. Error Handling: What's the backup plan?

TOOL USAGE PATTERNS:
- Battery-intensive: Check battery_level first, warn if low
- Sensitive data: Use biometric_auth before access
- Long operations: Provide haptic_feedback for progress
- Results: Use clipboard_set or text_to_speech for output
- Failures: Always have a fallback_strategy`;
  }

  private getFewShotExamples(): string {
    return `FEW-SHOT EXAMPLES:

Example 1 - Simple Task:
User: "What's my battery level?"
{
  "reasoning": "Direct query for battery status. Single tool call, no dependencies.",
  "confidence": 0.95,
  "toolsToUse": [
    {"tool": "battery_level", "reason": "Direct battery info", "params": {}, "priority": 10, "expectedDuration": 10}
  ],
  "expectedOutcome": "Battery percentage and charging status",
  "estimatedTime": 10,
  "fallbackStrategy": "If unavailable, use device_info for last known state"
}

Example 2 - Multi-Step Task:
User: "Scan this document and email it to John"
{
  "reasoning": "Multi-step: 1) Take photo, 2) OCR text, 3) Find contact, 4) Send email. Dependencies: photo→OCR, contact→email. Can parallelize photo and contact search.",
  "confidence": 0.85,
  "toolsToUse": [
    {"tool": "camera_take_photo", "reason": "Capture document", "params": {"quality": 0.9}, "priority": 10, "expectedDuration": 2000},
    {"tool": "find_contacts", "reason": "Locate John's email", "params": {"query": "John"}, "priority": 10, "expectedDuration": 50},
    {"tool": "ocr_recognize", "reason": "Extract text from photo", "params": {}, "priority": 8, "dependencies": ["camera_take_photo"], "expectedDuration": 1500},
    {"tool": "compose_email", "reason": "Send to John", "params": {"to": "contact_email", "subject": "Scanned Document"}, "priority": 5, "dependencies": ["find_contacts", "ocr_recognize"], "expectedDuration": 2000},
    {"tool": "haptic_feedback", "reason": "Confirm completion", "params": {"style": "success"}, "priority": 1, "dependencies": ["compose_email"], "expectedDuration": 10}
  ],
  "expectedOutcome": "Document scanned, text extracted, emailed to John with haptic confirmation",
  "estimatedTime": 5560,
  "fallbackStrategy": "If OCR fails, attach photo directly to email"
}

Example 3 - Context-Aware Task:
User: "Set up a meeting reminder"
{
  "reasoning": "Need meeting details from user (use speech_to_text), then create calendar event with location context. Check battery first for voice recognition.",
  "confidence": 0.80,
  "toolsToUse": [
    {"tool": "battery_level", "reason": "Check power for voice recognition", "params": {}, "priority": 10, "expectedDuration": 10},
    {"tool": "speech_to_text", "reason": "Get meeting details from user", "params": {"language": "en-US"}, "priority": 9, "expectedDuration": 3000},
    {"tool": "get_location", "reason": "Add location context", "params": {}, "priority": 8, "expectedDuration": 1000},
    {"tool": "calendar_create", "reason": "Create event with details", "params": {}, "priority": 7, "dependencies": ["speech_to_text", "get_location"], "expectedDuration": 100},
    {"tool": "text_to_speech", "reason": "Confirm creation", "params": {"text": "Meeting reminder created"}, "priority": 5, "dependencies": ["calendar_create"], "expectedDuration": 500}
  ],
  "expectedOutcome": "Meeting added to calendar with location and voice confirmation",
  "estimatedTime": 4610,
  "fallbackStrategy": "If speech_to_text fails, use default meeting template with current time+1 hour"
}`;
  }

  private formatDeviceContext(deviceState: DeviceState): string {
    return `Device State:
- Model: ${deviceState.model || "Unknown"}
- iOS: ${deviceState.systemVersion || "Unknown"}
- Battery: ${deviceState.batteryLevel || 0}% ${deviceState.isCharging ? "(Charging)" : "(On Battery)"}
- Power Mode: ${deviceState.isLowPowerMode ? "Low Power" : "Normal"}
- Memory: ${deviceState.availableMemoryMB || 0}MB available
- Network: ${deviceState.networkStatus || "unknown"}
- Time: ${new Date().toLocaleString()}

CONSTRAINTS:
${deviceState.batteryLevel < 20 ? "⚠️ LOW BATTERY - Avoid intensive operations" : "✓ Battery OK"}
${deviceState.isLowPowerMode ? "⚠️ LOW POWER MODE - Minimize background tasks" : ""}
${deviceState.networkStatus === "offline" ? "⚠️ OFFLINE - Use only local tools" : ""}
${deviceState.availableMemoryMB < 500 ? "⚠️ LOW MEMORY - Avoid ML models" : ""}`;
  }

  private formatMemoryContext(memories: VectorMemory[]): string {
    if (memories.length === 0) {
      return "RELEVANT HISTORY: None";
    }

    const formatted = memories
      .slice(0, 3) // Top 3 most relevant
      .map((mem, i) => `${i + 1}. [${mem.category}] ${mem.content} (relevance: ${mem.relevance.toFixed(2)})`)
      .join("\n");

    return `RELEVANT HISTORY:\n${formatted}`;
  }

  private formatToolReference(): string {
    const byCategory = new Map<string, ToolCapability[]>();

    this.toolCapabilities.forEach(tool => {
      if (!byCategory.has(tool.category)) {
        byCategory.set(tool.category, []);
      }
      byCategory.get(tool.category)!.push(tool);
    });

    let reference = "";
    byCategory.forEach((tools, category) => {
      reference += `\n${category.toUpperCase()}:\n`;
      tools.forEach(tool => {
        reference += `- ${tool.name}: ${tool.description} (${tool.averageDuration}ms, ${(tool.reliability * 100).toFixed(0)}% reliable)\n`;
        if (tool.dependencies && tool.dependencies.length > 0) {
          reference += `  Dependencies: ${tool.dependencies.join(", ")}\n`;
        }
      });
    });

    return reference;
  }

  // ==================== TOOL EXECUTION WITH RETRY & PARALLELIZATION ====================

  /**
   * Execute tools with intelligent retry logic and parallelization
   */
  async executeTools(toolsToUse: ToolUse[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    const executed = new Set<string>();

    // Group by dependency level for parallel execution
    const executionLevels = this.groupToolsByDependencyLevel(toolsToUse);

    for (const level of executionLevels) {
      // Execute all tools in this level in parallel
      const levelResults = await Promise.all(
        level.map(tool => this.executeToolWithRetry(tool, executed))
      );

      results.push(...levelResults);

      // Mark as executed
      level.forEach(tool => executed.add(tool.tool));

      // Stop if any critical tool failed
      const criticalFailure = levelResults.find(
        r => !r.success && r.tool === level.find(t => t.priority > 8)?.tool
      );

      if (criticalFailure) {
        console.warn("Critical tool failed, stopping execution:", criticalFailure.tool);
        break;
      }
    }

    return results;
  }

  private async executeToolWithRetry(
    toolUse: ToolUse,
    executedTools: Set<string>
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let retries = 0;
    const maxRetries = this.MAX_RETRIES;

    // Check cache first
    const cacheKey = this.generateCacheKey(toolUse);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.context.sessionMetadata.cacheHits++;
      return {
        success: true,
        tool: toolUse.tool,
        result: cached,
        duration: Date.now() - startTime,
        retries: 0
      };
    }

    while (retries <= maxRetries) {
      try {
        // Execute the tool
        const result = await this.executeTool(toolUse.tool, toolUse.params);

        // Cache successful result
        this.addToCache(cacheKey, result);

        // Update metrics
        this.updateToolUsageCount(toolUse.tool);

        return {
          success: true,
          tool: toolUse.tool,
          result,
          duration: Date.now() - startTime,
          retries
        };

      } catch (error: unknown) {
        retries++;
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (retries > maxRetries) {
          this.context.sessionMetadata.errorCount++;
          return {
            success: false,
            tool: toolUse.tool,
            error: errorMessage,
            duration: Date.now() - startTime,
            retries: retries - 1
          };
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retries - 1), 5000);
        await this.sleep(delay);

        console.log(`Retry ${retries}/${maxRetries} for ${toolUse.tool} after ${delay}ms`);
      }
    }

    // Should never reach here
    return {
      success: false,
      tool: toolUse.tool,
      error: "Max retries exceeded",
      duration: Date.now() - startTime,
      retries: maxRetries
    };
  }

  /**
   * Execute a specific tool with parameters
   */
  private async executeTool(toolName: string, params: Record<string, any>): Promise<any> {
    switch (toolName) {
      // Device Features
      case "battery_level":
        return CustomModules.BatteryModule.getBatteryInfo();

      case "brightness_control":
        return CustomModules.BrightnessModule.setBrightness(params.level ?? 0.5);

      case "sensors_read":
        return CustomModules.SensorsModule.getSensorData(
          params.type || "accelerometer",
          params.duration || 1000
        );

      case "device_info":
        return CustomModules.DeviceInfoModule.getDeviceInfo();

      case "flashlight_toggle":
        return CustomModules.FlashlightModule.setTorchMode(params.enabled ?? true);

      // Communication
      case "calendar_create":
        return CustomModules.CalendarModule.createEvent(
          params.title,
          params.startDate,
          params.endDate,
          params.durationSeconds,
          params.location,
          params.notes
        );

      case "camera_take_photo":
        return CustomModules.CameraModule.takePhoto(params.quality);

      case "find_contacts":
        return CustomModules.ContactsModule.searchContacts(params.query);

      case "get_location":
        return CustomModules.LocationModule.getCurrentLocation();

      case "send_sms":
        return CustomModules.MessagesModule.sendMessage(
          params.phoneNumber,
          params.body
        );

      case "compose_email":
        return CustomModules.MailComposerModule.composeMail(params);

      // Media
      case "pick_photo":
        return CustomModules.PhotosModule.pickPhoto();

      case "web_fetch":
        return CustomModules.WebModule.fetch(params.url, params.options);

      case "web_scrape":
        return CustomModules.WebModule.scrapeWebpage(params.url, params.options);

      // Advanced
      case "text_to_speech":
        return CustomModules.SpeechModule.speak(params.text, params.options);

      case "speech_to_text":
        return CustomModules.SpeechRecognitionModule.startRecognition(params);

      case "ocr_recognize":
        return CustomModules.OCRModule.recognizeText(params.imagePath);

      case "haptic_feedback":
        return CustomModules.HapticsModule.impact(params.style || "medium");

      case "biometric_auth":
        return CustomModules.BiometricsModule.authenticate(params.reason);

      case "clipboard_get":
        return CustomModules.ClipboardModule.getString();

      case "clipboard_set":
        return CustomModules.ClipboardModule.setString(params.content);

      // AI/ML
      case "mlx_load_model":
        return CustomModules.MLXModule.loadModel(params.modelId, params.options);

      case "mlx_generate":
        return CustomModules.MLXModule.generate(
          params.modelId,
          params.prompt,
          params.options
        );

      case "mlx_chat_session":
        return CustomModules.MLXModule.createChatSession(
          params.modelId,
          params.sessionId,
          params.systemPrompt
        );

      case "mlx_chat_respond":
        return CustomModules.MLXModule.chatRespond(
          params.sessionId,
          params.message,
          params.options
        );

      case "mlx_recommended_models":
        return CustomModules.MLXModule.getRecommendedModels();

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  // ==================== VECTOR MEMORY MANAGEMENT ====================

  /**
   * Store interaction in vector memory with embedding
   */
  private async storeInVectorMemory(
    userRequest: string,
    decision: AgentDecision
  ): Promise<void> {
    const content = `Request: ${userRequest} | Tools: ${decision.toolsToUse.map(t => t.tool).join(", ")} | Outcome: ${decision.expectedOutcome}`;

    // Simple embedding (in production, use actual embedding model)
    const embedding = this.generateSimpleEmbedding(content);

    const memory: VectorMemory = {
      content,
      embedding,
      timestamp: Date.now(),
      relevance: 1.0,
      category: this.categorizeRequest(userRequest),
      metadata: {
        toolCount: decision.toolsToUse.length,
        confidence: decision.confidence,
        estimatedTime: decision.estimatedTime
      }
    };

    this.context.vectorMemory.push(memory);

    // Keep only recent memories (FIFO)
    if (this.context.vectorMemory.length > this.VECTOR_MEMORY_SIZE) {
      this.context.vectorMemory.shift();
    }
  }

  /**
   * Retrieve relevant memories using cosine similarity
   */
  private async retrieveRelevantMemories(query: string): Promise<VectorMemory[]> {
    if (this.context.vectorMemory.length === 0) {
      return [];
    }

    const queryEmbedding = this.generateSimpleEmbedding(query);

    // Calculate similarity scores
    const scored = this.context.vectorMemory.map(mem => ({
      memory: mem,
      similarity: this.cosineSimilarity(queryEmbedding, mem.embedding)
    }));

    // Sort by similarity and return top results
    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(item => ({
        ...item.memory,
        relevance: item.similarity
      }));
  }

  /**
   * Generate simple embedding (keyword-based)
   * In production, replace with actual embedding model
   */
  private generateSimpleEmbedding(text: string): number[] {
    const keywords = [
      "battery", "brightness", "sensor", "device", "flashlight",
      "calendar", "camera", "contact", "location", "sms", "email",
      "photo", "web", "fetch", "scrape",
      "speech", "voice", "ocr", "text", "haptic", "biometric", "clipboard",
      "ai", "llm", "model", "chat", "generate"
    ];

    const lowerText = text.toLowerCase();
    return keywords.map(keyword =>
      lowerText.includes(keyword) ? 1 : 0
    );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private categorizeRequest(request: string): string {
    const lower = request.toLowerCase();
    if (/(battery|power|charge|brightness)/i.test(request)) return "device";
    if (/(calendar|meeting|event|reminder)/i.test(request)) return "calendar";
    if (/(photo|camera|picture|image)/i.test(request)) return "media";
    if (/(contact|call|message|sms|email)/i.test(request)) return "communication";
    if (/(web|fetch|scrape|url|website)/i.test(request)) return "web";
    if (/(ai|chat|generate|model|llm)/i.test(request)) return "ai";
    return "general";
  }

  // ==================== DEPENDENCY RESOLUTION & OPTIMIZATION ====================

  /**
   * Optimize tool execution order based on dependencies
   */
  private optimizeToolExecutionOrder(tools: ToolUse[]): ToolUse[] {
    // Sort by priority first, then resolve dependencies
    const sorted = [...tools].sort((a, b) => b.priority - a.priority);

    // Build dependency graph
    const graph = new Map<string, string[]>();
    sorted.forEach(tool => {
      graph.set(tool.tool, tool.dependencies || []);
    });

    // Topological sort
    return this.topologicalSort(sorted, graph);
  }

  private topologicalSort(tools: ToolUse[], graph: Map<string, string[]>): ToolUse[] {
    const sorted: ToolUse[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (toolName: string) => {
      if (visited.has(toolName)) return;
      if (visiting.has(toolName)) {
        throw new Error(`Circular dependency detected: ${toolName}`);
      }

      visiting.add(toolName);

      const deps = graph.get(toolName) || [];
      deps.forEach(dep => visit(dep));

      visiting.delete(toolName);
      visited.add(toolName);

      const tool = tools.find(t => t.tool === toolName);
      if (tool) sorted.push(tool);
    };

    tools.forEach(tool => visit(tool.tool));

    return sorted;
  }

  /**
   * Group tools by dependency level for parallel execution
   */
  private groupToolsByDependencyLevel(tools: ToolUse[]): ToolUse[][] {
    const levels: ToolUse[][] = [];
    const remaining = new Set(tools);
    const executed = new Set<string>();

    while (remaining.size > 0) {
      const currentLevel: ToolUse[] = [];

      for (const tool of remaining) {
        const deps = tool.dependencies || [];
        const allDepsMet = deps.every(dep => executed.has(dep));

        if (allDepsMet) {
          currentLevel.push(tool);
        }
      }

      if (currentLevel.length === 0) {
        // No progress possible - circular dependency or missing tool
        console.warn("Cannot resolve dependencies for:", Array.from(remaining).map(t => t.tool));
        break;
      }

      levels.push(currentLevel);
      currentLevel.forEach(tool => {
        remaining.delete(tool);
        executed.add(tool.tool);
      });
    }

    return levels;
  }

  /**
   * Estimate total execution time
   */
  private estimateExecutionTime(tools: ToolUse[]): number {
    const levels = this.groupToolsByDependencyLevel(tools);

    // Sum max duration per level (parallel execution)
    return levels.reduce((total, level) => {
      const maxDuration = Math.max(
        ...level.map(tool => tool.expectedDuration || 100)
      );
      return total + maxDuration;
    }, 0);
  }

  // ==================== HELPER METHODS ====================

  private async gatherDeviceContext(): Promise<DeviceState> {
    try {
      const [deviceInfo, batteryInfo] = await Promise.all([
        CustomModules.DeviceInfoModule.getDeviceInfo(),
        CustomModules.BatteryModule.getBatteryInfo()
      ]);

      return {
        model: deviceInfo.model || "Unknown",
        systemVersion: deviceInfo.systemVersion || "Unknown",
        batteryLevel: batteryInfo.level || 0,
        isCharging: batteryInfo.state === 2 || batteryInfo.state === 3, // 2=charging, 3=full
        isLowPowerMode: false, // Not available from current BatteryInfo
        availableMemoryMB: 2048, // Placeholder - would need native module
        networkStatus: "wifi" as const // Placeholder - would need native module
      };
    } catch (error) {
      console.error("Failed to gather device context:", error);
      return {
        model: "Unknown",
        systemVersion: "Unknown",
        batteryLevel: 50,
        isCharging: false,
        isLowPowerMode: false,
        availableMemoryMB: 2048,
        networkStatus: "wifi" as const
      };
    }
  }

  private async callLLMWithRetry(prompt: string, retries = 2): Promise<string> {
    for (let i = 0; i <= retries; i++) {
      try {
        // Call your LLM client here
        // This is a placeholder - replace with actual LLM call
        const response = await this.llmClient.chat([
          { role: "system", content: "You are an expert iOS automation agent." },
          { role: "user", content: prompt }
        ]);

        this.context.sessionMetadata.totalTokens += response.tokens || 0;
        return response.content;

      } catch (error) {
        if (i === retries) throw error;
        await this.sleep(1000 * (i + 1));
      }
    }

    throw new Error("LLM call failed after retries");
  }

  private parseAndValidateDecision(llmResponse: string): AgentDecision {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in LLM response");
      }

      const decision = JSON.parse(jsonMatch[0]) as AgentDecision;

      // Validate structure
      if (!decision.reasoning || !decision.toolsToUse || !decision.expectedOutcome) {
        throw new Error("Invalid decision structure");
      }

      // Set defaults
      decision.confidence = decision.confidence || 0.7;
      decision.estimatedTime = decision.estimatedTime || 1000;

      // Validate tools
      decision.toolsToUse = decision.toolsToUse.filter(tool => {
        if (!this.toolCapabilities.has(tool.tool)) {
          console.warn(`Unknown tool: ${tool.tool}`);
          return false;
        }
        tool.priority = tool.priority || 5;
        tool.expectedDuration = tool.expectedDuration || 100;
        return true;
      });

      return decision;

    } catch (error) {
      console.error("Failed to parse LLM decision:", error);
      throw new Error("Invalid LLM response format");
    }
  }

  private createFallbackDecision(userRequest: string, error: string): AgentDecision {
    return {
      reasoning: `Failed to create optimal plan due to error: ${error}. Using fallback strategy.`,
      confidence: 0.3,
      toolsToUse: [
        {
          tool: "text_to_speech",
          reason: "Inform user of error",
          params: {
            text: `I encountered an error: ${error}. Please try rephrasing your request.`
          },
          priority: 10,
          expectedDuration: 500
        }
      ],
      expectedOutcome: "Error message delivered to user",
      estimatedTime: 500,
      fallbackStrategy: "Manual intervention required"
    };
  }

  private generateCacheKey(toolUse: ToolUse): string {
    return `${toolUse.tool}:${JSON.stringify(toolUse.params)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.executionCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.executionCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private addToCache(key: string, result: any): void {
    this.executionCache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.executionCache.size > 100) {
      const firstKey = this.executionCache.keys().next().value;
      if (firstKey !== undefined) {
        this.executionCache.delete(firstKey);
      }
    }
  }

  private addToConversationHistory(role: "user" | "assistant" | "system", content: string): void {
    this.context.conversationHistory.push({
      role,
      content,
      timestamp: Date.now()
    });

    // Keep only recent history
    if (this.context.conversationHistory.length > 50) {
      this.context.conversationHistory = this.context.conversationHistory.slice(-50);
    }
  }

  private updateToolUsageCount(toolName: string): void {
    this.context.sessionMetadata.toolUsageCount[toolName] =
      (this.context.sessionMetadata.toolUsageCount[toolName] || 0) + 1;
  }

  private updatePerformanceMetrics(duration: number, success: boolean): void {
    const total = this.context.sessionMetadata.toolUsageCount;
    const totalCalls = Object.values(total).reduce((sum, count) => sum + count, 0);

    // Update average response time
    this.performanceMetrics.averageResponseTime =
      (this.performanceMetrics.averageResponseTime * (totalCalls - 1) + duration) / totalCalls;

    // Update success rate
    const successCount = success ? 1 : 0;
    this.performanceMetrics.successRate =
      (this.performanceMetrics.successRate * (totalCalls - 1) + successCount) / totalCalls;

    // Update cache hit rate
    this.performanceMetrics.cacheHitRate =
      this.context.sessionMetadata.cacheHits / Math.max(totalCalls, 1);

    // Update error rate
    this.performanceMetrics.errorRate =
      this.context.sessionMetadata.errorCount / Math.max(totalCalls, 1);

    // Update most used tools
    this.performanceMetrics.mostUsedTools = Object.entries(total)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tool]) => tool);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== PUBLIC API ====================

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get session metadata
   */
  getSessionMetadata(): SessionMetadata {
    return { ...this.context.sessionMetadata };
  }

  /**
   * Clear vector memory
   */
  clearVectorMemory(): void {
    this.context.vectorMemory = [];
  }

  /**
   * Clear execution cache
   */
  clearCache(): void {
    this.executionCache.clear();
  }

  /**
   * Reset session
   */
  resetSession(): void {
    this.context.conversationHistory = [];
    this.context.vectorMemory = [];
    this.executionCache.clear();
    this.context.sessionMetadata = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      toolUsageCount: {},
      errorCount: 0,
      totalTokens: 0,
      cacheHits: 0
    };
  }
}

// ==================== INTELLIGENT SCENARIOS (ENHANCED) ====================

export class EnhancedIntelligentScenarios {
  private agent: AdvancedAIAgent;

  constructor(agent: AdvancedAIAgent) {
    this.agent = agent;
  }

  /**
   * Scenario: Smart Morning Routine
   * Enhanced with device awareness and optimization
   */
  async smartMorningRoutine(): Promise<any> {
    const decision = await this.agent.analyzeAndPlan(
      "Execute my morning routine: check battery, adjust brightness, fetch weather, and read me the forecast"
    );

    const results = await this.agent.executeTools(decision.toolsToUse);

    return {
      decision,
      results,
      summary: this.summarizeResults(results)
    };
  }

  /**
   * Scenario: Intelligent Document Scanner
   * With error recovery and quality optimization
   */
  async intelligentDocumentScanner(): Promise<string> {
    const decision = await this.agent.analyzeAndPlan(
      "Scan a document with high quality OCR, optimize the text, copy to clipboard, and confirm with voice feedback"
    );

    const results = await this.agent.executeTools(decision.toolsToUse);

    // Extract OCR text
    const ocrResult = results.find(r => r.tool === "ocr_recognize");
    return ocrResult?.result?.text || "No text extracted";
  }

  /**
   * Scenario: Context-Aware Reminder System
   * Uses location, time, and contacts intelligently
   */
  async contextAwareReminder(contactName: string, message: string): Promise<void> {
    const decision = await this.agent.analyzeAndPlan(
      `Create a location-based reminder for ${contactName} with message: "${message}". Include authentication, location context, and confirmation.`
    );

    await this.agent.executeTools(decision.toolsToUse);
  }

  /**
   * Scenario: AI-Powered Research Assistant
   * Combines web scraping, local LLM, and presentation
   */
  async aiResearchAssistant(topic: string): Promise<string> {
    const decision = await this.agent.analyzeAndPlan(
      `Research "${topic}" by scraping relevant websites, use on-device AI to summarize findings, and present results via speech and clipboard`
    );

    const results = await this.agent.executeTools(decision.toolsToUse);

    // Extract AI summary
    const mlxResult = results.find(r => r.tool === "mlx_generate" || r.tool === "mlx_chat_respond");
    return mlxResult?.result?.text || "Research completed";
  }

  /**
   * Scenario: Voice-Controlled Smart Actions
   * Full voice interface with error recovery
   */
  async voiceControlledAction(): Promise<void> {
    const decision = await this.agent.analyzeAndPlan(
      "Listen for voice command, interpret the action needed, execute it, and confirm completion with haptic and voice feedback"
    );

    await this.agent.executeTools(decision.toolsToUse);
  }

  /**
   * Scenario: Secure Quick Actions
   * Biometric + intelligent tool selection
   */
  async secureQuickAction(contactName: string, action: "sms" | "email" | "call"): Promise<void> {
    const decision = await this.agent.analyzeAndPlan(
      `Authenticate with biometrics, find ${contactName}, perform ${action} action, and confirm with haptic feedback`
    );

    await this.agent.executeTools(decision.toolsToUse);
  }

  private summarizeResults(results: ExecutionResult[]): string {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

    return `Executed ${results.length} tools: ${successful} succeeded, ${failed} failed. Total time: ${totalTime}ms`;
  }
}
