const CONVERSATION_PREFIX = "conv";

function sanitizeSeed(seed?: string | null): string | null {
  if (!seed) {
    return null;
  }

  const trimmed = seed.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function createConversationId(seed?: string | null): string {
  const normalizedSeed = sanitizeSeed(seed);
  const timestamp = Date.now().toString(36);
  const randomSegment = Math.random().toString(36).slice(2, 10);

  return [CONVERSATION_PREFIX, normalizedSeed, timestamp, randomSegment]
    .filter((segment): segment is string => Boolean(segment && segment.length > 0))
    .join("-");
}

export function isConversationId(value: string): boolean {
  return new RegExp(`^${CONVERSATION_PREFIX}(?:-[a-z0-9]+){2,}$`).test(value);
}
