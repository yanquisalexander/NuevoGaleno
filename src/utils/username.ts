/** Normalizes a username: removes diacritics, lowercases, strips invalid characters. */
export function normalizeUsername(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics (é→e, ñ→n, etc.)
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '');  // only allow a-z, 0-9, dot, underscore, hyphen
}

/** Generates a username suggestion from a full name.
 *  "Dr. Juan Pérez" → "jperez"
 *  "Ana García"     → "agarcia"
 *  "Juan"           → "juan"
 */
export function generateUsernameFromName(fullName: string): string {
    const withoutTitles = fullName
        .replace(/\b(dr|dra|lic|ing|sr|sra|prof)\b\.?\s*/gi, '')
        .trim();
    const parts = withoutTitles.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return normalizeUsername(parts[0]);
    const firstInitial = normalizeUsername(parts[0]).charAt(0);
    const lastPart = normalizeUsername(parts[parts.length - 1]);
    return firstInitial + lastPart;
}
