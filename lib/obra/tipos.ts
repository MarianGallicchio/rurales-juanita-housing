export type CostCategory = 'material' | 'labor' | 'equipment' | 'overhead';

export type ArgentineRegion = 
  | 'buenos_aires' 
  | 'caba' 
  | 'cordoba' 
  | 'santa_fe' 
  | 'mendoza' 
  | 'entre_rios' 
  | 'patagonia' 
  | 'noa_nea';

export interface RegionalModifier {
  id: ArgentineRegion;
  name: string;
  materialCoefficient: number; // e.g. 1.05 = +5%
  laborCoefficient: number;
  freightCoefficient: number;
  description: string;
}

export interface MaterialItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  referencePrice: number; // in ARS
  source: 'CAMARCO' | 'INDEC' | 'Corralón Mayorista' | 'Fabricante Directo';
  lastUpdated: string; // YYYY-MM
  historicalPrices: { [period: string]: number }; // e.g. "2025-01": 8500, "2026-01": 13500
  brandExample?: string;
  specNotes?: string;
}

export interface UocraLaborCategory {
  id: string;
  categoryName: string; // 'Oficial Especializado', 'Oficial', 'Medio Oficial', 'Ayudante'
  basicHourlyRate: number; // ARS
  basicDailyRate: number; // ARS (8hs)
  socialChargesPercentage: number; // ~60-70% (cargas sociales, ART, seguro)
  effectiveHourlyCost: number; // basic + social charges + tools
  effectiveDailyCost: number;
  source: string; // "UOCRA CCT 76/75 - Paritaria Vigente"
  period: string; // YYYY-MM
}

export interface BudgetItem {
  id: string;
  rubroId: number;
  code?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number; // ARS
  costType: CostCategory;
  materialRefId?: string;
  laborRefId?: string;
  notes?: string;
  historicalBasePrice?: number; // Price when budget was first created
}

export interface RubroSection {
  id: number;
  number: number;
  name: string;
  description: string;
  iconName: string;
  items: BudgetItem[];
}

export interface ConstructionProject {
  id: string;
  name: string;
  clientName: string;
  location: string;
  region: ArgentineRegion;
  projectType: 'Vivienda Unifamiliar' | 'Dúplex' | 'Edificio en Altura' | 'Refacción / Ampliación' | 'Comercial / Galpón' | 'Otro';
  totalAreaM2: number; // m² cubiertos
  semiCoveredAreaM2: number; // m² semicubiertos
  createdDate: string; // YYYY-MM-DD
  baseIndexPeriod: string; // e.g. "2025-01" or "2026-01"
  currentPeriod: string; // e.g. "2026-08"
  validityDays: number;
  overheadPercentage: number; // Gastos generales %
  profitPercentage: number; // Beneficio / Honorarios %
  taxPercentage: number; // IVA u otros %
  rubros: RubroSection[];
  notes?: string;
  status: 'Borrador' | 'Presentado' | 'Aprobado' | 'En Ejecución' | 'Cerrado';
  lastUpdatedDate: string;
}

export interface IndexDataPoint {
  period: string; // e.g. "2025-01", "2025-06", "2026-01", "2026-08"
  label: string; // "Enero 2025", "Agosto 2026"
  indecIccGeneral: number;
  indecMateriales: number;
  indecManoObra: number;
  indecGastosGenerales: number;
  camarcoCostos: number;
  uocraSalarios: number;
  m2CostReferenceARS: number; // Estimated $/m² standard house
}

export interface BudgetCostSummary {
  materialsCost: number;
  laborCost: number;
  equipmentCost: number;
  subtotalDirectCost: number;
  overheadCost: number;
  profitCost: number;
  subtotalBeforeTax: number;
  taxCost: number;
  totalCostARS: number;
  costPerM2: number;
  totalItemsCount: number;
  rubroSubtotals: { [rubroId: number]: number };
}

export interface BudgetUpdateComparison {
  originalPeriod: string;
  targetPeriod: string;
  indexTypeUsed: 'INDEC_ICC' | 'CAMARCO' | 'COMPONENT_SPECIFIC' | 'MATERIAL_DATABASE';
  originalTotalCost: number;
  updatedTotalCost: number;
  totalVariationPercentage: number;
  originalMaterials: number;
  updatedMaterials: number;
  materialsVariationPercentage: number;
  originalLabor: number;
  updatedLabor: number;
  laborVariationPercentage: number;
  originalEquipment: number;
  updatedEquipment: number;
  equipmentVariationPercentage: number;
  originalOverhead: number;
  updatedOverhead: number;
  overheadVariationPercentage: number;
  originalCostPerM2: number;
  updatedCostPerM2: number;
  topInflationDrivers: {
    name: string;
    category: CostCategory;
    rubroName: string;
    originalCost: number;
    updatedCost: number;
    variationPercent: number;
    impactAmount: number;
  }[];
}
