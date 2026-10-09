import type { Metadata } from "next";
// Fonts are bundled with the app (via the `geist` package) instead of being
// downloaded from Google Fonts at build time, so builds work offline / behind
// proxies and no third-party font request is made at runtime.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: "Umodai Restaurant & Catering | Ajman",
  description:
    "Bilingual restaurant and catering ordering website for Umodai in Ajman, UAE.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f8f5f0] text-slate-900">{children}</body>
    </html>
  );
}
