import {
  MSFOrganization,
  OrganizationDetectionResult,
} from '@/types/organization';

/**
 * Domain pattern for detecting MSF organization from email.
 */
interface DomainPattern {
  /** Regex pattern to match against email */
  pattern: RegExp;
  /** Organization this pattern indicates */
  organization: MSFOrganization;
  /** Confidence level of this pattern */
  confidence: 'high' | 'medium';
}

/**
 * Domain patterns for MSF organization detection.
 * Ordered by specificity - more specific patterns should be checked first.
 * High confidence patterns match explicit domain names.
 * Medium confidence patterns match partial strings that may appear in domains.
 */
const DOMAIN_PATTERNS: DomainPattern[] = [
  // USA - New York patterns
  {
    pattern: /newyork\.msf\.org$/i,
    organization: 'USA',
    confidence: 'high',
  },
  { pattern: /newyork/i, organization: 'USA', confidence: 'medium' },
  { pattern: /msf-usa/i, organization: 'USA', confidence: 'high' },

  // OCG - Geneva patterns
  {
    pattern: /geneva\.msf\.org$/i,
    organization: 'OCG',
    confidence: 'high',
  },
  { pattern: /\.gva\./i, organization: 'OCG', confidence: 'high' },
  { pattern: /ocg\.msf\.org$/i, organization: 'OCG', confidence: 'high' },
  { pattern: /geneva/i, organization: 'OCG', confidence: 'medium' },

  // OCA - Amsterdam patterns
  {
    pattern: /amsterdam\.msf\.org$/i,
    organization: 'OCA',
    confidence: 'high',
  },
  { pattern: /\.ams\./i, organization: 'OCA', confidence: 'high' },
  { pattern: /oca\.msf\.org$/i, organization: 'OCA', confidence: 'high' },
  { pattern: /amsterdam/i, organization: 'OCA', confidence: 'medium' },
];

/**
 * Detects the MSF organization from a user's email address.
 * Uses domain pattern matching to determine which operational center
 * the user likely belongs to.
 *
 * @param email - The user's email address (can be undefined or null)
 * @returns Detection result with organization, confidence level, and source
 *
 * @example
 * detectOrganizationFromEmail('user@newyork.msf.org')
 * // Returns: { organization: 'USA', confidence: 'high', source: 'email_domain' }
 *
 * @example
 * detectOrganizationFromEmail('user@field.msf.org')
 * // Returns: { organization: 'FIELD', confidence: 'low', source: 'default' }
 */
export function detectOrganizationFromEmail(
  email: string | undefined | null,
): OrganizationDetectionResult {
  if (!email) {
    return {
      organization: 'FIELD',
      confidence: 'low',
      source: 'default',
    };
  }

  const normalizedEmail = email.toLowerCase();

  for (const { pattern, organization, confidence } of DOMAIN_PATTERNS) {
    if (pattern.test(normalizedEmail)) {
      return {
        organization,
        confidence,
        source: 'email_domain',
      };
    }
  }

  // Default to FIELD for unknown domains
  return {
    organization: 'FIELD',
    confidence: 'low',
    source: 'default',
  };
}

/**
 * Gets a human-readable description of the detection result.
 * Useful for displaying to users why a certain organization was selected.
 *
 * @param result - The detection result from detectOrganizationFromEmail
 * @returns Human-readable description
 */
export function getDetectionDescription(
  result: OrganizationDetectionResult,
): string {
  if (result.source === 'user_preference') {
    return 'Manually selected';
  }
  if (result.source === 'email_domain') {
    return result.confidence === 'high'
      ? 'Detected from email domain'
      : 'Detected from email (partial match)';
  }
  return 'Default selection';
}
