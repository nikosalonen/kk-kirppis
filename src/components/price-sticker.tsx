import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

// The yellow price sticker from a second-hand game case. Sold listings get a
// red "Sold" sticker in its place. This is the one accent in the UI, so it is
// used for prices only.
export function PriceSticker({
  priceCents,
  sold,
  size = "sm",
  className,
}: {
  priceCents: number;
  sold: boolean;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block -rotate-3 rounded-[3px] font-bold tabular-nums shadow-[0_1px_2px_rgb(0_0_0/0.3)]",
        size === "sm" ? "px-2 py-1 text-sm" : "px-3.5 py-1.5 text-3xl",
        sold ? "bg-danger text-on-danger" : "bg-sticker text-sticker-ink",
        className,
      )}
    >
      {sold ? "Sold" : formatPrice(priceCents)}
    </span>
  );
}
