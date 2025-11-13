import { buildChatMessages } from "../utils/chat-format";
import type { ChatTurn } from "../types/chat";

describe("buildChatMessages", () => {
  const baseHistory: ChatTurn[] = [
    { role: "user", content: " Hello there! ", timestamp: 1 },
    { role: "assistant", content: "General Kenobi", timestamp: 2 },
    { role: "user", content: "", timestamp: 3 },
  ];

  it("prepends the system prompt when provided", () => {
    const messages = buildChatMessages(baseHistory, "Act like a Jedi Master.");
    expect(messages[0]).toEqual({ role: "system", content: "Act like a Jedi Master." });
    expect(messages[1]).toEqual({ role: "user", content: "Hello there!" });
  });

  it("filters out empty or whitespace-only messages", () => {
    const messages = buildChatMessages(baseHistory);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: "user", content: "Hello there!" });
    expect(messages[1]).toEqual({ role: "assistant", content: "General Kenobi" });
  });

  it("returns an empty array when history is empty and no prompt provided", () => {
    expect(buildChatMessages([])).toEqual([]);
  });
});
