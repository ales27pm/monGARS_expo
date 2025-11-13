/**
 * Semantic Memory System
 * Privacy-first, offline RAG (Retrieval-Augmented Generation)
 *
 * Features:
 * - On-device text embeddings (when ONNX available)
 * - Semantic search with vector similarity
 * - Conversation memory with context retrieval
 * - Automatic text chunking for long documents
 * - Fully offline operation
 */

import { vectorStore, VectorStore } from "./vector-store";
import { chunkText, TextChunk } from "./text-chunking";
import { EmbeddingStorageStats, SemanticSearchOptions } from "../types/embeddings";
import { getGlobalLLM } from "./on-device-llm";
import { extractErrorMessage, isNativeModuleUnavailableError } from "./nativeModuleError";

const DEFAULT_CLOUD_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

const FALLBACK_VECTOR_SIZE = 384;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "if",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "such",
  "that",
  "the",
  "their",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
  if (!isFinite(norm) || norm === 0) {
    return vector.map(() => 0);
  }
  return vector.map((value) => value / norm);
}

function matchVectorDimensions(vector: number[], targetLength: number): number[] {
  if (vector.length === targetLength) {
    return vector;
  }

  if (targetLength <= 0) {
    return [];
  }

  if (vector.length > targetLength) {
    return normalizeVector(vector.slice(0, targetLength));
  }

  const padded = new Array(targetLength).fill(0);
  for (let i = 0; i < Math.min(vector.length, targetLength); i += 1) {
    padded[i] = vector[i];
  }

  return normalizeVector(padded);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

function fallbackEmbedding(text: string): number[] {
  const tokens = tokenize(text);
  const vector = new Array<number>(FALLBACK_VECTOR_SIZE).fill(0);

  if (tokens.length === 0) {
    return vector;
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const tokenHash = hashString(token);
    const bucket = tokenHash % FALLBACK_VECTOR_SIZE;
    vector[bucket] += 1;

    if (index < tokens.length - 1) {
      const nextToken = tokens[index + 1];
      const bigramHash = hashString(`${token}_${nextToken}`);
      const bigramBucket = bigramHash % FALLBACK_VECTOR_SIZE;
      vector[bigramBucket] += 0.5;
    }
  }

  const joined = tokens.join(" ");
  for (let i = 0; i < joined.length - 2; i += 1) {
    const trigram = joined.slice(i, i + 3);
    const trigramHash = hashString(trigram);
    const trigramBucket = trigramHash % FALLBACK_VECTOR_SIZE;
    vector[trigramBucket] += 0.25;
  }

  return normalizeVector(vector);
}

export function createFallbackEmbeddingFunction(): (text: string) => Promise<number[]> {
  return async (text: string) => fallbackEmbedding(text);
}

function getCloudEmbeddingConfig(): {
  apiKey: string | null;
  baseUrl: string;
  model: string;
} {
  const apiKey = process.env.EXPO_PUBLIC_MONGARS_OPENAI_API_KEY ?? null;
  const baseUrl = process.env.EXPO_PUBLIC_MONGARS_OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL;
  const model = process.env.EXPO_PUBLIC_MONGARS_OPENAI_EMBEDDING_MODEL ?? DEFAULT_CLOUD_EMBEDDING_MODEL;

  return { apiKey, baseUrl, model };
}

export function createCloudEmbeddingFunction(): ((text: string) => Promise<number[]>) | null {
  const { apiKey } = getCloudEmbeddingConfig();

  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }

  return async (text: string) => {
    const { apiKey: runtimeKey, baseUrl, model } = getCloudEmbeddingConfig();

    if (!runtimeKey) {
      throw new Error("OpenAI API key not configured for cloud embeddings.");
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${runtimeKey}`,
      },
      body: JSON.stringify({
        input: text,
        model,
      }),
    });

    if (!response.ok) {
      let errorDetail: string | undefined;

      try {
        const data = await response.json();
        errorDetail = data?.error?.message;
      } catch {
        errorDetail = undefined;
      }

      const reason = errorDetail ? `${response.status} ${errorDetail}` : `${response.status}`;
      throw new Error(`Cloud embedding request failed: ${reason}`);
    }

    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Cloud embedding response did not include a valid embedding vector.");
    }

    return normalizeVector(embedding.map((value: unknown) => Number(value) || 0));
  };
}

function shouldFallbackToHashEmbeddings(error: unknown): boolean {
  if (isNativeModuleUnavailableError(error)) {
    return true;
  }

  const message = extractErrorMessage(error).toLowerCase();

  if (!message) {
    return false;
  }

  const recoverablePatterns = [
    "model not initialized",
    "call initializemodel",
    "initialize model()",
    "initllama",
    "failed to load the model",
    "context is null",
    "embedding vector",
  ];

  return recoverablePatterns.some((pattern) => message.includes(pattern));
}

function createResilientEmbeddingFunction(
  onDeviceEmbedding: ((text: string) => Promise<number[]>) | null,
  fallbackEmbeddingFn: (text: string) => Promise<number[]>,
  cloudEmbeddingFn: ((text: string) => Promise<number[]>) | null = null,
): (text: string) => Promise<number[]> {
  let expectedLength: number | null = null;
  let hasLoggedNativeFallback = false;
  let hasLoggedCloudFallback = false;

  const ensureVector = (vector: number[]): number[] => {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Embedding provider returned an empty vector.");
    }

    expectedLength = expectedLength ?? vector.length;
    return expectedLength !== vector.length ? matchVectorDimensions(vector, expectedLength) : normalizeVector(vector);
  };

  const tryCloudEmbedding = async (text: string, reason?: string): Promise<number[]> => {
    const provider = cloudEmbeddingFn;

    if (!provider) {
      const fallbackVector = await fallbackEmbeddingFn(text);
      return ensureVector(fallbackVector);
    }

    if (!hasLoggedCloudFallback) {
      const context = reason ? ` (${reason})` : "";
      console.warn(
        `[SemanticMemory] Falling back to cloud embeddings${context}. Vectors will be generated via OpenAI before storage.`,
      );
      hasLoggedCloudFallback = true;
    }

    try {
      const cloudVector = await provider(text);
      return ensureVector(cloudVector);
    } catch (cloudError) {
      console.error("[SemanticMemory] Cloud embedding failed:", cloudError);
      const fallbackVector = await fallbackEmbeddingFn(text);
      return ensureVector(fallbackVector);
    }
  };

  return async (text: string) => {
    if (onDeviceEmbedding) {
      try {
        const vector = await onDeviceEmbedding(text);
        return ensureVector(vector);
      } catch (error) {
        const message = extractErrorMessage(error);

        if (!shouldFallbackToHashEmbeddings(error)) {
          console.error("[SemanticMemory] Unexpected embedding failure:", error);
          throw error instanceof Error ? error : new Error(message || "Unknown embedding error");
        }

        if (!hasLoggedNativeFallback) {
          const details = message ? ` (${message})` : "";
          console.warn(
            `[SemanticMemory] On-device embeddings unavailable${details}. Attempting cloud embeddings as fallback.`,
          );
          hasLoggedNativeFallback = true;
        }

        return tryCloudEmbedding(text, message);
      }
    }

    if (cloudEmbeddingFn) {
      return tryCloudEmbedding(text);
    }

    const fallbackVector = await fallbackEmbeddingFn(text);
    return ensureVector(fallbackVector);
  };
}

async function tryCreateOnDeviceEmbedding(): Promise<((text: string) => Promise<number[]>) | null> {
  try {
    const llm = getGlobalLLM();
    const info = llm.getModelInfo?.();
    if (info?.isInitialized) {
      return async (text: string) => {
        const embedding = await llm.embed(text);
        return normalizeVector(embedding);
      };
    }
  } catch (error) {
    console.warn("[SemanticMemory] On-device embedding unavailable:", error);
  }
  return null;
}

export interface MemoryEntry {
  /** Unique ID */
  id: string;

  /** Original text */
  text: string;

  /** When it was stored */
  timestamp: number;

  /** Optional metadata */
  metadata?: {
    role?: "user" | "assistant" | "system";
    conversationId?: string;
    category?: string;
    [key: string]: any;
  };
}

export interface RetrievalResult {
  /** The text that matched */
  text: string;

  /** Similarity score (0-1) */
  relevance: number;

  /** Full memory entry */
  entry: MemoryEntry;

  /** Chunk information if text was chunked */
  chunk?: TextChunk;

  /** Raw embedding vector when available */
  vector?: number[];
}

export class SemanticMemory {
  private store: VectorStore;
  private embeddingFunction?: (text: string) => Promise<number[]>;

  constructor(embeddingFn?: (text: string) => Promise<number[]>) {
    this.store = vectorStore;
    this.embeddingFunction = embeddingFn;
  }

  /**
   * Set the embedding function (for when ONNX models are loaded)
   */
  setEmbeddingFunction(fn: (text: string) => Promise<number[]>): void {
    this.embeddingFunction = fn;
  }

  hasEmbeddingFunction(): boolean {
    return typeof this.embeddingFunction === "function";
  }

  getEmbeddingFunction(): ((text: string) => Promise<number[]>) | null {
    return this.embeddingFunction ?? null;
  }

  async embed(text: string): Promise<number[] | null> {
    if (!this.embeddingFunction) {
      return null;
    }

    try {
      return await this.embeddingFunction(text);
    } catch (error) {
      console.warn("[SemanticMemory] Failed to compute embedding:", error);
      return null;
    }
  }

  /**
   * Add a memory entry to the store
   * Automatically chunks long texts
   */
  async addMemory(text: string, metadata?: MemoryEntry["metadata"], chunkLongText: boolean = true): Promise<string[]> {
    if (!this.embeddingFunction) {
      console.warn("Semantic memory is disabled because no embedding function is configured. Skipping memory storage.");
      return [];
    }

    const timestamp = Date.now();

    // Check if text should be chunked
    if (chunkLongText && text.length > 500) {
      const chunks = chunkText(text, {
        maxChunkSize: 500,
        overlapSize: 50,
        splitBySentence: true,
        preserveParagraphs: true,
      });

      const embeddingIds: string[] = [];

      // Embed each chunk
      for (const chunk of chunks) {
        const vector = await this.embeddingFunction(chunk.text);

        const id = await this.store.addEmbedding({
          text: chunk.text,
          vector,
          timestamp,
          metadata: {
            ...metadata,
            isChunk: true,
            chunkIndex: chunk.index,
            chunkTotal: chunks.length,
            originalTextLength: text.length,
          },
        });

        embeddingIds.push(id);
      }

      return embeddingIds;
    } else {
      // Embed full text
      const vector = await this.embeddingFunction(text);

      const id = await this.store.addEmbedding({
        text,
        vector,
        timestamp,
        metadata: {
          ...metadata,
          isChunk: false,
        },
      });

      return [id];
    }
  }

  /**
   * Search memories by semantic similarity to a query
   */
  async searchMemories(query: string, options?: SemanticSearchOptions): Promise<RetrievalResult[]> {
    if (!this.embeddingFunction) {
      console.warn("Semantic memory search skipped because no embedding function is configured.");
      return [];
    }

    const results = await this.store.searchByText(query, this.embeddingFunction, options);

    return results.map((result) => ({
      text: result.embedding.text,
      relevance: result.similarity,
      entry: {
        id: result.embedding.id,
        text: result.embedding.text,
        timestamp: result.embedding.timestamp,
        metadata: result.embedding.metadata,
      },
      vector: Array.isArray(result.embedding.vector) ? [...result.embedding.vector] : undefined,
    }));
  }

  /**
   * Get relevant context for a query (for RAG)
   * Returns formatted string ready to inject into LLM prompt
   */
  async getRelevantContext(
    query: string,
    options: {
      maxResults?: number;
      minRelevance?: number;
      conversationId?: string;
      includeMetadata?: boolean;
    } = {},
  ): Promise<string> {
    const { maxResults = 5, minRelevance = 0.7, conversationId, includeMetadata = false } = options;

    const searchOptions: SemanticSearchOptions = {
      limit: maxResults,
      threshold: minRelevance,
      filter: conversationId ? { conversationId } : undefined,
    };

    if (!this.embeddingFunction) {
      console.warn("Semantic context retrieval skipped because no embedding function is configured.");
      return "";
    }

    const results = await this.searchMemories(query, searchOptions);

    if (results.length === 0) {
      return "";
    }

    // Format results as context
    let context = "Relevant context from memory:\n\n";

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      context += `[${i + 1}] ${result.text}\n`;

      if (includeMetadata && result.entry.metadata) {
        context += `   (relevance: ${(result.relevance * 100).toFixed(0)}%`;
        if (result.entry.metadata.role) {
          context += `, role: ${result.entry.metadata.role}`;
        }
        context += ")\n";
      }

      context += "\n";
    }

    return context;
  }

  /**
   * Add a conversation message to memory
   */
  async addConversationMessage(message: string, role: "user" | "assistant", conversationId: string): Promise<string[]> {
    return this.addMemory(message, {
      role,
      conversationId,
      category: "conversation",
    });
  }

  /**
   * Get conversation history with semantic search
   * Useful for long conversations where we only want relevant parts
   */
  async getRelevantConversationHistory(
    query: string,
    conversationId: string,
    maxMessages: number = 5,
  ): Promise<RetrievalResult[]> {
    return this.searchMemories(query, {
      limit: maxMessages,
      threshold: 0.6,
      filter: { conversationId, category: "conversation" },
    });
  }

  /**
   * Clear all memories (for privacy)
   */
  async clearAllMemories(): Promise<void> {
    await this.store.waitUntilReady();
    this.store.clearAll();
  }

  /**
   * Clear memories for a specific conversation
   */
  async clearConversation(conversationId: string): Promise<number> {
    await this.store.waitUntilReady();
    return this.store.deleteByFilter({ conversationId });
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<EmbeddingStorageStats> {
    await this.store.waitUntilReady();
    return this.store.getStats();
  }

  /**
   * Export memories (for backup/transfer)
   */
  async exportMemories(filter?: Record<string, any>): Promise<MemoryEntry[]> {
    await this.store.waitUntilReady();
    const embeddings = this.store.listEmbeddings(filter);

    return embeddings.map((embedding) => ({
      id: embedding.id,
      text: embedding.text,
      timestamp: embedding.timestamp,
      metadata: embedding.metadata,
    }));
  }

  /**
   * Import memories (from backup)
   */
  async importMemories(memories: MemoryEntry[]): Promise<void> {
    if (!this.embeddingFunction) {
      throw new Error("Embedding function not set. Cannot import memories.");
    }

    for (const memory of memories) {
      await this.addMemory(memory.text, memory.metadata, false);
    }
  }
}

/**
 * Create a semantic memory instance with automatic embedding
 * This is a placeholder - will be implemented when ONNX models are available
 */
export async function createSemanticMemory(): Promise<SemanticMemory> {
  const memory = new SemanticMemory();

  try {
    await vectorStore.waitUntilReady();
  } catch (error) {
    console.error("[SemanticMemory] Failed to initialize vector store:", error);
  }

  const fallbackEmbeddingFn = createFallbackEmbeddingFunction();
  const onDeviceEmbedding = await tryCreateOnDeviceEmbedding();
  const cloudEmbeddingFn = createCloudEmbeddingFunction();

  if (onDeviceEmbedding) {
    memory.setEmbeddingFunction(
      createResilientEmbeddingFunction(onDeviceEmbedding, fallbackEmbeddingFn, cloudEmbeddingFn),
    );
    return memory;
  }

  if (cloudEmbeddingFn) {
    memory.setEmbeddingFunction(createResilientEmbeddingFunction(null, fallbackEmbeddingFn, cloudEmbeddingFn));
    console.warn(
      "[SemanticMemory] On-device embeddings unavailable. Using cloud embeddings via OpenAI for semantic memory.",
    );
    return memory;
  }

  memory.setEmbeddingFunction(createResilientEmbeddingFunction(null, fallbackEmbeddingFn));
  console.warn(
    "[SemanticMemory] Falling back to lightweight hash-based embeddings. " +
      "Configure OpenAI credentials or load an on-device embedding model for higher quality results.",
  );

  return memory;
}

/**
 * Singleton instance (optional - can create multiple instances)
 */
let globalMemoryInstance: SemanticMemory | null = null;

export async function getGlobalMemory(): Promise<SemanticMemory> {
  if (!globalMemoryInstance) {
    globalMemoryInstance = await createSemanticMemory();
  }
  return globalMemoryInstance;
}

type EmbeddingConfiguration =
  | {
      type: "on-device";
      llm: { embed(text: string): Promise<number[]> };
    }
  | { type: "cloud" }
  | { type: "hash" };

export async function configureSemanticMemoryEmbedding(config: EmbeddingConfiguration): Promise<void> {
  const memory = await getGlobalMemory();
  const fallbackEmbeddingFn = createFallbackEmbeddingFunction();
  const cloudEmbeddingFn = createCloudEmbeddingFunction();

  if (config.type === "on-device") {
    const onDeviceEmbedding = async (text: string) => {
      const vector = await config.llm.embed(text);
      return normalizeVector(vector);
    };

    memory.setEmbeddingFunction(
      createResilientEmbeddingFunction(onDeviceEmbedding, fallbackEmbeddingFn, cloudEmbeddingFn),
    );
    return;
  }

  if (config.type === "cloud") {
    if (!cloudEmbeddingFn) {
      console.warn(
        "[SemanticMemory] Cloud embedding requested but OpenAI credentials are missing. Falling back to hash embeddings.",
      );
      memory.setEmbeddingFunction(createResilientEmbeddingFunction(null, fallbackEmbeddingFn));
      return;
    }

    memory.setEmbeddingFunction(createResilientEmbeddingFunction(null, fallbackEmbeddingFn, cloudEmbeddingFn));
    return;
  }

  memory.setEmbeddingFunction(createResilientEmbeddingFunction(null, fallbackEmbeddingFn));
}
