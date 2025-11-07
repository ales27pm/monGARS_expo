import { NativeModules } from "react-native";

interface DeviceInfo {
  model: string; // e.g., "iPhone14,2"
  systemName: string; // e.g., "iOS"
  systemVersion: string; // e.g., "17.0"
  name: string; // User-visible device name
  identifierForVendor: string; // Unique identifier
  isLowPowerMode: boolean;
}

interface DeviceInfoTurboModuleType {
  getDeviceInfo(): Promise<DeviceInfo>;
}

const { DeviceInfoTurboModule } = NativeModules;

export default DeviceInfoTurboModule as DeviceInfoTurboModuleType;
