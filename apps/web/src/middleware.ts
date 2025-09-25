import createMiddleware from 'next-intl/middleware';
import {locales} from './i18n';
import {defaultLocale, localePrefix} from '@/navigation';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Always use the locale prefix in the URL
  localePrefix
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
