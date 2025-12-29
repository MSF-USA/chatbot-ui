'use client';

import { useSession } from 'next-auth/react';
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
 * @returns Organization support state including effective org, contact config, and actions
 *
 * @example
 * const {
 *   effectiveOrganization,
 *   contactConfig,
 *   setOrganizationPreference,
 * } = useOrganizationSupport();
 *
 * // Display contact info
 * if (contactConfig.hasEmailSupport) {
 *   console.log('Email:', contactConfig.email);
 * } else {
 *   console.log('Instructions:', contactConfig.escalationInstructions);
 * }
 *
 * // Let user override
 * setOrganizationPreference('OCG');
 */
export function useOrganizationSupport(): OrganizationSupportState {
  const { data: session } = useSession();
  const organizationPreference = useSettingsStore(
    (state) => state.organizationPreference,
  );
  const setOrganizationPreference = useSettingsStore(
    (state) => state.setOrganizationPreference,
  );

  // Detect organization from user's email
  const detectedOrganization = useMemo(
    () => detectOrganizationFromEmail(session?.user?.mail),
    [session?.user?.mail],
  );

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
