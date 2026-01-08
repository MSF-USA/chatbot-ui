import {
  MSFOrganization,
  OrganizationContactConfig,
} from '@/types/organization';

/**
 * Validates an email address format and returns the email or a default.
 *
 * @param email - The email to validate
 * @param defaultEmail - Fallback email if validation fails
 * @returns Valid email address
 */
const checkValidEmail = (
  email: string | undefined,
  defaultEmail: string = 'ai@newyork.msf.org',
): string => {
  if (!email) return defaultEmail;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(email)) {
    return email;
  } else {
    return defaultEmail;
  }
};

/** MSF USA support email */
export const US_FEEDBACK_EMAIL: string = checkValidEmail(
  process.env.NEXT_PUBLIC_EMAIL,
  'ai@newyork.msf.org',
);

/** OCA (Amsterdam) support email - also serves as general EU feedback */
export const FEEDBACK_EMAIL: string = checkValidEmail(
  process.env.NEXT_PUBLIC_FEEDBACK_EMAIL,
  'ai.team@amsterdam.msf.org',
);

/** OCG (Geneva) support email */
export const OCG_FEEDBACK_EMAIL: string = checkValidEmail(
  process.env.NEXT_PUBLIC_OCG_FEEDBACK_EMAIL,
  'ai-support.gva@geneva.msf.org',
);

/** Default escalation instructions for field staff */
const DEFAULT_FIELD_ESCALATION_MESSAGE =
  'For field staff and other MSF personnel:\n\n' +
  '1. Contact your local IT support first\n' +
  '2. If unresolved, they should escalate to your Operational Center (OC) IT department\n' +
  '3. If still unresolved, OC IT can escalate to SITS (Shared IT Services)';

/** Field/Other staff escalation instructions */
export const FIELD_ESCALATION_MESSAGE: string =
  process.env.NEXT_PUBLIC_FIELD_ESCALATION_MESSAGE ||
  DEFAULT_FIELD_ESCALATION_MESSAGE;

/** Display names for each organization */
const ORGANIZATION_DISPLAY_NAMES: Record<MSFOrganization, string> = {
  USA: 'MSF USA',
  OCG: 'OCG (Geneva)',
  OCA: 'OCA (Amsterdam)',
  FIELD: 'Field / Other',
};

/**
 * Gets the contact configuration for a given MSF organization.
 * Returns email contact info for USA, OCG, OCA, and escalation instructions for Field/Other.
 *
 * @param organization - The MSF organization
 * @returns Contact configuration with email or escalation instructions
 */
export function getOrganizationContactConfig(
  organization: MSFOrganization,
): OrganizationContactConfig {
  const baseConfig = {
    organization,
    displayName: ORGANIZATION_DISPLAY_NAMES[organization],
  };

  switch (organization) {
    case 'USA':
      return {
        ...baseConfig,
        hasEmailSupport: true,
        email: US_FEEDBACK_EMAIL,
      };
    case 'OCG':
      return {
        ...baseConfig,
        hasEmailSupport: true,
        email: OCG_FEEDBACK_EMAIL,
      };
    case 'OCA':
      return {
        ...baseConfig,
        hasEmailSupport: true,
        email: FEEDBACK_EMAIL,
      };
    case 'FIELD':
      return {
        ...baseConfig,
        hasEmailSupport: false,
        escalationInstructions: FIELD_ESCALATION_MESSAGE,
      };
  }
}
