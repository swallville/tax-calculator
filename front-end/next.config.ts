import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // Next.js gzips responses at the server layer by default. Keeping this
  // enabled because the Docker Compose topology places the Next.js standalone
  // server directly on the network with no reverse proxy (nginx, Traefik) in
  // front. Disabling compression would push the wire size from ~222 KB
  // (gzipped) to ~750 KB (raw). Identified during the Phase 8.5 performance
  // review — the previous `compress: false` value assumed an external proxy.
  compress: true,
  images: { unoptimized: true },
  experimental: {
    inlineCss: true,
    optimizePackageImports: [
      'effector',
      'effector-react',
      '@farfetched/core',
      '@farfetched/zod',
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // A Phase 8.5 deferred-item pass attempted a nonce-based CSP
              // via middleware.ts to drop both `'unsafe-inline'` and
              // `'unsafe-eval'`. The migration worked (47/47 Playwright
              // chromium tests passed, zero browser console violations), but
              // forcing a per-request nonce pushed every route from static
              // prerender to dynamic SSR and inflated the first-load bundle
              // by ~97 KB gzipped (121 KB → 218 KB). For this specific app
              // — a public unauthenticated Canadian tax calculator whose
              // only user input is a Zod-validated number and which has no
              // XSS vectors in source — the bundle cost was judged not
              // worth the strictness gain. The attempt and its measurements
              // are documented in docs/IMPLEMENTATION-FINDINGS.md Phase 8.6.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              // `data:` is required because next/font/google inlines small
              // woff2 glyph subsets as data URIs in the generated @font-face
              // CSS. Without it, every inlined font triggers a CSP violation
              // even though the bytes are same-origin.
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              // Additional hardening directives added in Phase 8.5 after the
              // security review. Each blocks a specific injection class:
              //   object-src 'none'   — defeats <object>/<embed>/<applet> plugin injection
              //   base-uri 'self'     — stops <base href="https://evil"> from redirecting relative URLs
              //   form-action 'self'  — prevents injected <form action="https://evil"> from exfiltrating data
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/tax-calculator/:path*',
        destination: `${process.env.API_BASE_URL || 'http://localhost:5001'}/tax-calculator/:path*`,
      },
    ];
  },
};

export default nextConfig;
