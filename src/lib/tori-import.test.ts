import { describe, it, expect } from "vitest";
import { isToriItemUrl, parseToriListing } from "@/lib/tori-import";

function pageWith(productJson: object): string {
  return `<!doctype html><html><head>
    <script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org/", "@type": "Organization", name: "Tori" })}</script>
    <script type="application/ld+json">${JSON.stringify(productJson)}</script>
    </head><body>...</body></html>`;
}

const PRODUCT = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Nintendo Switch Fire Emblem: Three Houses -peli",
  description: "Myydään Nintendo Switch -peli Fire Emblem: Three Houses",
  image:
    "https://img.tori.net/dynamic/1280w/item/41367037/06b50516-6179-4198-907a-d298e8b4f955",
  offers: { "@type": "Offer", price: "38", priceCurrency: "EUR" },
};

describe("isToriItemUrl", () => {
  it("accepts canonical tori item URLs", () => {
    expect(
      isToriItemUrl("https://www.tori.fi/recommerce/forsale/item/41367037"),
    ).toBe(true);
    expect(isToriItemUrl("https://tori.fi/recommerce/forsale/item/123/")).toBe(
      true,
    );
  });

  it("rejects other hosts, schemes, and non-item paths", () => {
    expect(isToriItemUrl("https://evil.example.com/item/1")).toBe(false);
    expect(isToriItemUrl("http://www.tori.fi/item/1")).toBe(false); // not https
    expect(isToriItemUrl("https://www.tori.fi/recommerce/forsale")).toBe(false);
    expect(isToriItemUrl("not a url")).toBe(false);
  });
});

describe("parseToriListing", () => {
  it("maps the Product JSON-LD to a listing", () => {
    expect(parseToriListing(pageWith(PRODUCT))).toEqual({
      title: "Nintendo Switch Fire Emblem: Three Houses -peli",
      description: "Myydään Nintendo Switch -peli Fire Emblem: Three Houses",
      priceEuros: 38,
      coverUrl:
        "https://img.tori.net/dynamic/1280w/item/41367037/06b50516-6179-4198-907a-d298e8b4f955",
    });
  });

  it("parses a numeric price too", () => {
    expect(parseToriListing(pageWith({ ...PRODUCT, offers: { price: 50 } }))
      ?.priceEuros).toBe(50);
  });

  it("picks the first tori-hosted image from an array", () => {
    const cover = parseToriListing(
      pageWith({
        ...PRODUCT,
        image: [
          "https://evil.example.com/x.jpg",
          "https://img.tori.net/dynamic/640w/item/1/abc",
        ],
      }),
    )?.coverUrl;
    expect(cover).toBe("https://img.tori.net/dynamic/640w/item/1/abc");
  });

  it("drops images on disallowed hosts", () => {
    expect(
      parseToriListing(
        pageWith({ ...PRODUCT, image: "https://evil.example.com/x.jpg" }),
      )?.coverUrl,
    ).toBeNull();
  });

  it("finds a Product inside an @graph wrapper", () => {
    const html = pageWith({ "@context": "https://schema.org", "@graph": [PRODUCT] });
    expect(parseToriListing(html)?.title).toBe(PRODUCT.name);
  });

  it("returns null when there is no Product block", () => {
    expect(parseToriListing("<html><head></head><body>nope</body></html>")).toBeNull();
  });

  it("returns null when a malformed JSON-LD block is the only candidate", () => {
    const html =
      '<script type="application/ld+json">{ not json }</script>';
    expect(parseToriListing(html)).toBeNull();
  });
});
