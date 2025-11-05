/**
 * Context Management for LLMs
 * Handles context window limits, message history, and RAG integration
 */

import { RetrievalResult } from "./semantic-memory";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp?: number;
  tokens?: number;
}

export interface ContextOptions {
  /** Maximum context tokens (model-dependent) */
  maxTokens: number;

  /** Reserve tokens for completion */
  reserveTokens?: number;

  /** Whether to include system prompt in token count */
  includeSystem?: boolean;

  /** Strategy for handling overflow */
  overflowStrategy?: "truncate-old" | "truncate-middle" | "summarize";
}

/**
 * Rough token estimation (more accurate than char count / 4)
 * Based on GPT tokenizer averages
 */
export function estimateTokens(text: string): number {
  // Average: ~4 chars per token for English
  // Adjust for punctuation, spaces, and special chars
  const words = text.split(/\s+/).length;
  const chars = text.length;

  // Heuristic: words * 1.3 (accounts for subword tokenization)
  return Math.ceil(words * 1.3);
}

/**
 * Context Window Manager
 * Ensures conversation fits within model's context limit
 */
export class ContextManager {
  private options: Required<ContextOptions>;

  constructor(options: ContextOptions) {
    this.options = {
      maxTokens: options.maxTokens,
      reserveTokens: options.reserveTokens ?? 512,
      includeSystem: options.includeSystem ?? true,
      overflowStrategy: options.overflowStrategy ?? "truncate-old",
    };
  }

  /**
   * Fit messages into context window
   * Returns messages that fit within token limit
   */
  fitMessages(messages: Message[]): Message[] {
    // Calculate available tokens
    const availableTokens = this.options.maxTokens - this.options.reserveTokens;

    // Estimate tokens for each message
    const messagesWithTokens = messages.map((msg) => ({
      ...msg,
      tokens: estimateTokens(msg.content),
    }));

    // Separate system messages
    const systemMessages = messagesWithTokens.filter(
      (m) => m.role === "system"
    );
    const conversationMessages = messagesWithTokens.filter(
      (m) => m.role !== "system"
    );

    // Calculate system tokens
    const systemTokens = this.options.includeSystem
      ? systemMessages.reduce((sum, m) => sum + (m.tokens ?? 0), 0)
      : 0;

    const conversationLimit = availableTokens - systemTokens;

    // Apply overflow strategy
    let fittedConversation: Message[];

    switch (this.options.overflowStrategy) {
      case "truncate-old":
        fittedConversation = this.truncateOld(
          conversationMessages,
          conversationLimit
        );
        break;

      case "truncate-middle":
        fittedConversation = this.truncateMiddle(
          conversationMessages,
          conversationLimit
        );
        break;

      case "summarize":
        // TODO: Implement summarization (requires LLM call)
        fittedConversation = this.truncateOld(
          conversationMessages,
          conversationLimit
        );
        break;

      default:
        fittedConversation = this.truncateOld(
          conversationMessages,
          conversationLimit
        );
    }

    // Combine system + conversation
    return [...systemMessages, ...fittedConversation];
  }

  /**
   * Truncate old messages (keep recent messages)
   */
  private truncateOld(messages: Message[], tokenLimit: number): Message[] {
    const result: Message[] = [];
    let totalTokens = 0;

    // Work backwards from most recent
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = msg.tokens ?? estimateTokens(msg.content);

      if (totalTokens + msgTokens <= tokenLimit) {
        result.unshift(msg);
        totalTokens += msgTokens;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Truncate middle messages (keep first and last)
   */
  private truncateMiddle(messages: Message[], tokenLimit: number): Message[] {
    if (messages.length === 0) return [];

    // Always keep first and last message if possible
    const first = messages[0];
    const last = messages[messages.length - 1];

    const firstTokens = first.tokens ?? estimateTokens(first.content);
    const lastTokens = last.tokens ?? estimateTokens(last.content);

    if (firstTokens + lastTokens > tokenLimit) {
      // Even first and last don't fit, just keep last
      return [last];
    }

    const result = [first];
    let totalTokens = firstTokens;

    // Try to fit messages from the end
    for (let i = messages.length - 1; i > 0; i--) {
      const msg = messages[i];
      const msgTokens = msg.tokens ?? estimateTokens(msg.content);

      if (totalTokens + msgTokens <= tokenLimit) {
        if (i === messages.length - 1) {
          result.push(msg);
        } else {
          result.splice(result.length, 0, msg);
        }
        totalTokens += msgTokens;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Check if messages fit within context
   */
  checkFit(messages: Message[]): {
    fits: boolean;
    totalTokens: number;
    availableTokens: number;
  } {
    const totalTokens = messages.reduce(
      (sum, msg) => sum + (msg.tokens ?? estimateTokens(msg.content)),
      0
    );

    const availableTokens = this.options.maxTokens - this.options.reserveTokens;

    return {
      fits: totalTokens <= availableTokens,
      totalTokens,
      availableTokens,
    };
  }

  /**
   * Get context statistics
   */
  getStats(messages: Message[]) {
    const fit = this.checkFit(messages);

    return {
      ...fit,
      maxTokens: this.options.maxTokens,
      reserveTokens: this.options.reserveTokens,
      messageCount: messages.length,
      utilizationPercent: (fit.totalTokens / fit.availableTokens) * 100,
    };
  }
}

/**
 * RAG Context Builder
 * Combines retrieved memories with conversation
 */
export class RAGContextBuilder {
  /**
   * Build a prompt with RAG context
   */
  static buildPrompt(
    query: string,
    retrievedContext: RetrievalResult[],
    options: {
      systemPrompt?: string;
      includeRelevanceScores?: boolean;
      maxContextLength?: number;
    } = {}
  ): string {
    const {
      systemPrompt,
      includeRelevanceScores = false,
      maxContextLength = 2000,
    } = options;

    let prompt = "";

    // Add system prompt
    if (systemPrompt) {
      prompt += `${systemPrompt}\n\n`;
    }

    // Add retrieved context
    if (retrievedContext.length > 0) {
      prompt += "Relevant information from memory:\n\n";

      let contextLength = 0;

      for (let i = 0; i < retrievedContext.length; i++) {
        const result = retrievedContext[i];

        let contextEntry = `[${i + 1}] ${result.text}\n`;

        if (includeRelevanceScores) {
          contextEntry += `   (relevance: ${(result.relevance * 100).toFixed(0)}%)\n`;
        }

        contextEntry += "\n";

        // Check length limit
        if (contextLength + contextEntry.length > maxContextLength) {
          break;
        }

        prompt += contextEntry;
        contextLength += contextEntry.length;
      }

      prompt += "---\n\n";
    }

    // Add user query
    prompt += `User: ${query}\n\nAssistant:`;

    return prompt;
  }

  /**
   * Build chat messages with RAG context
   */
  static buildChatMessages(
    messages: Message[],
    retrievedContext: RetrievalResult[],
    systemPrompt?: string
  ): Message[] {
    const result: Message[] = [];

    // Add system prompt with RAG context
    if (systemPrompt || retrievedContext.length > 0) {
      let systemContent = systemPrompt ?? "";

      if (retrievedContext.length > 0) {
        systemContent += "\n\nRelevant information from memory:\n\n";

        for (let i = 0; i < retrievedContext.length; i++) {
          const ctx = retrievedContext[i];
          systemContent += `[${i + 1}] ${ctx.text}\n\n`;
        }
      }

      result.push({
        role: "system",
        content: systemContent.trim(),
      });
    }

    // Add conversation messages
    result.push(...messages);

    return result;
  }
}

/**
 * Prompt Templates
 */
export const PROMPT_TEMPLATES = {
  /**
   * Default conversational assistant
   */
  conversational: `You are a helpful, respectful, and honest assistant. Always answer as helpfully as possible while being safe and private. All processing happens on-device to protect user privacy.`,

  /**
   * RAG-aware assistant
   */
  ragAssistant: `You are a helpful assistant with access to relevant information from the user's personal memory. When answering questions, use the provided context from memory when relevant, but clearly indicate when you're using stored information vs general knowledge. All data stays on the user's device for privacy.`,

  /**
   * Summarization prompt
   */
  summarize: (text: string) =>
    `Summarize the following text concisely, preserving the key information:\n\n${text}\n\nSummary:`,

  /**
   * Conversation summarization
   */
  summarizeConversation: (messages: Message[]) => {
    const conversation = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    return `Summarize this conversation, keeping the most important points:\n\n${conversation}\n\nSummary:`;
  },

  /**
   * Extraction prompt
   */
  extract: (text: string, field: string) =>
    `Extract the ${field} from the following text. Return only the extracted information, nothing else.\n\nText: ${text}\n\n${field}:`,

  /**
   * Classification prompt
   */
  classify: (text: string, categories: string[]) =>
    `Classify the following text into one of these categories: ${categories.join(", ")}. Return only the category name.\n\nText: ${text}\n\nCategory:`,
};
