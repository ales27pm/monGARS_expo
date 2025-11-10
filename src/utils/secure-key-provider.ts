import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Buffer } from "buffer";

const STORAGE_KEY = "vector_store_encryption_key";
let cachedKey: string | null = null;
let inFlight: Promise<string> | null = null;

async function generateKey(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Buffer.from(randomBytes).toString("base64");
}

export async function getOrCreateVectorStoreKey(): Promise<string> {
  if (cachedKey) {
    return cachedKey;
  }

  if (!inFlight) {
    inFlight = (async () => {
      let key = await SecureStore.getItemAsync(STORAGE_KEY);

      if (!key) {
        key = await generateKey();
        await SecureStore.setItemAsync(STORAGE_KEY, key, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        });
      }

      cachedKey = key;
      return key;
    })().catch((error) => {
      inFlight = null;
      throw error;
    });
  }

  return inFlight;
}
