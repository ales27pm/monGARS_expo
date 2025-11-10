import { Buffer } from "buffer";

type SecureStoreModule = typeof import("expo-secure-store");
type CryptoModule = typeof import("expo-crypto");

let secureStoreModule: SecureStoreModule | null = null;
let cryptoModule: CryptoModule | null = null;
let loggedSecureFallback = false;
let loggedCryptoFallback = false;

try {
  secureStoreModule = require("expo-secure-store");
} catch (error) {
  secureStoreModule = null;
  if (!loggedSecureFallback) {
    console.warn(
      "[SecureKeyProvider] expo-secure-store unavailable. Using in-memory fallback; keys will reset between sessions.",
      error instanceof Error ? error.message : error,
    );
    loggedSecureFallback = true;
  }
}

try {
  cryptoModule = require("expo-crypto");
} catch (error) {
  cryptoModule = null;
  if (!loggedCryptoFallback) {
    console.warn(
      "[SecureKeyProvider] expo-crypto unavailable. Falling back to global crypto APIs for randomness.",
      error instanceof Error ? error.message : error,
    );
    loggedCryptoFallback = true;
  }
}

interface SecureStoreLike {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: string | number;
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: any): Promise<void>;
}

const secureStoreMemory = new Map<string, string>();

const fallbackSecureStore: SecureStoreLike = {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: "AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY",
  async getItemAsync(key: string): Promise<string | null> {
    return secureStoreMemory.get(key) ?? null;
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    secureStoreMemory.set(key, value);
  },
};

const SecureStore: SecureStoreLike = secureStoreModule ?? fallbackSecureStore;

async function getRandomBytes(size: number): Promise<Uint8Array> {
  if (cryptoModule?.getRandomBytesAsync) {
    return cryptoModule.getRandomBytesAsync(size);
  }

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const buffer = new Uint8Array(size);
    globalThis.crypto.getRandomValues(buffer);
    return buffer;
  }

  if (typeof require === "function") {
    try {
      const nodeCrypto = require("crypto");
      if (typeof nodeCrypto.randomBytes === "function") {
        const buffer: Uint8Array = nodeCrypto.randomBytes(size);
        return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      }
    } catch (error) {
      console.warn(
        "[SecureKeyProvider] Node crypto.randomBytes unavailable:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  throw new Error("No secure random byte generator available.");
}

const STORAGE_KEY = "vector_store_encryption_key";
let cachedKey: string | null = null;
let inFlight: Promise<string> | null = null;

async function generateKey(): Promise<string> {
  const randomBytes = await getRandomBytes(32);
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
