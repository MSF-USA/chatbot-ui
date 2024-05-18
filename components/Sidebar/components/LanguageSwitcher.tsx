import { FC, ChangeEvent, JSXElementConstructor, ReactElement, ReactFragment, ReactPortal} from 'react';
import {useRouter} from 'next/router';
// import {IconLanguage, IconMessage} from "@tabler/icons-react";

// map locale to autonym language name
const localeToLanguageName: {
    de: string;
    fi: string;
    ru: string;
    sv: string;
    ko: string;
    pt: string;
    en: string;
    it: string;
    bn: string;
    fr: string;
    es: string;
    zh: string;
    ar: string;
    te: string;
    vi: string;
    si: string;
    ja: string;
    id: string;
    pl: string;
    he: string;
    ro: string;
    ca: string;
    nl: string;
    tr: string
} = {
    en: 'English',
    es: 'Español',
    ar: 'العربية',
    bn: 'বাংলা',
    ca: 'Català',
    de: 'Deutsch',
    fi: 'Suomi',
    fr: 'Français',
    he: 'עברית',
    id: 'Bahasa Indonesia',
    it: 'Italiano',
    ja: '日本語',
    ko: '한국어',
    nl: 'Nederlands',
    pl: 'Polski',
    pt: 'Português',
    ro: 'Română',
    ru: 'Русский',
    si: 'සිංහල',
    sv: 'Svenska',
    te: 'తెలుగు',
    tr: 'Türkçe',
    vi: 'Tiếng Việt',
    zh: '中文',
}

const LanguageSwitcher: FC = () => {
    const router = useRouter();
    const {locale, locales, asPath} = router;

    const handleLocaleChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const newLocale = event.target.value;
        if (locales) {
            const regex = new RegExp(`^/(${locales.join('|')})`);
            router.push(asPath, asPath, {locale: newLocale});
        }
    };

    if (!locales || locales.length === 0) {
        return null;
    }

    const getAutonym = (locale: string) => {
        // @ts-ignore
        return localeToLanguageName[locale] ?? locale;
    }

    return (<div className={'grid'}>
        <select value={locale} onChange={handleLocaleChange} className='w-[200px] cursor-pointer bg-transparent p-2 text-neutral-700 dark:text-neutral-200 text-center text-sm'>
        {locales.map((localeOption) => (
                <option
                    data-te-select-init={'true'}
                    key={localeOption}
                    value={localeOption}>
                    {getAutonym(localeOption)}
                </option>
))}
    </select>
</div>);
};

export default LanguageSwitcher;
