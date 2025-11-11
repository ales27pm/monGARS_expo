import { NativeModules } from "react-native";

export interface CallRecord {
  id: string;
  phoneNumber: string | null;
  timestamp: number;
  direction: "incoming" | "outgoing" | "missed";
  durationSeconds: number;
}

interface CallTurboModuleType {
  getRecentCalls(limit: number): Promise<CallRecord[]>;
}

const { CallTurboModule } = NativeModules;

export default CallTurboModule as CallTurboModuleType;
