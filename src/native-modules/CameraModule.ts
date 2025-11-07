import { NativeModules } from "react-native";

interface CameraResult {
  url: string; // File URL of captured photo
}

interface CameraTurboModuleType {
  takePhoto(quality: number): Promise<CameraResult>; // quality: 0.0 to 1.0
}

const { CameraTurboModule } = NativeModules;

export default CameraTurboModule as CameraTurboModuleType;
