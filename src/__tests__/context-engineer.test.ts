import { setGlobalLLM } from "../utils/on-device-llm";
import { createSemanticMemory, type SemanticMemory } from "../utils/semantic-memory";
import { vectorStore } from "../utils/vector-store";
import { ContextEngineer } from "../services/contextEngineer";
import type { Message as ContextMessage } from "../utils/context-management";

jest.mock("../utils/on-device-llm", () => {
  class MockLLM {
    getModelInfo() {
      return { isInitialized: false, modelPath: null, modelConfig: null };
    }

    async embed(): Promise<number[]> {
      throw new Error("Mock embed not implemented");
    }
  }

  let currentLLM: unknown | null = null;

  return {
    getGlobalLLM: () => {
      if (!currentLLM) {
        currentLLM = new MockLLM();
      }
      return currentLLM;
    },
    setGlobalLLM: (instance: unknown) => {
      currentLLM = instance;
    },
  };
});

describe("ContextEngineer", () => {
  let memory: SemanticMemory;
  const deterministicEmbedding = async (text: string): Promise<number[]> => {
    const lower = text.toLowerCase();
    const vector = new Array(8).fill(0);
    vector[0] = lower.includes("wifi") ? 1 : 0;
    vector[1] = lower.includes("network") ? 1 : 0;
    vector[2] = lower.includes("scan") ? 1 : 0;
    vector[3] = lower.includes("ios") ? 1 : 0;
    vector[4] = lower.includes("corewlan") ? 1 : 0;
    vector[5] = lower.includes("battery") ? 1 : 0;
    vector[6] = lower.length / 100;
    vector[7] = 1;
    return vector;
  };

  beforeEach(async () => {
    setGlobalLLM(null);
    await vectorStore.waitUntilReady();
    vectorStore.clearAll();
    memory = await createSemanticMemory();
    memory.setEmbeddingFunction(deterministicEmbedding);
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
    expect(result.contextEntries.length).toBeGreaterThan(0);
    expect(result.messages[0].content.toLowerCase()).toContain("relevant information");
    expect(result.messages[result.messages.length - 1].content).toContain("WiFi");
  });
});
