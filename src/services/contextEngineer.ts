import { Platform } from "react-native";

import { estimateTokens, Message, PROMPT_TEMPLATES } from "../utils/context-management";
import type { RetrievalResult, SemanticMemory } from "../utils/semantic-memory";
import { applyHierarchicalSparseAttention } from "../utils/sparse-attention";
import { getDeviceProfile, DeviceProfile } from "../utils/device-profile";

interface EvaluatableContextItem {
  index: number;
  text: string;
  similarity: number;
  vector?: number[];
  metadata?: RetrievalResult["entry"]["metadata"];
  timestamp: number;
}

interface EvaluatedContextItem extends EvaluatableContextItem {
  qualityScore: number;
  isHighQuality: boolean;
}

interface EvaluateContextResult {
  items: EvaluatedContextItem[];
  usedSparseAttention: boolean;
}

export interface EngineerContextOptions {
  conversationId?: string;
  systemPrompt?: string;
  maxContextItems?: number;
}

export interface EngineerContextResult {
  messages: Message[];
  contextEntries: EvaluatedContextItem[];
  tokenUsage: {
    total: number;
    context: number;
    conversation: number;
    query: number;
  };
  usedSparseAttention: boolean;
}

const DEFAULT_CONTEXT_THRESHOLD = 0.55;

export class ContextEvaluator {
  private readonly relevanceThreshold: number;
  private readonly qualityThreshold: number;

  constructor(relevanceThreshold: number = DEFAULT_CONTEXT_THRESHOLD, qualityThreshold: number = 0.7) {
    this.relevanceThreshold = relevanceThreshold;
    this.qualityThreshold = qualityThreshold;
  }

  async evaluateContext(
    queryEmbedding: number[] | null,
    contextItems: EvaluatableContextItem[],
  ): Promise<EvaluateContextResult> {
    if (!contextItems.length) {
      return { items: [], usedSparseAttention: false };
    }

    const filtered = contextItems.filter((item) => item.similarity >= this.relevanceThreshold);
    if (filtered.length === 0) {
      return { items: [], usedSparseAttention: false };
    }

    let candidates = filtered;
    let usedSparseAttention = false;

    if (queryEmbedding && filtered.length > 8) {
      const withVectors = filtered.filter(
        (item) => Array.isArray(item.vector) && item.vector?.length === queryEmbedding.length,
      );
      if (withVectors.length > 0) {
        const indices = applyHierarchicalSparseAttention(
          queryEmbedding,
          withVectors.map((item) => item.vector as number[]),
          {
            numClusters: Math.min(3, Math.max(1, Math.ceil(withVectors.length / 4))),
            topKPerCluster: 2,
          },
        );

        if (indices.length > 0) {
          const selectedSet = new Set(indices.map((index) => withVectors[index].index));
          candidates = filtered.filter((item) => selectedSet.has(item.index));
          usedSparseAttention = true;
        }
      }
    }

    const evaluated = candidates.map((item) => this.assessContextQuality(item));
    return { items: evaluated, usedSparseAttention };
  }

  prioritizeContext(items: EvaluatedContextItem[], limit: number): EvaluatedContextItem[] {
    if (!items.length) {
      return [];
    }

    const sorted = [...items].sort((a, b) => {
      const qualityDiff = (b.qualityScore ?? b.similarity) - (a.qualityScore ?? a.similarity);
      if (Math.abs(qualityDiff) > 0.05) {
        return qualityDiff;
      }

      const aTime = Number.isFinite(a.timestamp) ? a.timestamp : 0;
      const bTime = Number.isFinite(b.timestamp) ? b.timestamp : 0;
      return bTime - aTime;
    });

    return sorted.slice(0, limit);
  }

  private assessContextQuality(item: EvaluatableContextItem): EvaluatedContextItem {
    let qualityScore = item.similarity;

    if (item.metadata?.timestamp) {
      const ageMs = Date.now() - new Date(item.metadata.timestamp).getTime();
      const ageFactor = Math.max(0.7, 1 - ageMs / (30 * 24 * 60 * 60 * 1000));
      qualityScore *= ageFactor;
    }

    if (item.metadata?.source === "knowledge_base") {
      qualityScore *= 1.1;
    }

    return {
      ...item,
      qualityScore,
      isHighQuality: qualityScore >= this.qualityThreshold,
    };
  }
}

export class ContextEngineer {
  private readonly memory: SemanticMemory;
  private readonly evaluator: ContextEvaluator;
  private deviceProfile: DeviceProfile | null = null;
  private maxContextTokens: number = 768;
  private summaryTokens: number = 128;
  private readonly fallbackSystemPrompt: string;
  private readonly defaultMaxContextItems: number;

  constructor({ memory, maxContextItems = 3 }: { memory: SemanticMemory; maxContextItems?: number }) {
    this.memory = memory;
    this.evaluator = new ContextEvaluator();
    this.fallbackSystemPrompt = PROMPT_TEMPLATES.ragAssistant;
    this.defaultMaxContextItems = maxContextItems;
  }

  async engineerContext(
    query: string,
    conversation: Message[],
    options: EngineerContextOptions = {},
  ): Promise<EngineerContextResult> {
    await this.ensureDeviceProfile();

    const embeddingFn = this.memory.getEmbeddingFunction();
    const queryEmbedding = embeddingFn ? await this.memory.embed(query) : null;

    const contextResults = await this.memory.searchMemories(query, {
      limit: 12,
      threshold: DEFAULT_CONTEXT_THRESHOLD,
      filter: options.conversationId ? { conversationId: options.conversationId } : undefined,
    });

    const evaluatable = contextResults.map<EvaluatableContextItem>((result, index) => ({
      index,
      text: result.text,
      similarity: result.relevance,
      vector: result.vector,
      metadata: result.entry.metadata,
      timestamp: result.entry.timestamp,
    }));

    const evaluation = await this.evaluator.evaluateContext(queryEmbedding, evaluatable);

    const prioritized = this.enforceContextBudget(
      this.evaluator.prioritizeContext(evaluation.items, options.maxContextItems ?? this.defaultMaxContextItems),
    );

    const systemMessage = this.buildSystemMessage(prioritized, options.systemPrompt);
    const conversationSummary = this.buildConversationSummary(conversation);

    const finalMessages: Message[] = [];
    if (systemMessage) {
      finalMessages.push(systemMessage);
    }
    if (conversationSummary) {
      finalMessages.push(conversationSummary);
    }

    finalMessages.push(...conversation.map((message) => ({ ...message })));

    const tokenUsage = this.computeTokenUsage({
      systemMessage,
      conversationSummary,
      conversation,
    });

    return {
      messages: finalMessages,
      contextEntries: prioritized,
      tokenUsage,
      usedSparseAttention: evaluation.usedSparseAttention,
    };
  }

  private async ensureDeviceProfile(): Promise<void> {
    if (!this.deviceProfile) {
      this.deviceProfile = await getDeviceProfile().catch(
        () =>
          ({
            tier: "low",
            totalMemoryMB: 2000,
            processorCores: 2,
            isLowEndDevice: true,
            platform: Platform.OS,
          }) as DeviceProfile,
      );

      const profile = this.deviceProfile;
      if (profile.tier === "high") {
        this.maxContextTokens = 1024;
        this.summaryTokens = 160;
      } else if (profile.tier === "mid") {
        this.maxContextTokens = 768;
        this.summaryTokens = 140;
      } else {
        this.maxContextTokens = 512;
        this.summaryTokens = 96;
      }
    }
  }

  private buildSystemMessage(contextItems: EvaluatedContextItem[], systemPrompt?: string): Message | null {
    const promptBase = (systemPrompt ?? this.fallbackSystemPrompt).trim();
    if (!promptBase && contextItems.length === 0) {
      return null;
    }

    let content = promptBase;
    if (contextItems.length > 0) {
      content += "\n\nRelevant information from memory:";
      contextItems.forEach((item, index) => {
        const relevance = item.qualityScore ?? item.similarity;
        const relevanceStr = Number.isFinite(relevance) ? `${(relevance * 100).toFixed(0)}%` : "n/a";
        content += `\n[${index + 1}] ${item.text}`;
        if (item.metadata?.source) {
          content += ` (source: ${item.metadata.source}, relevance: ${relevanceStr})`;
        } else {
          content += ` (relevance: ${relevanceStr})`;
        }
      });
    }

    return {
      role: "system",
      content: content.trim(),
    };
  }

  private buildConversationSummary(conversation: Message[]): Message | null {
    if (conversation.length <= 6) {
      return null;
    }

    const slice = conversation.slice(-Math.min(conversation.length, 8));
    const summaryText = slice
      .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
      .join("\n");

    const trimmed = summaryText.split(/\n+/).slice(-6).join("\n");
    const finalText = trimmed.length > 0 ? trimmed : summaryText;

    const summary = `Conversation recap (recent messages):\n${finalText}`;
    const estimatedTokens = estimateTokens(summary);
    if (estimatedTokens > this.summaryTokens) {
      return {
        role: "system",
        content: summary.split(/\n/).slice(-4).join("\n"),
      };
    }

    return {
      role: "system",
      content: summary,
    };
  }

  private computeTokenUsage({
    systemMessage,
    conversationSummary,
    conversation,
  }: {
    systemMessage: Message | null;
    conversationSummary: Message | null;
    conversation: Message[];
  }): EngineerContextResult["tokenUsage"] {
    const systemTokens = systemMessage ? estimateTokens(systemMessage.content) : 0;
    const summaryTokens = conversationSummary ? estimateTokens(conversationSummary.content) : 0;
    const conversationTokens = conversation.reduce((total, message) => total + estimateTokens(message.content), 0);

    const total = systemTokens + summaryTokens + conversationTokens;

    return {
      total,
      context: systemTokens,
      conversation: conversationTokens,
      query: summaryTokens,
    };
  }

  private enforceContextBudget(items: EvaluatedContextItem[]): EvaluatedContextItem[] {
    if (!items.length) {
      return [];
    }

    const maxTokensForContext = Math.floor(this.maxContextTokens * 0.4);
    const result: EvaluatedContextItem[] = [];
    let consumed = 0;

    for (const item of items) {
      const tokens = estimateTokens(item.text);
      if (consumed + tokens > maxTokensForContext) {
        break;
      }
      consumed += tokens;
      result.push(item);
    }

    return result;
  }
}
