'use client';

import { useMemo } from 'react';

import { detectOrganizationFromEmail } from '@/lib/utils/shared/organization';

import { getOrganizationContactConfig } from '@/types/contact';
import {
  MSFOrganization,
  OrganizationContactConfig,
  OrganizationDetectionResult,
} from '@/types/organization';

import { useSettingsStore } from '@/client/stores/settingsStore';

/**
 * Options for the useOrganizationSupport hook.
 *
 * This hook intentionally does NOT use useSession() to avoid requiring
 * SessionProvider. Instead, callers provide either userEmail (from useSession
 * in their own component) or serverDetectedOrganization (from server component).
 */
export interface UseOrganizationSupportOptions {
  /**
   * User's email address for organization detection.
   * Pass this from useSession().data?.user?.mail when SessionProvider is available.
   */
  userEmail?: string | null;

  /**
   * Server-detected organization, used when SessionProvider is not available
   * (e.g., pages outside the (chat) route group).
   */
  serverDetectedOrganization?: MSFOrganization;
}

/**
 * Return type for the useOrganizationSupport hook.
 */
export interface OrganizationSupportState {
  /** The currently effective organization (user preference or auto-detected) */
  effectiveOrganization: MSFOrganization;
  /** The organization detected from the user's email */
  detectedOrganization: OrganizationDetectionResult;
  /** Whether the user has manually overridden the auto-detected organization */
  isOverridden: boolean;
  /** Contact configuration for the effective organization */
  contactConfig: OrganizationContactConfig;
  /** Set a manual organization preference (or null to use auto-detect) */
  setOrganizationPreference: (org: MSFOrganization | null) => void;
  /** Reset to auto-detection (clears manual preference) */
  resetToAutoDetect: () => void;
}

/**
 * Hook that provides organization-based support contact information.
 * Combines auto-detection from the user's email domain with the ability
 * to manually override the organization preference.
 *
 * NOTE: This hook does NOT use useSession() internally to avoid requiring
 * SessionProvider. Callers must provide either userEmail or serverDetectedOrganization.
 *
 * @param options - Configuration with userEmail or serverDetectedOrganization
 * @returns Organization support state including effective org, contact config, and actions
 *
 * @example
 * // With userEmail (when SessionProvider is available)
 * const { data: session } = useSession();
 * const { contactConfig } = useOrganizationSupport({
 *   userEmail: session?.user?.mail,
 * });
 *
 * @example
 * // With server-detected org (for pages without SessionProvider)
 * const { contactConfig } = useOrganizationSupport({
 *   serverDetectedOrganization: serverDetectedOrg,
 * });
 *
 * // Display contact info
 * if (contactConfig.hasEmailSupport) {
 *   console.log('Email:', contactConfig.email);
 * } else {
 *   console.log('Instructions:', contactConfig.escalationInstructions);
 * }
 */
export function useOrganizationSupport(
  options: UseOrganizationSupportOptions = {},
): OrganizationSupportState {
  const { userEmail, serverDetectedOrganization } = options;
  const organizationPreference = useSettingsStore(
    (state) => state.organizationPreference,
  );
  const setOrganizationPreference = useSettingsStore(
    (state) => state.setOrganizationPreference,
  );

  // Detect organization from user's email, or use server-provided fallback
  const detectedOrganization = useMemo(() => {
    // If userEmail is provided, use it for detection
    if (userEmail) {
      return detectOrganizationFromEmail(userEmail);
    }
    // Fallback to server-detected org when no email available
    if (serverDetectedOrganization) {
      return {
        organization: serverDetectedOrganization,
        confidence: 'high' as const,
        source: 'email_domain' as const,
      };
    }
    // Default fallback
    return detectOrganizationFromEmail(null);
  }, [userEmail, serverDetectedOrganization]);

  // Determine effective organization (user preference takes precedence)
  const effectiveOrganization = useMemo(
    () => organizationPreference ?? detectedOrganization.organization,
    [organizationPreference, detectedOrganization.organization],
  );

  // Get contact configuration for the effective organization
  const contactConfig = useMemo(
    () => getOrganizationContactConfig(effectiveOrganization),
    [effectiveOrganization],
  );

  // Whether user has manually overridden auto-detection
  const isOverridden = organizationPreference !== null;

  // Reset to auto-detect (convenience function)
  const resetToAutoDetect = () => setOrganizationPreference(null);

  return {
    effectiveOrganization,
    detectedOrganization,
    isOverridden,
    contactConfig,
    setOrganizationPreference,
    resetToAutoDetect,
  };
}
