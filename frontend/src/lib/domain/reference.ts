/**
 * Public references shown to customers, e.g. UMD-7K4Q2XRM (orders) and
 * UMC-7K4Q2XRM (catering requests). The database generates them
 * (public.generate_public_reference); this module validates and formats them.
 * The alphabet excludes ambiguous characters (0, 1, I, L, O).
 */

export const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const REFERENCE_PREFIX = { order: "UMD", catering: "UMC" } as const;
export type ReferenceKind = keyof typeof REFERENCE_PREFIX;

const pattern = new RegExp(`^(UMD|UMC)-[${REFERENCE_ALPHABET}]{8}$`);

/** Normalises user input ("umd 7k4q2xrm") to the canonical form, or null if invalid. */
export function parseReference(input: string): { kind: ReferenceKind; reference: string } | null {
  const compact = input.trim().toUpperCase().replace(/[\s_]/g, "").replace(/^(UMD|UMC)-?/, "$1-");
  if (!pattern.test(compact)) return null;
  return { kind: compact.startsWith("UMD") ? "order" : "catering", reference: compact };
}

export function isValidReference(input: string): boolean {
  return parseReference(input) !== null;
}

/** Generates a reference with the same format as the database (used in tests and the mock provider). */
export function generateReference(kind: ReferenceKind, random: (size: number) => Uint8Array = randomBytes): string {
  const bytes = random(8);
  let body = "";
  for (let i = 0; i < 8; i++) body += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  return `${REFERENCE_PREFIX[kind]}-${body}`;
}

function randomBytes(size: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(size));
}
