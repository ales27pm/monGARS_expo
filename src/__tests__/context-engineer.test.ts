import { setGlobalLLM } from "../utils/on-device-llm";
import { createSemanticMemory, type SemanticMemory } from "../utils/semantic-memory";
import { vectorStore } from "../utils/vector-store";
import { ContextEngineer } from "../services/contextEngineer";
import type { Message as ContextMessage } from "../utils/context-management";

describe("ContextEngineer", () => {
  let memory: SemanticMemory;

  beforeEach(async () => {
    setGlobalLLM(null);
    await vectorStore.waitUntilReady();
    vectorStore.clearAll();
    memory = await createSemanticMemory();
  });

  afterEach(() => {
    setGlobalLLM(null);
  });

  it("injects retrieved context into system prompt", async () => {
    await memory.addConversationMessage(
      "WiFi diagnostics require scanning available SSIDs and logging RSSI for each channel.",
      "assistant",
      "conv-1",
    );
    await memory.addConversationMessage(
      "Use CoreWLAN on macOS or NetworkExtension on iOS to enumerate networks.",
      "assistant",
      "conv-1",
    );

    const engineer = new ContextEngineer({ memory, maxContextItems: 2 });

    const conversation: ContextMessage[] = [{ role: "user", content: "How can I scan WiFi networks on iOS?" }];

    const result = await engineer.engineerContext("How can I scan WiFi networks on iOS?", conversation, {
      conversationId: "conv-1",
    });

    expect(result.messages[0].role).toBe("system");
    expect(result.messages[0].content).toContain("Relevant information");
    expect(result.contextEntries.length).toBeGreaterThan(0);
    expect(result.messages[result.messages.length - 1].content).toContain("WiFi");
  });
});
