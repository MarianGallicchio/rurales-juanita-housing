import type { MetadataRoute } from 'next';
import { queryLocal } from '@/lib/db-local';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  const urls: MetadataRoute.Sitemap = [{ url: `${base}/web`, lastModified: new Date() }];
  try {
    const mods = await queryLocal<{ codigo: string }>(`select codigo from public.modelo where activo`);
    for (const m of mods) urls.push({ url: `${base}/web/ficha/${m.codigo}`, lastModified: new Date() });
  } catch { /* sin base: solo portada */ }
  return urls;
}
