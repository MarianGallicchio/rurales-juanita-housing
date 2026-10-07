import {
  ArgentineRegion,
  BudgetItem,
  BudgetCostSummary,
  BudgetUpdateComparison,
  ConstructionProject,
  CostCategory
} from './tipos';
import { getIndexForPeriod, OFFICIAL_INDEXES_HISTORY } from './indices';
import { MATERIALS_DATABASE } from './materiales';
import { ARGENTINE_REGIONS } from './regiones';

export function formatARS(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '$ 0';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount);
}

export function formatPercent(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return '0.0%';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

export function calculateProjectSummary(project: ConstructionProject): BudgetCostSummary {
  let materialsCost = 0;
  let laborCost = 0;
  let equipmentCost = 0;
  let directOverheadItemsCost = 0;
  let totalItemsCount = 0;
  const rubroSubtotals: { [rubroId: number]: number } = {};

  const regionMod = ARGENTINE_REGIONS.find(r => r.id === project.region) || ARGENTINE_REGIONS[0];

  project.rubros.forEach(rubro => {
    let currentRubroSubtotal = 0;
    (rubro.items || []).forEach(item => {
      totalItemsCount++;
      // Apply regional modifier
      let regFactor = 1.0;
      if (item.costType === 'material') regFactor = regionMod.materialCoefficient;
      else if (item.costType === 'labor') regFactor = regionMod.laborCoefficient;
      else if (item.costType === 'overhead') regFactor = regionMod.freightCoefficient;

      const effectiveUnitPrice = item.unitPrice * regFactor;
      const itemSubtotal = (item.quantity || 0) * effectiveUnitPrice;
      currentRubroSubtotal += itemSubtotal;

      switch (item.costType) {
        case 'material':
          materialsCost += itemSubtotal;
          break;
        case 'labor':
          laborCost += itemSubtotal;
          break;
        case 'equipment':
          equipmentCost += itemSubtotal;
          break;
        case 'overhead':
          directOverheadItemsCost += itemSubtotal;
          break;
      }
    });
    rubroSubtotals[rubro.id] = currentRubroSubtotal;
  });

  const subtotalDirectCost = materialsCost + laborCost + equipmentCost;
  const percentOverhead = (subtotalDirectCost * (project.overheadPercentage || 0)) / 100;
  const totalOverhead = directOverheadItemsCost + percentOverhead;

  const costBasisForProfit = subtotalDirectCost + totalOverhead;
  const profitCost = (costBasisForProfit * (project.profitPercentage || 0)) / 100;

  const subtotalBeforeTax = subtotalDirectCost + totalOverhead + profitCost;
  const taxCost = (subtotalBeforeTax * (project.taxPercentage || 0)) / 100;
  const totalCostARS = subtotalBeforeTax + taxCost;

  // Weighted surface (semi-covered at 50%)
  const effectiveArea = (project.totalAreaM2 || 1) + ((project.semiCoveredAreaM2 || 0) * 0.5);
  const costPerM2 = effectiveArea > 0 ? totalCostARS / effectiveArea : 0;

  return {
    materialsCost,
    laborCost,
    equipmentCost,
    subtotalDirectCost,
    overheadCost: totalOverhead,
    profitCost,
    subtotalBeforeTax,
    taxCost,
    totalCostARS,
    costPerM2,
    totalItemsCount,
    rubroSubtotals
  };
}

function getComponentRatios(
  basePeriod: string,
  targetPeriod: string,
  indexMode: 'INDEC_ICC' | 'CAMARCO' | 'COMPONENT_SPECIFIC' | 'MATERIAL_DATABASE' = 'COMPONENT_SPECIFIC'
) {
  const baseIndex = getIndexForPeriod(basePeriod) || OFFICIAL_INDEXES_HISTORY[0];
  const targetIndex = getIndexForPeriod(targetPeriod) || OFFICIAL_INDEXES_HISTORY[OFFICIAL_INDEXES_HISTORY.length - 1];
  let matRatio = targetIndex.indecMateriales / baseIndex.indecMateriales;
  let labRatio = targetIndex.indecManoObra / baseIndex.indecManoObra;
  let eqRatio = targetIndex.indecGastosGenerales / baseIndex.indecGastosGenerales;
  let ovRatio = targetIndex.indecGastosGenerales / baseIndex.indecGastosGenerales;
  if (indexMode === 'CAMARCO') {
    const camarcoRatio = targetIndex.camarcoCostos / baseIndex.camarcoCostos;
    matRatio = labRatio = eqRatio = ovRatio = camarcoRatio;
  } else if (indexMode === 'INDEC_ICC') {
    const generalRatio = targetIndex.indecIccGeneral / baseIndex.indecIccGeneral;
    matRatio = labRatio = eqRatio = ovRatio = generalRatio;
  }
  return { matRatio, labRatio, eqRatio, ovRatio, baseIndex, targetIndex };
}

function getRegionalFactor(item: BudgetItem, regionId: ArgentineRegion): number {
  const regionMod = ARGENTINE_REGIONS.find(r => r.id === regionId) || ARGENTINE_REGIONS[0];
  if (item.costType === 'material') return regionMod.materialCoefficient;
  if (item.costType === 'labor') return regionMod.laborCoefficient;
  if (item.costType === 'overhead') return regionMod.freightCoefficient;
  return 1.0;
}

export function updateProjectBudgetComparison(
  project: ConstructionProject,
  targetPeriod: string,
  indexMode: 'INDEC_ICC' | 'CAMARCO' | 'COMPONENT_SPECIFIC' | 'MATERIAL_DATABASE' = 'COMPONENT_SPECIFIC'
): BudgetUpdateComparison {
  const basePeriod = project.baseIndexPeriod || '2025-01';
  const { matRatio, labRatio, eqRatio, ovRatio } = getComponentRatios(basePeriod, targetPeriod, indexMode);

  const currentSummary = calculateProjectSummary(project);

  const originalMaterials = currentSummary.materialsCost;
  const updatedMaterials = originalMaterials * matRatio;

  const originalLabor = currentSummary.laborCost;
  const updatedLabor = originalLabor * labRatio;

  const originalEquipment = currentSummary.equipmentCost;
  const updatedEquipment = originalEquipment * eqRatio;

  const originalOverhead = currentSummary.overheadCost;
  const updatedOverhead = originalOverhead * ovRatio;

  const originalDirect = originalMaterials + originalLabor + originalEquipment;
  const updatedDirect = updatedMaterials + updatedLabor + updatedEquipment;

  const origProfit = (originalDirect + originalOverhead) * ((project.profitPercentage || 0) / 100);
  const updatedProfit = (updatedDirect + updatedOverhead) * ((project.profitPercentage || 0) / 100);

  const origBeforeTax = originalDirect + originalOverhead + origProfit;
  const updatedBeforeTax = updatedDirect + updatedOverhead + updatedProfit;

  const origTax = origBeforeTax * ((project.taxPercentage || 0) / 100);
  const updatedTax = updatedBeforeTax * ((project.taxPercentage || 0) / 100);

  const originalTotalCost = origBeforeTax + origTax;
  const updatedTotalCost = updatedBeforeTax + updatedTax;

  const totalVariationPercentage = originalTotalCost > 0
    ? ((updatedTotalCost - originalTotalCost) / originalTotalCost) * 100
    : 0;

  const materialsVariationPercentage = originalMaterials > 0
    ? ((updatedMaterials - originalMaterials) / originalMaterials) * 100
    : 0;

  const laborVariationPercentage = originalLabor > 0
    ? ((updatedLabor - originalLabor) / originalLabor) * 100
    : 0;

  const equipmentVariationPercentage = originalEquipment > 0
    ? ((updatedEquipment - originalEquipment) / originalEquipment) * 100
    : 0;

  const overheadVariationPercentage = originalOverhead > 0
    ? ((updatedOverhead - originalOverhead) / originalOverhead) * 100
    : 0;

  const effectiveArea = (project.totalAreaM2 || 1) + ((project.semiCoveredAreaM2 || 0) * 0.5);
  const originalCostPerM2 = originalTotalCost / effectiveArea;
  const updatedCostPerM2 = updatedTotalCost / effectiveArea;

  // Identify top inflation drivers
  const drivers: {
    name: string;
    category: CostCategory;
    rubroName: string;
    originalCost: number;
    updatedCost: number;
    variationPercent: number;
    impactAmount: number;
  }[] = [];

  // Drivers con factor regional aplicado (corrige bug anterior)
  project.rubros.forEach(rubro => {
    (rubro.items || []).forEach(item => {
      const reg = getRegionalFactor(item, project.region);
      const origCost = item.quantity * item.unitPrice * reg;
      let ratio = matRatio;
      if (item.costType === 'labor') ratio = labRatio;
      else if (item.costType === 'equipment') ratio = eqRatio;
      else if (item.costType === 'overhead') ratio = ovRatio;
      const newCost = origCost * ratio;
      const diff = newCost - origCost;
      const varPct = origCost > 0 ? (diff / origCost) * 100 : 0;
      drivers.push({
        name: item.description,
        category: item.costType,
        rubroName: rubro.name,
        originalCost: origCost,
        updatedCost: newCost,
        variationPercent: varPct,
        impactAmount: diff
      });
    });
  });

  // Sort descending by highest absolute monetary impact
  drivers.sort((a, b) => b.impactAmount - a.impactAmount);

  return {
    originalPeriod: basePeriod,
    targetPeriod,
    indexTypeUsed: indexMode,
    originalTotalCost,
    updatedTotalCost,
    totalVariationPercentage,
    originalMaterials,
    updatedMaterials,
    materialsVariationPercentage,
    originalLabor,
    updatedLabor,
    laborVariationPercentage,
    originalEquipment,
    updatedEquipment,
    equipmentVariationPercentage,
    originalOverhead,
    updatedOverhead,
    overheadVariationPercentage,
    originalCostPerM2,
    updatedCostPerM2,
    topInflationDrivers: drivers.slice(0, 8)
  };
}

export function applyIndexUpdateToProject(
  project: ConstructionProject,
  targetPeriod: string,
  indexMode: 'INDEC_ICC' | 'CAMARCO' | 'COMPONENT_SPECIFIC' | 'MATERIAL_DATABASE' = 'COMPONENT_SPECIFIC'
): ConstructionProject {
  const basePeriod = project.baseIndexPeriod || '2025-01';
  const { matRatio, labRatio, eqRatio, ovRatio } = getComponentRatios(basePeriod, targetPeriod, indexMode);

  const updatedRubros = project.rubros.map(rubro => ({
    ...rubro,
    items: rubro.items.map(item => {
      let ratio = matRatio;
      if (item.costType === 'labor') ratio = labRatio;
      else if (item.costType === 'equipment') ratio = eqRatio;
      else if (item.costType === 'overhead') ratio = ovRatio;

      const newUnitPrice = Math.round(item.unitPrice * ratio);
      return {
        ...item,
        unitPrice: newUnitPrice,
        notes: item.notes ? `${item.notes} | Actualizado a ${targetPeriod}` : `Actualizado a ${targetPeriod}`
      };
    })
  }));

  return {
    ...project,
    baseIndexPeriod: targetPeriod,
    currentPeriod: targetPeriod,
    lastUpdatedDate: new Date().toISOString().split('T')[0],
    rubros: updatedRubros
  };
}
