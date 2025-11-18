import type { SpyInstance } from "jest-mock";
import { createConversationId, isConversationId } from "../conversation";

describe("conversation id utilities", () => {
  let dateSpy: SpyInstance<() => number>;
  let randomSpy: SpyInstance<() => number>;

  beforeEach(() => {
    dateSpy = jest.spyOn(Date, "now").mockImplementation(() => 1_704_000_000_000);
    randomSpy = jest.spyOn(Math, "random").mockImplementation(() => 0.123456789);
  });

  afterEach(() => {
    dateSpy.mockRestore();
    randomSpy.mockRestore();
  });

  it("generates deterministic ids when time and randomness are mocked", () => {
    const id = createConversationId();
    expect(id).toBe("conv-lqt1lqtc-4fzzzxjy");
    expect(isConversationId(id)).toBe(true);
  });

  it("includes sanitized seed segments when provided", () => {
    const id = createConversationId("My Model 1.1b!");
    expect(id.startsWith("conv-my-model-1-1b-lqt1lqtc-4fzzzxjy")).toBe(true);
  });

  it("handles empty or whitespace seeds gracefully", () => {
    expect(createConversationId("   ")).toMatch(/^conv-[a-z0-9]+-[a-z0-9]+$/);
  });
});
