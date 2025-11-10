import * as FileSystem from "expo-file-system";
import { ModelConfig, ModelDownloadProgress } from "../types/models";

/**
 * Service for downloading ML models from HuggingFace at runtime
 * This eliminates the need to bundle large models with the app
 */

export class ModelDownloadService {
  private downloadResumables: Map<string, FileSystem.DownloadResumable> = new Map();
  private readonly modelsDir: string | null;

  constructor() {
    const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    this.modelsDir = baseDir ? `${baseDir}models/` : null;
  }

  private assertModelsDir(): string {
    if (!this.modelsDir) {
      throw new Error("No writable directory available for storing models on this platform.");
    }

    return this.modelsDir;
  }

  /**
   * Initialize the models directory
   */
  async initialize(): Promise<void> {
    const modelsDir = this.assertModelsDir();
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
    }
  }

  /**
   * Get the local file path for a model
   */
  getModelPath(model: ModelConfig): string {
    return `${this.assertModelsDir()}${model.filename}`;
  }

  /**
   * Check if a model is already downloaded
   */
  async isModelDownloaded(model: ModelConfig): Promise<boolean> {
    const path = this.getModelPath(model);
    const fileInfo = await FileSystem.getInfoAsync(path);
    return fileInfo.exists;
  }

  /**
   * Get downloaded model size in bytes
   */
  async getModelSize(model: ModelConfig): Promise<number | null> {
    const path = this.getModelPath(model);
    const fileInfo = await FileSystem.getInfoAsync(path);
    if (fileInfo.exists && "size" in fileInfo) {
      return fileInfo.size;
    }
    return null;
  }

  /**
   * Get HuggingFace download URL for a model
   */
  private getHuggingFaceUrl(model: ModelConfig): string {
    return `https://huggingface.co/${model.repo}/resolve/main/${model.filename}`;
  }

  /**
   * Download a model with progress tracking
   */
  async downloadModel(model: ModelConfig, onProgress?: (progress: ModelDownloadProgress) => void): Promise<string> {
    await this.initialize();

    const url = this.getHuggingFaceUrl(model);
    const localPath = this.getModelPath(model);

    // Check if already downloaded
    const isDownloaded = await this.isModelDownloaded(model);
    if (isDownloaded) {
      console.log(`Model ${model.name} already downloaded`);
      return localPath;
    }

    console.log(`Downloading model: ${model.name} from ${url}`);

    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
      const totalBytes = downloadProgress.totalBytesExpectedToWrite;
      const downloadedBytes = downloadProgress.totalBytesWritten;

      const progressPercentage = totalBytes && totalBytes > 0 ? Math.min((downloadedBytes / totalBytes) * 100, 100) : 0;

      const progress: ModelDownloadProgress = {
        totalBytes,
        downloadedBytes,
        progress: progressPercentage,
      };
      onProgress?.(progress);
    };

    const downloadResumable = FileSystem.createDownloadResumable(url, localPath, {}, callback);

    this.downloadResumables.set(model.filename, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();
      if (!result) {
        throw new Error("Download failed");
      }

      console.log(`Model downloaded successfully to: ${result.uri}`);
      this.downloadResumables.delete(model.filename);
      return result.uri;
    } catch (error) {
      this.downloadResumables.delete(model.filename);
      // Clean up partial download
      await this.deleteModel(model);
      throw error;
    }
  }

  /**
   * Pause a model download
   */
  async pauseDownload(model: ModelConfig): Promise<void> {
    const downloadResumable = this.downloadResumables.get(model.filename);
    if (downloadResumable) {
      await downloadResumable.pauseAsync();
    }
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(model: ModelConfig, onProgress?: (progress: ModelDownloadProgress) => void): Promise<string> {
    const downloadResumable = this.downloadResumables.get(model.filename);
    if (!downloadResumable) {
      // If no resumable exists, start fresh download
      return this.downloadModel(model, onProgress);
    }

    try {
      const result = await downloadResumable.resumeAsync();
      if (!result) {
        throw new Error("Resume failed");
      }
      return result.uri;
    } catch (error) {
      // If resume fails, start fresh
      this.downloadResumables.delete(model.filename);
      return this.downloadModel(model, onProgress);
    }
  }

  /**
   * Cancel a model download
   */
  async cancelDownload(model: ModelConfig): Promise<void> {
    const downloadResumable = this.downloadResumables.get(model.filename);
    if (downloadResumable) {
      await downloadResumable.pauseAsync();
      this.downloadResumables.delete(model.filename);
      // Clean up partial download
      await this.deleteModel(model);
    }
  }

  /**
   * Delete a downloaded model
   */
  async deleteModel(model: ModelConfig): Promise<void> {
    const path = this.getModelPath(model);
    const fileInfo = await FileSystem.getInfoAsync(path);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(path);
      console.log(`Deleted model: ${model.name}`);
    }
  }

  /**
   * Get list of all downloaded models
   */
  async getDownloadedModels(): Promise<string[]> {
    await this.initialize();
    const modelsDir = this.assertModelsDir();
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    if (!dirInfo.exists) {
      return [];
    }
    const files = await FileSystem.readDirectoryAsync(modelsDir);
    return files.filter((file) => file.endsWith(".gguf") || file.endsWith(".bin"));
  }

  /**
   * Get total storage used by models
   */
  async getTotalStorageUsed(): Promise<number> {
    const files = await this.getDownloadedModels();
    let totalSize = 0;

    for (const file of files) {
      const path = `${this.assertModelsDir()}${file}`;
      const fileInfo = await FileSystem.getInfoAsync(path);
      if (fileInfo.exists && "size" in fileInfo) {
        totalSize += fileInfo.size;
      }
    }

    return totalSize;
  }

  /**
   * Clear all downloaded models
   */
  async clearAllModels(): Promise<void> {
    const modelsDir = this.assertModelsDir();
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(modelsDir, { idempotent: true });
      await this.initialize();
      console.log("All models cleared");
    }
  }
}

// Singleton instance
export const modelDownloadService = new ModelDownloadService();
