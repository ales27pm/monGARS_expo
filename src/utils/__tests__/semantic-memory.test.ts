import { createSemanticMemory } from "../semantic-memory";
import { vectorStore } from "../vector-store";

type MockOnDeviceLLM = {
  getModelInfo: () => { isInitialized: boolean; modelPath: string | null; modelConfig: unknown };
  embed: (text: string) => Promise<number[]>;
};

jest.mock("../on-device-llm", () => {
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

const FALLBACK_LENGTH = 384;

function createUnitVector(): number[] {
  const vector = new Array(FALLBACK_LENGTH).fill(0);
  vector[0] = 1;
  return vector;
}

class ToggleLLM {
  private failureEmitted = false;

  constructor(private readonly fallbackVector: number[]) {}

  getModelInfo() {
    return { isInitialized: true, modelPath: "model.gguf", modelConfig: null };
  }

  async embed(): Promise<number[]> {
    if (!this.failureEmitted) {
      this.failureEmitted = true;
      throw new Error("Model not initialized. Call initializeModel() first.");
    }
    return this.fallbackVector;
  }
}

describe("SemanticMemory", () => {
  const { setGlobalLLM } = jest.requireMock("../on-device-llm");

  beforeEach(async () => {
    setGlobalLLM(null);
    await vectorStore.waitUntilReady();
    vectorStore.clearAll();
  });

  afterEach(() => {
    setGlobalLLM(null);
  });

  it("falls back to hash embeddings when on-device model is unavailable", async () => {
    const unavailableLLM = {
      getModelInfo: () => ({ isInitialized: false, modelPath: null, modelConfig: null }),
      embed: async () => {
        throw new Error("embed should not be called when model is unavailable");
      },
    } as unknown as MockOnDeviceLLM;

    setGlobalLLM(unavailableLLM);

    const memory = await createSemanticMemory();

    expect(memory.hasEmbeddingFunction()).toBe(true);

    const ids = await memory.addMemory("diagnostic memory entry", { conversationId: "conv-1" });
    expect(ids).toHaveLength(1);

    const results = await memory.searchMemories("diagnostic memory entry", { limit: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("diagnostic memory entry");

    await memory.clearAllMemories();
  });

  it("logs and uses fallback embeddings when llama.rn initialization fails", async () => {
    const warnSpy = jest.spyOn(console, "warn");

    const llm = new ToggleLLM(createUnitVector());
    setGlobalLLM(llm as unknown as MockOnDeviceLLM);

    const memory = await createSemanticMemory();

    const ids = await memory.addMemory("first entry", { conversationId: "conv-2" });
    expect(ids).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalled();

    const idsSecond = await memory.addMemory("second entry", { conversationId: "conv-2" });
    expect(idsSecond).toHaveLength(1);

    warnSpy.mockRestore();
    await memory.clearAllMemories();
  });
});
