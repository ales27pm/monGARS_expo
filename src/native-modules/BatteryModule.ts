import { NativeModules } from "react-native";

interface BatteryInfo {
  level: number; // 0-100
  state: number; // UIDeviceBatteryState: 0 = unknown, 1 = unplugged, 2 = charging, 3 = full
}

interface BatteryTurboModuleType {
  getBatteryInfo(): Promise<BatteryInfo>;
}

const { BatteryTurboModule } = NativeModules;

export default BatteryTurboModule as BatteryTurboModuleType;
