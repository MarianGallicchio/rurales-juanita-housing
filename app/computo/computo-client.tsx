'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ConstructionProject } from '@/lib/obra/tipos';
import { calculateProjectSummary, updateProjectBudgetComparison, formatPercent } from '@/lib/obra/calculo';
import { getAvailablePeriods, getSyncedIndexesHistory } from '@/lib/obra/indices';
import { MATERIALS_DATABASE } from '@/lib/obra/materiales';
import { UOCRA_LABOR_DATABASE } from '@/lib/obra/uocra';
import { fmtARS } from '@/lib/formato-ar';
import { Tarjeta, Paso } from '@/components/ui-brand';

const KEY = 'rj_obra_computo_v1';

type Tab = 'computo' | 'materiales' | 'indices' | 'uocra';

export function ComputoClient({ initialProject }: { initialProject: ConstructionProject }) {
  const [project, setProject] = useState<ConstructionProject>(initialProject);
  const [tab, setTab] = useState<Tab>('computo');
  const [periodo, setPeriodo] = useState('2026-08');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as ConstructionProject;
        if (p?.id && Array.isArray(p.rubros)) setProject(p);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(project));
    } catch {}
  }, [project]);

  const summary = useMemo(() => calculateProjectSummary(project), [project]);
  const comp = useMemo(() => {
    try {
      return updateProjectBudgetComparison(project, periodo, 'COMPONENT_SPECIFIC');
    } catch {
      return null;
    }
  }, [project, periodo]);
  const periods = useMemo(() => getAvailablePeriods(), []);
  const history = useMemo(() => getSyncedIndexesHistory(), []);

  function setItem(rubroId: number, itemId: string, patch: { quantity?: number; unitPrice?: number }) {
    setProject((prev) => ({
      ...prev,
      lastUpdatedDate: new Date().toISOString().slice(0, 10),
      rubros: prev.rubros.map((r) =>
        r.id !== rubroId
          ? r
          : { ...r, items: r.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
      ),
    }));
  }

  function exportPDF() {
    import('@/lib/obra/exportar').then((m) => m.exportarComputoPDF(project));
  }
  function exportExcel() {
    import('@/lib/obra/exportar').then((m) => m.exportarComputoExcel(project));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1 rounded-xl border bg-white p-1">
        {(['computo', 'materiales', 'indices', 'uocra'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${tab === t ? 'bg-[#07503f] text-white' : 'hover:bg-slate-100'}`}
          >
            {t === 'computo' ? 'Cómputo' : t === 'materiales' ? 'Materiales' : t === 'indices' ? 'Índices' : 'UOCRA'}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={exportPDF} className="rj-btn-primary">PDF</button>
          <button onClick={exportExcel} className="rj-btn-green">Excel</button>
        </div>
      </div>

      {tab === 'computo' && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Tarjeta titulo="Total" valor={fmtARS(summary.totalCostARS)} pie={`${summary.totalItemsCount} ítems`} tono={1} />
            <Tarjeta titulo="$/m²" valor={fmtARS(summary.costPerM2)} pie={`${project.totalAreaM2} m² + ${project.semiCoveredAreaM2} sem.`} tono={2} />
            <Tarjeta titulo="Materiales" valor={fmtARS(summary.materialsCost)} tono={0} />
            <Tarjeta titulo="Mano de obra" valor={fmtARS(summary.laborCost)} tono={3} />
          </div>

          <Paso n={1} titulo={`Redeterminación — base ${project.baseIndexPeriod} → ${periodo}`}>
            <div className="flex flex-wrap items-center gap-2">
              <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="rj-input">
                {periods.map((p) => (
                  <option key={p.period} value={p.period}>{p.label}</option>
                ))}
              </select>
              {comp && (
                <p className="text-sm">
                  Total actualizado: <b>{fmtARS(comp.updatedTotalCost)}</b> ({formatPercent(comp.totalVariationPercentage)})
                </p>
              )}
            </div>
            {comp && comp.topInflationDrivers.length > 0 && (
              <ul className="mt-2 text-xs">
                {comp.topInflationDrivers.slice(0, 5).map((d, i) => (
                  <li key={i}>• {d.name} — {formatPercent(d.variationPercent)} ({fmtARS(d.impactAmount)})</li>
                ))}
              </ul>
            )}
          </Paso>

          {project.rubros.map((r) => (
            <section key={r.id} className="rj-card">
              <p className="font-bold">Rubro {r.number} — {r.name}</p>
              <p className="text-xs text-[#3f3f46]">{r.description} · Subtotal {fmtARS(summary.rubroSubtotals[r.id] ?? 0)}</p>
              <div className="mt-2 flex flex-col gap-1">
                {(r.items || []).slice(0, 12).map((it) => (
                  <div key={it.id} className="grid grid-cols-[1fr_70px_90px] items-center gap-1 text-sm">
                    <span className="truncate">{it.description} <span className="opacity-50">({it.unit})</span></span>
                    <input
                      type="number" min={0} step="any" value={it.quantity}
                      onChange={(e) => setItem(r.id, it.id, { quantity: Number(e.target.value) })}
                      className="rj-input !py-1" aria-label="cantidad"
                    />
                    <input
                      type="number" min={0} step="any" value={it.unitPrice}
                      onChange={(e) => setItem(r.id, it.id, { unitPrice: Number(e.target.value) })}
                      className="rj-input !py-1" aria-label="precio unitario"
                    />
                  </div>
                ))}
                {(r.items || []).length > 12 && (
                  <p className="text-xs opacity-60">+ {(r.items || []).length - 12} ítems más (se exportan completos en PDF/Excel)</p>
                )}
              </div>
            </section>
          ))}
        </>
      )}

      {tab === 'materiales' && (
        <section className="rj-card">
          <p className="font-bold">Catálogo de materiales ({MATERIALS_DATABASE.length})</p>
          <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
            {MATERIALS_DATABASE.slice(0, 40).map((m) => (
              <div key={m.id} className="rounded border p-2 text-sm">
                <p className="font-semibold">{m.code} — {m.name}</p>
                <p className="text-xs text-[#3f3f46]">{m.category} · {m.unit} · {m.source} · {m.lastUpdated}</p>
                <p className="text-sm font-bold">{fmtARS(m.referencePrice)}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs opacity-60">Se muestran 40 de {MATERIALS_DATABASE.length} para no saturar. El resto está en lib/obra/materiales.ts</p>
        </section>
      )}

      {tab === 'indices' && (
        <section className="rj-card">
          <p className="font-bold">Histórico INDEC / CAMARCO / UOCRA ({history.length} períodos)</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[#3f3f46]"><th>Período</th><th>ICC gral</th><th>Materiales</th><th>Mano obra</th><th>CAMARCO</th><th>$/m² ref</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.period} className="border-t">
                    <td>{h.label}</td><td>{h.indecIccGeneral}</td><td>{h.indecMateriales}</td>
                    <td>{h.indecManoObra}</td><td>{h.camarcoCostos}</td><td>{fmtARS(h.m2CostReferenceARS)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'uocra' && (
        <section className="rj-card">
          <p className="font-bold">Escalas UOCRA CCT 76/75</p>
          <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
            {UOCRA_LABOR_DATABASE.map((u) => (
              <div key={u.id} className="rounded border p-2 text-sm">
                <p className="font-semibold">{u.categoryName}</p>
                <p className="text-xs text-[#3f3f46]">{u.source} · {u.period} · cargas {u.socialChargesPercentage}%</p>
                <p>Jornal efectivo: <b>{fmtARS(u.effectiveDailyCost)}</b> · Hora: <b>{fmtARS(u.effectiveHourlyCost)}</b></p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
