import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import * as termsAcceptance from '@/utils/app/termsAcceptance';

import { TermsAcceptanceModal } from '@/components/Terms/TermsAcceptanceModal';

import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/router', () => ({
  useRouter: () => ({
    locale: 'en',
    locales: ['en', 'fr'],
    push: vi.fn(),
    asPath: '/',
    pathname: '/',
    query: {},
    events: {
      on: vi.fn(),
      off: vi.fn(),
    },
  }),
}));

vi.mock('@/utils/app/termsAcceptance', () => ({
  fetchTermsData: vi.fn(),
  saveUserAcceptance: vi.fn(),
  hasUserAcceptedAllRequiredDocuments: vi.fn(),
}));

vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key, // Return the key as the translation
    i18n: {
      language: 'en',
    },
  }),
}));

describe('TermsAcceptanceModal', () => {
  const mockUser = {
    id: 'user123',
    givenName: 'Test',
    surname: 'User',
    displayName: 'Test User',
    jobTitle: 'Tester',
    department: 'QA',
    mail: 'test.user@example.com',
    companyName: 'Test Company',
  };
  const mockOnAcceptance = vi.fn();

  // Updated mock data structure to match the new format
  const mockTermsData = {
    platformTerms: {
      localized: {
        en: {
          content:
            '# ai.msf.org Terms of Service\n\nThis is the terms content.',
          hash: 'abc123',
        },
        fr: {
          content:
            "# Conditions d'utilisation\n\nCeci est le contenu des conditions.",
          hash: 'xyz789',
        },
      },
      version: '2.0.1',
      required: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(termsAcceptance.fetchTermsData).mockResolvedValue(mockTermsData);
  });

  it('should render loading state initially', () => {
    render(
      <TermsAcceptanceModal user={mockUser} onAcceptance={mockOnAcceptance} />,
    );
    expect(
      screen.getByText('Loading terms and conditions...'),
    ).toBeInTheDocument();
  });

  it('should render terms content after loading', async () => {
    render(
      <TermsAcceptanceModal user={mockUser} onAcceptance={mockOnAcceptance} />,
    );

    await waitFor(() => {
      expect(
        screen.queryByText('Loading terms and conditions...'),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText('Terms and Conditions')).toBeInTheDocument();
    expect(screen.getByText(/ai.msf.org Terms of Service/)).toBeInTheDocument();
  });

  it('should handle API error', async () => {
    vi.mocked(termsAcceptance.fetchTermsData).mockRejectedValueOnce(
      new Error('API error'),
    );

    render(
      <TermsAcceptanceModal user={mockUser} onAcceptance={mockOnAcceptance} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'Failed to load terms and conditions. Please try again later.',
        ),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should display version information', async () => {
    render(
      <TermsAcceptanceModal user={mockUser} onAcceptance={mockOnAcceptance} />,
    );

    await waitFor(() => {
      expect(
        screen.queryByText('Loading terms and conditions...'),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText('Version: 2.0.1')).toBeInTheDocument();
  });

  it('should toggle acceptance checkbox when clicked', async () => {
    render(
      <TermsAcceptanceModal user={mockUser} onAcceptance={mockOnAcceptance} />,
    );

    await waitFor(() => {
      expect(
        screen.queryByText('Loading terms and conditions...'),
      ).not.toBeInTheDocument();
    });

    const termsCheckbox = screen.getByLabelText(
      /I accept the Terms of Service/,
    );

    expect(termsCheckbox).not.toBeChecked();

    fireEvent.click(termsCheckbox);
    expect(termsCheckbox).toBeChecked();

    fireEvent.click(termsCheckbox);
    expect(termsCheckbox).not.toBeChecked();
  });

  it('should enable the accept button only when the required document is accepted', async () => {
    render(
      <TermsAcceptanceModal user={mockUser} onAcceptance={mockOnAcceptance} />,
    );

    await waitFor(() => {
      expect(
        screen.queryByText('Loading terms and conditions...'),
      ).not.toBeInTheDocument();
    });

    const acceptButton = screen.getByText('Accept and Continue');

    // Initially, the button should be disabled
    expect(acceptButton).toBeDisabled();

    // Accept the terms
    fireEvent.click(screen.getByLabelText(/I accept the Terms of Service/));

    // Now the button should be enabled
    expect(acceptButton).not.toBeDisabled();

    // Uncheck the terms
    fireEvent.click(screen.getByLabelText(/I accept the Terms of Service/));

    // Button should be disabled again
    expect(acceptButton).toBeDisabled();
  });

  it('should call saveUserAcceptance and onAcceptance when accept button is clicked', async () => {
    render(
      <TermsAcceptanceModal user={mockUser} onAcceptance={mockOnAcceptance} />,
    );

    // Wait for the terms to load
    await waitFor(() => {
      expect(
        screen.queryByText('Loading terms and conditions...'),
      ).not.toBeInTheDocument();
    });

    // Accept the document
    fireEvent.click(screen.getByLabelText(/I accept the Terms of Service/));

    // Click the accept button
    fireEvent.click(screen.getByText('Accept and Continue'));

    // Check that saveUserAcceptance was called with the correct parameters
    expect(termsAcceptance.saveUserAcceptance).toHaveBeenCalledTimes(1);
    expect(termsAcceptance.saveUserAcceptance).toHaveBeenCalledWith(
      'user123',
      'platformTerms',
      '2.0.1',
      'abc123',
      'en',
    );

    // Check that onAcceptance was called
    expect(mockOnAcceptance).toHaveBeenCalledTimes(1);
  });

  it('should handle error when saving acceptance', async () => {
    // Mock saveUserAcceptance to throw an error
    vi.mocked(termsAcceptance.saveUserAcceptance).mockImplementationOnce(() => {
      throw new Error('Save error');
    });

    render(
      <TermsAcceptanceModal user={mockUser} onAcceptance={mockOnAcceptance} />,
    );

    // Wait for the terms to load
    await waitFor(() => {
      expect(
        screen.queryByText('Loading terms and conditions...'),
      ).not.toBeInTheDocument();
    });

    // Accept the document
    fireEvent.click(screen.getByLabelText(/I accept the Terms of Service/));

    // Click the accept button
    fireEvent.click(screen.getByText('Accept and Continue'));

    // Check that the error message is displayed
    await waitFor(() => {
      expect(
        screen.getByText('Failed to save your acceptance. Please try again.'),
      ).toBeInTheDocument();
    });

    // Check that onAcceptance was not called
    expect(mockOnAcceptance).not.toHaveBeenCalled();
  });

  it('should handle case when user ID is not available', async () => {
    const userWithoutId = {
      id: '',
      givenName: 'Test',
      surname: 'User',
      displayName: 'Test User',
      name: 'Test User',
    };

    render(
      <TermsAcceptanceModal
        user={userWithoutId}
        onAcceptance={mockOnAcceptance}
      />,
    );

    // Wait for the terms to load
    await waitFor(() => {
      expect(
        screen.queryByText('Loading terms and conditions...'),
      ).not.toBeInTheDocument();
    });

    // Accept the document
    fireEvent.click(screen.getByLabelText(/I accept the Terms of Service/));

    // Click the accept button
    fireEvent.click(screen.getByText('Accept and Continue'));

    // saveUserAcceptance should not be called because userId is empty
    expect(termsAcceptance.saveUserAcceptance).not.toHaveBeenCalled();

    // onAcceptance should not be called
    expect(mockOnAcceptance).not.toHaveBeenCalled();
  });
});
