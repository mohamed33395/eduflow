export function toPhoneDigits(input: string): string {
  return (input || "").replace(/\D/g, "");
}

export function normalizePhone(input: string): string {
  const digits = toPhoneDigits(input);
  // remove leading zeros for a canonical "significant number"
  return digits.replace(/^0+/, "");
}

export function phonesMatch(a: string, b: string): boolean {
  const da = toPhoneDigits(a);
  const db = toPhoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;

  // handle one containing the other (e.g. +966... vs 05...)
  if (da.includes(db) || db.includes(da)) return true;

  // compare the last 9 significant digits (enough to match local/international variants)
  const sa = normalizePhone(a).slice(-9);
  const sb = normalizePhone(b).slice(-9);
  return sa === sb && sa.length >= 7;
}
