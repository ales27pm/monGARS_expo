import { ContextManager } from "../context-management";

function createManager(maxTokens: number) {
  return new ContextManager({
    maxTokens,
    reserveTokens: 0,
    includeSystem: false,
    overflowStrategy: "truncate-middle",
  });
}

describe("ContextManager truncate-middle strategy", () => {
  it("maintains chronological order when trimming middle messages", () => {
    const manager = createManager(6);

    const messages = [
      { role: "user" as const, content: "alpha" },
      { role: "assistant" as const, content: "beta" },
      { role: "user" as const, content: "gamma" },
      { role: "assistant" as const, content: "delta" },
    ];

    const fitted = manager.fitMessages(messages);

    expect(fitted.map((m) => m.content)).toEqual(["alpha", "gamma", "delta"]);
  });

  it("falls back to recent messages when boundary messages cannot both fit", () => {
    const manager = createManager(3);

    const messages = [
      { role: "user" as const, content: "alpha" },
      { role: "assistant" as const, content: "beta" },
      { role: "user" as const, content: "gamma" },
    ];

    const fitted = manager.fitMessages(messages);

    expect(fitted.map((m) => m.content)).toEqual(["gamma"]);
  });
});
