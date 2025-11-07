import { NativeModules } from "react-native";

interface CallRecord {
  // iOS does not provide API to access call history
  // This module returns empty array for privacy/security reasons
}

interface CallTurboModuleType {
  getRecentCalls(limit: number): Promise<CallRecord[]>;
}

const { CallTurboModule } = NativeModules;

export default CallTurboModule as CallTurboModuleType;
