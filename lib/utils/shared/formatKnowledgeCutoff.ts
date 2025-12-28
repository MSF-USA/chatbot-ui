/**
 * Format a knowledge cutoff date for display using the user's locale.
 *
 * Supports ISO date strings with varying precision:
 * - Month only: "2025-12" → "Dec 2025" (en) / "déc. 2025" (fr)
 * - Date only: "2025-01-20" → "Jan 20, 2025" (en)
 * - Date with time: "2025-08-06T20:00" → "Aug 6, 2025, 8:00 PM" (en)
 *
 * @param isoDate - ISO date string (e.g., "2025-12", "2025-01-20", "2025-08-06T20:00")
 * @param locale - User's locale (e.g., "en", "fr", "ja")
 * @returns Formatted date string, or null if no date provided
 */
export function formatKnowledgeCutoff(
  isoDate: string | undefined,
  locale: string,
): string | null {
  if (!isoDate) return null;

  // Determine precision based on format
  const hasTime = isoDate.includes('T');
  const parts = isoDate.split('T')[0].split('-');
  const hasDay = parts.length === 3;

  // Parse date components
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed for Date

  let date: Date;
  let options: Intl.DateTimeFormatOptions;

  if (hasTime) {
    // Full date with time: "2025-08-06T20:00"
    const day = parseInt(parts[2], 10);
    const timeParts = isoDate.split('T')[1].split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    date = new Date(year, month, day, hours, minutes);
    options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    };
  } else if (hasDay) {
    // Date only: "2025-01-20"
    const day = parseInt(parts[2], 10);
    date = new Date(year, month, day);
    options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
  } else {
    // Month only: "2025-12"
    date = new Date(year, month, 1);
    options = {
      year: 'numeric',
      month: 'short',
    };
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
}
