"use client";

import { Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";

export function DeleteListingButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this listing permanently? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <SubmitButton variant="danger">
        <Trash2 className="h-4 w-4" />
        Delete
      </SubmitButton>
    </form>
  );
}
