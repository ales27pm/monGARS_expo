const store = new Map<string, string>();

export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = "AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY";

export async function isAvailableAsync(): Promise<boolean> {
  return true;
}

export async function getItemAsync(key: string): Promise<string | null> {
  return store.get(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store.set(key, value);
}

export default {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  isAvailableAsync,
  getItemAsync,
  setItemAsync,
};
