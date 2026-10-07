import { UocraLaborCategory } from './tipos';

export const UOCRA_LABOR_DATABASE: UocraLaborCategory[] = [
  {
    id: 'uocra-oficial-especializado',
    categoryName: 'Oficial Especializado',
    basicHourlyRate: 4850,
    basicDailyRate: 38800,
    socialChargesPercentage: 65, // ~65% cargas sociales + ART + fondo de cese
    effectiveHourlyCost: 8000,
    effectiveDailyCost: 64000,
    source: 'UOCRA CCT 76/75 - Paritaria Vigente',
    period: '2026-08'
  },
  {
    id: 'uocra-oficial',
    categoryName: 'Oficial Albañil / Armador',
    basicHourlyRate: 4130,
    basicDailyRate: 33040,
    socialChargesPercentage: 65,
    effectiveHourlyCost: 6815,
    effectiveDailyCost: 54520,
    source: 'UOCRA CCT 76/75 - Paritaria Vigente',
    period: '2026-08'
  },
  {
    id: 'uocra-medio-oficial',
    categoryName: 'Medio Oficial',
    basicHourlyRate: 3810,
    basicDailyRate: 30480,
    socialChargesPercentage: 65,
    effectiveHourlyCost: 6285,
    effectiveDailyCost: 50280,
    source: 'UOCRA CCT 76/75 - Paritaria Vigente',
    period: '2026-08'
  },
  {
    id: 'uocra-ayudante',
    categoryName: 'Ayudante de Obra',
    basicHourlyRate: 3500,
    basicDailyRate: 28000,
    socialChargesPercentage: 65,
    effectiveHourlyCost: 5775,
    effectiveDailyCost: 46200,
    source: 'UOCRA CCT 76/75 - Paritaria Vigente',
    period: '2026-08'
  }
];

export const HISTORICAL_LABOR_EVOLUTION: { [period: string]: { [category: string]: number } } = {
  '2025-01': {
    'Oficial Especializado': 4400,
    'Oficial Albañil / Armador': 3750,
    'Medio Oficial': 3450,
    'Ayudante de Obra': 3180,
  },
  '2025-06': {
    'Oficial Especializado': 5700,
    'Oficial Albañil / Armador': 4860,
    'Medio Oficial': 4480,
    'Ayudante de Obra': 4120,
  },
  '2026-01': {
    'Oficial Especializado': 6900,
    'Oficial Albañil / Armador': 5880,
    'Medio Oficial': 5420,
    'Ayudante de Obra': 4980,
  },
  '2026-08': {
    'Oficial Especializado': 8000,
    'Oficial Albañil / Armador': 6815,
    'Medio Oficial': 6285,
    'Ayudante de Obra': 5775,
  }
};
