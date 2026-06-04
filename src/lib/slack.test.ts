import { describe, it, expect, vi } from "vitest";

// slack.ts is marked `import "server-only"`, which throws under vitest's Node
// resolution (no react-server condition). Stub it so the module can load.
vi.mock("server-only", () => ({}));

import { esc } from "@/lib/slack";

describe("esc — Slack mrkdwn escaping", () => {
  it("escapes the three Slack metacharacters", () => {
    expect(esc("&")).toBe("&amp;");
    expect(esc("<")).toBe("&lt;");
    expect(esc(">")).toBe("&gt;");
  });

  it("escapes a crafted injection attempt", () => {
    expect(esc("<https://evil.example|click>")).toBe(
      "&lt;https://evil.example|click&gt;",
    );
  });

  it("escapes & before < and > so entities aren't double-escaped", () => {
    // If `<` were escaped first, the resulting `&lt;` would then have its `&`
    // turned into `&amp;`, yielding `&amp;lt;`. Order must keep this correct.
    expect(esc("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
  });

  it("leaves ordinary text untouched", () => {
    expect(esc("The Legend of Zelda")).toBe("The Legend of Zelda");
    expect(esc("")).toBe("");
  });
});
