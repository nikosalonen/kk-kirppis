import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAllowedRedirects } from "@/lib/redirect-fetch";

// Allow only https on cdn.example.com — stands in for a real host allowlist.
const isAllowed = (raw: string): boolean => {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.hostname === "cdn.example.com";
  } catch {
    return false;
  }
};

const START = "https://cdn.example.com/a";
const redirect = (location: string) =>
  new Response(null, { status: 302, headers: { location } });

afterEach(() => vi.unstubAllGlobals());

function mockFetch(...responses: Response[]) {
  const fn = vi.fn<typeof fetch>();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("fetchAllowedRedirects", () => {
  it("rejects an off-host redirect WITHOUT fetching the off-host URL (SSRF)", async () => {
    const fn = mockFetch(redirect("https://169.254.169.254/latest/meta-data/"));
    await expect(fetchAllowedRedirects(START, isAllowed)).rejects.toThrow(
      "redirect left the allowlist",
    );
    // The whole point of manual following: we never issue the second fetch.
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(
      START,
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("rejects a protocol-relative redirect escape", async () => {
    const fn = mockFetch(redirect("//evil.example.com/x"));
    await expect(fetchAllowedRedirects(START, isAllowed)).rejects.toThrow(
      "redirect left the allowlist",
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rejects a 3xx with no Location header", async () => {
    const fn = mockFetch(new Response(null, { status: 302 }));
    await expect(fetchAllowedRedirects(START, isAllowed)).rejects.toThrow(
      "redirect left the allowlist",
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("follows a same-host redirect and returns the final response", async () => {
    const fn = mockFetch(
      redirect("https://cdn.example.com/b"),
      new Response("BODY", { status: 200 }),
    );
    const res = await fetchAllowedRedirects(START, isAllowed);
    expect(await res.text()).toBe("BODY");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after the hop budget is exhausted", async () => {
    const fn = vi.fn(() =>
      Promise.resolve(redirect("https://cdn.example.com/loop")),
    );
    vi.stubGlobal("fetch", fn);
    await expect(fetchAllowedRedirects(START, isAllowed)).rejects.toThrow(
      "too many redirects",
    );
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("rejects a disallowed start URL before any fetch", async () => {
    const fn = mockFetch();
    await expect(
      fetchAllowedRedirects("https://evil.example.com/x", isAllowed),
    ).rejects.toThrow("not on the allowlist");
    expect(fn).not.toHaveBeenCalled();
  });
});
