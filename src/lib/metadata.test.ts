import { describe, it, expect, vi } from "vitest";

// metadata.ts is marked `import "server-only"`; stub it so the module loads.
vi.mock("server-only", () => ({}));

import { escapeApicalypseString } from "@/lib/metadata";

describe("escapeApicalypseString — IGDB query escaping", () => {
  it("leaves plain titles unchanged", () => {
    expect(escapeApicalypseString("Zelda: Tears of the Kingdom")).toBe(
      "Zelda: Tears of the Kingdom",
    );
  });

  it("escapes quotes and backslashes", () => {
    expect(escapeApicalypseString('say "hi"')).toBe('say \\"hi\\"');
    expect(escapeApicalypseString("a\\b")).toBe("a\\\\b");
  });

  it("keeps a trailing backslash from escaping the closing quote", () => {
    // `x\"; where id = 1;` must stay one string literal, not end the search.
    const escaped = escapeApicalypseString('x\\"; where id = 1;');
    expect(escaped).toBe('x\\\\\\"; where id = 1;');
    expect(`search "${escaped}";`).toBe('search "x\\\\\\"; where id = 1;";');
  });
});
