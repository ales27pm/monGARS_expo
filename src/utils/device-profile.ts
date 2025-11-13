import { Platform } from "react-native";
import * as Device from "expo-device";

export type DeviceTier = "low" | "mid" | "high";

export interface DeviceProfile {
  tier: DeviceTier;
  totalMemoryMB: number;
  processorCores: number;
  isLowEndDevice: boolean;
  platform: typeof Platform.OS;
}

let cachedProfile: DeviceProfile | null = null;

function toPositiveInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (value <= 0) {
    return undefined;
  }
  return Math.max(1, Math.round(value));
}

function classifyTier(totalMemoryMB: number, cores: number): DeviceTier {
  if (totalMemoryMB >= 6000 && cores >= 6) {
    return "high";
  }
  if (totalMemoryMB >= 3000 && cores >= 4) {
    return "mid";
  }
  return "low";
}

async function readTotalMemoryMB(): Promise<number | undefined> {
  const immediateBytes = toPositiveInteger(Device.totalMemory ?? undefined);
  if (immediateBytes) {
    return immediateBytes;
  }

  const asyncGetter = (
    Device as unknown as {
      getTotalMemoryAsync?: () => Promise<number>;
    }
  ).getTotalMemoryAsync;

  if (typeof asyncGetter === "function") {
    try {
      const bytes = await asyncGetter();
      const normalized = toPositiveInteger(bytes);
      if (normalized) {
        return normalized;
      }
    } catch (error) {
      console.warn("[DeviceProfile] Failed to query async total memory:", error);
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number") {
    // Rough heuristic based on CPU cores when memory is unavailable.
    const coreEstimate = navigator.hardwareConcurrency;
    if (coreEstimate >= 8) {
      return 8000;
    }
    if (coreEstimate >= 4) {
      return 4000;
    }
    return 2000;
  }

  if (typeof process !== "undefined" && typeof process.env === "object") {
    if (process.env.MEMORY_LIMIT_MB) {
      const limit = Number(process.env.MEMORY_LIMIT_MB);
      const normalized = toPositiveInteger(limit);
      if (normalized) {
        return normalized;
      }
    }
  }

  return undefined;
}

async function readProcessorCores(): Promise<number | undefined> {
  const asyncGetter = (
    Device as unknown as {
      getCpuCoreCountAsync?: () => Promise<number>;
    }
  ).getCpuCoreCountAsync;

  if (typeof asyncGetter === "function") {
    try {
      const cores = await asyncGetter();
      const normalized = toPositiveInteger(cores);
      if (normalized) {
        return normalized;
      }
    } catch (error) {
      console.warn("[DeviceProfile] Failed to query CPU cores:", error);
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number") {
    const normalized = toPositiveInteger(navigator.hardwareConcurrency);
    if (normalized) {
      return normalized;
    }
  }

  if (typeof process !== "undefined" && typeof process.env === "object") {
    const cpus = process.env.CPU_COUNT ? Number(process.env.CPU_COUNT) : undefined;
    const normalized = toPositiveInteger(cpus);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

export async function getDeviceProfile(forceRefresh: boolean = false): Promise<DeviceProfile> {
  if (cachedProfile && !forceRefresh) {
    return cachedProfile;
  }

  const [totalMemoryMB, processorCores] = await Promise.all([readTotalMemoryMB(), readProcessorCores()]);

  const memory = totalMemoryMB ?? 2000;
  const cores = processorCores ?? (memory >= 6000 ? 6 : memory >= 3000 ? 4 : 2);
  const tier = classifyTier(memory, cores);

  cachedProfile = {
    tier,
    totalMemoryMB: memory,
    processorCores: cores,
    isLowEndDevice: tier === "low",
    platform: Platform.OS,
  };

  return cachedProfile;
}

export function clearCachedDeviceProfile(): void {
  cachedProfile = null;
}
