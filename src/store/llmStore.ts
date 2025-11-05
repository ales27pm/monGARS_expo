/**
 * LLM Store - Zustand store for managing conversations and LLM state
 * Adapted from offLLM for Expo with AsyncStorage persistence
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  lastUpdated: number;
  messages: Message[];
}

interface LLMStoreState {
  messages: Message[];
  conversations: Conversation[];
  currentConversationId: string | null;
  voiceMode: boolean;
  isGenerating: boolean;
  modelStatus: "idle" | "loading" | "ready" | "error";
  modelError: string | null;
  downloadProgress: number;
  currentModelPath: string | null;
  selectedModel: string | null;
  activeModelId: string | null;

  // Actions
  addMessage: (message: Partial<Message>) => void;
  setMessages: (messages: Message[]) => void;
  startNewConversation: (title?: string) => void;
  selectConversation: (conversationId: string) => void;
  setVoiceMode: (voiceMode: boolean) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setModelStatus: (status: "idle" | "loading" | "ready" | "error") => void;
  setModelError: (error: string | null) => void;
  setDownloadProgress: (progress: number) => void;
  setCurrentModelPath: (path: string | null) => void;
  setSelectedModel: (model: string | null) => void;
  setActiveModelId: (modelId: string | null) => void;
  generateResponse: (prompt: string, llmService: any) => Promise<string | undefined>;
}

const normalizeMessage = (message: Partial<Message>): Message => ({
  id: message.id ?? generateId("msg"),
  role: message.role ?? "user",
  content: message.content ?? "",
  timestamp: message.timestamp ?? Date.now(),
});

const inferTitleFromMessage = (message: Message, fallback: string): string => {
  if (!message?.content) {
    return fallback;
  }
  const trimmed = message.content.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.length > 42 ? `${trimmed.slice(0, 39)}…` : trimmed;
};

const createConversation = (options?: { id?: string; title?: string }): Conversation => ({
  id: options?.id ?? generateId("conv"),
  title: options?.title ?? "New conversation",
  createdAt: Date.now(),
  lastUpdated: Date.now(),
  messages: [],
});

const useLLMStore = create<LLMStoreState>((set, get) => ({
  messages: [],
  conversations: [],
  currentConversationId: null,
  voiceMode: false,
  isGenerating: false,
  modelStatus: "idle",
  modelError: null,
  downloadProgress: 0,
  currentModelPath: null,
  selectedModel: null,
  activeModelId: null,

  addMessage: (message) =>
    set((state) => {
      const normalized = normalizeMessage(message);
      let conversationId = state.currentConversationId;
      let conversations = state.conversations;

      let activeConversation = conversations.find((conv) => conv.id === conversationId);

      if (!activeConversation) {
        const created = createConversation({ id: conversationId ?? undefined });
        if (normalized.role === "user") {
          created.title = inferTitleFromMessage(normalized, created.title);
        }
        activeConversation = {
          ...created,
          messages: [normalized],
          lastUpdated: normalized.timestamp,
        };
        conversations = [activeConversation, ...conversations];
        conversationId = activeConversation.id;
        return {
          messages: activeConversation.messages,
          conversations,
          currentConversationId: conversationId,
        };
      }

      const updatedConversation = {
        ...activeConversation,
        messages: [...activeConversation.messages, normalized],
        lastUpdated: normalized.timestamp,
      };

      if (normalized.role === "user" && activeConversation.messages.length === 0) {
        updatedConversation.title = inferTitleFromMessage(normalized, activeConversation.title);
      }

      const otherConversations = conversations.filter((conv) => conv.id !== updatedConversation.id);

      return {
        messages: updatedConversation.messages,
        conversations: [updatedConversation, ...otherConversations],
        currentConversationId: updatedConversation.id,
      };
    }),

  setMessages: (messages) =>
    set((state) => {
      const normalizedMessages = messages.map(normalizeMessage);
      const conversationId = state.currentConversationId;
      if (!conversationId) {
        return { messages: normalizedMessages };
      }
      const conversations = state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: normalizedMessages,
              lastUpdated:
                normalizedMessages[normalizedMessages.length - 1]?.timestamp ?? conv.lastUpdated,
            }
          : conv
      );
      const activeConversation = conversations.find((conv) => conv.id === conversationId);
      return {
        messages: activeConversation?.messages ?? normalizedMessages,
        conversations,
      };
    }),

  startNewConversation: (title) =>
    set((state) => {
      const conversation = createConversation({ title });
      return {
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id,
        messages: [],
        isGenerating: false,
      };
    }),

  selectConversation: (conversationId) => {
    const state = get();
    const conversation = state.conversations.find((conv) => conv.id === conversationId);
    if (!conversation) {
      return;
    }
    const others = state.conversations.filter((conv) => conv.id !== conversationId);
    set({
      currentConversationId: conversationId,
      messages: conversation.messages,
      conversations: [conversation, ...others],
      isGenerating: false,
    });
  },

  setVoiceMode: (voiceMode) => set({ voiceMode }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setModelStatus: (status) => set({ modelStatus: status }),
  setModelError: (modelError) => set({ modelError }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setCurrentModelPath: (path) => set({ currentModelPath: path }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setActiveModelId: (modelId) => set({ activeModelId: modelId }),

  generateResponse: async (prompt, llmService) => {
    const { addMessage, setIsGenerating } = get();
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return;
    }
    const trimmed = prompt.trim();
    addMessage({ role: "user", content: trimmed });
    setIsGenerating(true);
    try {
      const response = await llmService.generate(trimmed);
      const text = typeof response === "string" ? response : response?.text ?? String(response);
      addMessage({ role: "assistant", content: text });
      return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addMessage({ role: "assistant", content: `Error: ${message}` });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  },
}));

export default useLLMStore;
