import { IndexDataPoint } from './tipos';

export const OFFICIAL_INDEXES_HISTORY: IndexDataPoint[] = [
  {
    period: '2024-01',
    label: 'Enero 2024',
    indecIccGeneral: 100.0,
    indecMateriales: 100.0,
    indecManoObra: 100.0,
    indecGastosGenerales: 100.0,
    camarcoCostos: 100.0,
    uocraSalarios: 100.0,
    m2CostReferenceARS: 385000,
  },
  {
    period: '2024-06',
    label: 'Junio 2024',
    indecIccGeneral: 138.4,
    indecMateriales: 132.1,
    indecManoObra: 147.8,
    indecGastosGenerales: 136.2,
    camarcoCostos: 139.2,
    uocraSalarios: 146.5,
    m2CostReferenceARS: 532000,
  },
  {
    period: '2024-12',
    label: 'Diciembre 2024',
    indecIccGeneral: 168.2,
    indecMateriales: 158.4,
    indecManoObra: 182.6,
    indecGastosGenerales: 165.8,
    camarcoCostos: 169.5,
    uocraSalarios: 181.0,
    m2CostReferenceARS: 645000,
  },
  {
    period: '2025-01',
    label: 'Enero 2025',
    indecIccGeneral: 174.5,
    indecMateriales: 164.2,
    indecManoObra: 189.5,
    indecGastosGenerales: 172.0,
    camarcoCostos: 175.8,
    uocraSalarios: 188.4,
    m2CostReferenceARS: 672000,
  },
  {
    period: '2025-03',
    label: 'Marzo 2025',
    indecIccGeneral: 186.2,
    indecMateriales: 174.8,
    indecManoObra: 203.1,
    indecGastosGenerales: 183.4,
    camarcoCostos: 187.9,
    uocraSalarios: 201.5,
    m2CostReferenceARS: 717000,
  },
  {
    period: '2025-06',
    label: 'Junio 2025',
    indecIccGeneral: 204.8,
    indecMateriales: 191.5,
    indecManoObra: 224.2,
    indecGastosGenerales: 201.7,
    camarcoCostos: 206.4,
    uocraSalarios: 222.8,
    m2CostReferenceARS: 788000,
  },
  {
    period: '2025-09',
    label: 'Septiembre 2025',
    indecIccGeneral: 222.3,
    indecMateriales: 207.6,
    indecManoObra: 243.8,
    indecGastosGenerales: 219.0,
    camarcoCostos: 224.1,
    uocraSalarios: 241.9,
    m2CostReferenceARS: 855000,
  },
  {
    period: '2025-12',
    label: 'Diciembre 2025',
    indecIccGeneral: 239.6,
    indecMateriales: 223.1,
    indecManoObra: 263.5,
    indecGastosGenerales: 236.4,
    camarcoCostos: 241.8,
    uocraSalarios: 261.2,
    m2CostReferenceARS: 922000,
  },
  {
    period: '2026-01',
    label: 'Enero 2026',
    indecIccGeneral: 246.8,
    indecMateriales: 229.4,
    indecManoObra: 271.8,
    indecGastosGenerales: 243.5,
    camarcoCostos: 249.0,
    uocraSalarios: 269.8,
    m2CostReferenceARS: 950000,
  },
  {
    period: '2026-04',
    label: 'Abril 2026',
    indecIccGeneral: 261.4,
    indecMateriales: 242.0,
    indecManoObra: 289.4,
    indecGastosGenerales: 258.0,
    camarcoCostos: 263.8,
    uocraSalarios: 287.1,
    m2CostReferenceARS: 1006000,
  },
  {
    period: '2026-08',
    label: 'Agosto 2026 (Actual)',
    indecIccGeneral: 282.5,
    indecMateriales: 260.5,
    indecManoObra: 314.0,
    indecGastosGenerales: 279.0,
    camarcoCostos: 285.2,
    uocraSalarios: 312.0,
    m2CostReferenceARS: 1087000,
  }
];

let _syncedCache: IndexDataPoint[] | null = null;

function getActiveHistory(): IndexDataPoint[] {
  if (_syncedCache) return _syncedCache;
  if (typeof window === 'undefined') return OFFICIAL_INDEXES_HISTORY;
  try {
    // v2 primary, fallback v1 for migration
    const raw2 = localStorage.getItem('cp_ar_synced_indexes_v2');
    if (raw2) {
      const parsed = JSON.parse(raw2);
      const arr = Array.isArray(parsed) ? parsed : parsed.history;
      if (Array.isArray(arr) && arr.length) {
        // Detect duplicado bug v1 (dos 2026-08) -> invalidar y regenerar
        const periods = new Set(arr.map((p:any)=>p.period));
        if (periods.size !== arr.length) throw new Error('duplicate');
        _syncedCache = arr as IndexDataPoint[]; return _syncedCache;
      }
    }
    const raw = localStorage.getItem('cp_ar_synced_indexes_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : parsed.history;
      if (Array.isArray(arr) && arr.length) {
        const periods = new Set(arr.map((p:any)=>p.period));
        if (periods.size === arr.length) { _syncedCache = arr as IndexDataPoint[]; return _syncedCache; }
      }
    }
  } catch {}
  return OFFICIAL_INDEXES_HISTORY;
}

export function invalidateSyncedCache() { _syncedCache = null; }

export function getIndexForPeriod(period: string): IndexDataPoint | undefined {
  return getActiveHistory().find(p => p.period === period) || OFFICIAL_INDEXES_HISTORY.find(p => p.period === period);
}

export function getAvailablePeriods(): { period: string; label: string }[] {
  return getActiveHistory().map(i => ({ period: i.period, label: i.label }));
}

export function getSyncedIndexesHistory(): IndexDataPoint[] {
  return getActiveHistory();
}
