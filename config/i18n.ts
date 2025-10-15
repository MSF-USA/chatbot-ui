import { getSupportedLocales } from '@/lib/utils/app/locales';
import { defineRouting } from 'next-intl/routing';

export const locales = getSupportedLocales();
export const defaultLocale = 'en';

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Don't use locale prefixes in the URL (/en/..., /es/...)
  localePrefix: 'never',
});
