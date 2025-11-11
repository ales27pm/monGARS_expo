/**
 * Vector math utilities for semantic search and embeddings
 * All operations are optimized for mobile performance
 */

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1 (typically 0-1 for embeddings)
 * Higher values indicate more similarity
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Calculate Euclidean distance between two vectors
 * Lower values indicate more similarity
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Calculate dot product between two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result += a[i] * b[i];
  }

  return result;
}

/**
 * Normalize a vector (make it unit length)
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  if (magnitude === 0) {
    return vector.map(() => 0);
  }

  return vector.map((val) => val / magnitude);
}

/**
 * Calculate the magnitude (length) of a vector
 */
export function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Compress a vector by reducing precision (for storage optimization)
 * Converts float64 -> float16-like representation
 */
export function compressVector(vector: number[], precision: number = 3): number[] {
  return vector.map((val) => Number(val.toFixed(precision)));
}

/**
 * Batch cosine similarity calculation
 * Returns array of similarities in the same order as vectorsB
 */
export function batchCosineSimilarity(queryVector: number[], vectorsB: number[][]): number[] {
  return vectorsB.map((vec) => cosineSimilarity(queryVector, vec));
}

/**
 * Find top K most similar vectors
 * Returns indices and similarity scores
 */
export function topKSimilar(
  queryVector: number[],
  vectors: number[][],
  k: number = 5,
  threshold: number = 0,
): { index: number; similarity: number }[] {
  const similarities = batchCosineSimilarity(queryVector, vectors);

  const results = similarities
    .map((similarity, index) => ({ index, similarity }))
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  return results;
}

/**
 * Calculate average of multiple vectors (centroid)
 */
export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return [];
  }

  const length = vectors[0].length;
  const result = new Array(length).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < length; i++) {
      result[i] += vector[i];
    }
  }

  return result.map((val) => val / vectors.length);
}

/**
 * Simple vector quantization for storage optimization
 * Converts float32 -> uint8 (reduces size by 4x)
 */
export function quantizeVector(vector: number[]): Uint8Array {
  // Find min and max for normalization
  const min = Math.min(...vector);
  const max = Math.max(...vector);
  const range = max - min;

  if (range === 0) {
    return new Uint8Array(vector.length).fill(0);
  }

  const quantized = new Uint8Array(vector.length);

  for (let i = 0; i < vector.length; i++) {
    // Normalize to 0-255
    quantized[i] = Math.round(((vector[i] - min) / range) * 255);
  }

  return quantized;
}

/**
 * Dequantize a vector back to float32
 */
export function dequantizeVector(quantized: Uint8Array, min: number, max: number): number[] {
  const range = max - min;
  const result = new Array(quantized.length);

  for (let i = 0; i < quantized.length; i++) {
    result[i] = (quantized[i] / 255) * range + min;
  }

  return result;
}
