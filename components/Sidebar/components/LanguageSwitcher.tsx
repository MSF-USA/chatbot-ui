import { FC, ChangeEvent } from 'react';
import { useRouter } from 'next/router';
// import {IconLanguage, IconMessage} from "@tabler/icons-react";

// map locale to autonym language name
const localeToLanguageName = {
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
    const { locale, locales, asPath } = router;

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
    return (<div className={'grid'}>
        <select value={locale} onChange={handleLocaleChange}>
        {locales.map((localeOption) => (
                <option
                    data-te-select-init={'true'}
                    key={localeOption}
                    value={localeOption}>
                    {localeToLanguageName[localeOption] ?? localeOption}
                </option>
))}
    </select>
</div>);
};

export default LanguageSwitcher;
