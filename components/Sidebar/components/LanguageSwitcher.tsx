'use client';

import { ChangeEvent, FC } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/lib/navigation';
import { useParams } from 'next/navigation';
import { getAutonym, getSupportedLocales } from '@/lib/utils/app/locales';

const LanguageSwitcher: FC = () => {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const locales = getSupportedLocales();

  const handleLocaleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newLocale = event.target.value;
    router.replace(
      // @ts-expect-error -- TypeScript will validate that only known `params`
      // are used in combination with a given `pathname`. Since the two will
      // always match for the current route, we can skip runtime checks.
      { pathname, params },
      { locale: newLocale }
    );
  };

  return (
    <div className={'grid'}>
      <select
        value={locale}
        onChange={handleLocaleChange}
        className="w-[100px] cursor-pointer bg-transparent p-2 text-neutral-700 dark:text-neutral-200 text-center text-sm border-none hover:bg-gray-500/10"
      >
        {locales.map((localeOption) => (
          <option
            className={'bg-white dark:bg-black'}
            key={localeOption}
            value={localeOption}
          >
            {getAutonym(localeOption)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
