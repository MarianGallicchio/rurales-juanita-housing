import { AppLayout } from '@/components/app-layout';
import { FotoModelo } from '@/components/foto-modelo';
import { PageHero, Paso } from '@/components/ui-brand';
import { queryLocal } from '@/lib/db-local';
import { fmtUSD } from '@/lib/formato-ar';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function crearModelo(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const codigo = String(fd.get('codigo') ?? '').trim().toUpperCase();
  const nombre = String(fd.get('nombre') ?? '').trim();
  const categoria_id = String(fd.get('categoria_id') ?? '');
  const precio = Number(fd.get('precio') ?? 0);
  const largo = Number(fd.get('largo') ?? 0), ancho = Number(fd.get('ancho') ?? 0), alto = Number(fd.get('alto') ?? 0);
  if (!codigo || !nombre || !categoria_id || precio < 0) return;
  if (largo <= 0 || ancho <= 0 || alto <= 0) return; // medidas obligatorias >0
  const sup = Math.round((largo * ancho) / 10000) / 100;
  const m = (await queryLocal<{ id: string }>(
    `insert into public.modelo (categoria_id, codigo, nombre, precio_base_usd, largo_mm, ancho_mm, alto_mm, superficie_m2)
     values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (codigo) do nothing returning id`,
    [categoria_id, codigo, nombre, precio, largo, ancho, alto, sup]
  ))[0];
  if (m) await queryLocal(`insert into public.precio_historial (entidad, entidad_id, precio_usd) values ('modelo',$1,$2)`, [m.id, precio]);
  redirect('/catalogo');
}

async function subirFoto(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { guardarArchivo } = await import('@/lib/archivos');
  const { redirect } = await import('next/navigation');
  const modelo_id = String(fd.get('modelo_id') ?? '');
  const file = fd.get('foto') as File | null;
  if (!modelo_id || !file || file.size === 0) return;
  const mod = (await queryLocal<{ codigo: string }>(`select codigo from public.modelo where id=$1`, [modelo_id]))[0];
  if (!mod) return;
  let url: string;
  try { url = await guardarArchivo(file, 'fotos', mod.codigo); }
  catch { return; } // tipo o peso inválido: se ignora
  const esPortada = String(fd.get('portada') ?? '') === '1';
  if (esPortada) await queryLocal(`update public.modelo_foto set es_portada=false where modelo_id=$1`, [modelo_id]);
  const ya = (await queryLocal<{ n: number }>(`select count(*)::int n from public.modelo_foto where modelo_id=$1`, [modelo_id]))[0].n;
  await queryLocal(`insert into public.modelo_foto (modelo_id, url, leyenda, orden, es_portada) values ($1,$2,$3,$4,$5)`,
    [modelo_id, url, String(fd.get('leyenda') ?? '') || 'Foto planta', ya, esPortada || ya === 0]);
  redirect('/catalogo');
}

async function subirManual(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { guardarArchivo } = await import('@/lib/archivos');
  const { redirect } = await import('next/navigation');
  const modelo_id = String(fd.get('modelo_id') ?? '');
  const file = fd.get('manual') as File | null;
  if (!modelo_id || !file || file.size === 0) return;
  const mod = (await queryLocal<{ codigo: string }>(`select codigo from public.modelo where id=$1`, [modelo_id]))[0];
  if (!mod) return;
  try {
    const url = await guardarArchivo(file, 'manuales', `${mod.codigo}-manual`);
    await queryLocal(`update public.modelo set manual_url=$2 where id=$1`, [modelo_id, url]);
  } catch { return; }
  redirect('/catalogo');
}

async function crearOpcion(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const nombre = String(fd.get('nombre') ?? '').trim();
  if (!nombre) return;
  await queryLocal(`insert into public.opcion (grupo, nombre, descripcion, tipo_precio, precio_usd) values ($1,$2,$3,$4,$5)`,
    [String(fd.get('grupo') ?? 'general'), nombre, String(fd.get('desc') ?? '') || null, String(fd.get('tipo') ?? 'fijo'), Number(fd.get('precio') ?? 0) || 0]);
  redirect('/catalogo');
}

async function vincularOpcion(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const modelo_id = String(fd.get('modelo_id') ?? '');
  const opcion_id = String(fd.get('opcion_id') ?? '');
  if (!modelo_id || !opcion_id) return;
  await queryLocal(`insert into public.modelo_opcion (modelo_id, opcion_id, obligatoria, incluida_por_defecto) values ($1,$2,$3,$4) on conflict do nothing`,
    [modelo_id, opcion_id, String(fd.get('obl') ?? '') === '1', String(fd.get('def') ?? '') === '1']);
  redirect('/catalogo');
}

async function agregarFicha(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const modelo_id = String(fd.get('modelo_id') ?? '');
  const item = String(fd.get('item') ?? '').trim();
  if (!modelo_id || !item) return;
  const n = (await queryLocal<{ n: number }>(`select count(*)::int n from public.ficha_tecnica_item where modelo_id=$1`, [modelo_id]))[0].n;
  await queryLocal(`insert into public.ficha_tecnica_item (modelo_id, grupo, item, especificacion, orden) values ($1,$2,$3,$4,$5)`,
    [modelo_id, String(fd.get('grupo') ?? 'General'), item, String(fd.get('esp') ?? ''), n]);
  redirect('/catalogo');
}

async function toggleActivo(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const id = String(fd.get('id'));
  // Con cotizaciones asociadas no se borra: solo desactivar
  const n = (await queryLocal<{ n: number }>(`select count(*)::int n from public.cotizacion_item where modelo_id=$1`, [id]))[0].n;
  if (n > 0) await queryLocal(`update public.modelo set activo=false where id=$1`, [id]);
  else await queryLocal(`update public.modelo set activo = not activo where id=$1`, [id]);
  redirect('/catalogo');
}

export default async function Catalogo() {
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador', 'Ventas', 'Produccion', 'Compras']);
  const cats = await queryLocal<{ id: string; nombre: string }>(`select id, nombre from public.categoria order by orden`);
  const mods = await queryLocal<{
    id: string; codigo: string; nombre: string; cat: string; precio_base_usd: number; activo: boolean;
    largo_mm: number; ancho_mm: number; alto_mm: number; superficie_m2: number;
    fotos: number; portada: number; items: number; cotiz: number; portada_url: string | null;
  }>(
    `select m.id, m.codigo, m.nombre, c.nombre as cat, m.precio_base_usd, m.activo,
      m.largo_mm, m.ancho_mm, m.alto_mm, m.superficie_m2,
      (select count(*)::int from public.modelo_foto f where f.modelo_id=m.id) as fotos,
      (select count(*)::int from public.modelo_foto f where f.modelo_id=m.id and f.es_portada) as portada,
      (select url from public.modelo_foto f where f.modelo_id=m.id and f.es_portada limit 1) as portada_url,
      (select count(*)::int from public.ficha_tecnica_item t where t.modelo_id=m.id) as items,
      (select count(*)::int from public.cotizacion_item i where i.modelo_id=m.id) as cotiz
     from public.modelo m join public.categoria c on c.id=m.categoria_id order by m.codigo`
  );
  const nOpc = await queryLocal<{ n: number }>(`select count(*)::int as n from public.opcion where activo=true`).then((r) => r[0]?.n ?? 0);
  const opcs = await queryLocal<{ id: string; nombre: string; grupo: string }>(`select id, nombre, grupo from public.opcion where activo=true order by grupo, nombre`);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
        <PageHero kicker="Fase 1 · Fuente única de verdad" titulo={`Catálogo — ${mods.length} modelos`}
          bajada={`${nOpc} opciones con precio. Lo que figura acá alimenta cotizador, web y fichas PDF.`} vivo />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {mods.map((m) => {
            const completa = Number(m.fotos) >= 1 && Number(m.portada) === 1 && Number(m.items) >= 3 && Number(m.largo_mm) > 0;
            return (
              <div key={m.codigo} className={`rounded-xl border bg-white p-3 ${completa ? '' : 'border-amber-400'}`}>
                <FotoModelo url={m.portada_url} codigo={m.codigo} />
                <p className="mt-2 font-bold">{m.codigo} — {m.nombre} {m.activo ? '' : '· INACTIVO'}</p>
                <p className="text-sm text-[#3f3f46]">{m.cat} · {fmtUSD(Number(m.precio_base_usd))} · {m.largo_mm}x{m.ancho_mm}x{m.alto_mm}mm ({m.superficie_m2 ?? '—'} m²)</p>
                <p className="text-xs">{completa ? '✓ ficha completa' : `⚠ ficha incompleta: fotos ${m.fotos}, portada ${m.portada}, ítems ${m.items}`} · {m.cotiz} cotizaciones</p>
                <form action={toggleActivo} className="mt-1">
                  <input type="hidden" name="id" value={m.id} />
                  <button className="rounded bg-slate-200 px-3 py-1 text-xs font-bold">
                    {m.activo ? (Number(m.cotiz) > 0 ? 'Desactivar (tiene cotizaciones)' : 'Desactivar') : 'Reactivar'}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
        <Paso n={1} titulo="Subir foto real (JPG/PNG/WebP, máx 3MB)">
          <form action={subirFoto} className="grid grid-cols-2 gap-2">
            <select name="modelo_id" className="rj-input">{mods.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}</select>
            <input name="leyenda" placeholder="Leyenda (ej. frente planta)" className="rj-input" />
            <input name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="rj-input col-span-2" required />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="portada" value="1" className="h-5 w-5" /> Usar como portada</label>
            <button className="rj-btn-green">Subir (comprime: sacá liviano desde el celu)</button>
          </form>
        </Paso>
        <Paso n={2} titulo="Manual de uso por modelo (PDF, máx 10MB)">
          <form action={subirManual} className="flex gap-2">
            <select name="modelo_id" className="rj-input">{mods.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}</select>
            <input name="manual" type="file" accept="application/pdf" className="rj-input" required />
            <button className="rj-btn-primary">Subir manual</button>
          </form>
        </Paso>
        <Paso n={3} titulo="Opciones y equipamiento">
          <form action={crearOpcion} className="grid grid-cols-2 gap-1">
            <input name="nombre" placeholder="Nueva opción * ej. Grupo 7kVA" className="rj-input col-span-2" required />
            <input name="grupo" placeholder="Grupo (climatizacion…)" className="rj-input" />
            <select name="tipo" className="rj-input"><option value="fijo">fijo USD</option><option value="por_m2">por m²</option><option value="por_unidad">por unidad</option><option value="por_metro">por metro</option></select>
            <input name="precio" type="number" step="0.01" min={0} placeholder="Precio USD" className="rj-input" />
            <input name="desc" placeholder="Descripción" className="rj-input" />
            <button className="rj-btn-green col-span-2">Crear opción</button>
          </form>
          <form action={vincularOpcion} className="mt-2 flex flex-wrap items-center gap-1">
            <select name="modelo_id" className="rj-input flex-1">{mods.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}</select>
            <select name="opcion_id" className="rj-input flex-1">{opcs.map((o) => <option key={o.id} value={o.id}>[{o.grupo}] {o.nombre}</option>)}</select>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="obl" value="1" className="h-5 w-5" /> Oblig.</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="def" value="1" className="h-5 w-5" /> Defecto</label>
            <button className="rj-btn-primary">Vincular</button>
          </form>
        </Paso>
        <Paso n={4} titulo="Ítems de ficha técnica">
          <form action={agregarFicha} className="grid grid-cols-2 gap-1">
            <select name="modelo_id" className="rj-input col-span-2">{mods.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}</select>
            <input name="grupo" placeholder="Grupo (Estructura…)" className="rj-input" />
            <input name="item" placeholder="Ítem * ej. Chasis" className="rj-input" required />
            <input name="esp" placeholder="Especificación * ej. Doble T 300mm" className="rj-input col-span-2" required />
            <button className="rj-btn-green col-span-2">Agregar ítem</button>
          </form>
        </Paso>
        <form action={crearModelo} className="rounded-xl border bg-white p-4 grid grid-cols-2 gap-2">
          <p className="col-span-2 font-bold text-sm">Nuevo modelo (medidas obligatorias, precio ≥0)</p>
          <select name="categoria_id" className="rounded border p-2" required>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input name="codigo" placeholder="CODIGO-UNICO" className="rounded border p-2" required />
          <input name="nombre" placeholder="Nombre" className="rounded border p-2" required />
          <input name="precio" type="number" step="0.01" min={0} placeholder="Precio base USD" className="rounded border p-2" />
          <input name="largo" type="number" min={1} placeholder="Largo mm" className="rounded border p-2" required />
          <input name="ancho" type="number" min={1} placeholder="Ancho mm" className="rounded border p-2" required />
          <input name="alto" type="number" min={1} placeholder="Alto mm" className="rounded border p-2" required />
          <button className="col-span-2 rounded bg-[#07503f] p-3 text-white font-bold">Guardar</button>
        </form>
      </div>
    </AppLayout>
  );
}
