import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';

import LanguageSwitcher from '@/components/Sidebar/components/LanguageSwitcher';

// Mock next-intl
const mockUseLocale = vi.fn();
vi.mock('next-intl', () => ({
  useLocale: () => mockUseLocale(),
}));

// Mock navigation
const mockReplace = vi.fn();
const mockUsePathname = vi.fn();
const mockUseParams = vi.fn();
const mockUseRouter = vi.fn();

vi.mock('@/lib/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => mockUseRouter(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
}));

// Mock locales utility
vi.mock('@/lib/utils/app/locales', () => ({
  getSupportedLocales: () => ['en', 'fr', 'es', 'de'],
  getAutonym: (locale: string) => {
    const autonyms: Record<string, string> = {
      en: 'English',
      fr: 'Français',
      es: 'Español',
      de: 'Deutsch',
    };
    return autonyms[locale] || locale;
  },
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockUseLocale.mockReturnValue('en');
    mockUsePathname.mockReturnValue('/chat');
    mockUseParams.mockReturnValue({});
    mockUseRouter.mockReturnValue({ replace: mockReplace });
    mockReplace.mockClear();
  });

  describe('Rendering', () => {
    it('renders language selector', () => {
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('renders all supported locales as options', () => {
      render(<LanguageSwitcher />);

      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Français')).toBeInTheDocument();
      expect(screen.getByText('Español')).toBeInTheDocument();
      expect(screen.getByText('Deutsch')).toBeInTheDocument();
    });

    it('displays current locale as selected', () => {
      mockUseLocale.mockReturnValue('fr');
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('fr');
    });

    it('has correct number of options', () => {
      render(<LanguageSwitcher />);

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(4);
    });
  });

  describe('Locale Change', () => {
    it('calls router.replace when locale is changed', () => {
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'es' } });

      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    it('passes correct pathname to router.replace', () => {
      mockUsePathname.mockReturnValue('/settings');
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'de' } });

      expect(mockReplace).toHaveBeenCalledWith(
        { pathname: '/settings', params: {} },
        { locale: 'de' }
      );
    });

    it('passes correct params to router.replace', () => {
      mockUseParams.mockReturnValue({ id: '123' });
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'fr' } });

      expect(mockReplace).toHaveBeenCalledWith(
        { pathname: '/chat', params: { id: '123' } },
        { locale: 'fr' }
      );
    });

    it('updates to selected locale', () => {
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'es' } });

      expect(mockReplace).toHaveBeenCalledWith(
        { pathname: '/chat', params: {} },
        { locale: 'es' }
      );
    });
  });

  describe('Styling', () => {
    it('has correct select styling classes', () => {
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('w-[100px]');
      expect(select).toHaveClass('cursor-pointer');
      expect(select).toHaveClass('bg-transparent');
      expect(select).toHaveClass('text-center');
    });

    it('has dark mode styling', () => {
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('dark:text-neutral-200');
    });

    it('options have correct background classes', () => {
      render(<LanguageSwitcher />);

      const options = screen.getAllByRole('option');
      options.forEach((option) => {
        expect(option).toHaveClass('bg-white');
        expect(option).toHaveClass('dark:bg-black');
      });
    });

    it('has hover styling', () => {
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('hover:bg-gray-500/10');
    });
  });

  describe('Different Locales', () => {
    it('works with English locale', () => {
      mockUseLocale.mockReturnValue('en');
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('en');
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('works with French locale', () => {
      mockUseLocale.mockReturnValue('fr');
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('fr');
      expect(screen.getByText('Français')).toBeInTheDocument();
    });

    it('works with Spanish locale', () => {
      mockUseLocale.mockReturnValue('es');
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('es');
      expect(screen.getByText('Español')).toBeInTheDocument();
    });

    it('works with German locale', () => {
      mockUseLocale.mockReturnValue('de');
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('de');
      expect(screen.getByText('Deutsch')).toBeInTheDocument();
    });
  });

  describe('Option Values', () => {
    it('each option has correct value attribute', () => {
      render(<LanguageSwitcher />);

      const englishOption = screen.getByText('English') as HTMLOptionElement;
      expect(englishOption.value).toBe('en');

      const frenchOption = screen.getByText('Français') as HTMLOptionElement;
      expect(frenchOption.value).toBe('fr');

      const spanishOption = screen.getByText('Español') as HTMLOptionElement;
      expect(spanishOption.value).toBe('es');

      const germanOption = screen.getByText('Deutsch') as HTMLOptionElement;
      expect(germanOption.value).toBe('de');
    });
  });

  describe('Accessibility', () => {
    it('select is keyboard accessible', () => {
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox');
      expect(select.tagName).toBe('SELECT');
    });
  });
});
