import { averageVectors, cosineSimilarity, euclideanDistance, dotProduct } from "./vector-math";

export interface SparseAttentionOptions {
  topK?: number;
  threshold?: number;
  useCosine?: boolean;
}

export function applySparseAttention(
  queryVector: number[],
  contextVectors: number[][],
  options: SparseAttentionOptions = {},
): number[] {
  const { topK = 5, threshold = 0.5, useCosine = true } = options;

  if (!Array.isArray(contextVectors) || contextVectors.length === 0) {
    return [];
  }

  const scores = contextVectors.map((vector, index) => {
    const score = useCosine ? cosineSimilarity(queryVector, vector) : dotProduct(queryVector, vector);
    return { index, score };
  });

  return scores
    .filter((entry) => entry.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((entry) => entry.index);
}

export function applyBlockSparseAttention(
  queryVector: number[],
  contextVectors: number[][],
  blockSize: number = 64,
): number[] {
  if (!Array.isArray(contextVectors) || contextVectors.length === 0) {
    return [];
  }

  const numBlocks = Math.ceil(contextVectors.length / blockSize);
  const blockScores: { blockIndex: number; score: number; start: number; end: number }[] = [];

  for (let blockIndex = 0; blockIndex < numBlocks; blockIndex += 1) {
    const start = blockIndex * blockSize;
    const end = Math.min(start + blockSize, contextVectors.length);
    const blockVectors = contextVectors.slice(start, end);
    const representative = averageVectors(blockVectors);
    const score = cosineSimilarity(queryVector, representative);
    blockScores.push({ blockIndex, score, start, end });
  }

  blockScores.sort((a, b) => b.score - a.score);
  const selectedBlocks = blockScores.slice(0, Math.max(1, Math.ceil(numBlocks / 2)));

  const indices: number[] = [];
  for (const block of selectedBlocks) {
    for (let index = block.start; index < block.end; index += 1) {
      indices.push(index);
    }
  }

  return indices;
}

export interface HierarchicalSparseAttentionOptions {
  numClusters?: number;
  topKPerCluster?: number;
}

export function applyHierarchicalSparseAttention(
  queryVector: number[],
  contextVectors: number[][],
  options: HierarchicalSparseAttentionOptions = {},
): number[] {
  const { numClusters = 3, topKPerCluster = 2 } = options;

  if (!Array.isArray(contextVectors) || contextVectors.length === 0) {
    return [];
  }

  const clusters = clusterVectors(contextVectors, numClusters);
  const selectedIndices: number[] = [];

  for (const cluster of clusters) {
    const clusterScores = cluster.indices.map((index) => ({
      index,
      score: cosineSimilarity(queryVector, contextVectors[index]),
    }));

    clusterScores.sort((a, b) => b.score - a.score);
    for (const entry of clusterScores.slice(0, topKPerCluster)) {
      selectedIndices.push(entry.index);
    }
  }

  return Array.from(new Set(selectedIndices));
}

interface ClusterResult {
  centroid: number[];
  indices: number[];
}

function clusterVectors(vectors: number[][], numClusters: number): ClusterResult[] {
  if (vectors.length === 0) {
    return [];
  }

  if (vectors.length <= numClusters) {
    return vectors.map((vector, index) => ({ centroid: vector, indices: [index] }));
  }

  const centroids: number[][] = [];
  const firstIndex = Math.floor(Math.random() * vectors.length);
  centroids.push([...vectors[firstIndex]]);

  while (centroids.length < numClusters) {
    const distances = vectors.map((vector) => {
      let minDistance = Infinity;
      for (const centroid of centroids) {
        const distance = euclideanDistance(vector, centroid);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
      return minDistance;
    });

    const totalDistance = distances.reduce((sum, value) => sum + value, 0);
    let r = Math.random() * totalDistance;
    let nextIndex = 0;
    for (let i = 0; i < distances.length; i += 1) {
      r -= distances[i];
      if (r <= 0) {
        nextIndex = i;
        break;
      }
    }
    centroids.push([...vectors[nextIndex]]);
  }

  let clusters: ClusterResult[] = Array.from({ length: numClusters }, () => ({ centroid: [], indices: [] }));
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 10) {
    clusters = Array.from({ length: numClusters }, () => ({ centroid: [], indices: [] }));

    for (let vectorIndex = 0; vectorIndex < vectors.length; vectorIndex += 1) {
      let minDistance = Infinity;
      let bestCluster = 0;
      for (let clusterIndex = 0; clusterIndex < numClusters; clusterIndex += 1) {
        const distance = euclideanDistance(vectors[vectorIndex], centroids[clusterIndex]);
        if (distance < minDistance) {
          minDistance = distance;
          bestCluster = clusterIndex;
        }
      }
      clusters[bestCluster].indices.push(vectorIndex);
    }

    changed = false;
    for (let clusterIndex = 0; clusterIndex < numClusters; clusterIndex += 1) {
      const cluster = clusters[clusterIndex];
      if (cluster.indices.length > 0) {
        const newCentroid = averageVectors(cluster.indices.map((index) => vectors[index]));
        if (euclideanDistance(newCentroid, centroids[clusterIndex]) > 0.001) {
          changed = true;
          centroids[clusterIndex] = newCentroid;
        }
        cluster.centroid = centroids[clusterIndex];
      } else {
        cluster.centroid = centroids[clusterIndex];
      }
    }

    iterations += 1;
  }

  return clusters;
}
