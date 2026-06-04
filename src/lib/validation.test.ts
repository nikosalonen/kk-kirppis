import { describe, it, expect } from "vitest";
import {
  eurosToCents,
  listingInputSchema,
  MAX_IMAGES,
} from "@/lib/validation";

describe("eurosToCents — euros → integer cents", () => {
  it("converts whole and fractional euros", () => {
    expect(eurosToCents(0)).toBe(0);
    expect(eurosToCents(25.5)).toBe(2550);
    expect(eurosToCents(1)).toBe(100);
  });

  it("rounds half-cents to the nearest cent", () => {
    expect(eurosToCents(25.005)).toBe(2501);
  });

  it("avoids binary float drift", () => {
    // 0.1 + 0.2 === 0.30000000000000004; must still land on 30 cents.
    expect(eurosToCents(0.1 + 0.2)).toBe(30);
    expect(eurosToCents(19.99)).toBe(1999);
  });
});

describe("listingInputSchema", () => {
  const valid = {
    title: "Zelda: Tears of the Kingdom",
    description: "Mint condition, complete in box.",
    priceEuros: "25.00",
    platform: "Switch",
  };

  it("accepts valid input and coerces priceEuros string → number", () => {
    const parsed = listingInputSchema.parse(valid);
    expect(parsed.priceEuros).toBe(25);
    expect(typeof parsed.priceEuros).toBe("number");
  });

  it("defaults category to videogame and imagePaths to []", () => {
    const parsed = listingInputSchema.parse(valid);
    expect(parsed.category).toBe("videogame");
    expect(parsed.imagePaths).toEqual([]);
  });

  it("rejects a title that is too short", () => {
    expect(() =>
      listingInputSchema.parse({ ...valid, title: "a" }),
    ).toThrow();
  });

  it("rejects a negative price and an over-max price", () => {
    expect(() =>
      listingInputSchema.parse({ ...valid, priceEuros: "-1" }),
    ).toThrow();
    expect(() =>
      listingInputSchema.parse({ ...valid, priceEuros: "100001" }),
    ).toThrow();
  });

  it("requires a description", () => {
    expect(() =>
      listingInputSchema.parse({ ...valid, description: "" }),
    ).toThrow();
  });

  it("caps imagePaths at MAX_IMAGES", () => {
    const path = (i: number) => `listings/user-1/${i}-image.jpg`;
    const tooMany = Array.from({ length: MAX_IMAGES + 1 }, (_, i) => path(i));
    expect(() =>
      listingInputSchema.parse({ ...valid, imagePaths: tooMany }),
    ).toThrow();
  });

  describe("imagePaths object-path guard", () => {
    it("accepts a real server-generated path", () => {
      const parsed = listingInputSchema.parse({
        ...valid,
        imagePaths: ["listings/clx123/9f1c-uuid.jpg"],
      });
      expect(parsed.imagePaths).toHaveLength(1);
    });

    it("rejects traversal sequences", () => {
      expect(() =>
        listingInputSchema.parse({
          ...valid,
          imagePaths: ["listings/../secrets/key.jpg"],
        }),
      ).toThrow();
    });

    it("rejects disallowed characters (smuggled URLs / spaces)", () => {
      expect(() =>
        listingInputSchema.parse({
          ...valid,
          imagePaths: ["https://evil.example/x.jpg"],
        }),
      ).toThrow();
      expect(() =>
        listingInputSchema.parse({
          ...valid,
          imagePaths: ["listings/user 1/img.jpg"],
        }),
      ).toThrow();
    });
  });
});
