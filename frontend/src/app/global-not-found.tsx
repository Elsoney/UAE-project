/**
 * 404 page for URLs that match no route. The root layout lives under the
 * dynamic [lang] segment, so this page renders on its own (Next.js
 * global-not-found) and speaks both languages.
 */
import type { Metadata } from "next";
import Link from "next/link";
import ar from "@/i18n/dictionaries/ar.json";
import en from "@/i18n/dictionaries/en.json";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: `${ar.notFound.title} | ${en.notFound.title}`,
};

const link =
  "mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-madder px-6 font-semibold text-plaster hover:bg-madder-deep";

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full">
        <div className="sadu-band" aria-hidden="true" />
        <main className="mx-auto grid max-w-5xl gap-16 px-4 py-20 sm:px-6 md:grid-cols-2">
          <section>
            <h1 className="font-display text-4xl text-indigo">{ar.notFound.title}</h1>
            <p className="mt-4 text-lg text-date">{ar.notFound.body}</p>
            <Link href="/ar" className={link}>
              {ar.notFound.home}
            </Link>
          </section>
          <section lang="en" dir="ltr">
            <h2 className="font-display text-4xl text-indigo">{en.notFound.title}</h2>
            <p className="mt-4 text-lg text-date">{en.notFound.body}</p>
            <Link href="/en" className={link}>
              {en.notFound.home}
            </Link>
          </section>
        </main>
      </body>
    </html>
  );
}
