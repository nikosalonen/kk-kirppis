import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { Analytics } from "@/components/analytics";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KK-Kirppis: used games from Koodiklinikka members",
    template: "%s | KK-Kirppis",
  },
  description:
    "Buy and sell used video games within the Koodiklinikka community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${schibsted.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
