import * as CustomModules from "../native-modules";

/**
 * AI Agent with Native iOS Capabilities
 *
 * This agent can reason about tasks and intelligently use all 20 native modules
 * to accomplish complex real-world tasks on iOS.
 */

interface AgentContext {
  userIntent: string;
  availableCapabilities: string[];
  currentLocation?: any;
  deviceState?: any;
  conversationHistory: Message[];
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface ToolUse {
  tool: string;
  reason: string;
  params: any;
}

interface AgentDecision {
  reasoning: string;
  toolsToUse: ToolUse[];
  expectedOutcome: string;
}

export class AIAgent {
  private context: AgentContext;
  private llmClient: any; // Your LLM client (OpenAI, Anthropic, etc.)

  constructor(llmClient: any) {
    this.llmClient = llmClient;
    this.context = {
      userIntent: "",
      availableCapabilities: this.getAvailableCapabilities(),
      conversationHistory: [],
    };
  }

  /**
   * Get all available native capabilities
   */
  private getAvailableCapabilities(): string[] {
    return [
      // Device Features
      "battery_monitoring",
      "brightness_control",
      "sensor_data",
      "device_info",
      "flashlight_control",

      // Communication
      "calendar_events",
      "camera_photo",
      "contacts_management",
      "location_tracking",
      "sms_messaging",
      "email_compose",

      // Media
      "photo_library",
      "web_fetch",
      "web_scraping",

      // Advanced
      "text_to_speech",
      "speech_to_text",
      "ocr_text_recognition",
      "haptic_feedback",
      "biometric_auth",
      "clipboard_operations",
    ];
  }

  /**
   * Main reasoning engine: Analyze user request and decide which tools to use
   */
  async analyzeAndPlan(userRequest: string): Promise<AgentDecision> {
    // Update context
    this.context.userIntent = userRequest;
    this.context.conversationHistory.push({
      role: "user",
      content: userRequest,
      timestamp: Date.now(),
    });

    // Get current device state for context
    const deviceState = await this.gatherDeviceContext();

    // Build reasoning prompt
    const reasoningPrompt = this.buildReasoningPrompt(userRequest, deviceState);

    // Use LLM to reason about the task
    const reasoning = await this.llmClient.chat([
      {
        role: "system",
        content: this.getSystemPrompt(),
      },
      {
        role: "user",
        content: reasoningPrompt,
      },
    ]);

    // Parse LLM response into structured decision
    const decision = this.parseDecision(reasoning.content);

    return decision;
  }

  /**
   * Execute the planned tools in sequence
   */
  async executePlan(decision: AgentDecision): Promise<any> {
    const results = [];

    for (const toolUse of decision.toolsToUse) {
      console.log(`Executing: ${toolUse.tool} - ${toolUse.reason}`);

      try {
        const result = await this.executeTool(toolUse.tool, toolUse.params);
        results.push({
          tool: toolUse.tool,
          success: true,
          result,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          tool: toolUse.tool,
          success: false,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  /**
   * Execute a specific tool with parameters
   */
  private async executeTool(toolName: string, params: any): Promise<any> {
    switch (toolName) {
      // Device Features
      case "battery_monitoring":
        return await CustomModules.BatteryModule.getBatteryInfo();

      case "brightness_control":
        return await CustomModules.BrightnessModule.setBrightness(params.level);

      case "sensor_data":
        return await CustomModules.SensorsModule.getSensorData(params.type, params.duration);

      case "device_info":
        return await CustomModules.DeviceInfoModule.getDeviceInfo();

      case "flashlight_control":
        return await CustomModules.FlashlightModule.setTorchMode(params.on);

      // Communication
      case "calendar_event":
        return await CustomModules.CalendarModule.createEvent(
          params.title,
          params.startDate,
          params.endDate,
          params.durationSeconds,
          params.location,
          params.notes,
        );

      case "take_photo":
        return await CustomModules.CameraModule.takePhoto(params.quality);

      case "find_contacts":
        return await CustomModules.ContactsModule.searchContacts(params.query);

      case "get_location":
        return await CustomModules.LocationModule.getCurrentLocation();

      case "send_sms":
        return await CustomModules.MessagesModule.sendMessage(params.phoneNumber, params.body);

      case "compose_email":
        return await CustomModules.MailComposerModule.composeMail(params);

      // Media
      case "pick_photo":
        return await CustomModules.PhotosModule.pickPhoto();

      case "web_fetch":
        return await CustomModules.WebModule.fetch(params.url, params.options);

      case "web_scrape":
        return await CustomModules.WebModule.scrapeWebpage(params.url, params.options);

      // Advanced
      case "text_to_speech":
        return await CustomModules.SpeechModule.speak(params.text, params.options);

      case "speech_to_text":
        return await CustomModules.SpeechRecognitionModule.startRecognition(params);

      case "ocr_recognize":
        return await CustomModules.OCRModule.recognizeText(params.imagePath);

      case "haptic_feedback":
        return await CustomModules.HapticsModule.impact(params.style);

      case "biometric_auth":
        return await CustomModules.BiometricsModule.authenticate(params.reason);

      case "clipboard_get":
        return await CustomModules.ClipboardModule.getString();

      case "clipboard_set":
        return await CustomModules.ClipboardModule.setString(params.content);

      // AI/ML
      case "mlx_load_model":
        return await CustomModules.MLXModule.loadModel(params.modelId, params.options);

      case "mlx_generate":
        return await CustomModules.MLXModule.generate(params.modelId, params.prompt, params.options);

      case "mlx_chat_session":
        return await CustomModules.MLXModule.createChatSession(params.modelId, params.sessionId, params.systemPrompt);

      case "mlx_chat_respond":
        return await CustomModules.MLXModule.chatRespond(params.sessionId, params.message, params.options);

      case "mlx_recommended_models":
        return await CustomModules.MLXModule.getRecommendedModels();

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Gather current device context for better reasoning
   */
  private async gatherDeviceContext(): Promise<any> {
    try {
      const [deviceInfo, batteryInfo] = await Promise.all([
        CustomModules.DeviceInfoModule.getDeviceInfo(),
        CustomModules.BatteryModule.getBatteryInfo(),
      ]);

      return {
        device: deviceInfo,
        battery: batteryInfo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to gather device context:", error);
      return {};
    }
  }

  /**
   * Build comprehensive system prompt for LLM
   */
  private getSystemPrompt(): string {
    return `You are an AI agent with access to 21 native iOS capabilities. Your role is to:

1. Understand user requests and their underlying intent
2. Reason about which native tools are needed
3. Plan a sequence of tool uses to accomplish the task
4. Consider device context (battery, location, etc.) when making decisions

Available Native Capabilities:
${this.formatCapabilitiesForPrompt()}

Decision Rules:
- Use battery_monitoring before energy-intensive tasks
- Request biometric_auth for sensitive operations
- Use location_tracking for location-aware tasks
- Combine web_scraping with ocr_recognize for visual web data
- Use haptic_feedback to confirm actions
- Chain tools when needed (e.g., take_photo → ocr_recognize)

Output Format:
Respond with a JSON object containing:
{
  "reasoning": "Brief explanation of your decision-making process",
  "toolsToUse": [
    {
      "tool": "tool_name",
      "reason": "Why this tool is needed",
      "params": { /* tool parameters */ }
    }
  ],
  "expectedOutcome": "What the user should expect"
}`;
  }

  /**
   * Format capabilities for LLM prompt
   */
  private formatCapabilitiesForPrompt(): string {
    const capabilities = {
      Device: ["battery_monitoring", "brightness_control", "sensor_data", "device_info", "flashlight_control"],
      Communication: ["calendar_event", "take_photo", "find_contacts", "get_location", "send_sms", "compose_email"],
      Media: ["pick_photo", "web_fetch", "web_scrape"],
      Advanced: [
        "text_to_speech",
        "speech_to_text",
        "ocr_recognize",
        "haptic_feedback",
        "biometric_auth",
        "clipboard_get",
        "clipboard_set",
      ],
      "AI/ML": ["mlx_load_model", "mlx_generate", "mlx_chat_session", "mlx_chat_respond", "mlx_recommended_models"],
    };

    return Object.entries(capabilities)
      .map(([category, tools]) => `${category}: ${tools.join(", ")}`)
      .join("\n");
  }

  /**
   * Build reasoning prompt with context
   */
  private buildReasoningPrompt(userRequest: string, deviceState: any): string {
    return `User Request: "${userRequest}"

Device Context:
- Model: ${deviceState.device?.model || "Unknown"}
- iOS Version: ${deviceState.device?.systemVersion || "Unknown"}
- Battery Level: ${deviceState.battery?.level || "Unknown"}%
- Low Power Mode: ${deviceState.device?.isLowPowerMode ? "Yes" : "No"}
- Current Time: ${new Date().toLocaleString()}

Based on this request and context, determine:
1. What is the user's actual intent?
2. Which native tools are needed?
3. In what order should they be used?
4. What parameters are required?

Provide your decision in the specified JSON format.`;
  }

  /**
   * Parse LLM decision into structured format
   */
  private parseDecision(llmResponse: string): AgentDecision {
    try {
      // Remove markdown code blocks if present
      const cleaned = llmResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      const parsed = JSON.parse(cleaned);

      return {
        reasoning: parsed.reasoning || "No reasoning provided",
        toolsToUse: parsed.toolsToUse || [],
        expectedOutcome: parsed.expectedOutcome || "Task will be executed",
      };
    } catch (error) {
      console.error("Failed to parse LLM response:", error);

      // Fallback: Basic parsing
      return {
        reasoning: "Failed to parse structured decision",
        toolsToUse: [],
        expectedOutcome: "Please try rephrasing your request",
      };
    }
  }

  /**
   * High-level interface: Process request end-to-end
   */
  async processRequest(userRequest: string): Promise<{
    decision: AgentDecision;
    results: any[];
    summary: string;
  }> {
    // Step 1: Analyze and plan
    const decision = await this.analyzeAndPlan(userRequest);

    // Step 2: Execute plan
    const results = await this.executePlan(decision);

    // Step 3: Summarize results
    const summary = await this.summarizeResults(userRequest, decision, results);

    // Update conversation history
    this.context.conversationHistory.push({
      role: "assistant",
      content: summary,
      timestamp: Date.now(),
    });

    return { decision, results, summary };
  }

  /**
   * Summarize execution results for user
   */
  private async summarizeResults(originalRequest: string, decision: AgentDecision, results: any[]): Promise<string> {
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    const summaryPrompt = `Original Request: "${originalRequest}"

Execution Results:
${results.map((r) => `- ${r.tool}: ${r.success ? "Success" : "Failed"}`).join("\n")}

Summary Statistics: ${successCount} succeeded, ${failureCount} failed.

${decision.reasoning}

Create a brief, natural language summary for the user explaining what was done and the outcome.`;

    const summary = await this.llmClient.chat([
      { role: "system", content: "You are a helpful assistant summarizing task execution results." },
      { role: "user", content: summaryPrompt },
    ]);

    return summary.content;
  }
}

/**
 * Pre-built intelligent scenarios using native modules
 */
export class IntelligentScenarios {
  private agent: AIAgent;

  constructor(agent: AIAgent) {
    this.agent = agent;
  }

  /**
   * Scenario: Smart Morning Routine
   * Uses: device_info, battery, brightness, weather (web), calendar, speech
   */
  async morningRoutine(): Promise<void> {
    // Check battery
    const battery = await CustomModules.BatteryModule.getBatteryInfo();

    if (battery.level < 20) {
      await CustomModules.SpeechModule.speak("Your battery is low. Please charge your device.", { rate: 0.5 });
      return;
    }

    // Increase brightness for morning
    await CustomModules.BrightnessModule.setBrightness(0.8);

    // Get weather (only if API key configured)
    const weatherApiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
    if (weatherApiKey) {
      try {
        const weather = await CustomModules.WebModule.fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${weatherApiKey}`,
        );

        const weatherData = JSON.parse(weather.body);

        // Speak morning briefing
        await CustomModules.SpeechModule.speak(
          `Good morning! The temperature is ${weatherData.main.temp} degrees. Have a great day!`,
          { rate: 0.5, pitch: 1.0 },
        );
      } catch (error) {
        console.warn("Morning routine weather fetch failed:", error);
        await CustomModules.SpeechModule.speak(
          "Good morning! Weather information is unavailable right now, but your device is ready to go.",
          { rate: 0.5, pitch: 1.0 },
        );
      }
    } else {
      await CustomModules.SpeechModule.speak(
        "Good morning! Configure a weather API key to include weather updates in this routine.",
        { rate: 0.5, pitch: 1.0 },
      );
    }

    // Haptic confirmation
    await CustomModules.HapticsModule.notification("success");
  }

  /**
   * Scenario: Document Scanner & OCR
   * Uses: camera, ocr, clipboard, haptics, speech
   */
  async scanDocument(): Promise<string> {
    // Take photo
    const photo = await CustomModules.CameraModule.takePhoto(0.9);

    // Haptic feedback
    await CustomModules.HapticsModule.impact("medium");

    // Perform OCR
    const ocrResults = await CustomModules.OCRModule.recognizeText(photo.url);

    // Extract text
    const extractedText = ocrResults.text;

    // Copy to clipboard
    await CustomModules.ClipboardModule.setString(extractedText);

    // Confirm with speech
    await CustomModules.SpeechModule.speak(`Scanned document. Copied to clipboard.`, { rate: 0.6 });

    // Success haptic
    await CustomModules.HapticsModule.notification("success");

    return extractedText;
  }

  /**
   * Scenario: Smart Location Reminder
   * Uses: location, contacts, calendar, biometrics, haptics
   */
  async createLocationReminder(contactName: string, message: string): Promise<void> {
    // Authenticate
    await CustomModules.BiometricsModule.authenticate("Authenticate to create reminder");

    // Get current location
    const location = await CustomModules.LocationModule.getCurrentLocation();

    // Find contact
    const contacts = await CustomModules.ContactsModule.searchContacts(contactName);

    if (contacts.length === 0) {
      throw new Error("Contact not found");
    }

    // Create calendar event at this location
    await CustomModules.CalendarModule.createEvent(
      `Reminder: ${message}`,
      new Date().toISOString(),
      undefined,
      3600,
      `${location.latitude}, ${location.longitude}`,
      `Message for ${contacts[0].givenName} ${contacts[0].familyName}`,
    );

    // Haptic confirmation
    await CustomModules.HapticsModule.notification("success");
  }

  /**
   * Scenario: Web Research Assistant
   * Uses: web_scrape, ocr (for images), speech, clipboard
   */
  async researchTopic(topic: string): Promise<any> {
    // Scrape search results
    const searchResults = await CustomModules.WebModule.searchGoogle(topic);

    // Extract top 5 links
    const topLinks = searchResults.links.slice(0, 5);

    // Scrape each link
    const articles = await Promise.all(topLinks.map((link) => CustomModules.WebModule.scrapeWebpage(link.href, {})));

    // Compile research
    const research = {
      topic,
      sources: articles.map((a) => ({
        title: a.title,
        url: a.url,
        summary: a.text.substring(0, 500),
      })),
    };

    // Copy JSON to clipboard
    await CustomModules.ClipboardModule.setString(JSON.stringify(research, null, 2));

    // Speak summary
    await CustomModules.SpeechModule.speak(
      `Research complete. Found ${articles.length} articles about ${topic}. Data copied to clipboard.`,
      { rate: 0.6 },
    );

    return research;
  }

  /**
   * Scenario: Voice-Controlled Smart Home
   * Uses: speech_to_text, brightness, flashlight, haptics
   */
  async voiceControl(): Promise<void> {
    // Listen for command
    await CustomModules.SpeechModule.speak("Listening for command", { rate: 0.7 });

    const recognition = await CustomModules.SpeechRecognitionModule.startRecognition({});
    const command = recognition.text.toLowerCase();

    // Parse command
    if (command.includes("light on") || command.includes("flashlight")) {
      await CustomModules.FlashlightModule.setTorchMode(true);
      await CustomModules.SpeechModule.speak("Light is on", { rate: 0.6 });
    } else if (command.includes("light off")) {
      await CustomModules.FlashlightModule.setTorchMode(false);
      await CustomModules.SpeechModule.speak("Light is off", { rate: 0.6 });
    } else if (command.includes("bright")) {
      await CustomModules.BrightnessModule.setBrightness(1.0);
      await CustomModules.SpeechModule.speak("Brightness set to maximum", { rate: 0.6 });
    } else if (command.includes("dim")) {
      await CustomModules.BrightnessModule.setBrightness(0.3);
      await CustomModules.SpeechModule.speak("Brightness dimmed", { rate: 0.6 });
    }

    // Haptic confirmation
    await CustomModules.HapticsModule.selection();
  }

  /**
   * Scenario: Contact Quick Actions
   * Uses: contacts, sms, email, location, biometrics
   */
  async quickContactAction(contactName: string, action: "sms" | "email" | "share_location"): Promise<void> {
    // Authenticate for sensitive action
    await CustomModules.BiometricsModule.authenticate(`Authenticate to ${action} ${contactName}`);

    // Find contact
    const contacts = await CustomModules.ContactsModule.searchContacts(contactName);

    if (contacts.length === 0) {
      throw new Error("Contact not found");
    }

    const contact = contacts[0];

    switch (action) {
      case "sms":
        if (contact.phoneNumbers.length > 0) {
          await CustomModules.MessagesModule.sendMessage(
            contact.phoneNumbers[0],
            "Quick message sent via native module!",
          );
        }
        break;

      case "email":
        if (contact.emailAddresses.length > 0) {
          await CustomModules.MailComposerModule.composeMail({
            to: [contact.emailAddresses[0]],
            subject: "Hello",
            body: "Sent via native module",
          });
        }
        break;

      case "share_location":
        const location = await CustomModules.LocationModule.getCurrentLocation();
        if (contact.phoneNumbers.length > 0) {
          await CustomModules.MessagesModule.sendMessage(
            contact.phoneNumbers[0],
            `My location: ${location.latitude}, ${location.longitude}`,
          );
        }
        break;
    }

    // Success feedback
    await CustomModules.HapticsModule.notification("success");
  }
}

export default AIAgent;
