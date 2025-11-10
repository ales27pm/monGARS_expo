/**
 * On-Device Vector Storage System
 * Privacy-first, fully offline semantic memory
 *
 * Uses MMKV for fast vector storage and retrieval
 * Supports semantic search with cosine similarity
 */

import {
  Embedding,
  EmbeddingStorageOptions,
  EmbeddingStorageStats,
  SemanticSearchOptions,
  SimilaritySearchResult,
} from "../types/embeddings";
import { compressVector, topKSimilar } from "./vector-math";
import { getOrCreateVectorStoreKey } from "./secure-key-provider";
import { createMMKVInstance } from "./mmkv-adapter";

// MMKV storage for fast vector operations
const vectorStorage = createMMKVInstance({
  id: "vector-embeddings",
});

// Index storage for fast lookups
const indexStorage = createMMKVInstance({
  id: "vector-index",
});

export class VectorStore {
  private options: Required<EmbeddingStorageOptions>;
  private readonly ready: Promise<void>;
  private readyResolved = false;
  private initializationError: Error | null = null;

  constructor(options: EmbeddingStorageOptions = {}) {
    this.options = {
      maxEmbeddings: options.maxEmbeddings ?? 10000,
      maxAgeDays: options.maxAgeDays ?? 90,
      compress: options.compress ?? true,
      keyPrefix: options.keyPrefix ?? "emb",
    };

    this.ready = this.initializeEncryption()
      .then(() => {
        this.readyResolved = true;
      })
      .catch((error) => {
        const err = error instanceof Error ? error : new Error(String(error ?? "Unknown error"));
        this.initializationError = err;
        console.error("Failed to initialize secure vector storage:", err);
        throw err;
      });
  }

  private async initializeEncryption(): Promise<void> {
    const key = await getOrCreateVectorStoreKey();
    if (key) {
      vectorStorage.recrypt(key);
    }
  }

  async waitUntilReady(): Promise<void> {
    if (this.initializationError) {
      throw this.initializationError;
    }

    try {
      await this.ready;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error ?? "Unknown error"));
      this.initializationError = err;
      throw err;
    }
  }

  isReady(): boolean {
    return this.readyResolved && this.initializationError === null;
  }

  private ensureReadySync(): void {
    if (this.initializationError) {
      throw this.initializationError;
    }

    if (!this.readyResolved) {
      throw new Error(
        "Vector store not initialized. Await vectorStore.waitUntilReady() before using synchronous methods.",
      );
    }
  }

  /**
   * Add an embedding to the store
   */
  async addEmbedding(embedding: Omit<Embedding, "id">): Promise<string> {
    await this.waitUntilReady();
    const id = this.generateId();

    const embeddingWithId: Embedding = {
      ...embedding,
      id,
    };

    // Optionally compress vector for storage
    const processedEmbedding = this.options.compress
      ? {
          ...embeddingWithId,
          vector: compressVector(embeddingWithId.vector),
        }
      : embeddingWithId;

    // Store embedding
    const key = this.getKey(id);
    vectorStorage.set(key, JSON.stringify(processedEmbedding));

    // Update index
    this.updateIndex(id, embeddingWithId);

    // Check if cleanup needed
    await this.cleanupIfNeeded();

    return id;
  }

  /**
   * Add multiple embeddings in batch
   */
  async addBatch(embeddings: Omit<Embedding, "id">[]): Promise<string[]> {
    await this.waitUntilReady();
    const ids: string[] = [];

    for (const embedding of embeddings) {
      const id = await this.addEmbedding(embedding);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Get an embedding by ID
   */
  getEmbedding(id: string): Embedding | null {
    this.ensureReadySync();
    const key = this.getKey(id);
    const data = vectorStorage.getString(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to parse embedding:", error);
      return null;
    }
  }

  /**
   * Search for similar embeddings using cosine similarity
   */
  async search(queryVector: number[], options: SemanticSearchOptions = {}): Promise<SimilaritySearchResult[]> {
    await this.waitUntilReady();
    const { limit = 5, threshold = 0.7, filter } = options;

    // Get all embedding IDs from index
    const ids = this.getAllIds(filter);

    // Load all embeddings (TODO: Optimize for large datasets with approximate search)
    const embeddings: Embedding[] = [];

    for (const id of ids) {
      const embedding = this.getEmbedding(id);
      if (embedding) {
        embeddings.push(embedding);
      }
    }

    const mismatched: { id: string; expected: number; actual: number }[] = [];
    const compatibleEmbeddings = embeddings.filter((embedding) => {
      if (embedding.vector.length !== queryVector.length) {
        mismatched.push({ id: embedding.id, expected: queryVector.length, actual: embedding.vector.length });
        return false;
      }
      return true;
    });

    if (mismatched.length > 0) {
      const sample = mismatched
        .slice(0, 3)
        .map((item) => `${item.id}(${item.actual})`)
        .join(", ");
      console.warn(
        `[VectorStore] Skipped ${mismatched.length} embedding(s) due to dimension mismatch. Expected ${queryVector.length}, ` +
          `saw ${sample}${mismatched.length > 3 ? ", ..." : ""}.`,
      );
    }

    if (compatibleEmbeddings.length === 0) {
      return [];
    }

    // Calculate similarities
    const vectors = compatibleEmbeddings.map((e) => e.vector);
    const topResults = topKSimilar(queryVector, vectors, limit, threshold);

    // Map back to embeddings
    const results: SimilaritySearchResult[] = topResults.map((result: { index: number; similarity: number }) => ({
      embedding: compatibleEmbeddings[result.index],
      similarity: result.similarity,
    }));

    return results;
  }

  /**
   * Semantic search by text (requires embedding function)
   */
  async searchByText(
    text: string,
    embedFn: (text: string) => Promise<number[]>,
    options?: SemanticSearchOptions,
  ): Promise<SimilaritySearchResult[]> {
    await this.waitUntilReady();
    const vector = await embedFn(text);
    return this.search(vector, options);
  }

  /**
   * Delete an embedding by ID
   */
  delete(id: string): boolean {
    this.ensureReadySync();
    const key = this.getKey(id);
    const existed = vectorStorage.contains(key);

    if (existed) {
      vectorStorage.delete(key);
      this.removeFromIndex(id);
    }

    return existed;
  }

  /**
   * Delete embeddings by filter
   */
  deleteByFilter(filter: Record<string, any>): number {
    this.ensureReadySync();
    const ids = this.getAllIds(filter);
    let deleted = 0;

    for (const id of ids) {
      if (this.delete(id)) {
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Clear all embeddings
   */
  clearAll(): void {
    this.ensureReadySync();
    vectorStorage.clearAll();
    indexStorage.clearAll();
  }

  /**
   * Get storage statistics
   */
  getStats(): EmbeddingStorageStats {
    this.ensureReadySync();
    const ids = this.getAllIds();
    const embeddings = ids.map((id) => this.getEmbedding(id)).filter((e): e is Embedding => e !== null);

    const timestamps = embeddings.map((e) => e.timestamp);

    return {
      totalEmbeddings: embeddings.length,
      storageSize: this.calculateStorageSize(),
      conversationCount: this.countUniqueConversations(embeddings),
      oldestEmbedding: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestEmbedding: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
    };
  }

  /**
   * List embeddings for export or analytics
   */
  listEmbeddings(filter?: Record<string, any>): Embedding[] {
    this.ensureReadySync();
    const ids = this.getAllIds(filter);
    const embeddings: Embedding[] = [];

    for (const id of ids) {
      const embedding = this.getEmbedding(id);
      if (embedding) {
        embeddings.push(embedding);
      }
    }

    return embeddings;
  }

  /**
   * Cleanup old embeddings based on age or count limits
   */
  private async cleanupIfNeeded(): Promise<void> {
    await this.waitUntilReady();
    const stats = this.getStats();

    // Check count limit
    if (stats.totalEmbeddings > this.options.maxEmbeddings) {
      await this.cleanupByCount(stats.totalEmbeddings - this.options.maxEmbeddings);
    }

    // Check age limit
    const maxAge = this.options.maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - maxAge;

    const ids = this.getAllIds();
    for (const id of ids) {
      const embedding = this.getEmbedding(id);
      if (embedding && embedding.timestamp < cutoff) {
        this.delete(id);
      }
    }
  }

  /**
   * Remove oldest N embeddings
   */
  private async cleanupByCount(count: number): Promise<void> {
    await this.waitUntilReady();
    const ids = this.getAllIds();
    const embeddings = ids
      .map((id) => {
        const emb = this.getEmbedding(id);
        return emb ? { id, timestamp: emb.timestamp } : null;
      })
      .filter((e): e is { id: string; timestamp: number } => e !== null);

    // Sort by timestamp (oldest first)
    embeddings.sort((a, b) => a.timestamp - b.timestamp);

    // Delete oldest N
    const toDelete = embeddings.slice(0, count);
    for (const { id } of toDelete) {
      this.delete(id);
    }
  }

  /**
   * Generate unique ID for embedding
   */
  private generateId(): string {
    return `${this.options.keyPrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get storage key for embedding ID
   */
  private getKey(id: string): string {
    return `${this.options.keyPrefix}:${id}`;
  }

  /**
   * Update index with new embedding
   */
  private updateIndex(id: string, embedding: Embedding): void {
    this.ensureReadySync();
    const indexKey = "embedding_ids";
    const idsJson = indexStorage.getString(indexKey) ?? "[]";
    const ids = JSON.parse(idsJson) as string[];

    if (!ids.includes(id)) {
      ids.push(id);
      indexStorage.set(indexKey, JSON.stringify(ids));
    }

    // Store metadata index for filtering
    if (embedding.metadata) {
      this.updateMetadataIndex(id, embedding.metadata);
    }
  }

  /**
   * Remove from index
   */
  private removeFromIndex(id: string): void {
    this.ensureReadySync();
    const indexKey = "embedding_ids";
    const idsJson = indexStorage.getString(indexKey) ?? "[]";
    const ids = JSON.parse(idsJson) as string[];

    const filtered = ids.filter((i) => i !== id);
    indexStorage.set(indexKey, JSON.stringify(filtered));
  }

  /**
   * Get all embedding IDs, optionally filtered by metadata
   */
  private getAllIds(filter?: Record<string, any>): string[] {
    this.ensureReadySync();
    const indexKey = "embedding_ids";
    const idsJson = indexStorage.getString(indexKey) ?? "[]";
    const ids = JSON.parse(idsJson) as string[];

    if (!filter) {
      return ids;
    }

    // Filter by metadata
    return ids.filter((id) => {
      const embedding = this.getEmbedding(id);
      if (!embedding || !embedding.metadata) {
        return false;
      }

      return Object.entries(filter).every(([key, value]) => embedding.metadata?.[key] === value);
    });
  }

  /**
   * Update metadata index for fast filtering
   */
  private updateMetadataIndex(id: string, metadata: Record<string, any>): void {
    this.ensureReadySync();
    // Store reverse index: metadata_key -> [ids]
    for (const [key, value] of Object.entries(metadata)) {
      const indexKey = `meta:${key}:${value}`;
      const idsJson = indexStorage.getString(indexKey) ?? "[]";
      const ids = JSON.parse(idsJson) as string[];

      if (!ids.includes(id)) {
        ids.push(id);
        indexStorage.set(indexKey, JSON.stringify(ids));
      }
    }
  }

  /**
   * Calculate total storage size in bytes (approximate)
   */
  private calculateStorageSize(): number {
    this.ensureReadySync();
    // MMKV doesn't expose size directly, so we estimate
    const ids = this.getAllIds();
    let totalSize = 0;

    for (const id of ids) {
      const key = this.getKey(id);
      const data = vectorStorage.getString(key);
      if (data) {
        totalSize += data.length;
      }
    }

    return totalSize;
  }

  /**
   * Count unique conversations
   */
  private countUniqueConversations(embeddings: Embedding[]): number {
    this.ensureReadySync();
    const conversations = new Set(embeddings.map((e) => e.metadata?.conversationId).filter((id): id is string => !!id));
    return conversations.size;
  }
}

// Singleton instance
export const vectorStore = new VectorStore();
