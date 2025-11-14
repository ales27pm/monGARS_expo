declare module "react-native-mmkv" {
  export type MMKVMode = "MMAP" | "ASHMEM" | "SHARED" | "MULTI_PROCESS" | string;

  export interface Configuration {
    id?: string;
    path?: string;
    encryptionKey?: string;
    mode?: MMKVMode;
  }

  export class MMKV {
    constructor(configuration?: Configuration);

    set(key: string, value: string | number | boolean | ArrayBuffer | Uint8Array): boolean;
    getString(key: string): string | undefined;
    getNumber(key: string): number | undefined;
    getBoolean(key: string): boolean | undefined;
    getBuffer(key: string): ArrayBuffer | undefined;
    contains(key: string): boolean;
    delete(key: string): void;
    clearAll(): void;
    getAllKeys(): string[];
    recrypt(key?: string): void;
  }
}
