import { NativeModules } from "react-native";

interface RecognitionOptions {
  language?: string;
  continuous?: boolean;
}

interface SpeechRecognitionTurboModuleType {
  /**
   * Request microphone permission
   * @returns Promise with permission granted status
   */
  requestPermission(): Promise<{ granted: boolean }>;

  /**
   * Start speech recognition
   * @param options - Recognition options
   * @returns Promise with recognized text
   */
  startRecognition(options?: RecognitionOptions): Promise<{ text: string }>;

  /**
   * Stop speech recognition
   * @returns Promise with success status
   */
  stopRecognition(): Promise<{ success: boolean }>;
}

const { SpeechRecognitionTurboModule } = NativeModules;

export default SpeechRecognitionTurboModule as SpeechRecognitionTurboModuleType;
