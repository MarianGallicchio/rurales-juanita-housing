import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ConstructionProject } from './tipos';
import { calculateProjectSummary } from './calculo';
import { ARGENTINE_REGIONS } from './regiones';
import { fmtARS } from '@/lib/formato-ar';

export function exportarComputoPDF(project: ConstructionProject): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const summary = calculateProjectSummary(project);
  const region = ARGENTINE_REGIONS.find((r) => r.id === project.region)?.name ?? project.location;

  doc.setFillColor(7, 80, 63);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPUTO Y PRESUPUESTO DE OBRA', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Rurales Juanita · Obra Metrics — INDEC / CAMARCO / UOCRA', 14, 19);

  doc.setTextColor(33, 37, 41);
  doc.setFontSize(10);
  doc.text(`Proyecto: ${project.name}`, 14, 33);
  doc.setFontSize(8.5);
  doc.text(`Cliente: ${project.clientName || 'Particular'} · ${project.location} (${region})`, 14, 38);
  doc.text(`Sup: ${project.totalAreaM2} m2 + ${project.semiCoveredAreaM2 || 0} sem. · Base: ${project.baseIndexPeriod} · Estado: ${project.status}`, 14, 43);
  doc.setFontSize(12);
  doc.text(`TOTAL: ${fmtARS(summary.totalCostARS)}  (${fmtARS(summary.costPerM2)}/m2)`, 14, 50);

  const rows: string[][] = [];
  project.rubros.forEach((rubro) => {
    rows.push([`Rubro ${rubro.number}: ${rubro.name}`, '', '', '']);
    (rubro.items || []).forEach((it) => {
      rows.push([it.description, `${it.quantity} ${it.unit}`, fmtARS(it.unitPrice), fmtARS(it.quantity * it.unitPrice)]);
    });
  });

  autoTable(doc, {
    startY: 54,
    head: [['Descripcion', 'Cant.', 'P. unit', 'Subtotal']],
    body: rows,
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [7, 80, 63] },
  });
  doc.save(`computo-${project.id}.pdf`);
}

export function exportarComputoExcel(project: ConstructionProject): void {
  const summary = calculateProjectSummary(project);
  const wsData: (string | number)[][] = [
    ['Proyecto', project.name],
    ['Cliente', project.clientName],
    ['Ubicacion', project.location],
    ['Total ARS', summary.totalCostARS],
    ['$/m2', Math.round(summary.costPerM2)],
    [],
    ['Rubro', 'Descripcion', 'Unidad', 'Cantidad', 'P.unit ARS', 'Subtotal ARS'],
  ];
  project.rubros.forEach((r) => {
    (r.items || []).forEach((it) => {
      wsData.push([`R${r.number} ${r.name}`, it.description, it.unit, it.quantity, it.unitPrice, it.quantity * it.unitPrice]);
    });
  });
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'computo');
  XLSX.writeFile(wb, `computo-${project.id}.xlsx`);
}
