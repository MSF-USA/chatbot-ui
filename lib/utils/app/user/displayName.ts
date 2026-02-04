import { Session } from 'next-auth';

import { DisplayNamePreference } from '@/types/settings';

/**
 * Gets the user's display name based on their preference setting.
 *
 * @param user - The NextAuth session user object
 * @param preference - The user's display name preference
 * @param customName - Optional custom name (used when preference is 'custom')
 * @returns The formatted display name, or undefined if no user
 *
 * @example
 * // With firstName preference (default)
 * getUserDisplayName(session.user, 'firstName'); // "John"
 *
 * @example
 * // With custom preference
 * getUserDisplayName(session.user, 'custom', 'Dr. Smith'); // "Dr. Smith"
 */
export function getUserDisplayName(
  user: Session['user'] | undefined,
  preference: DisplayNamePreference = 'firstName',
  customName?: string,
): string | undefined {
  if (!user) return undefined;

  switch (preference) {
    case 'none':
      // User prefers anonymous greeting without name
      return undefined;

    case 'lastName':
      // Use surname from profile, or extract last word from displayName
      return user.surname || user.displayName?.split(' ').pop();

    case 'fullName':
      return user.displayName;

    case 'custom':
      // Use custom name if provided, otherwise fall back to firstName behavior
      return (
        customName?.trim() || user.givenName || user.displayName?.split(' ')[0]
      );

    case 'firstName':
    default:
      // Use givenName from profile, or extract first word from displayName
      return user.givenName || user.displayName?.split(' ')[0];
  }
}
