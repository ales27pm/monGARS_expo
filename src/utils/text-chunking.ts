/**
 * Text chunking utilities for semantic embeddings
 * Splits long texts into smaller chunks for better embedding quality
 */

export interface ChunkOptions {
  /** Maximum characters per chunk */
  maxChunkSize?: number;

  /** Overlap between chunks for context preservation */
  overlapSize?: number;

  /** Minimum chunk size (avoid tiny chunks) */
  minChunkSize?: number;

  /** Split by sentences (vs fixed size) */
  splitBySentence?: boolean;

  /** Preserve paragraphs when possible */
  preserveParagraphs?: boolean;
}

export interface TextChunk {
  /** Chunk text */
  text: string;

  /** Chunk index in original document */
  index: number;

  /** Start position in original text */
  startPos: number;

  /** End position in original text */
  endPos: number;

  /** Whether this is the first chunk */
  isFirst: boolean;

  /** Whether this is the last chunk */
  isLast: boolean;
}

/**
 * Split text into chunks with overlap for semantic search
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const {
    maxChunkSize = 500,
    overlapSize = 50,
    minChunkSize = 50,
    splitBySentence = true,
    preserveParagraphs = true,
  } = options;

  // Handle empty text
  if (!text || text.trim().length === 0) {
    return [];
  }

  // If text is small enough, return as single chunk
  if (text.length <= maxChunkSize) {
    return [
      {
        text: text.trim(),
        index: 0,
        startPos: 0,
        endPos: text.length,
        isFirst: true,
        isLast: true,
      },
    ];
  }

  // Split by paragraphs first if requested
  if (preserveParagraphs) {
    const paragraphs = text.split(/\n\n+/);
    const chunks: TextChunk[] = [];
    let currentPos = 0;

    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) {
        currentPos += paragraph.length + 2; // +2 for \n\n
        continue;
      }

      // If paragraph fits in chunk size, keep it intact
      if (paragraph.length <= maxChunkSize) {
        chunks.push({
          text: paragraph.trim(),
          index: chunks.length,
          startPos: currentPos,
          endPos: currentPos + paragraph.length,
          isFirst: chunks.length === 0,
          isLast: false,
        });
        currentPos += paragraph.length + 2;
      } else {
        // Split large paragraph into chunks
        const paraChunks = splitBySentence
          ? chunkBySentence(paragraph, maxChunkSize, overlapSize, minChunkSize)
          : chunkBySize(paragraph, maxChunkSize, overlapSize);

        for (const chunk of paraChunks) {
          chunks.push({
            ...chunk,
            index: chunks.length,
            startPos: currentPos + chunk.startPos,
            endPos: currentPos + chunk.endPos,
            isFirst: chunks.length === 0,
            isLast: false,
          });
        }
        currentPos += paragraph.length + 2;
      }
    }

    // Mark last chunk
    if (chunks.length > 0) {
      chunks[chunks.length - 1].isLast = true;
    }

    return chunks;
  }

  // Standard chunking without paragraph preservation
  return splitBySentence
    ? chunkBySentence(text, maxChunkSize, overlapSize, minChunkSize)
    : chunkBySize(text, maxChunkSize, overlapSize);
}

/**
 * Split text by sentences, respecting max chunk size
 */
function chunkBySentence(
  text: string,
  maxSize: number,
  overlap: number,
  minSize: number
): TextChunk[] {
  // Split by sentence boundaries
  const sentenceRegex = /[.!?]+\s+/g;
  const sentences: string[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(sentenceRegex)) {
    const endIndex = match.index! + match[0].length;
    sentences.push(text.slice(lastIndex, endIndex).trim());
    lastIndex = endIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    sentences.push(text.slice(lastIndex).trim());
  }

  // Combine sentences into chunks
  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let currentStartPos = 0;
  let sentenceStartPos = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    // Check if adding this sentence would exceed max size
    if (currentChunk.length + sentence.length > maxSize && currentChunk.length >= minSize) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        index: chunks.length,
        startPos: currentStartPos,
        endPos: sentenceStartPos,
        isFirst: chunks.length === 0,
        isLast: false,
      });

      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + " " + sentence;
      currentStartPos = sentenceStartPos - overlapText.length;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }

    sentenceStartPos += sentence.length + 1;
  }

  // Add final chunk
  if (currentChunk.trim().length >= minSize) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunks.length,
      startPos: currentStartPos,
      endPos: text.length,
      isFirst: chunks.length === 0,
      isLast: true,
    });
  }

  return chunks;
}

/**
 * Split text by fixed size with overlap
 */
function chunkBySize(text: string, maxSize: number, overlap: number): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxSize, text.length);
    const chunkText = text.slice(start, end).trim();

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        index: chunks.length,
        startPos: start,
        endPos: end,
        isFirst: start === 0,
        isLast: end >= text.length,
      });
    }

    // Move to next chunk with overlap
    start = end - overlap;

    // Avoid infinite loop on small texts
    if (start >= text.length - overlap) {
      break;
    }
  }

  return chunks;
}

/**
 * Reconstruct original text from chunks (best effort)
 */
export function reconstructFromChunks(chunks: TextChunk[]): string {
  if (chunks.length === 0) {
    return "";
  }

  // Sort by index
  const sorted = [...chunks].sort((a, b) => a.index - b.index);

  // Simple concatenation with paragraph breaks
  return sorted.map((chunk) => chunk.text).join("\n\n");
}

/**
 * Find the best chunk containing a specific position
 */
export function findChunkAtPosition(chunks: TextChunk[], position: number): TextChunk | null {
  return (
    chunks.find((chunk) => position >= chunk.startPos && position < chunk.endPos) || null
  );
}

/**
 * Merge overlapping chunks
 */
export function mergeOverlappingChunks(chunks: TextChunk[], threshold: number = 0.5): TextChunk[] {
  if (chunks.length <= 1) {
    return chunks;
  }

  const sorted = [...chunks].sort((a, b) => a.startPos - b.startPos);
  const merged: TextChunk[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = merged[merged.length - 1];

    // Calculate overlap
    const overlapStart = Math.max(previous.startPos, current.startPos);
    const overlapEnd = Math.min(previous.endPos, current.endPos);
    const overlapLength = Math.max(0, overlapEnd - overlapStart);

    const currentLength = current.endPos - current.startPos;
    const overlapRatio = overlapLength / currentLength;

    // Merge if overlap is significant
    if (overlapRatio >= threshold) {
      // Extend previous chunk
      previous.text =
        previous.text + " " + current.text.slice(overlapLength).trim();
      previous.endPos = Math.max(previous.endPos, current.endPos);
      previous.isLast = current.isLast;
    } else {
      merged.push(current);
    }
  }

  // Reindex
  return merged.map((chunk, index) => ({
    ...chunk,
    index,
  }));
}
