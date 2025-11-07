import { NativeModules } from "react-native";

interface FlashlightResult {
  success: boolean;
}

interface FlashlightTurboModuleType {
  setTorchMode(on: boolean): Promise<FlashlightResult>;
}

const { FlashlightTurboModule } = NativeModules;

export default FlashlightTurboModule as FlashlightTurboModuleType;
