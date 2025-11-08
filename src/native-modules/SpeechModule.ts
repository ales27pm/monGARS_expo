import { NativeModules } from "react-native";

interface SpeechOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface SpeechTurboModuleType {
  /**
   * Speak text using Text-to-Speech
   * @param text - Text to speak
   * @param options - Speech synthesis options
   * @returns Promise with success status
   */
  speak(text: string, options?: SpeechOptions): Promise<{ success: boolean }>;

  /**
   * Stop current speech
   * @returns Promise with success status
   */
  stop(): Promise<{ success: boolean }>;

  /**
   * Get available voices
   * @returns Promise with array of available voice identifiers
   */
  getAvailableVoices(): Promise<{ voices: string[] }>;
}

const { SpeechTurboModule } = NativeModules;

export default SpeechTurboModule as SpeechTurboModuleType;
