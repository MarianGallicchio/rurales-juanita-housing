import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  return { rules: [{ userAgent: '*', allow: '/web', disallow: '/' }], sitemap: `${base}/sitemap.xml` };
}
