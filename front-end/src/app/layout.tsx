import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { StoresPersistence } from './StoresPersistence';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    // template: "%s | Tax Calculator" means child pages set their own title
    // segment and the suffix is appended automatically. The `default` value
    // is used when a page exports no metadata of its own.
    default: 'Tax Calculator — Canadian Federal Income Tax',
    template: '%s | Tax Calculator',
  },
  description:
    'Free Canadian federal income tax calculator. Calculate your taxes by bracket, see effective rates, and plan your finances for tax years 2019-2022.',
  keywords: [
    'tax calculator',
    'Canadian income tax',
    'federal tax brackets',
    'effective tax rate',
    'tax year 2022',
  ],
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    title: 'Tax Calculator — Canadian Federal Income Tax',
    description:
      'Free Canadian federal income tax calculator. Calculate your taxes by bracket and see effective rates.',
    siteName: 'Tax Calculator',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tax Calculator — Canadian Federal Income Tax',
    description:
      'Free Canadian federal income tax calculator with per-bracket breakdown.',
  },
  other: {
    'theme-color': '#1A1226',
  },
};

// JSON-LD structured data lets search engines understand this is a
// WebApplication (Finance category), improving rich-result eligibility.
// Emitted as a <script type="application/ld+json"> element in <head> —
// this is the pattern Next.js officially recommends for App Router
// structured data (https://nextjs.org/docs/app/guides/json-ld).
//
// `dangerouslySetInnerHTML` is unavoidable here because React escapes text
// children of <script> tags. The content is a static object defined at
// module scope with no user input, so there is no XSS vector — the
// "dangerous" name is misleading in this specific usage.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Tax Calculator',
  description:
    'Free Canadian federal income tax calculator with per-bracket breakdown and effective rate display.',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'CAD',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-CA"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          // Static structured data with no user input — safe to inline.
          // This is the Next.js App Router-recommended JSON-LD pattern:
          // https://nextjs.org/docs/app/guides/json-ld
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg-page text-text-primary">
        {/* StoresPersistence wraps the entire tree so its useEffect (which
            wires sessionStorage hydration) runs once at the client root before
            any child component reads from the Effector store. Placing it here
            in the server layout avoids the need for a separate providers file. */}
        <StoresPersistence>{children}</StoresPersistence>
      </body>
    </html>
  );
}
