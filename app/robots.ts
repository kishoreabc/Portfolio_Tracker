import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://portfolio-tracker-kishoreabcs-projects.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/developers',
          '/docs',
          '/about',
          '/contact',
          '/privacy',
          '/openapi.json',
          '/openapi.yaml',
          '/llms.txt',
          '/llms-full.txt',
          '/.well-known/mcp',
          '/api/market-data',
          '/api/v1/',
        ],
        disallow: [
          '/api/auth/',
          '/_next/',
          '/portfolio',
          '/stocks',
          '/bonds',
          '/cashflow',
          '/calendar',
          '/analytics',
          '/reports',
          '/insights',
          '/news',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
