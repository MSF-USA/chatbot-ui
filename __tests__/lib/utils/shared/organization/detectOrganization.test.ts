import {
  detectOrganizationFromEmail,
  getDetectionDescription,
} from '@/lib/utils/shared/organization/detectOrganization';

import { describe, expect, it } from 'vitest';

describe('detectOrganizationFromEmail', () => {
  describe('USA detection', () => {
    it('should detect USA from newyork.msf.org domain with high confidence', () => {
      const result = detectOrganizationFromEmail('user@newyork.msf.org');
      expect(result.organization).toBe('USA');
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('email_domain');
    });

    it('should detect USA from email containing "newyork" with medium confidence', () => {
      const result = detectOrganizationFromEmail(
        'user@newyork-office.example.org',
      );
      expect(result.organization).toBe('USA');
      expect(result.confidence).toBe('medium');
      expect(result.source).toBe('email_domain');
    });

    it('should detect USA from msf-usa domain with high confidence', () => {
      const result = detectOrganizationFromEmail('user@msf-usa.org');
      expect(result.organization).toBe('USA');
      expect(result.confidence).toBe('high');
    });

    it('should be case-insensitive for USA detection', () => {
      const result = detectOrganizationFromEmail('user@NEWYORK.MSF.ORG');
      expect(result.organization).toBe('USA');
    });
  });

  describe('OCG (Geneva) detection', () => {
    it('should detect OCG from geneva.msf.org domain with high confidence', () => {
      const result = detectOrganizationFromEmail('user@geneva.msf.org');
      expect(result.organization).toBe('OCG');
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('email_domain');
    });

    it('should detect OCG from .gva. pattern with high confidence', () => {
      const result = detectOrganizationFromEmail('user@mail.gva.msf.org');
      expect(result.organization).toBe('OCG');
      expect(result.confidence).toBe('high');
    });

    it('should detect OCG from ocg.msf.org domain with high confidence', () => {
      const result = detectOrganizationFromEmail('user@ocg.msf.org');
      expect(result.organization).toBe('OCG');
      expect(result.confidence).toBe('high');
    });

    it('should detect OCG from email containing "geneva" with medium confidence', () => {
      const result = detectOrganizationFromEmail(
        'user@geneva-office.example.org',
      );
      expect(result.organization).toBe('OCG');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('OCA (Amsterdam) detection', () => {
    it('should detect OCA from amsterdam.msf.org domain with high confidence', () => {
      const result = detectOrganizationFromEmail('user@amsterdam.msf.org');
      expect(result.organization).toBe('OCA');
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('email_domain');
    });

    it('should detect OCA from .ams. pattern with high confidence', () => {
      const result = detectOrganizationFromEmail('user@mail.ams.msf.org');
      expect(result.organization).toBe('OCA');
      expect(result.confidence).toBe('high');
    });

    it('should detect OCA from oca.msf.org domain with high confidence', () => {
      const result = detectOrganizationFromEmail('user@oca.msf.org');
      expect(result.organization).toBe('OCA');
      expect(result.confidence).toBe('high');
    });

    it('should detect OCA from email containing "amsterdam" with medium confidence', () => {
      const result = detectOrganizationFromEmail(
        'user@amsterdam-office.example.org',
      );
      expect(result.organization).toBe('OCA');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('FIELD (default) detection', () => {
    it('should return FIELD for unknown domain with low confidence', () => {
      const result = detectOrganizationFromEmail('user@field.msf.org');
      expect(result.organization).toBe('FIELD');
      expect(result.confidence).toBe('low');
      expect(result.source).toBe('default');
    });

    it('should return FIELD for undefined email with low confidence', () => {
      const result = detectOrganizationFromEmail(undefined);
      expect(result.organization).toBe('FIELD');
      expect(result.confidence).toBe('low');
      expect(result.source).toBe('default');
    });

    it('should return FIELD for null email with low confidence', () => {
      const result = detectOrganizationFromEmail(null);
      expect(result.organization).toBe('FIELD');
      expect(result.confidence).toBe('low');
      expect(result.source).toBe('default');
    });

    it('should return FIELD for empty string with low confidence', () => {
      const result = detectOrganizationFromEmail('');
      expect(result.organization).toBe('FIELD');
      expect(result.confidence).toBe('low');
      expect(result.source).toBe('default');
    });

    it('should return FIELD for generic MSF domain', () => {
      const result = detectOrganizationFromEmail('user@msf.org');
      expect(result.organization).toBe('FIELD');
      expect(result.confidence).toBe('low');
    });

    it('should return FIELD for non-MSF domain', () => {
      const result = detectOrganizationFromEmail('user@gmail.com');
      expect(result.organization).toBe('FIELD');
      expect(result.confidence).toBe('low');
    });
  });

  describe('edge cases', () => {
    it('should handle emails with uppercase characters', () => {
      const result = detectOrganizationFromEmail('USER@AMSTERDAM.MSF.ORG');
      expect(result.organization).toBe('OCA');
    });

    it('should handle emails with mixed case', () => {
      const result = detectOrganizationFromEmail('User@Geneva.Msf.Org');
      expect(result.organization).toBe('OCG');
    });

    it('should handle complex email formats', () => {
      const result = detectOrganizationFromEmail(
        'first.last+tag@newyork.msf.org',
      );
      expect(result.organization).toBe('USA');
    });
  });
});

describe('getDetectionDescription', () => {
  it('should return "Manually selected" for user preference source', () => {
    const description = getDetectionDescription({
      organization: 'USA',
      confidence: 'high',
      source: 'user_preference',
    });
    expect(description).toBe('Manually selected');
  });

  it('should return high confidence message for email domain source', () => {
    const description = getDetectionDescription({
      organization: 'OCG',
      confidence: 'high',
      source: 'email_domain',
    });
    expect(description).toBe('Detected from email domain');
  });

  it('should return medium confidence message for partial match', () => {
    const description = getDetectionDescription({
      organization: 'OCA',
      confidence: 'medium',
      source: 'email_domain',
    });
    expect(description).toBe('Detected from email (partial match)');
  });

  it('should return default selection message for default source', () => {
    const description = getDetectionDescription({
      organization: 'FIELD',
      confidence: 'low',
      source: 'default',
    });
    expect(description).toBe('Default selection');
  });
});
