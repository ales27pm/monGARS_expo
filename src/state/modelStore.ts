import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ModelConfig,
  ModelDownloadProgress,
  RECOMMENDED_MODELS,
} from "../types/models";
import { modelDownloadService } from "../services/modelDownloadService";

interface ModelState {
  // Available models
  availableModels: ModelConfig[];

  // Currently selected/active model
  activeModel: ModelConfig | null;

  // Download states
  downloadingModels: Map<string, ModelDownloadProgress>;
  downloadedModels: Set<string>;

  // Actions
  setActiveModel: (model: ModelConfig | null) => void;
  downloadModel: (
    model: ModelConfig,
    onProgress?: (progress: ModelDownloadProgress) => void
  ) => Promise<void>;
  cancelDownload: (model: ModelConfig) => void;
  deleteModel: (model: ModelConfig) => Promise<void>;
  checkDownloadedModels: () => Promise<void>;
  isModelDownloaded: (model: ModelConfig) => boolean;
  getDownloadProgress: (model: ModelConfig) => ModelDownloadProgress | null;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      availableModels: RECOMMENDED_MODELS,
      activeModel: null,
      downloadingModels: new Map(),
      downloadedModels: new Set(),

      setActiveModel: (model) => {
        set({ activeModel: model });
      },

      downloadModel: async (model, onProgress) => {
        const { downloadingModels } = get();

        // Check if already downloading
        if (downloadingModels.has(model.filename)) {
          console.log(`Model ${model.name} is already being downloaded`);
          return;
        }

        // Check if already downloaded
        const isDownloaded = await modelDownloadService.isModelDownloaded(
          model
        );
        if (isDownloaded) {
          set((state) => ({
            downloadedModels: new Set(state.downloadedModels).add(
              model.filename
            ),
          }));
          return;
        }

        try {
          // Start download with progress tracking
          await modelDownloadService.downloadModel(model, (progress) => {
            set((state) => {
              const newMap = new Map(state.downloadingModels);
              newMap.set(model.filename, progress);
              return { downloadingModels: newMap };
            });

            onProgress?.(progress);
          });

          // Download complete
          set((state) => {
            const newMap = new Map(state.downloadingModels);
            newMap.delete(model.filename);
            return {
              downloadingModels: newMap,
              downloadedModels: new Set(state.downloadedModels).add(
                model.filename
              ),
            };
          });
        } catch (error) {
          console.error(`Failed to download model ${model.name}:`, error);

          // Remove from downloading state
          set((state) => {
            const newMap = new Map(state.downloadingModels);
            newMap.delete(model.filename);
            return { downloadingModels: newMap };
          });

          throw error;
        }
      },

      cancelDownload: async (model) => {
        await modelDownloadService.cancelDownload(model);

        set((state) => {
          const newMap = new Map(state.downloadingModels);
          newMap.delete(model.filename);
          return { downloadingModels: newMap };
        });
      },

      deleteModel: async (model) => {
        await modelDownloadService.deleteModel(model);

        set((state) => {
          const newSet = new Set(state.downloadedModels);
          newSet.delete(model.filename);

          // If this was the active model, clear it
          const newActiveModel =
            state.activeModel?.filename === model.filename
              ? null
              : state.activeModel;

          return {
            downloadedModels: newSet,
            activeModel: newActiveModel,
          };
        });
      },

      checkDownloadedModels: async () => {
        const downloadedFiles =
          await modelDownloadService.getDownloadedModels();
        set({ downloadedModels: new Set(downloadedFiles) });
      },

      isModelDownloaded: (model) => {
        return get().downloadedModels.has(model.filename);
      },

      getDownloadProgress: (model) => {
        return get().downloadingModels.get(model.filename) || null;
      },
    }),
    {
      name: "model-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields
      partialize: (state) => ({
        activeModel: state.activeModel,
        downloadedModels: Array.from(state.downloadedModels),
      }),
      // Deserialize Set back from Array
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        downloadedModels: new Set(persistedState.downloadedModels || []),
      }),
    }
  )
);
