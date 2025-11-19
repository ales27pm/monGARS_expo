export function getErrorMessage(error: unknown, fallback = "Unknown error"): string {
  if (error instanceof Error) {
    const message = typeof error.message === "string" ? error.message.trim() : "";
    if (message) {
      return message;
    }
  }

  if (typeof error === "string") {
    const trimmed = error.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (error && typeof error === "object") {
    if ("message" in (error as Record<string, unknown>)) {
      const messageValue = (error as { message?: unknown }).message;
      if (typeof messageValue === "string") {
        const trimmed = messageValue.trim();
        if (trimmed) {
          return trimmed;
        }
      } else if (messageValue != null) {
        return String(messageValue);
      }
    }

    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") {
        return serialized;
      }
    } catch {
      // ignore serialization errors and fall through to fallback
    }
  }

  return fallback;
}

export function toErrorWithMessage(error: unknown, fallback?: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(getErrorMessage(error, fallback));
}
