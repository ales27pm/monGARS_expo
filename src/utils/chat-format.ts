import type { ChatTurn } from "../types/chat";

export type FormattedMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Convert chat history into the format expected by both MLX and cloud APIs.
 * Empty messages are filtered out and the optional system prompt is placed at
 * the beginning of the array when provided.
 */
export function buildChatMessages(history: ChatTurn[], systemPrompt?: string): FormattedMessage[] {
  const messages: FormattedMessage[] = [];

  if (systemPrompt && systemPrompt.trim().length > 0) {
    messages.push({ role: "system", content: systemPrompt.trim() });
  }

  for (const turn of history) {
    const trimmed = turn.content.trim();
    if (!trimmed) {
      continue;
    }
    messages.push({ role: turn.role, content: trimmed });
  }

  return messages;
}
