import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function Migas({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Migas de pan" className="mb-2 flex flex-wrap items-center gap-1 text-[13px]">
      <Link href="/" className="font-bold text-[#07503f] hover:underline">Inicio</Link>
      {trail.map((t, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          {t.href && i < trail.length - 1 ? (
            <Link href={t.href} className="font-bold text-[#07503f] hover:underline">{t.label}</Link>
          ) : (
            <span aria-current="page" className="text-[#212529] dark:text-neutral-200">{t.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
