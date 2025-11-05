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

import { vectorStore, VectorStore } from "../utils/vector-store";
import { chunkText, TextChunk } from "../utils/text-chunking";
import { Embedding, SemanticSearchOptions } from "../types/embeddings";

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

  /**
   * Add a memory entry to the store
   * Automatically chunks long texts
   */
  async addMemory(
    text: string,
    metadata?: MemoryEntry["metadata"],
    chunkLongText: boolean = true
  ): Promise<string[]> {
    if (!this.embeddingFunction) {
      throw new Error(
        "Embedding function not set. Call setEmbeddingFunction() first or wait for model to load."
      );
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
  async searchMemories(
    query: string,
    options?: SemanticSearchOptions
  ): Promise<RetrievalResult[]> {
    if (!this.embeddingFunction) {
      throw new Error("Embedding function not set. Cannot perform search.");
    }

    const results = await this.store.searchByText(
      query,
      this.embeddingFunction,
      options
    );

    return results.map((result) => ({
      text: result.embedding.text,
      relevance: result.similarity,
      entry: {
        id: result.embedding.id,
        text: result.embedding.text,
        timestamp: result.embedding.timestamp,
        metadata: result.embedding.metadata,
      },
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
    } = {}
  ): Promise<string> {
    const {
      maxResults = 5,
      minRelevance = 0.7,
      conversationId,
      includeMetadata = false,
    } = options;

    const searchOptions: SemanticSearchOptions = {
      limit: maxResults,
      threshold: minRelevance,
      filter: conversationId ? { conversationId } : undefined,
    };

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
  async addConversationMessage(
    message: string,
    role: "user" | "assistant",
    conversationId: string
  ): Promise<string[]> {
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
    maxMessages: number = 5
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
  clearAllMemories(): void {
    this.store.clearAll();
  }

  /**
   * Clear memories for a specific conversation
   */
  clearConversation(conversationId: string): number {
    return this.store.deleteByFilter({ conversationId });
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return this.store.getStats();
  }

  /**
   * Export memories (for backup/transfer)
   */
  async exportMemories(): Promise<MemoryEntry[]> {
    const stats = this.store.getStats();
    const memories: MemoryEntry[] = [];

    // This is a simplified export - in production, you'd iterate through all IDs
    // For now, return empty array as placeholder
    return memories;
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
  // TODO: Load embedding model and create embedding function
  // For now, return instance without embedding function
  // User must call setEmbeddingFunction() after model is loaded

  const memory = new SemanticMemory();

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
