/**
 * Dictionary types and helpers usable on the server and in Client Components
 * (client components receive the slice of the dictionary they need as props).
 */
import type en from "./dictionaries/en.json";
import type { ValidationMessageKey } from "@/lib/domain/validation";

export type Dictionary = typeof en;

/** Replaces {name} placeholders. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** Resolves a validation key such as "errors.email" to localised text. */
export function errorMessage(errors: Dictionary["errors"], key: ValidationMessageKey): string {
  const name = key.slice("errors.".length) as keyof Dictionary["errors"];
  return errors[name] ?? errors.generic;
}
