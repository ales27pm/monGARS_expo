/**
 * Type definitions for semantic embeddings and vector storage
 * Used for RAG (Retrieval-Augmented Generation) and memory systems
 */

export interface Embedding {
  /** Unique identifier for this embedding */
  id: string;

  /** The original text that was embedded */
  text: string;

  /** Vector representation (typically 384, 512, or 768 dimensions) */
  vector: number[];

  /** When this embedding was created */
  timestamp: number;

  /** Optional metadata for filtering and organization */
  metadata?: {
    /** Source of the text (e.g., "user_message", "document", "note") */
    source?: string;

    /** Category or tag */
    category?: string;

    /** Associated conversation ID */
    conversationId?: string;

    /** Custom fields */
    [key: string]: any;
  };
}

export interface EmbeddingChunk {
  /** Unique identifier for this chunk */
  id: string;

  /** The chunked text */
  text: string;

  /** Parent document ID (if this is a chunk of a larger text) */
  parentId?: string;

  /** Chunk index in the parent document */
  chunkIndex?: number;

  /** Vector representation */
  vector: number[];

  /** Timestamp */
  timestamp: number;

  /** Metadata */
  metadata?: Record<string, any>;
}

export interface SimilaritySearchResult {
  /** The embedding that matched */
  embedding: Embedding;

  /** Cosine similarity score (0-1, higher is more similar) */
  similarity: number;

  /** Distance metric (lower is more similar) */
  distance?: number;
}

export interface EmbeddingStorageStats {
  /** Total number of embeddings stored */
  totalEmbeddings: number;

  /** Total size in bytes */
  storageSize: number;

  /** Number of unique conversations */
  conversationCount: number;

  /** Oldest embedding timestamp */
  oldestEmbedding?: number;

  /** Newest embedding timestamp */
  newestEmbedding?: number;
}

export interface EmbeddingStorageOptions {
  /** Maximum number of embeddings to store before cleanup */
  maxEmbeddings?: number;

  /** Maximum age in days before auto-cleanup */
  maxAgeDays?: number;

  /** Whether to compress vectors for storage */
  compress?: boolean;

  /** Storage key prefix */
  keyPrefix?: string;
}

export interface SemanticSearchOptions {
  /** Maximum number of results to return */
  limit?: number;

  /** Minimum similarity threshold (0-1) */
  threshold?: number;

  /** Filter by metadata */
  filter?: Record<string, any>;

  /** Whether to include the query embedding itself */
  includeQuery?: boolean;
}
