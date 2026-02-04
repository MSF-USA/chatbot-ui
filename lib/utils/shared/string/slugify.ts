/**
 * Converts text into a URL-safe slug.
 *
 * Transforms the input by:
 * - Converting to lowercase
 * - Removing special characters (keeps alphanumeric and hyphens)
 * - Replacing spaces and underscores with hyphens
 * - Collapsing multiple consecutive hyphens
 * - Trimming leading/trailing hyphens
 * - Limiting length to maxLength
 *
 * @param text - The text to slugify
 * @param maxLength - Maximum length of the resulting slug (default: 50)
 * @returns A URL-safe slug
 *
 * @example
 * slugify("How to Bake Cookies!") // "how-to-bake-cookies"
 * slugify("  Multiple   Spaces  ") // "multiple-spaces"
 * slugify("Special @#$ Characters") // "special-characters"
 */
export function slugify(text: string, maxLength: number = 50): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/_/g, '-') // Convert underscores to hyphens first
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters (keeping spaces and hyphens)
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, maxLength);
}

/**
 * Generates a filename for audio downloads with proper slugification.
 *
 * Creates a filename from a base text (like conversation title or filename),
 * an optional suffix (like message index), and file extension.
 *
 * @param baseText - The primary text to base the filename on (e.g., conversation title)
 * @param suffix - Optional suffix to append (e.g., message index)
 * @param extension - File extension without the dot (default: 'mp3')
 * @param fallback - Fallback name if baseText is empty or slugifies to empty (default: 'audio')
 * @returns A properly formatted filename
 *
 * @example
 * generateAudioFilename("How to bake cookies", 5) // "how-to-bake-cookies-5.mp3"
 * generateAudioFilename("", 1, "mp3", "assistant-audio") // "assistant-audio-1.mp3"
 * generateAudioFilename("meeting.wav", "audio") // "meeting-audio.mp3"
 */
export function generateAudioFilename(
  baseText: string,
  suffix?: string | number,
  extension: string = 'mp3',
  fallback: string = 'audio',
): string {
  // Remove common audio/video file extensions from base text
  const textWithoutExt = baseText.replace(
    /\.(mp3|mp4|mpeg|mpga|m4a|wav|webm)$/i,
    '',
  );

  const slugifiedBase = slugify(textWithoutExt) || fallback;

  const parts = [slugifiedBase];
  if (suffix !== undefined && suffix !== null && suffix !== '') {
    parts.push(String(suffix));
  }

  return `${parts.join('-')}.${extension}`;
}
