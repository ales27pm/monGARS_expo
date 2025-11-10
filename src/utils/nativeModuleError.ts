export function extractErrorMessage(error: unknown): string {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && "message" in (error as Record<string, unknown>)) {
    const messageValue = (error as { message?: unknown }).message;
    if (typeof messageValue === "string") {
      return messageValue;
    }
    if (messageValue != null) {
      return String(messageValue);
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isNativeModuleUnavailableError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();

  if (!message) {
    return false;
  }

  const keywords = [
    "nativeeventemitter",
    "llama.rn",
    "native module",
    "not available",
    "failed to load the model",
    "no native module",
  ];

  return keywords.some((keyword) => message.includes(keyword));
}
