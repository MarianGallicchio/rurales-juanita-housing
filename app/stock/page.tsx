import { AppLayout } from '@/components/app-layout';
import { PageHero } from '@/components/ui-brand';
import { queryLocal } from '@/lib/db-local';
import { fmtUSD } from '@/lib/formato-ar';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function movimiento(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const material_id = String(fd.get('material_id'));
  const tipo = String(fd.get('tipo'));
  const cantidad = Number(fd.get('cantidad') ?? 0);
  if (!material_id || !cantidad) return;
  if (tipo === 'ajuste' && cantidad < 0 && !String(fd.get('motivo') ?? '').trim()) return; // ajuste negativo exige motivo
  await queryLocal(`insert into public.movimiento_stock (material_id, tipo, cantidad, referencia_tipo) values ($1,$2,$3,'manual')`, [material_id, tipo, cantidad]);
  await auditLocal('movimiento_stock', material_id, 'alta', { tipo, cantidad });
  // Promedio ponderado real: (stock_prev*prom_prev + cant*costo) / (stock_prev+cant)
  if (tipo === 'entrada') {
    const costo = Number(fd.get('costo') ?? 0);
    if (costo > 0) {
      const prev = (await queryLocal<{ s: number; p: number }>(
        `select coalesce((select sum(case when tipo in ('entrada','ajuste') then cantidad when tipo='salida' then -cantidad else 0 end) from public.movimiento_stock where material_id=$1),0) as s, coalesce((select costo_promedio_usd from public.material where id=$1),0) as p`, [material_id]))[0];
      const ns = Number(prev.s) + cantidad;
      const np = ns > 0 ? (Number(prev.s) * Number(prev.p) + cantidad * costo) / ns : costo;
      await queryLocal(`update public.material set costo_ultimo_usd=$1, costo_promedio_usd=$2 where id=$3`, [costo, Math.round(np * 100) / 100, material_id]);
    }
  }
  redirect('/stock');
}

async function lineaBOM(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const modelo_id = String(fd.get('modelo_id'));
  const material_id = String(fd.get('material_id'));
  const cantidad = Number(fd.get('cantidad') ?? 0);
  const merma = Number(fd.get('merma') ?? 0);
  if (!modelo_id || !material_id || cantidad <= 0 || merma < 0) return;
  let bom = (await queryLocal<{ id: string }>(`select id from public.bom_modelo where modelo_id=$1 order by version desc limit 1`, [modelo_id]))[0];
  if (!bom) bom = (await queryLocal<{ id: string }>(`insert into public.bom_modelo (modelo_id, version) values ($1,1) returning id`, [modelo_id]))[0];
  await queryLocal(`insert into public.bom_linea (bom_id, material_id, cantidad, merma_pct, etapa_consumo) values ($1,$2,$3,$4,$5) on conflict do nothing`,
    [bom.id, material_id, cantidad, merma, String(fd.get('etapa') ?? '') || null]);
  redirect('/stock?mod=' + modelo_id);
}

async function generarLista(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const lista = (await queryLocal<{ id: string }>(`insert into public.lista_compra (estado) values ('borrador') returning id`))[0];
  const falt = await queryLocal<{ material_id: string; cant: number }>(`
    select l.material_id, sum(l.cantidad * (1 + l.merma_pct/100) * u.n) as cant
    from public.bom_linea l join public.bom_modelo b on b.id=l.bom_id
    join (select modelo_id, count(*)::int as n from public.unidad u join public.orden_produccion o on o.id=u.orden_id where o.estado in ('pendiente','en_produccion') group by modelo_id) u on u.modelo_id=b.modelo_id
    group by l.material_id`);
  for (const f of falt) {
    const st = await queryLocal<{ s: number }>(`select coalesce(sum(case when tipo in ('entrada','ajuste') then cantidad when tipo in ('salida','reserva') then -cantidad else 0 end),0) as s from public.movimiento_stock where material_id=$1`, [f.material_id]);
    const comprar = Number(f.cant) - Number(st[0].s);
    if (comprar > 0) {
      const prov = (await queryLocal<{ id: string }>(`select proveedor_id as id from public.proveedor_material where material_id=$1 order by fecha desc limit 1`, [f.material_id]))[0];
      await queryLocal(`insert into public.lista_compra_linea (lista_id, material_id, cantidad_sugerida, proveedor_sugerido_id) values ($1,$2,$3,$4)`,
        [lista.id, f.material_id, Math.round(comprar * 1000) / 1000, prov?.id ?? null]);
    }
  }
  await auditLocal('lista_compra', lista.id, 'alta', { auto: true });
  redirect('/stock?lista=' + lista.id);
}

async function BOMEditor({ mats, modSel }: { mats: { id: string; codigo: string }[]; modSel?: string }) {
  const mods = await queryLocal<{ id: string; codigo: string }>(`select id, codigo from public.modelo order by codigo`);
  const mid = modSel ?? mods[0]?.id;
  const lineas = mid ? await queryLocal<{ codigo: string; cantidad: number; merma: number; costo: number }>(
    `select m.codigo, l.cantidad, l.merma_pct as merma, m.costo_promedio_usd as costo from public.bom_linea l
     join public.bom_modelo b on b.id=l.bom_id join public.material m on m.id=l.material_id
     where b.modelo_id=$1 order by m.codigo`, [mid]) : [];
  const total = lineas.reduce((a, l) => a + Number(l.cantidad) * (1 + Number(l.merma) / 100) * Number(l.costo), 0);
  return (
    <div className="mt-2 rounded-xl border bg-white p-4">
      <p className="text-sm font-bold">Lista de materiales por modelo (BOM versionada, alimenta cotizador)</p>
      <div className="mt-1 flex gap-1">
        {mods.map((m) => <Link key={m.id} href={`/stock?mod=${m.id}`} className={`rounded px-3 py-1 text-xs font-bold ${m.id === mid ? 'bg-[#07503f] text-white' : 'bg-slate-200'}`}>{m.codigo}</Link>)}
      </div>
      {lineas.length === 0 && <p className="mt-1 text-sm opacity-60">Sin BOM. Agregá la primera línea abajo.</p>}
      {lineas.map((l, i) => <p key={i} className="text-sm">· {l.codigo}: {l.cantidad} +{l.merma}% merma — {fmtUSD(Number(l.cantidad) * (1 + Number(l.merma) / 100) * Number(l.costo))}</p>)}
      <p className="mt-1 text-sm font-black">Costo materiales BOM: {fmtUSD(Math.round(total * 100) / 100)}</p>
      <form action={lineaBOM} className="mt-2 grid grid-cols-2 gap-1">
        <input type="hidden" name="modelo_id" value={mid ?? ''} />
        <select name="material_id" className="rounded border p-2 text-sm">{mats.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}</select>
        <input name="etapa" placeholder="etapa consumo (ej. Estructura)" className="rounded border p-2 text-sm" />
        <input name="cantidad" type="number" step="0.001" min={0.001} placeholder="cantidad" className="rounded border p-2 text-sm" required />
        <input name="merma" type="number" step="0.1" min={0} defaultValue={5} placeholder="merma %" className="rounded border p-2 text-sm" />
        <button className="col-span-2 rounded bg-[#07503f] p-2 text-sm font-bold text-white">Agregar línea (nueva versión si cambia, órdenes viejas conservan la suya)</button>
      </form>
    </div>
  );
}
async function conteo(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const material_id = String(fd.get('material_id') ?? '');
  const contada = Number(fd.get('contada') ?? NaN);
  if (!material_id || Number.isNaN(contada) || contada < 0) return;
  const st = (await queryLocal<{ s: number }>(`select coalesce(sum(case when tipo in ('entrada','ajuste') then cantidad when tipo='salida' then -cantidad else 0 end),0) as s from public.movimiento_stock where material_id=$1`, [material_id]))[0].s;
  const dif = Math.round((contada - Number(st)) * 1000) / 1000;
  if (dif !== 0) {
    await queryLocal(`insert into public.movimiento_stock (material_id, tipo, cantidad, referencia_tipo) values ($1,'ajuste',$2,'conteo-fisico')`, [material_id, dif]);
    await auditLocal('movimiento_stock', material_id, 'alta', { conteo: contada, diferencia: dif });
  }
  redirect('/stock');
}

async function calificarProv(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id') ?? '');
  const cal = Math.min(5, Math.max(1, Number(fd.get('cal') ?? 3)));
  const tel = String(fd.get('contacto') ?? '');
  if (tel) await queryLocal(`update public.proveedor set calificacion=$2, contacto=$3 where id=$1`, [id, cal, tel]);
  else await queryLocal(`update public.proveedor set calificacion=$2 where id=$1`, [id, cal]);
  redirect('/stock');
}

async function crearMaterial(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const codigo = String(fd.get('codigo') ?? '').trim().toUpperCase();
  const nombre = String(fd.get('nombre') ?? '').trim();
  if (!codigo || !nombre) return;
  const m = (await queryLocal<{ id: string }>(
    `insert into public.material (codigo, nombre, categoria, unidad_medida, stock_minimo, costo_ultimo_usd, costo_promedio_usd)
     values ($1,$2,$3,$4,$5,$6,$6) on conflict (codigo) do nothing returning id`,
    [codigo, nombre, String(fd.get('cat') ?? '') || null, String(fd.get('um') ?? 'u'), Number(fd.get('min') ?? 0) || 0, Number(fd.get('costo') ?? 0) || 0]))[0];
  if (m) await auditLocal('material', m.id, 'alta', { codigo });
  redirect('/stock');
}

async function crearProveedor(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const razon = String(fd.get('razon') ?? '').trim();
  if (!razon) return;
  await queryLocal(`insert into public.proveedor (razon_social, contacto, plazo_entrega_dias) values ($1,$2,$3) on conflict do nothing`,
    [razon, String(fd.get('contacto') ?? '') || null, Number(fd.get('plazo') ?? 7) || 7]);
  redirect('/stock');
}

async function Proveedores() {
  const provs = await queryLocal<{ id: string; razon_social: string; contacto: string | null; calificacion: number }>(
    `select id, razon_social, contacto, calificacion from public.proveedor order by razon_social`);
  return (
    <div className="mt-2 rounded-xl border bg-white p-4">
      <p className="text-sm font-bold">Proveedores y calificación (1–5)</p>      {provs.length === 0 && <p className="text-sm opacity-60">Sin proveedores.</p>}
      {provs.map((p) => (
        <form key={p.id} action={calificarProv} className="mt-1 flex items-center gap-2 rounded-xl border p-2">
          <input type="hidden" name="id" value={p.id} />
          <span className="min-w-32 flex-1 text-sm"><b>{p.razon_social}</b> <span className="opacity-60">{p.contacto ?? ''}</span></span>
          <select name="cal" defaultValue={p.calificacion} className="rounded-xl border px-2 py-1 text-sm">{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select>
          <button className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-bold">Guardar</button>
        </form>
      ))}
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        <form action={crearMaterial} className="grid grid-cols-2 gap-1 rounded-xl border p-2">
          <p className="col-span-2 text-xs font-black">Nuevo material</p>
          <input name="codigo" placeholder="CÓDIGO *" className="rounded border p-2 text-xs" required />
          <input name="nombre" placeholder="Nombre *" className="rounded border p-2 text-xs" required />
          <input name="cat" placeholder="Categoría" className="rounded border p-2 text-xs" />
          <input name="um" placeholder="UM (u/m/m2/kg)" defaultValue="u" className="rounded border p-2 text-xs" />
          <input name="min" type="number" placeholder="Mínimo" className="rounded border p-2 text-xs" />
          <input name="costo" type="number" step="0.01" placeholder="Costo USD" className="rounded border p-2 text-xs" />
          <button className="col-span-2 rounded bg-[#07503f] px-3 py-1 text-xs font-bold text-white">Guardar</button>
        </form>
        <form action={crearProveedor} className="grid grid-cols-2 gap-1 rounded-xl border p-2">
          <p className="col-span-2 text-xs font-black">Nuevo proveedor</p>
          <input name="razon" placeholder="Razón social *" className="col-span-2 rounded border p-2 text-xs" required />
          <input name="contacto" placeholder="Contacto" className="rounded border p-2 text-xs" />
          <input name="plazo" type="number" defaultValue={7} className="rounded border p-2 text-xs" title="Plazo días" />
          <button className="col-span-2 rounded bg-[#07503f] px-3 py-1 text-xs font-bold text-white">Guardar</button>
        </form>
      </div>
    </div>
  );
}

async function ListaCompras({ listaId }: { listaId?: string }) {  const lineas = listaId ? await queryLocal<{ codigo: string; cant: number; prov: string | null }>(
    `select m.codigo, l.cantidad_sugerida as cant, p.razon_social as prov from public.lista_compra_linea l
     join public.material m on m.id=l.material_id left join public.proveedor p on p.id=l.proveedor_sugerido_id
     where l.lista_id=$1 order by m.codigo`, [listaId]) : [];
  return (
    <div className="mt-2 rounded-xl border bg-white p-4">
      <p className="text-sm font-bold">Lista de compras sugerida (OPs abiertas − stock)</p>
      {listaId ? (
        lineas.length === 0 ? <p className="text-sm opacity-60">✓ Stock alcanza para las OPs abiertas.</p>
        : lineas.map((l, i) => <p key={i} className="text-sm">· {l.codigo}: comprar {l.cant} {l.prov ? `(${l.prov})` : '(sin proveedor sugerido)'}</p>)
      ) : (
        <form action={generarLista}><button className="rj-btn-accent mt-1">Generar sugerencia ahora</button></form>
      )}
    </div>
  );
}

export default async function Stock({ searchParams }: { searchParams: Promise<{ mod?: string; lista?: string }> }) {
  const sp = await searchParams;
  const mats = await queryLocal<{ id: string; codigo: string; nombre: string; stock: number; minimo: number }>(
    `select m.id, m.codigo, m.nombre,
      coalesce((select sum(case when tipo in ('entrada','ajuste') then cantidad when tipo in ('salida','reserva') then -cantidad else 0 end) from public.movimiento_stock s where s.material_id=m.id),0) as stock,
      m.stock_minimo as minimo from public.material m order by m.codigo`);
  const criticos = mats.filter((m) => Number(m.stock) < Number(m.minimo));
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador', 'Ventas', 'Produccion', 'Compras']);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
      <PageHero kicker="Fase 5 · Costos reales" titulo={`Stock + BOM (${mats.length} · ${criticos.length} críticos)`}
        bajada="Solo movimientos, nunca edición directa. La BOM alimenta al cotizador." />
      {criticos.length > 0 && <p className="mt-1 rounded bg-red-100 p-2 text-sm font-bold">⛔ Faltantes: {criticos.map((c) => c.codigo).join(', ')} → generar lista de compras</p>}
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        {mats.map((m) => (
          <div key={m.id} className={`rounded-xl border bg-white p-3 ${Number(m.stock) < Number(m.minimo) ? 'border-red-400' : ''}`}>
            <p className="font-bold text-sm">{m.codigo} — {m.nombre}</p>
            <p className="text-sm">Stock {m.stock} · mín {m.minimo} {Number(m.stock) < Number(m.minimo) ? '🔴' : '🟢'}</p>
          </div>
        ))}
      </div>
      <form action={movimiento} className="mt-2 rounded-xl border bg-white p-4 grid grid-cols-2 gap-2">
        <p className="col-span-2 text-sm font-bold">Movimiento (nunca se edita saldo, solo movimientos)</p>
        <select name="material_id" className="rounded border p-2">{mats.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}</select>
        <select name="tipo" className="rounded border p-2"><option value="entrada">entrada</option><option value="salida">salida</option><option value="ajuste">ajuste</option><option value="reserva">reserva</option></select>
        <input name="cantidad" type="number" step="0.001" placeholder="cantidad" className="rounded border p-2" required />
        <input name="costo" type="number" step="0.01" placeholder="costo USD (entradas)" className="rounded border p-2" />
        <input name="motivo" placeholder="motivo (obligatorio si ajuste negativo)" className="col-span-2 rounded border p-2" />
        <button className="col-span-2 rounded bg-[#07503f] p-3 font-bold text-white">Registrar</button>
      </form>
      <BOMEditor mats={mats} modSel={sp.mod} />
      <Proveedores />
      <ListaCompras listaId={sp.lista} />
      <form action={conteo} className="mt-2 rounded-xl border bg-white p-4">
        <p className="text-sm font-bold">Conteo físico (ajusta a lo contado con motivo)</p>
        <div className="mt-1 flex gap-2">
          <select name="material_id" className="rj-input">{mats.map((m) => <option key={m.id} value={m.id}>{m.codigo} (stock {m.stock})</option>)}</select>
          <input name="contada" type="number" step="0.001" min={0} placeholder="cantidad contada" className="rj-input" required />
          <button className="rj-btn-primary">Ajustar</button>
        </div>
      </form>
      </div>
    </AppLayout>
  );
}
