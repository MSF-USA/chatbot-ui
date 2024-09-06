import { getRequestConfig } from 'next-intl/server';

import { locales } from '../i18n.config.js';

export default getRequestConfig(async ({ locale }) => {
  let messages = {};
  try {
    const common = (await import(`../public/locales/${locale}/common.json`))
      .default;
    const chat = (await import(`../public/locales/${locale}/chat.json`))
      .default;
    const markdown = (await import(`../public/locales/${locale}/markdown.json`))
      .default;
    const promptbar = (
      await import(`../public/locales/${locale}/promptbar.json`)
    ).default;
    const settings = (await import(`../public/locales/${locale}/settings.json`))
      .default;
    const sidebar = (await import(`../public/locales/${locale}/sidebar.json`))
      .default;
    messages = {
      ...common,
      ...chat,
      ...markdown,
      ...promptbar,
      ...settings,
      ...sidebar,
    };
  } catch (error) {
    console.error(`Could not load messages for locale "${locale}":`, error);
    throw error;
  }
  return {
    messages,
  };
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
