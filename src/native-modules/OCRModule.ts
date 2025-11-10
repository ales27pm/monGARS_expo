import { NativeModules } from "react-native";

interface OCRTurboModuleType {
  /**
   * Recognize text from an image using Vision framework
   * @param imagePath - Path to the image file
   * @returns Promise with recognized text
   */
  recognizeText(imagePath: string): Promise<{ text: string; confidence: number }>;

  /**
   * Recognize text from an image with detailed results
   * @param imagePath - Path to the image file
   * @returns Promise with array of text observations
   */
  recognizeTextDetailed(imagePath: string): Promise<{
    observations: {
      text: string;
      confidence: number;
      boundingBox: { x: number; y: number; width: number; height: number };
    }[];
  }>;
}

const { OCRTurboModule } = NativeModules;

export default OCRTurboModule as OCRTurboModuleType;
