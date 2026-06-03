import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirect-to-signin gate. This is UX; real enforcement lives in each
  // server action via requireUser() + ownership checks.
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader user={{ name: user.name, image: user.image }} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">
          KK-Kirppis · a flea market for the Koodiklinikka community · trade
          fairly, be kind.
        </div>
      </footer>
    </div>
  );
}
