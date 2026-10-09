/**
 * Self-hosted fonts (no request to Google at build or run time).
 * - Reem Kufi: geometric Kufic display face for headings in both scripts.
 * - IBM Plex Sans Arabic: body text; Arabic and Latin subsets are loaded as
 *   separate families so each script uses its own optimised file.
 */
import localFont from "next/font/local";

export const display = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "../../node_modules/@fontsource-variable/reem-kufi/files/reem-kufi-arabic-wght-normal.woff2", weight: "400 700" },
  ],
  fallback: ["system-ui", "sans-serif"],
});

export const displayLatin = localFont({
  variable: "--font-display-latin",
  display: "swap",
  src: [
    { path: "../../node_modules/@fontsource-variable/reem-kufi/files/reem-kufi-latin-wght-normal.woff2", weight: "400 700" },
  ],
  fallback: ["system-ui", "sans-serif"],
});

export const bodyArabic = localFont({
  variable: "--font-body-arabic",
  display: "swap",
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2", weight: "600" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff2", weight: "700" },
  ],
  fallback: ["Tahoma", "sans-serif"],
});

export const bodyLatin = localFont({
  variable: "--font-body-latin",
  display: "swap",
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-latin-600-normal.woff2", weight: "600" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-latin-700-normal.woff2", weight: "700" },
  ],
  fallback: ["system-ui", "sans-serif"],
});

export const fontVariables = [display.variable, displayLatin.variable, bodyArabic.variable, bodyLatin.variable].join(" ");
