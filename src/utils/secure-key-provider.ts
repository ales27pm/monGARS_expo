import { Buffer } from "buffer";

type SecureStoreModule = typeof import("expo-secure-store");
type CryptoModule = typeof import("expo-crypto");

let secureStoreModule: SecureStoreModule | null = null;
let cryptoModule: CryptoModule | null = null;
let loggedSecureFallback = false;
let loggedCryptoFallback = false;
let secureStorePromise: Promise<SecureStoreModule | null> | null = null;
let cryptoModulePromise: Promise<CryptoModule | null> | null = null;

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

async function resolveSecureStore(): Promise<SecureStoreLike> {
  if (secureStoreModule) {
    return secureStoreModule as SecureStoreLike;
  }

  if (!secureStorePromise) {
    secureStorePromise = import("expo-secure-store")
      .then((module) => module)
      .catch((error: unknown) => {
        if (!loggedSecureFallback) {
          console.warn(
            "[SecureKeyProvider] expo-secure-store unavailable. Using in-memory fallback; keys will reset between sessions.",
            error instanceof Error ? error.message : error,
          );
          loggedSecureFallback = true;
        }
        return null;
      });
  }

  const module = await secureStorePromise;
  if (module) {
    if (typeof module.isAvailableAsync === "function") {
      try {
        if (!(await module.isAvailableAsync())) {
          if (!loggedSecureFallback) {
            console.warn(
              "[SecureKeyProvider] expo-secure-store unavailable. Using in-memory fallback; keys will reset between sessions.",
            );
            loggedSecureFallback = true;
          }
          secureStorePromise = Promise.resolve(null);
          return fallbackSecureStore;
        }
      } catch (error) {
        if (!loggedSecureFallback) {
          console.warn(
            "[SecureKeyProvider] expo-secure-store unavailable. Using in-memory fallback; keys will reset between sessions.",
            error instanceof Error ? error.message : error,
          );
          loggedSecureFallback = true;
        }
        secureStorePromise = Promise.resolve(null);
        return fallbackSecureStore;
      }
    }
    secureStoreModule = module;
    return module as SecureStoreLike;
  }

  if (!loggedSecureFallback) {
    console.warn(
      "[SecureKeyProvider] expo-secure-store unavailable. Using in-memory fallback; keys will reset between sessions.",
    );
    loggedSecureFallback = true;
  }

  return fallbackSecureStore;
}

async function resolveCryptoModule(): Promise<CryptoModule | null> {
  if (cryptoModule) {
    return cryptoModule;
  }

  if (!cryptoModulePromise) {
    cryptoModulePromise = import("expo-crypto")
      .then((module) => module)
      .catch((error: unknown) => {
        if (!loggedCryptoFallback) {
          console.warn(
            "[SecureKeyProvider] expo-crypto unavailable. Falling back to global crypto APIs for randomness.",
            error instanceof Error ? error.message : error,
          );
          loggedCryptoFallback = true;
        }
        return null;
      });
  }

  const module = await cryptoModulePromise;
  if (module) {
    cryptoModule = module;
    return module;
  }

  if (!loggedCryptoFallback) {
    console.warn("[SecureKeyProvider] expo-crypto unavailable. Falling back to global crypto APIs for randomness.");
    loggedCryptoFallback = true;
  }

  return null;
}

async function getRandomBytes(size: number): Promise<Uint8Array> {
  const expoCrypto = await resolveCryptoModule();
  if (expoCrypto?.getRandomBytesAsync) {
    return expoCrypto.getRandomBytesAsync(size);
  }

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const buffer = new Uint8Array(size);
    globalThis.crypto.getRandomValues(buffer);
    return buffer;
  }

  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      const nodeCrypto = await import("crypto");
      if (typeof nodeCrypto.randomBytes === "function") {
        const buffer = nodeCrypto.randomBytes(size);
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
      const secureStore = await resolveSecureStore();
      let key = await secureStore.getItemAsync(STORAGE_KEY);

      if (!key) {
        key = await generateKey();
        await secureStore.setItemAsync(STORAGE_KEY, key, {
          keychainAccessible: secureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
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
