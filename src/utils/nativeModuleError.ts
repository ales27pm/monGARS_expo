import { getErrorMessage } from "./errors";

export function extractErrorMessage(error: unknown): string {
  if (!error) {
    return "";
  }

  const message = getErrorMessage(error, "");
  return message;
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
