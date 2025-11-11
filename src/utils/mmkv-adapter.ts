type Primitive = string | number | boolean;

export interface MMKVConfiguration {
  id?: string;
}

export interface MMKVLike {
  set(key: string, value: Primitive): void;
  getString(key: string): string | null;
  getNumber(key: string): number | null;
  getBoolean(key: string): boolean | null;
  contains(key: string): boolean;
  delete(key: string): void;
  clearAll(): void;
  getAllKeys(): string[];
  recrypt(key: string): void;
}

type MMKVConstructor = new (configuration?: MMKVConfiguration) => MMKVLike;

let NativeMMKV: MMKVConstructor | null = null;
let lastFallbackLog: number | null = null;
let loadPromise: Promise<void> | null = null;

function ensureNativeModuleLoading(): void {
  if (loadPromise) {
    return;
  }

  loadPromise = import("react-native-mmkv")
    .then((module) => {
      NativeMMKV = module?.MMKV ?? null;
      if (!NativeMMKV) {
        lastFallbackLog = Date.now();
        console.warn("[MMKVAdapter] MMKV export missing. Falling back to in-memory storage.");
      }
    })
    .catch((error: unknown) => {
      NativeMMKV = null;
      lastFallbackLog = Date.now();
      console.warn(
        "[MMKVAdapter] Falling back to in-memory storage. react-native-mmkv is unavailable in this environment.",
        error instanceof Error ? error.message : error,
      );
    });
}

ensureNativeModuleLoading();

class InMemoryMMKV implements MMKVLike {
  private store = new Map<string, Primitive>();

  set(key: string, value: Primitive): void {
    this.store.set(key, value);
  }

  getString(key: string): string | null {
    const value = this.store.get(key);
    return typeof value === "string" ? value : null;
  }

  getNumber(key: string): number | null {
    const value = this.store.get(key);
    return typeof value === "number" ? value : null;
  }

  getBoolean(key: string): boolean | null {
    const value = this.store.get(key);
    return typeof value === "boolean" ? value : null;
  }

  contains(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clearAll(): void {
    this.store.clear();
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  recrypt(_key?: string): void {
    // No-op for in-memory fallback; encryption is not simulated.
  }
}

const inMemoryStores = new Map<string | undefined, InMemoryMMKV>();

function getInMemoryStore(id?: string): InMemoryMMKV {
  if (!inMemoryStores.has(id)) {
    inMemoryStores.set(id, new InMemoryMMKV());
  }
  return inMemoryStores.get(id)!;
}

export function createMMKVInstance(configuration: MMKVConfiguration = {}): MMKVLike {
  if (NativeMMKV) {
    return new NativeMMKV(configuration);
  }

  if (!lastFallbackLog || Date.now() - lastFallbackLog > 60_000) {
    console.warn(
      "[MMKVAdapter] Using in-memory MMKV fallback. Data will not persist between sessions in this environment.",
    );
    lastFallbackLog = Date.now();
  }

  return getInMemoryStore(configuration.id);
}

export function resetInMemoryMMKV(): void {
  inMemoryStores.clear();
}
