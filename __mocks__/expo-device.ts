export const totalMemory = 2 * 1024 * 1024 * 1024;

export async function getTotalMemoryAsync(): Promise<number> {
  return totalMemory;
}

export async function getCpuCoreCountAsync(): Promise<number> {
  return 4;
}

export async function getDeviceTypeAsync(): Promise<number> {
  return 1;
}

export const osName = "TestOS";
export const osVersion = "1.0";
