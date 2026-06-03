import { z } from "zod";

export const CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "ACCEPTABLE"] as const;
export const MAX_IMAGES = 6;

// A Supabase Storage object path we generated server-side, e.g.
// "listings/clx123/0-uuid.jpg". Restrict the charset so a client can't smuggle
// arbitrary URLs or traversal sequences into the DB.
const objectPath = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[a-zA-Z0-9/_.-]+$/, "Invalid image path")
  .refine((p) => !p.includes(".."), "Invalid image path");

export const listingInputSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(120),
  description: z.string().trim().min(1, "Description is required").max(4000),
  // Price entered in euros; converted to integer cents before persisting.
  priceEuros: z.coerce
    .number()
    .min(0, "Price cannot be negative")
    .max(100000, "Price is too high"),
  condition: z.enum(CONDITIONS),
  platform: z.string().trim().max(40).optional().or(z.literal("")),
  category: z.string().trim().min(1).max(40).default("videogame"),
  imagePaths: z.array(objectPath).max(MAX_IMAGES).default([]),
});

export type ListingInput = z.infer<typeof listingInputSchema>;

/** Euros (possibly fractional) -> integer cents, no float drift. */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}
