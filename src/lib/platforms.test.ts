import { describe, it, expect } from "vitest";
import {
  groupPlatforms,
  platformFilter,
  platformLogoUrl,
  resolvePlatform,
} from "@/lib/platforms";

describe("platformLogoUrl", () => {
  it("builds a t_logo_med PNG URL on the IGDB image CDN", () => {
    expect(platformLogoUrl("plgu")).toBe(
      "https://images.igdb.com/igdb/image/upload/t_logo_med/plgu.png",
    );
  });
});

describe("resolvePlatform", () => {
  it("matches by abbreviation (the canonical stored form)", () => {
    const p = resolvePlatform("Switch");
    expect(p).toEqual({
      label: "Switch",
      logoUrl: "https://images.igdb.com/igdb/image/upload/t_logo_med/plgu.png",
    });
  });

  it("matches case-insensitively and trims", () => {
    expect(resolvePlatform("  switch  ")?.label).toBe("Switch");
    expect(resolvePlatform("PS5")?.label).toBe("PS5");
    expect(resolvePlatform("ps5")?.logoUrl).toContain("plos.png");
  });

  it("matches by full IGDB name", () => {
    expect(resolvePlatform("Nintendo Switch")?.label).toBe("Switch");
    expect(resolvePlatform("PlayStation 5")?.label).toBe("PS5");
  });

  it("matches by slug / common spellings", () => {
    expect(resolvePlatform("win")?.label).toBe("PC");
    expect(resolvePlatform("windows")?.label).toBe("PC");
  });

  it("resolves a retro platform with a logo", () => {
    const snes = resolvePlatform("super nintendo");
    expect(snes?.label).toBe("SNES");
    expect(snes?.logoUrl).toContain(
      "ifw2tvdkynyxayquiyk4.png",
    );
  });

  it("falls back to the raw string with no logo for unknown platforms", () => {
    expect(resolvePlatform("Magnavox Odyssey")).toEqual({
      label: "Magnavox Odyssey",
      logoUrl: null,
    });
  });

  it("returns null when there is no platform", () => {
    expect(resolvePlatform(null)).toBeNull();
    expect(resolvePlatform(undefined)).toBeNull();
    expect(resolvePlatform("")).toBeNull();
    expect(resolvePlatform("   ")).toBeNull();
  });
});

describe("groupPlatforms", () => {
  it("groups stored spellings of one platform under its label", () => {
    expect(groupPlatforms(["Nintendo Switch", "PS5", "Switch", "switch"])).toEqual([
      { label: "PS5", values: ["PS5"] },
      { label: "Switch", values: ["Nintendo Switch", "Switch", "switch"] },
    ]);
  });

  it("keeps unknown platforms as their own group", () => {
    expect(groupPlatforms(["Magnavox Odyssey", "PC"])).toEqual([
      { label: "Magnavox Odyssey", values: ["Magnavox Odyssey"] },
      { label: "PC", values: ["PC"] },
    ]);
  });

  it("skips empty values", () => {
    expect(groupPlatforms(["", "  ", "Wii"])).toEqual([
      { label: "Wii", values: ["Wii"] },
    ]);
  });
});

describe("platformFilter", () => {
  const groups = groupPlatforms(["Nintendo Switch", "PS5", "Switch", "switch"]);

  it("expands a chip label to every stored spelling", () => {
    expect(platformFilter(groups, "Switch")).toEqual({
      label: "Switch",
      values: ["Nintendo Switch", "Switch", "switch"],
    });
  });

  it("resolves an old link's stored spelling to its chip", () => {
    expect(platformFilter(groups, "Nintendo Switch")).toEqual({
      label: "Switch",
      values: ["Nintendo Switch", "Switch", "switch"],
    });
  });

  it("matches a value with no active group exactly", () => {
    expect(platformFilter(groups, "Magnavox Odyssey")).toEqual({
      label: "Magnavox Odyssey",
      values: ["Magnavox Odyssey"],
    });
    expect(platformFilter(groups, "PlayStation 4")).toEqual({
      label: "PS4",
      values: ["PlayStation 4"],
    });
  });

  it("returns undefined when there is no platform filter", () => {
    expect(platformFilter(groups, undefined)).toBeUndefined();
  });
});
