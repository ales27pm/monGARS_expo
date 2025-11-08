import { NativeModules } from "react-native";

interface ClipboardTurboModuleType {
  /**
   * Get text from clipboard
   * @returns Promise with clipboard text content
   */
  getString(): Promise<{ content: string }>;

  /**
   * Set text to clipboard
   * @param content - Text to copy to clipboard
   * @returns Promise with success status
   */
  setString(content: string): Promise<{ success: boolean }>;

  /**
   * Check if clipboard has content
   * @returns Promise with status
   */
  hasString(): Promise<{ hasContent: boolean }>;
}

const { ClipboardTurboModule } = NativeModules;

export default ClipboardTurboModule as ClipboardTurboModuleType;
