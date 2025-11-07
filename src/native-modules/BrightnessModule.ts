import { NativeModules } from "react-native";

interface BrightnessResult {
  success: boolean;
}

interface BrightnessTurboModuleType {
  setBrightness(level: number): Promise<BrightnessResult>; // level: 0.0 to 1.0
}

const { BrightnessTurboModule } = NativeModules;

export default BrightnessTurboModule as BrightnessTurboModuleType;
