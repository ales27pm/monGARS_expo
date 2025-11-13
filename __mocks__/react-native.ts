export const Platform = {
  OS: "ios" as const,
  select<T>(selections: { ios?: T; android?: T; default?: T }): T | undefined {
    if (Object.prototype.hasOwnProperty.call(selections, Platform.OS)) {
      return selections[Platform.OS];
    }
    return selections.default;
  },
};

export const NativeModules: Record<string, unknown> = {};

export class NativeEventEmitter {
  addListener(_event: string, _listener: (...args: unknown[]) => void): { remove: () => void } {
    return { remove: () => undefined };
  }

  removeAllListeners(_event?: string): void {}
}

export default {
  Platform,
  NativeModules,
  NativeEventEmitter,
};
