import { describe, it, expect } from "vitest";
import { isHomeUrl } from "@/lib/browse-url";

describe("isHomeUrl", () => {
  it("accepts the home page with or without filters", () => {
    expect(isHomeUrl("/")).toBe(true);
    expect(isHomeUrl("/?q=zelda&platform=Switch")).toBe(true);
  });

  it("rejects other pages and other sites", () => {
    expect(isHomeUrl(null)).toBe(false);
    expect(isHomeUrl("")).toBe(false);
    expect(isHomeUrl("/listings/1")).toBe(false);
    expect(isHomeUrl("//evil.example")).toBe(false);
    expect(isHomeUrl("https://evil.example")).toBe(false);
  });
});
