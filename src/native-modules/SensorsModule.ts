import { NativeModules } from "react-native";

interface SensorData {
  x: number;
  y: number;
  z: number;
}

type SensorType = "accelerometer" | "gyroscope" | "magnetometer";

interface SensorsTurboModuleType {
  getSensorData(type: SensorType, duration: number): Promise<SensorData>;
}

const { SensorsTurboModule } = NativeModules;

export default SensorsTurboModule as SensorsTurboModuleType;
