import {NextIntlClientProvider} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales} from '@/i18n';
import Header from '@/components/header';
import enMessages from '../../../messages/en.json';
import viMessages from '../../../messages/vi.json';

export function generateStaticParams() {
  return locales.map(locale => ({locale}));
}

const messagesByLocale = {
  en: enMessages,
  vi: viMessages
} as const;

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  setRequestLocale(locale);

  console.log('[locale/layout] rendering locale layout', {
    locale,
    availableLocales: locales
  });

  // Ensure that the incoming locale is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = messagesByLocale[locale as keyof typeof messagesByLocale];

  if (!messages) {
    console.error('[locale/layout] missing messages for locale', locale);
  }

  if (!messages) {
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="grid grid-rows-[auto_1fr] h-svh">
        <Header />
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
