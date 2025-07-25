import { ChangeEvent, FC } from 'react';

import { useRouter } from 'next/router';

import { getAutonym } from '@/utils/app/locales';

// import {IconLanguage, IconMessage} from "@tabler/icons-react";

const LanguageSwitcher: FC = () => {
  const router = useRouter();
  const { locale, locales, asPath } = router;

  const handleLocaleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newLocale = event.target.value;
    if (locales) {
      const regex = new RegExp(`^/(${locales.join('|')})`);
      router.push(asPath, asPath, { locale: newLocale });
    }
  };

  if (!locales || locales.length === 0) {
    return null;
  }

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
            data-te-select-init={'true'}
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
