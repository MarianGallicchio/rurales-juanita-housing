import { queryLocal } from '@/lib/db-local';
import { fmtUSD, fmtFechaAR } from '@/lib/formato-ar';
import { FotoModelo } from '@/components/foto-modelo';
import { HeroCampo } from '@/components/hero-3d';
import { EMPRESA, waLink, WA_COTIZACION, WA_ALQUILER, PRODUCTOS_CONTACTO } from '@/lib/empresa';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function lead(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const nombre = String(fd.get('nombre') ?? '').trim();
  if (!nombre) return;
  const prod = String(fd.get('producto') ?? '');
  const msg = `${prod ? `[${prod}] ` : ''}${String(fd.get('mensaje') ?? '')}`;
  await queryLocal(`insert into public.lead_web (nombre, empresa, email, telefono, mensaje, origen_url) values ($1,$2,$3,$4,$5,'/web')`,
    [nombre, String(fd.get('empresa') ?? ''), String(fd.get('email') ?? ''), String(fd.get('telefono') ?? ''), msg]);
  redirect('/web?ok=1#contacto');
}

const MARQUESINA = ['ISO 9001 · Bureau Veritas', 'Homologados por Pluspetrol, Servicios Dipp y Procesos Patagónicos', 'Soluciones llave en mano', 'Desde 2010'];
const CLIENTES = [
  ['Pluspetrol', 'Homologación directa · Petróleo & gas'],
  ['YPF', 'Normativas homologadas'],
  ['Servicios Dipp', 'Homologación directa'],
  ['Procesos Patagónicos', 'Homologación directa · Oil & Gas'],
  ['Isamar S.R.L.', 'Servicios petroleros'],
  ['Bureau Veritas', 'Certificación ISO 9001'],
];
const SECTORES = ['Petróleo', 'Minería', 'Agro', 'Energía', 'Obra'];

export default async function Web({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const cats = await queryLocal<{ nombre: string; slug: string; descripcion: string }>(`select nombre, slug, descripcion from public.categoria order by orden`);
  const mods = await queryLocal<{ codigo: string; nombre: string; precio_base_usd: number; largo_mm: number; ancho_mm: number; foto: string | null; cat: string }>(
    `select m.codigo, m.nombre, m.precio_base_usd, m.largo_mm, m.ancho_mm, c.nombre as cat,
      (select url from public.modelo_foto f where f.modelo_id=m.id and f.es_portada limit 1) as foto
     from public.modelo m join public.categoria c on c.id=m.categoria_id where m.activo order by m.codigo`);
  const tc = (await queryLocal<{ v: number; f: string }>(`select valor_ars_por_usd as v, fecha as f from public.tipo_cambio order by fecha desc limit 1`))[0];
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Rurales Juanita',
    description: 'Fabricación de módulos habitacionales transportables para petróleo, minería, obra y agro.',
    telephone: '+54 2317 472390', email: EMPRESA.email, foundingDate: '2010',
    address: { '@type': 'PostalAddress', streetAddress: 'Ruta 65 km 177,9', addressLocality: '9 de Julio', addressRegion: 'Buenos Aires', addressCountry: 'AR' },
  };
  return (
    <div className="min-h-screen bg-[#f1efdf] text-[#212529]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Topbar */}
      <div className="bg-[#053d30] font-mono2 text-[11px] tracking-[.06em] text-white/80">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-[7px]">
          <span>Planta industrial · {EMPRESA.direccion}</span>
          <span className="flex gap-4"><span><a href="tel:+542317472390" className="text-[#e8fe85]">2317-472390</a> · <a href={`mailto:${EMPRESA.email}`} className="text-[#e8fe85]">{EMPRESA.email}</a></span><span className="hidden md:inline">ISO 9001 · {EMPRESA.horario}</span></span>
        </div>
      </div>

      {/* Marquesina lima */}
      <div className="rj-marquee bg-[#e8fe85] py-[9px]">
        <div className="rj-marquee-track text-[13px] font-medium text-[#212529]">
          {[...MARQUESINA, ...MARQUESINA].map((t, i) => <span key={i} className="mx-[18px]">{t} ✓</span>)}
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#07503f] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/web" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e8fe85] font-black text-[#053d30]">RJ</span>
            <span className="leading-none"><span className="font-display text-xl font-semibold">Rurales Juanita</span><br /><span className="font-mono2 text-[10px] uppercase tracking-[.18em] opacity-75">Modulares & transportables</span></span>
          </Link>
          <nav className="hidden gap-1 text-sm lg:flex">
            {[['Productos', '#productos'], ['Fichas', '/fichas'], ['Casos', '#casos'], ['Empresa', '#empresa'], ['Contacto', '#contacto']].map(([t, h]) => (
              <a key={h} href={h} className="rounded-full px-3 py-2 text-white hover:bg-white/10">{t}</a>
            ))}
          </nav>
          <div className="flex gap-2">
            <Link href="/web/ficha/BOX-15-A" className="rj-btn hidden border border-[#e8fe85]/60 text-[#e8fe85] md:inline-block">Ficha técnica</Link>
            <a href="#contacto" className="rj-btn bg-white text-[#212529]">Contactanos</a>
          </div>
        </div>
      </header>

      {/* Hero 3D campo */}
      <section className="mx-auto max-w-6xl px-4 pt-4">
        <div className="relative">
          <HeroCampo variant="sunset" />
          <div className="absolute inset-x-4 bottom-4 rounded-[20px] p-5 text-center text-white md:inset-x-16">
            <div className="vector-dots-ondark pointer-events-none absolute inset-0 rounded-[20px] opacity-40" />
            <p className="rj-eyebrow rj-eyebrow-ondark relative">Planta industrial · 9 de Julio, Buenos Aires</p>
            <h1 className="hero-legible relative mx-auto mt-3 max-w-3xl font-display text-4xl font-light leading-tight md:text-6xl">Soluciones habitacionales modulares, donde la infraestructura fija no llega.</h1>
            <p className="hero-pill hero-legible relative mx-auto mt-2 max-w-2xl rounded-xl p-2 text-sm text-white">Unidades rodantes y módulos transportables para petróleo, minería, obra y agro. Diseño propio, fabricación integral y montaje llave en mano.</p>
            <div className="relative mt-4 flex flex-wrap justify-center gap-3">
              <a href="#productos" className="rj-btn bg-white text-[#212529]">Conocé los productos</a>
              <a href="/fichas" className="rj-btn collage-sticker bg-[#e8fe85] text-[#053d30]">Fichas técnicas ✂</a>
              <a href="#contacto" className="rj-btn border border-[#e8fe85] bg-[#053d30]/70 text-[#e8fe85]">Pedir cotización</a>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2 font-mono2 text-[10px] uppercase tracking-[.14em]">
              {['ISO 9001 · Bureau Veritas', 'Homologados YPF', 'Llave en mano'].map((b) => (
                <span key={b} className="rounded-full border border-dashed border-white/50 bg-white/10 px-4 py-2 backdrop-blur">✓ {b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Clientes */}
      <section className="mx-auto max-w-6xl px-4 py-12 text-center">
        <p className="rj-eyebrow">Homologaciones y certificaciones</p>
        <h2 className="mt-3 font-display text-4xl font-medium">Confían en <em className="not-italic text-[#07503f]">nosotros</em></h2>
        <p className="mx-auto mt-1 max-w-2xl text-[#3f3f46]">Unidades auditadas y homologadas por operadoras y certificadoras líderes del país.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {CLIENTES.map(([n, d]) => (
            <div key={n} className="rj-card"><p className="font-bold uppercase tracking-wide">{n}</p><p className="font-mono2 text-[10px] uppercase tracking-[.14em] text-[#6d6d6d]">{d}</p></div>
          ))}
        </div>
      </section>

      {/* Líneas de producto (de la base) */}
      <section id="productos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8">
        <p className="rj-eyebrow">Líneas de producto</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-medium leading-tight">Infraestructura móvil para cada demanda específica.</h2>
        <p className="mt-1 max-w-2xl text-[#3f3f46]">Cada línea se fabrica a medida según clima, transporte, térmica y seguridad.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {cats.map((c, ci) => (
            <div key={c.slug} className={`rj-card rj-tilt ${['', 'rj-pastel-0', 'rj-pastel-1', 'rj-pastel-2'][ci % 4]}`}>
              <p className="font-mono2 text-[10px] uppercase tracking-[.14em] text-[#07503f]">{c.slug.replace(/-/g, ' ')}</p>
              <h3 className="font-display text-2xl font-medium">{c.nombre}</h3>
              <p className="text-sm text-[#3f3f46]">{c.descripcion}</p>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {mods.filter((m) => m.cat === c.nombre).map((m) => (
                  <div key={m.codigo} className="flex items-center gap-3 rounded-2xl bg-[#f1efdf] p-2">
                    <FotoModelo url={m.foto} codigo={m.codigo} className="h-16 w-24 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{m.codigo} — {m.nombre}</p>
                      <p className="text-xs opacity-70">Base {fmtUSD(Number(m.precio_base_usd))}{tc ? ` · TC $${tc.v}` : ''}</p>
                    </div>
                    <Link href={`/web/ficha/${m.codigo}`} className="shrink-0 rounded-full bg-white px-3 py-1 font-mono2 text-[10px] uppercase tracking-widest text-[#07503f]">Ficha ↓</Link>
                  </div>
                ))}
              </div>
              <Link href={`/web/${c.slug}`} className="mt-2 inline-block rounded-full bg-[#07503f] px-4 py-2 font-mono2 text-[11px] uppercase tracking-widest text-white">Ver línea completa →</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Sectores */}
      <div className="rj-marquee border-y border-[#07503f]/10 bg-white py-3">
        <div className="rj-marquee-track font-display text-3xl">
          {[...SECTORES, ...SECTORES, ...SECTORES].map((s, i) => <span key={i} className={`mx-5 ${i % 2 ? 'text-[#07503f]' : ''}`}>{s}</span>)}
        </div>
      </div>

      {/* Casos */}
      <section id="casos" className="mx-auto max-w-6xl scroll-mt-20 bg-white px-4 py-12">
        <p className="rj-eyebrow">Proyectos ejecutados</p>
        <h2 className="mt-3 font-display text-4xl font-medium">Soluciones probadas en <em className="text-[#07503f]">entornos exigentes.</em></h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {([
            ['Petróleo · Patagonia', 'Campamentos y obradores', 'Oficinas, dormitorios, comedor y Company Man. Homologados Pluspetrol / Dipp.', ['LLAVE EN MANO', 'CLIMA EXTREMO']],
            ['Energía · Telecom', 'Contenedores y shelters técnicos', 'Laboratorios, usinas, radar y telecom. Alta rigidez para traslado continuo.', ['A MEDIDA', 'ISO 9001']],
            ['Agro · Ruta', 'Box hotel + casillas rurales', '15 m² con habitación, baño y cocina equipada. Viviendas listas para habitar.', ['15 M²', 'ENTREGA RÁPIDA']],
          ] as [string, string, string, string[]][]).map(([tag, t, d, chips], i) => (
            <div key={i} className="rj-card"><p className="font-mono2 text-[10px] uppercase tracking-[.14em] text-[#07503f]">{tag}</p><h3 className="font-display text-2xl">{t}</h3><p className="text-sm text-[#3f3f46]">{d}</p><p className="mt-2 flex gap-2">{chips.map((c) => <span key={c} className="rounded-full bg-[#f1efdf] px-2 py-1 font-mono2 text-[10px]">{c}</span>)}</p></div>
          ))}
        </div>
        <div className="rj-card mt-4 flex flex-wrap items-center justify-between gap-3 bg-[#07503f] text-white">
          <p><b>¿Obra temporal?</b> Alquiler de módulos habitacionales y técnicos — consultá disponibilidad y plazos.</p>
          <a href={waLink(WA_ALQUILER)} target="_blank" className="rj-btn bg-white text-[#212529]">Consultar alquiler</a>
        </div>
      </section>

      {/* Por qué + métricas */}
      <section className="bg-[#07503f] py-14 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <p className="rj-eyebrow rj-eyebrow-ondark">¿Por qué elegirnos?</p>
          <h2 className="mt-3 font-display text-4xl font-light">Respaldo industrial, flexibilidad total.</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {[['Certificación ISO 9001', 'Auditada por Bureau Veritas, con homologaciones directas ante Pluspetrol, Servicios Dipp y Procesos Patagónicos.'], ['Estructuras de alta rigidez', 'Resisten tracciones y traslados sin deformaciones, incluso en clima extremo.'], ['Estándar multitarea', 'Un mismo producto se adapta a lo que cada proyecto necesite.'], ['Montaje llave en mano', 'Izaje propio: mínimas horas en terreno y puesta en servicio acelerada.']].map(([t, d]) => (
              <div key={t}><h3 className="font-bold">{t}</h3><p className="text-sm text-white/75">{d}</p></div>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            {[['15+', 'Años fabricando'], ['7', 'Líneas de producto'], ['6', 'Homologaciones / clientes'], ['100%', 'Fabricación propia']].map(([n, l]) => (
              <div key={l}><p className="font-display text-5xl">{n}</p><p className="font-mono2 text-[11px] uppercase tracking-[.14em] opacity-70">{l}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Box destacado */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:items-center">
        <div>
          <p className="rj-eyebrow">Módulos habitacionales transportables</p>
          <h2 className="mt-3 font-display text-4xl font-medium">Comodidad y confort en un solo ambiente transportable.</h2>
          <p className="mt-2 text-[#3f3f46]">Unidades de 15 m² para estaciones de servicio y puntos estratégicos. Habitación con cama de 2 plazas o dos de 1 plaza, baño completo con ducha, inodoro, bidet y vanitorio, y cocina equipada.</p>
          <ul className="mt-3 space-y-2 text-sm font-medium">
            {['Aire acondicionado y barrera de vapor anticondensación', 'Interiores modernos, cálidos y luminosos', 'Instalación eléctrica completa y amplia ventilación', 'Instalación rápida sobre escenarios propios'].map((li) => <li key={li} className="flex gap-2"><span className="font-bold text-[#07503f]">✓</span>{li}</li>)}
          </ul>
        </div>
        <FotoModelo url={(mods.find((m) => m.codigo === 'BOX-15-A')?.foto) ?? null} codigo="BOX-15-A" className="h-80 w-full rounded-[30px] object-cover" />
      </section>

      {/* Datos técnicos */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="rj-carbon rounded-[20px] p-6">
        <p className="rj-eyebrow">Datos técnicos</p>
        <h2 className="mt-3 font-display text-4xl font-medium">Ingeniería declarada, <em className="not-italic text-[#e8fe85]">no promesas.</em></h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[['Chasis RJ-SR-300', 'Doble T de 300 mm', 'Vigas de 7 mm de alma, eje tubular para 12 toneladas con ABS y perno normalizado.'], ['Módulo RJ-MH-01', 'Aislamiento total', 'Poliuretano expandido en paredes y techo más film térmico, con barrera anticondensación.'], ['Instalaciones', '220 V + agua', 'Caja disyuntora y térmica con LED por sector; agua por termofusión de ½″ tipo Aqua-System.']].map(([tag, t, d]) => (
            <div key={t} className="rounded-2xl border border-dashed border-[#3a3a3a] p-4"><p className="font-mono2 text-[10px] uppercase tracking-[.14em] text-[#a8bde0]">{tag}</p><h3 className="font-display text-2xl text-white">{t}</h3><p className="text-sm text-white">{d}</p></div>
          ))}
        </div>
        </div>
      </section>

      {/* 3 pasos */}
      <section className="mx-auto max-w-6xl px-4 py-12 text-center">
        <p className="rj-eyebrow">Cómo trabajamos</p>
        <h2 className="mt-3 font-display text-4xl font-medium">Tu módulo, en tres pasos.</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[['01', 'Definimos tu necesidad', 'Clima, transporte, capacidad y equipamiento. Cálculo e ingeniería propia.'], ['02', 'Fabricamos en planta', 'Producción integrada con auditoría en cada estación y plazos óptimos.'], ['03', 'Entregamos llave en mano', 'Izaje ágil en terreno, unidad lista para operar.']].map(([n, t, d]) => (
            <div key={n}><p className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-dashed border-[#07503f] bg-white font-mono2 text-[#07503f]">{n}</p><h3 className="mt-2 font-bold">{t}</h3><p className="text-sm text-[#6d6d6d]">{d}</p></div>
          ))}
        </div>
      </section>

      {/* Alianza + empresa */}
      <section id="empresa" className="scroll-mt-20 bg-[#07503f] py-12 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="rj-eyebrow rj-eyebrow-ondark">Rurales Juanita × Isamar S.R.L.</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-light">Juntas para ofrecerte <em className="text-[#e8fe85]">infraestructura en origen.</em></h2>
          <p className="mx-auto mt-2 max-w-2xl text-white/80">Fabricación en origen en plena cuenca neuquina (Isamar, Neuquén) + planta 9 de Julio desde 2010. Dos marcas, MERCOSUR: Argentina · Paraguay · Brasil.</p>
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-4 text-left md:grid-cols-4">
            {[['2010', 'La planta', 'Nace en 9 de Julio dedicada a módulos transportables.'], ['Fábrica', 'Producción integrada', 'Todo bajo el mismo techo, auditado por estación.'], ['ISO 9001', 'Certificación', 'Bureau Veritas + Pluspetrol, Dipp, Procesos Patagónicos e Isamar.'], ['MERCOSUR', 'Dos marcas', 'Rurales Juanita y H.M Housing Module.']].map(([y, t, d]) => (
              <div key={t}><p className="font-mono2 text-xs tracking-[.16em] text-[#e8fe85]">{y}</p><h3 className="font-display text-xl">{t}</h3><p className="text-sm text-white/75">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
        <div className="rounded-[30px] bg-[#07503f] p-6 text-center text-white md:p-12">
          <p className="rj-eyebrow rj-eyebrow-ondark">Cotización en 24 h</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-4xl font-light">Contanos tu proyecto y te respondemos con la <em className="text-[#e8fe85]">solución óptima.</em></h2>
          <p className="mx-auto mt-2 text-white/85">Lo recibimos en <b>{EMPRESA.email}</b> y entra directo a nuestro CRM. O escribinos al <b>{EMPRESA.whatsapp}</b>.</p>
          <form action={lead} className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-3 text-left md:grid-cols-2">
            {sp.ok && <p className="rounded-2xl bg-[#e8fe85] p-3 text-sm font-bold text-[#053d30] md:col-span-2">✓ Recibido. Te contactamos en 24 h.</p>}
            <input name="nombre" placeholder="Nombre y apellido *" className="rj-input" required />
            <input name="empresa" placeholder="Empresa" className="rj-input" />
            <input name="email" placeholder="Email *" type="email" className="rj-input" required />
            <input name="telefono" placeholder="Teléfono / WhatsApp" className="rj-input" />
            <select name="producto" className="rj-input md:col-span-2" defaultValue="">
              <option value="">¿Qué necesitás? *</option>
              {PRODUCTOS_CONTACTO.map((p) => <option key={p}>{p}</option>)}
            </select>
            <textarea name="mensaje" placeholder="Contanos: cantidad, ubicación, plazo... *" rows={4} className="rj-input md:col-span-2" required />
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button className="rj-btn bg-white text-[#212529]">Enviar al mail</button>
              <a href={waLink(WA_COTIZACION)} target="_blank" className="rj-btn border border-[#e8fe85] text-[#e8fe85]">WhatsApp directo</a>
            </div>
          </form>
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-3 text-left text-sm md:grid-cols-4">
            <p><b>Tel / WhatsApp</b><br />{EMPRESA.tel}</p>
            <p><b>Administración</b><br />{EMPRESA.whatsapp}</p>
            <p><b>Mail</b><br />{EMPRESA.email}</p>
            <p><b>Planta</b><br />{EMPRESA.direccion}</p>
          </div>
          <div className="mx-auto mt-4 max-w-3xl overflow-hidden rounded-[20px]">
            <iframe title="Mapa: planta Ruta 65 km 177,9, 9 de Julio" src="https://www.google.com/maps?q=Ruta+65+km+177.9,+9+de+Julio,+Buenos+Aires&output=embed" loading="lazy" className="h-64 w-full border-0" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#053d30] pb-8 pt-12 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-4">
          <div>
            <p className="font-display text-xl font-semibold">Rurales Juanita</p>
            <p className="mt-1 text-sm text-white/70">Soluciones integrales llave en mano de infraestructura modular móvil para petróleo, minería, obra y agro.</p>
          </div>
          <div><p className="font-mono2 text-[11px] uppercase tracking-[.16em] text-white/60">Productos</p>{cats.slice(0, 6).map((c) => <p key={c.slug} className="text-sm leading-8 text-white/85">{c.nombre}</p>)}</div>
          <div><p className="font-mono2 text-[11px] uppercase tracking-[.16em] text-white/60">Empresa</p><p className="text-sm leading-8 text-white/85">Sobre nosotros<br />Alianza Isamar<br />Ficha técnica<br /><Link href="/" className="underline">Acceso interno →</Link></p></div>
          <div><p className="font-mono2 text-[11px] uppercase tracking-[.16em] text-white/60">Contacto</p><p className="text-sm leading-7 text-white/85">{EMPRESA.tel}<br />{EMPRESA.email}<br />{EMPRESA.direccion}</p></div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl border-t border-white/10 px-4 pt-4 text-xs text-white/55">© 2025 Rurales Juanita & H.M Housing Module — 9 de Julio, Buenos Aires. ISO 9001 · Bureau Veritas · Hecho en Argentina · En alianza con Isamar S.R.L.</p>
      </footer>
    </div>
  );
}
