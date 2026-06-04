import { describe, it, expect, vi, beforeEach } from "vitest";

// storage.ts is marked `import "server-only"`, which throws under vitest's Node
// resolution (no react-server condition). Stub it so the module can load.
vi.mock("server-only", () => ({}));

// Stub the Supabase client so deleteImages exercises its error handling without
// a network call. `remove` is reconfigured per test.
const remove = vi.fn();
const from = vi.fn(() => ({ remove }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ storage: { from } })),
}));

// admin() reads these at call time and throws if unset.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";

import { deleteImages } from "@/lib/storage";

describe("deleteImages — best-effort cleanup", () => {
  beforeEach(() => {
    remove.mockReset();
    from.mockClear();
  });

  it("makes no remote call for an empty path list", async () => {
    await deleteImages([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("removes the given paths and stays silent on success", async () => {
    remove.mockResolvedValue({ data: {}, error: null });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await deleteImages(["listings/u/a.jpg", "listings/u/b.jpg"]);
    expect(remove).toHaveBeenCalledWith([
      "listings/u/a.jpg",
      "listings/u/b.jpg",
    ]);
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("surfaces a cleanup failure via console.error without throwing", async () => {
    remove.mockResolvedValue({ data: null, error: { message: "boom" } });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(deleteImages(["listings/u/a.jpg"])).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalledWith(
      "[storage] image cleanup failed:",
      "boom",
    );
    errSpy.mockRestore();
  });
});
