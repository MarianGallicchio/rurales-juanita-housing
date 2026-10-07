import { RegionalModifier } from './tipos';

export const ARGENTINE_REGIONS: RegionalModifier[] = [
  {
    id: 'buenos_aires',
    name: 'Provincia de Buenos Aires (GBA / Interior)',
    materialCoefficient: 1.00,
    laborCoefficient: 1.00,
    freightCoefficient: 1.02,
    description: 'Referencia base nacional (Centros de distribución y corralones directos)'
  },
  {
    id: 'caba',
    name: 'CABA (Ciudad Autónoma de Buenos Aires)',
    materialCoefficient: 1.02,
    laborCoefficient: 1.05,
    freightCoefficient: 1.08,
    description: 'Costos logísticos urbanos, accesibilidad y tarifas horarias de CABA'
  },
  {
    id: 'cordoba',
    name: 'Córdoba (Capital e Interior)',
    materialCoefficient: 1.03,
    laborCoefficient: 0.98,
    freightCoefficient: 1.04,
    description: 'Excelente provisión de áridos y cementeras regionales (Yocsina / Malagueño)'
  },
  {
    id: 'santa_fe',
    name: 'Santa Fe (Rosario / Santa Fe Capital)',
    materialCoefficient: 1.02,
    laborCoefficient: 0.99,
    freightCoefficient: 1.03,
    description: 'Polo metalúrgico e hidrovía con gran disponibilidad de acero y áridos'
  },
  {
    id: 'mendoza',
    name: 'Mendoza (Cuyo)',
    materialCoefficient: 1.06,
    laborCoefficient: 0.97,
    freightCoefficient: 1.07,
    description: 'Condiciones sismorresistentes (INPRES-CIRSOC) y fletes de insumos pesados'
  },
  {
    id: 'entre_rios',
    name: 'Entre Ríos (Litoral)',
    materialCoefficient: 1.04,
    laborCoefficient: 0.96,
    freightCoefficient: 1.05,
    description: 'Disponibilidad de arenas del río Uruguay y maderas de forestación'
  },
  {
    id: 'patagonia',
    name: 'Patagonia (Neuquén, Río Negro, Chubut, etc.)',
    materialCoefficient: 1.18,
    laborCoefficient: 1.25,
    freightCoefficient: 1.22,
    description: 'Zona desfavorable UOCRA (adicional patagónico +20-30%) y mayores fletes'
  },
  {
    id: 'noa_nea',
    name: 'NOA / NEA (Tucumán, Salta, Misiones, Chaco)',
    materialCoefficient: 1.08,
    laborCoefficient: 0.94,
    freightCoefficient: 1.10,
    description: 'Incidencia de flete de larga distancia en aceros, perfiles y artefactos'
  }
];
