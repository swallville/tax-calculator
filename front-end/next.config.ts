import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: false,
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
