import { extractErrorMessage, isNativeModuleUnavailableError } from "../nativeModuleError";

describe("extractErrorMessage", () => {
  it("returns the message when error is a string", () => {
    expect(extractErrorMessage("boom")).toBe("boom");
  });

  it("returns the message property from an error-like object", () => {
    expect(extractErrorMessage({ message: "test" })).toBe("test");
  });

  it("stringifies objects without message", () => {
    expect(extractErrorMessage({ code: 500 })).toBe('{"code":500}');
  });
});

describe("isNativeModuleUnavailableError", () => {
  it("detects llama.rn related errors", () => {
    expect(isNativeModuleUnavailableError("llama.rn native module not available")).toBe(true);
  });

  it("detects expo NativeEventEmitter errors", () => {
    expect(
      isNativeModuleUnavailableError("Invariant Violation: new NativeEventEmitter() requires a non-null argument."),
    ).toBe(true);
  });

  it("detects errors about failing to load the model", () => {
    expect(isNativeModuleUnavailableError("Failed to load the model")).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isNativeModuleUnavailableError("network timeout")).toBe(false);
  });
});
