/**
 * MSF Organization types for support contact routing.
 * Each organization has different support contact methods.
 */
export type MSFOrganization = 'USA' | 'OCG' | 'OCA' | 'FIELD';

/**
 * All available MSF organizations for iteration.
 */
export const MSF_ORGANIZATIONS: readonly MSFOrganization[] = [
  'USA',
  'OCG',
  'OCA',
  'FIELD',
] as const;

/**
 * Organization contact configuration.
 * For organizations with email support, the email field is populated.
 * For Field/Other, escalationInstructions is provided instead.
 */
export interface OrganizationContactConfig {
  /** The organization identifier */
  organization: MSFOrganization;
  /** Human-readable display name for the organization */
  displayName: string;
  /** Whether this organization has direct email support */
  hasEmailSupport: boolean;
  /** Support email address (only for orgs with email support) */
  email?: string;
  /** Escalation instructions (only for orgs without email support) */
  escalationInstructions?: string;
}

/**
 * Result from organization detection based on email domain.
 */
export interface OrganizationDetectionResult {
  /** The detected organization */
  organization: MSFOrganization;
  /** Confidence level of the detection */
  confidence: 'high' | 'medium' | 'low';
  /** Source of the detection */
  source: 'email_domain' | 'user_preference' | 'default';
}
