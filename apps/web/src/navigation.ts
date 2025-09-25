import {createNavigation} from 'next-intl/navigation';
import {locales} from '@/i18n';

export const defaultLocale = 'vi';
export const localePrefix = 'always';

export const {Link, usePathname, useRouter, redirect} = createNavigation({
	locales,
	defaultLocale,
	localePrefix
});
