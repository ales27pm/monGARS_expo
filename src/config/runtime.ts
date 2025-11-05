const runtimeConfig: Record<string, any> = Object.create(null);

export function setRuntimeConfigValue(key: string, value: any): void {
  runtimeConfig[key] = value;
}

export function getRuntimeConfigValue(key: string): any {
  return runtimeConfig[key];
}

export function getRuntimeConfigSnapshot(): Record<string, any> {
  return { ...runtimeConfig };
}
