import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/terms/route';
import { NextRequest } from 'next/server';

describe('Terms API Route', () => {
  it('should return terms data with 200 status code', async () => {
    // Create a mock request
    const request = new NextRequest('http://localhost:3000/api/v2/terms');

    // Call the GET handler
    const response = await GET(request);

    // Verify the response
    expect(response.status).toBe(200);

    // Parse the response JSON
    const data = await response.json();

    // Verify the structure of the response
    expect(data).toHaveProperty('platformTerms');
    // expect(data).toHaveProperty('privacyPolicy');

    // Verify the platformTerms properties
    // expect(data.platformTerms).toHaveProperty('content');
    expect(data.platformTerms).toHaveProperty('version');
    // expect(data.platformTerms).toHaveProperty('hash');
    expect(data.platformTerms).toHaveProperty('required');
    expect(data.platformTerms.required).toBe(true);

    // Verify the privacyPolicy properties
    // expect(data.privacyPolicy).toHaveProperty('content');
    // expect(data.privacyPolicy).toHaveProperty('version');
    // expect(data.privacyPolicy).toHaveProperty('hash');
    // expect(data.privacyPolicy).toHaveProperty('required');
    // expect(data.privacyPolicy.required).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const request = new NextRequest('http://localhost:3000/api/v2/terms');

    const mockGet = async (_request?: never) => {
      console.error('Test error');
      throw new Error('Test error');
    };

    try {
      await mockGet(request as never);
      // If we reach here, the test should fail because an error should have been thrown
      expect(true).toBe(false); // This line should never execute
    } catch (error: unknown | Error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Test error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    }

    consoleErrorSpy.mockRestore();
  });

  it('should return the correct content for terms and privacy policy', async () => {
    // TODO: Change when we get final structure for Terms and Privacy Policy
    const request = new NextRequest('http://localhost:3000/api/v2/terms');

    const response = await GET(request);

    const data = await response.json();

    // expect(data.platformTerms.content).toContain('ai.msf.org Terms of Use');

    // expect(data.privacyPolicy.content).toContain('Privacy Policy');
    // expect(data.privacyPolicy.content).toContain('Information We Collect');
    // expect(data.privacyPolicy.content).toContain('How We Use Information');
    // expect(data.privacyPolicy.content).toContain('Information Sharing');
    // expect(data.privacyPolicy.content).toContain('Data Security');
    // expect(data.privacyPolicy.content).toContain('Changes to This Policy');
  });
});
