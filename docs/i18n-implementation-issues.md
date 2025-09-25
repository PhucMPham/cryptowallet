# i18n Implementation Issues Documentation

## Date: 2025-09-24

## Overview
This document details the issues encountered while implementing internationalization (i18n) for the crypto portfolio tracker application, specifically for English and Vietnamese language support.

## Initial Request
Implement i18n to translate the frontend UI text from English to Vietnamese, starting with the crypto page.

## Implementation Approach

### 1. Initial Setup
- **Library Chosen**: `next-intl` (version 4.3.9)
- **Framework**: Next.js 15.5.0 with App Router
- **Languages**: English (en) and Vietnamese (vi)

### 2. Files Created

#### Translation Files
- `/apps/web/messages/en.json` - English translations
- `/apps/web/messages/vi.json` - Vietnamese translations

#### Configuration Files
- `/apps/web/src/i18n.ts` - i18n configuration with locale setup
- `/apps/web/src/middleware.ts` - Middleware for locale routing

#### Component Files
- `/apps/web/src/app/[locale]/layout.tsx` - Locale layout wrapper
- `/apps/web/src/app/[locale]/crypto/CryptoClient.tsx` - Client component wrapper (created then deleted)
- `/apps/web/src/app/[locale]/test/page.tsx` - Test page for debugging (created for testing)

### 3. Files Modified

#### Configuration Updates
- `/apps/web/next.config.ts` - Added next-intl plugin wrapper
- `/apps/web/package.json` - Added next-intl dependency

#### Page Updates
- `/apps/web/src/app/[locale]/crypto/page.tsx` - Multiple iterations:
  1. First: Server component with getTranslations
  2. Second: Server component passing props to client component
  3. Third: Direct client component with useTranslations
  4. Fourth: Hardcoded translations (testing)
  5. Final: Client component with useTranslations hook

### 4. Files Deleted
- `/apps/web/src/app/[locale]/crypto/CryptoClient.tsx` - Removed after switching to direct client component approach

## Issues Encountered

### Issue 1: 404 Error on Crypto Page
**Problem**: After implementing i18n, the crypto page at `/vi/crypto` returns a 404 error.

**Error Message**:
```
Error: NEXT_HTTP_ERROR_FALLBACK;404
```

**Stack Trace Location**:
- LocaleLayout component
- CryptoPage component

### Issue 2: Configuration Not Found
**Problem**: next-intl cannot find the configuration file despite it being properly configured.

**Attempted Solutions**:
1. Used `createNextIntlPlugin` wrapper in next.config.ts
2. Specified explicit path to i18n.ts configuration
3. Changed from dynamic imports to static imports for messages

### Issue 3: Next.js 15.5.0 Compatibility
**Problem**: Next.js 15.5.0 requires params to be awaited in server components.

**Solution Applied**:
```typescript
// Before
export default function Layout({ params }) {
  const { locale } = params;
}

// After
export default async function Layout({ params }) {
  const { locale } = await params;
}
```

### Issue 4: getMessages() and getTranslations() Failures
**Problem**: Both `getMessages()` and `getTranslations()` functions fail to retrieve translations.

**Error Behavior**:
- `getMessages()` in layout causes notFound() to be triggered
- `getTranslations()` in page component causes 404 error

### Issue 5: Client vs Server Component Conflicts
**Problem**: The crypto page uses client-side features (hooks, state) but next-intl server functions require server components.

**Attempted Solutions**:
1. Created wrapper server component (CryptoClient.tsx)
2. Passed translations as props
3. Converted to full client component with useTranslations hook

## Current State

### What's Working
- Middleware correctly redirects to locale URLs
- Translation JSON files are properly structured
- Test page partially renders content (though still shows 404 status)

### What's Not Working
- Crypto page returns 404 with any i18n implementation
- getTranslations() and getMessages() fail to retrieve data
- NextIntlClientProvider doesn't properly provide translations to child components

## File Structure After Implementation

```
apps/web/
├── messages/
│   ├── en.json
│   └── vi.json
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx
│   │   │   ├── crypto/
│   │   │   │   └── page.tsx
│   │   │   └── test/
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   ├── i18n.ts
│   └── middleware.ts
└── next.config.ts
```

## Technical Details

### Middleware Configuration
```typescript
// localePrefix changed from 'as-needed' to 'always'
export default createMiddleware({
  locales,
  defaultLocale: 'vi',
  localePrefix: 'always'
});
```

### Multiple Layout Approaches Tried

#### Approach 1: Using getMessages()
```typescript
const messages = await getMessages();
```
Result: Throws error, triggers notFound()

#### Approach 2: Direct Import
```typescript
if (locale === 'en') {
  messages = (await import('../../../messages/en.json')).default;
} else if (locale === 'vi') {
  messages = (await import('../../../messages/vi.json')).default;
}
```
Result: Messages load but page still returns 404

#### Approach 3: Static Import
```typescript
import enMessages from '../../../messages/en.json';
import viMessages from '../../../messages/vi.json';
const messages = { en: enMessages, vi: viMessages };
```
Result: Same 404 error persists

## Root Cause Analysis

The issue appears to be a fundamental incompatibility between:
1. next-intl's expectation of server components for translation loading
2. The crypto page's requirement to be a client component for interactivity
3. Next.js 15.5.0's handling of dynamic routes with locale parameters

The error occurs at the routing level before the component even renders, suggesting the issue is with how next-intl integrates with Next.js's App Router in version 15.5.0.

## Recommendations

1. **Downgrade Next.js**: Consider using Next.js 14.x which has better documented compatibility with next-intl
2. **Alternative i18n Solution**: Consider using react-i18next or lingui which have better client-side support
3. **Custom Implementation**: Build a custom i18n solution using React Context API
4. **Static Generation**: Pre-generate pages for each locale using generateStaticParams

## Conclusion

The implementation of i18n using next-intl with Next.js 15.5.0 has encountered blocking issues that prevent the crypto page from loading. The 404 error persists despite multiple approaches and workarounds. The issue appears to be at the framework integration level rather than a simple configuration problem.

## Next Steps

1. Research known issues between next-intl and Next.js 15.5.0
2. Consider alternative i18n libraries
3. Test with a downgraded Next.js version
4. Implement a custom translation solution if framework solutions continue to fail