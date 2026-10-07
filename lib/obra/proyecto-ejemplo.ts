import { ConstructionProject, RubroSection } from './tipos';

export const STANDARD_RUBROS_DEFINITIONS: { id: number; name: string; description: string; iconName: string }[] = [
  { id: 1, name: 'Trabajos Preliminares', description: 'Limpieza de terreno, replanteo, obrador y cercos perimetrales', iconName: 'Compass' },
  { id: 2, name: 'Movimiento de Suelos', description: 'Excavaciones para cimientos, nivelación y retiro de tierra', iconName: 'Shovel' },
  { id: 3, name: 'Fundaciones y Cimientos', description: 'Zapatas corridas, pilotines, vigas de fundación y plateas', iconName: 'Anchor' },
  { id: 4, name: 'Estructuras Resistentes', description: 'Columnas, vigas, losas de hormigón armado y perfiles de acero', iconName: 'Building2' },
  { id: 5, name: 'Mampostería y Tabiques', description: 'Muros de elevación cerámicos, portantes, comunes y durlock', iconName: 'Layers' },
  { id: 6, name: 'Cubiertas y Techos', description: 'Chapa prepintada, losa plana con membrana, tirantes y aislación', iconName: 'Home' },
  { id: 7, name: 'Instalación Sanitaria y Gas', description: 'Distribución termofusión, desagües cloacales, gas epoxi/sigas', iconName: 'Droplet' },
  { id: 8, name: 'Instalación Eléctrica', description: 'Cañerías, cableado normalizado, tableros, térmicas y luminarias', iconName: 'Zap' },
  { id: 9, name: 'Pisos y Revestimientos', description: 'Contrapisos, carpetas, cerámicos, porcelanatos y zócalos', iconName: 'Grid' },
  { id: 10, name: 'Pintura y Terminaciones', description: 'Enduido, látex interior mate, impermeabilizante exterior', iconName: 'Paintbrush' },
  { id: 11, name: 'Carpinterías y Vidrios', description: 'Puertas placa, frentes de placard, aberturas de aluminio DVH', iconName: 'DoorOpen' },
  { id: 12, name: 'Mano de Obra Específica', description: 'Jornales calificados, montajes y cuadrillas de albañilería', iconName: 'HardHat' },
  { id: 13, name: 'Equipos y Maquinarias', description: 'Hormigoneras, andamios tubulares, demoledores y bombas', iconName: 'Wrench' },
  { id: 14, name: 'Fletes y Transporte', description: 'Descargas en obra, acarreo de materiales pesados y volquetes', iconName: 'Truck' },
  { id: 15, name: 'Gastos Generales y Seguros', description: 'Cartel de obra, seguro de vida obrero, ART y trámites municipales', iconName: 'FileText' },
];

export function createEmptyProject(
  name: string,
  clientName: string,
  location: string,
  totalAreaM2: number = 100
): ConstructionProject {
  const rubros: RubroSection[] = STANDARD_RUBROS_DEFINITIONS.map(r => ({
    id: r.id,
    number: r.id,
    name: r.name,
    description: r.description,
    iconName: r.iconName,
    items: []
  }));

  return {
    id: 'proj-' + Date.now(),
    name: name || 'Nueva Obra',
    clientName: clientName || 'Cliente Particular',
    location: location || 'Buenos Aires',
    region: 'buenos_aires',
    projectType: 'Vivienda Unifamiliar',
    totalAreaM2,
    semiCoveredAreaM2: Math.round(totalAreaM2 * 0.15),
    createdDate: new Date().toISOString().split('T')[0],
    baseIndexPeriod: '2025-01',
    currentPeriod: '2026-08',
    validityDays: 15,
    overheadPercentage: 8,
    profitPercentage: 15,
    taxPercentage: 21,
    rubros,
    status: 'Borrador',
    lastUpdatedDate: new Date().toISOString().split('T')[0]
  };
}

export const SAMPLE_VIVIENDA_UNIFAMILIAR: ConstructionProject = {
  id: 'proj-vivienda-120',
  name: 'Vivienda Unifamiliar Los Alerces (120 m²)',
  clientName: 'Ing. Carlos Mendoza / Arq. Lucía Rossi',
  location: 'Pilar, Prov. de Buenos Aires',
  region: 'buenos_aires',
  projectType: 'Vivienda Unifamiliar',
  totalAreaM2: 120,
  semiCoveredAreaM2: 24,
  createdDate: '2025-01-15',
  baseIndexPeriod: '2025-01',
  currentPeriod: '2026-08',
  validityDays: 20,
  overheadPercentage: 8,
  profitPercentage: 15,
  taxPercentage: 21,
  status: 'Aprobado',
  lastUpdatedDate: '2026-08-20',
  notes: 'Presupuesto base confeccionado en Enero 2025. Incluye platea de fundación, muros portantes del 18, cubierta de chapa con cielorraso suspendido y carpinterías módena.',
  rubros: [
    {
      id: 1,
      number: 1,
      name: 'Trabajos Preliminares',
      description: 'Limpieza de terreno, replanteo, obrador y cercos perimetrales',
      iconName: 'Compass',
      items: [
        {
          id: 'item-1-1',
          rubroId: 1,
          code: 'PRE-01',
          description: 'Limpieza, desmalezado y nivelación de terreno manual/mecánica',
          unit: 'm²',
          quantity: 250,
          unitPrice: 2200,
          costType: 'labor',
          historicalBasePrice: 1200
        },
        {
          id: 'item-1-2',
          rubroId: 1,
          code: 'PRE-02',
          description: 'Replanteo y escuadra de obra con caballetes de madera',
          unit: 'Global',
          quantity: 1,
          unitPrice: 420000,
          costType: 'labor',
          historicalBasePrice: 230000
        },
        {
          id: 'item-1-3',
          rubroId: 1,
          code: 'PRE-03',
          description: 'Obrador provisorio y cerco perimetral de obra con media sombra',
          unit: 'Global',
          quantity: 1,
          unitPrice: 650000,
          costType: 'material',
          historicalBasePrice: 350000
        }
      ]
    },
    {
      id: 2,
      number: 2,
      name: 'Movimiento de Suelos',
      description: 'Excavaciones para cimientos, nivelación y retiro de tierra',
      iconName: 'Shovel',
      items: [
        {
          id: 'item-2-1',
          rubroId: 2,
          code: 'MOV-01',
          description: 'Excavación para vigas de encadenado y platea (suelo semiduro)',
          unit: 'm³',
          quantity: 38,
          unitPrice: 28000,
          costType: 'labor',
          historicalBasePrice: 15500
        },
        {
          id: 'item-2-2',
          rubroId: 2,
          code: 'MOV-02',
          description: 'Relleno, nivelación y compactación con tosca seleccionada',
          unit: 'm³',
          quantity: 45,
          unitPrice: 32000,
          costType: 'material',
          historicalBasePrice: 17500
        }
      ]
    },
    {
      id: 3,
      number: 3,
      name: 'Fundaciones y Cimientos',
      description: 'Zapatas corridas, pilotines, vigas de fundación y plateas',
      iconName: 'Anchor',
      items: [
        {
          id: 'item-3-1',
          rubroId: 3,
          code: 'FUN-01',
          description: 'Film de polietileno 200 micrones bajo platea (barrera de vapor)',
          unit: 'm²',
          quantity: 140,
          unitPrice: 2800,
          costType: 'material',
          historicalBasePrice: 1500
        },
        {
          id: 'item-3-2',
          rubroId: 3,
          code: 'FUN-02',
          description: 'Malla electrosoldada SIMA Q188 (15x15 cm Ø6mm) doble capa',
          unit: 'Panel 14.4 m²',
          quantity: 20,
          unitPrice: 89500,
          costType: 'material',
          historicalBasePrice: 48000
        },
        {
          id: 'item-3-3',
          rubroId: 3,
          code: 'FUN-03',
          description: 'Hormigón elaborado H-21 colado en platea de 15cm y vigas',
          unit: 'm³',
          quantity: 24,
          unitPrice: 145000,
          costType: 'material',
          historicalBasePrice: 78000
        },
        {
          id: 'item-3-4',
          rubroId: 3,
          code: 'FUN-04',
          description: 'Mano de obra para armado de hierro, encofrado y llenado platea',
          unit: 'm²',
          quantity: 120,
          unitPrice: 24500,
          costType: 'labor',
          historicalBasePrice: 13500
        }
      ]
    },
    {
      id: 4,
      number: 4,
      name: 'Estructuras Resistentes',
      description: 'Columnas, vigas, losas de hormigón armado y perfiles de acero',
      iconName: 'Building2',
      items: [
        {
          id: 'item-4-1',
          rubroId: 4,
          code: 'EST-01',
          description: 'Columnas de encadenado y refuerzos verticales H-21 con hierro Ø10 y estribos Ø6',
          unit: 'ml',
          quantity: 85,
          unitPrice: 38000,
          costType: 'material',
          historicalBasePrice: 20500
        },
        {
          id: 'item-4-2',
          rubroId: 4,
          code: 'EST-02',
          description: 'Viga de encadenado superior 18x20 cm perimetral',
          unit: 'ml',
          quantity: 92,
          unitPrice: 42000,
          costType: 'material',
          historicalBasePrice: 22800
        },
        {
          id: 'item-4-3',
          rubroId: 4,
          code: 'EST-03',
          description: 'Mano de obra oficial y armador para hormigonado de estructura',
          unit: 'Global',
          quantity: 1,
          unitPrice: 2850000,
          costType: 'labor',
          historicalBasePrice: 1550000
        }
      ]
    },
    {
      id: 5,
      number: 5,
      name: 'Mampostería y Tabiques',
      description: 'Muros de elevación cerámicos, portantes, comunes y durlock',
      iconName: 'Layers',
      items: [
        {
          id: 'item-5-1',
          rubroId: 5,
          code: 'MAM-01',
          description: 'Muro exterior portante cerámico 18x19x33 con mortero 1:1:5',
          unit: 'm²',
          quantity: 165,
          unitPrice: 34000,
          costType: 'material',
          historicalBasePrice: 18500
        },
        {
          id: 'item-5-2',
          rubroId: 5,
          code: 'MAM-02',
          description: 'Tabique divisorio cerámico hueco 12x18x33 para dormitorios y baños',
          unit: 'm²',
          quantity: 95,
          unitPrice: 24500,
          costType: 'material',
          historicalBasePrice: 13200
        },
        {
          id: 'item-5-3',
          rubroId: 5,
          code: 'MAM-03',
          description: 'Capa aisladora horizontal doble con hidrófugo Ceresita en alzado',
          unit: 'ml',
          quantity: 110,
          unitPrice: 9800,
          costType: 'material',
          historicalBasePrice: 5300
        },
        {
          id: 'item-5-4',
          rubroId: 5,
          code: 'MAM-04',
          description: 'Mano de obra albañilería para elevación de muros y tabiques',
          unit: 'm²',
          quantity: 260,
          unitPrice: 19500,
          costType: 'labor',
          historicalBasePrice: 10800
        }
      ]
    },
    {
      id: 6,
      number: 6,
      name: 'Cubiertas y Techos',
      description: 'Chapa prepintada, losa plana con membrana, tirantes y aislación',
      iconName: 'Home',
      items: [
        {
          id: 'item-6-1',
          rubroId: 6,
          code: 'CUB-01',
          description: 'Estructura metálica con perfilería C 120x50x2mm galvanizada',
          unit: 'kg',
          quantity: 980,
          unitPrice: 3400,
          costType: 'material',
          historicalBasePrice: 1850
        },
        {
          id: 'item-6-2',
          rubroId: 6,
          code: 'CUB-02',
          description: 'Cubierta de chapa sinusoidal C25 color gris grafito cincalum',
          unit: 'm²',
          quantity: 155,
          unitPrice: 21500,
          costType: 'material',
          historicalBasePrice: 11600
        },
        {
          id: 'item-6-3',
          rubroId: 6,
          code: 'CUB-03',
          description: 'Aislación térmica lana de vidrio Isover 50mm con aluminio',
          unit: 'm²',
          quantity: 155,
          unitPrice: 6800,
          costType: 'material',
          historicalBasePrice: 3700
        },
        {
          id: 'item-6-4',
          rubroId: 6,
          code: 'CUB-04',
          description: 'Mano de obra zinguería, montajes de perfiles y fijación de chapas',
          unit: 'm²',
          quantity: 155,
          unitPrice: 22000,
          costType: 'labor',
          historicalBasePrice: 12000
        }
      ]
    },
    {
      id: 7,
      number: 7,
      name: 'Instalación Sanitaria y Gas',
      description: 'Distribución termofusión, desagües cloacales, gas epoxi/sigas',
      iconName: 'Droplet',
      items: [
        {
          id: 'item-7-1',
          rubroId: 7,
          code: 'SAN-01',
          description: 'Distribución completa agua fría y caliente en termofusión PN20 (2 baños, cocina, lavadero)',
          unit: 'Boca / Puntos',
          quantity: 18,
          unitPrice: 42000,
          costType: 'material',
          historicalBasePrice: 22500
        },
        {
          id: 'item-7-2',
          rubroId: 7,
          code: 'SAN-02',
          description: 'Desagües primarios y secundarios Awaduct Ø110/63 con cámara de inspección',
          unit: 'Global',
          quantity: 1,
          unitPrice: 1150000,
          costType: 'material',
          historicalBasePrice: 620000
        },
        {
          id: 'item-7-3',
          rubroId: 7,
          code: 'SAN-03',
          description: 'Mano de obra oficial sanitarista y pruebas de estanqueidad',
          unit: 'Global',
          quantity: 1,
          unitPrice: 2100000,
          costType: 'labor',
          historicalBasePrice: 1150000
        }
      ]
    },
    {
      id: 8,
      number: 8,
      name: 'Instalación Eléctrica',
      description: 'Cañerías, cableado normalizado, tableros, térmicas y luminarias',
      iconName: 'Zap',
      items: [
        {
          id: 'item-8-1',
          rubroId: 8,
          code: 'ELE-01',
          description: 'Bocas de iluminación y tomacorrientes con cable IRAM 2.5mm² y 1.5mm²',
          unit: 'Bocas',
          quantity: 52,
          unitPrice: 19500,
          costType: 'material',
          historicalBasePrice: 10500
        },
        {
          id: 'item-8-2',
          rubroId: 8,
          code: 'ELE-02',
          description: 'Tablero principal y seccional con disyuntor bipolar y térmicas Schneider',
          unit: 'Global',
          quantity: 1,
          unitPrice: 480000,
          costType: 'material',
          historicalBasePrice: 260000
        },
        {
          id: 'item-8-3',
          rubroId: 8,
          code: 'ELE-03',
          description: 'Mano de obra electricista matriculado, pase de caños y cableado integral',
          unit: 'Bocas',
          quantity: 52,
          unitPrice: 28000,
          costType: 'labor',
          historicalBasePrice: 15000
        }
      ]
    },
    {
      id: 9,
      number: 9,
      name: 'Pisos y Revestimientos',
      description: 'Contrapisos, carpetas, cerámicos, porcelanatos y zócalos',
      iconName: 'Grid',
      items: [
        {
          id: 'item-9-1',
          rubroId: 9,
          code: 'PIS-01',
          description: 'Contrapiso de cascote 10cm y carpeta niveladora 2.5cm',
          unit: 'm²',
          quantity: 120,
          unitPrice: 16500,
          costType: 'material',
          historicalBasePrice: 8900
        },
        {
          id: 'item-9-2',
          rubroId: 9,
          code: 'PIS-02',
          description: 'Porcelanato satinado rectificado 60x60 + adhesivo Klaukol',
          unit: 'm²',
          quantity: 110,
          unitPrice: 44000,
          costType: 'material',
          historicalBasePrice: 24000
        },
        {
          id: 'item-9-3',
          rubroId: 9,
          code: 'PIS-03',
          description: 'Mano de obra colocación de porcelanato, zócalos y pastina',
          unit: 'm²',
          quantity: 110,
          unitPrice: 18500,
          costType: 'labor',
          historicalBasePrice: 10200
        }
      ]
    },
    {
      id: 10,
      number: 10,
      name: 'Pintura y Terminaciones',
      description: 'Enduido, látex interior mate, impermeabilizante exterior',
      iconName: 'Paintbrush',
      items: [
        {
          id: 'item-10-1',
          rubroId: 10,
          code: 'PIN-01',
          description: 'Látex interior mate lavable 3 manos + enduido parcial y fijador',
          unit: 'm²',
          quantity: 320,
          unitPrice: 7800,
          costType: 'material',
          historicalBasePrice: 4200
        },
        {
          id: 'item-10-2',
          rubroId: 10,
          code: 'PIN-02',
          description: 'Revestimiento plástico texturado tipo Tarquini / Quimtex exterior',
          unit: 'm²',
          quantity: 170,
          unitPrice: 16500,
          costType: 'material',
          historicalBasePrice: 9000
        },
        {
          id: 'item-10-3',
          rubroId: 10,
          code: 'PIN-03',
          description: 'Mano de obra de pintura integral interior y aplicación de texturado',
          unit: 'm²',
          quantity: 490,
          unitPrice: 9500,
          costType: 'labor',
          historicalBasePrice: 5200
        }
      ]
    },
    {
      id: 11,
      number: 11,
      name: 'Carpinterías y Vidrios',
      description: 'Puertas placa, frentes de placard, aberturas de aluminio DVH',
      iconName: 'DoorOpen',
      items: [
        {
          id: 'item-11-1',
          rubroId: 11,
          code: 'CAR-01',
          description: 'Ventanas aluminio negro Modena con DVH (6 unidades surtidas)',
          unit: 'Global',
          quantity: 1,
          unitPrice: 1710000,
          costType: 'material',
          historicalBasePrice: 912000
        },
        {
          id: 'item-11-2',
          rubroId: 11,
          code: 'CAR-02',
          description: 'Puertas placa interiores marco chapa 18 y puerta principal de seguridad',
          unit: 'Global',
          quantity: 1,
          unitPrice: 1120000,
          costType: 'material',
          historicalBasePrice: 600000
        },
        {
          id: 'item-11-3',
          rubroId: 11,
          code: 'CAR-03',
          description: 'Colocación, amurado y sellado con poliuretano expandido',
          unit: 'Global',
          quantity: 1,
          unitPrice: 380000,
          costType: 'labor',
          historicalBasePrice: 210000
        }
      ]
    },
    {
      id: 12,
      number: 12,
      name: 'Mano de Obra Específica',
      description: 'Jornales calificados, montajes y cuadrillas de albañilería',
      iconName: 'HardHat',
      items: [
        {
          id: 'item-12-1',
          rubroId: 12,
          code: 'MO-01',
          description: 'Ayudantía y limpieza de obra continua (cuadrilla de apoyo 4 meses)',
          unit: 'Mes',
          quantity: 4,
          unitPrice: 1100000,
          costType: 'labor',
          historicalBasePrice: 620000
        }
      ]
    },
    {
      id: 13,
      number: 13,
      name: 'Equipos y Maquinarias',
      description: 'Hormigoneras, andamios tubulares, demoledores y bombas',
      iconName: 'Wrench',
      items: [
        {
          id: 'item-13-1',
          rubroId: 13,
          code: 'EQU-01',
          description: 'Alquiler de trompo hormigonero y vibrador de inmersión por 6 meses',
          unit: 'Mes',
          quantity: 6,
          unitPrice: 85000,
          costType: 'equipment',
          historicalBasePrice: 46000
        },
        {
          id: 'item-13-2',
          rubroId: 13,
          code: 'EQU-02',
          description: 'Alquiler de andamios tubulares con tablones metálicos reglamentarios',
          unit: 'Global',
          quantity: 1,
          unitPrice: 320000,
          costType: 'equipment',
          historicalBasePrice: 175000
        }
      ]
    },
    {
      id: 14,
      number: 14,
      name: 'Fletes y Transporte',
      description: 'Descargas en obra, acarreo de materiales pesados y volquetes',
      iconName: 'Truck',
      items: [
        {
          id: 'item-14-1',
          rubroId: 14,
          code: 'FLE-01',
          description: 'Servicio de volquetes para retiro de escombros y restos de obra',
          unit: 'Volquete',
          quantity: 10,
          unitPrice: 75000,
          costType: 'overhead',
          historicalBasePrice: 40000
        },
        {
          id: 'item-14-2',
          rubroId: 14,
          code: 'FLE-02',
          description: 'Fletes de áridos, hierros y carpinterías directos a pie de obra',
          unit: 'Viajes',
          quantity: 8,
          unitPrice: 55000,
          costType: 'overhead',
          historicalBasePrice: 30000
        }
      ]
    },
    {
      id: 15,
      number: 15,
      name: 'Gastos Generales y Seguros',
      description: 'Cartel de obra, seguro de vida obrero, ART y trámites municipales',
      iconName: 'FileText',
      items: [
        {
          id: 'item-15-1',
          rubroId: 15,
          code: 'GAS-01',
          description: 'Cartel reglamentario, botiquín, matafuegos y elementos de protección EPP',
          unit: 'Global',
          quantity: 1,
          unitPrice: 280000,
          costType: 'overhead',
          historicalBasePrice: 150000
        },
        {
          id: 'item-15-2',
          rubroId: 15,
          code: 'GAS-02',
          description: 'Seguro de Responsabilidad Civil linderos y accidentes de trabajo',
          unit: 'Global',
          quantity: 1,
          unitPrice: 450000,
          costType: 'overhead',
          historicalBasePrice: 240000
        }
      ]
    }
  ]
};

export const SAMPLE_REFACCION_BAÑO_COCINA: ConstructionProject = {
  id: 'proj-refaccion-35',
  name: 'Refacción Integral Cocina y Baño Principal (35 m²)',
  clientName: 'Dra. Florencia Gómez',
  location: 'Rosario, Santa Fe',
  region: 'santa_fe',
  projectType: 'Refacción / Ampliación',
  totalAreaM2: 35,
  semiCoveredAreaM2: 0,
  createdDate: '2025-06-10',
  baseIndexPeriod: '2025-06',
  currentPeriod: '2026-08',
  validityDays: 15,
  overheadPercentage: 6,
  profitPercentage: 18,
  taxPercentage: 21,
  status: 'En Ejecución',
  lastUpdatedDate: '2026-08-18',
  notes: 'Picado total de revestimientos antiguos, cañerías termofusión nuevas, porcelanato, muebles a medida y artefactos.',
  rubros: [
    {
      id: 1,
      number: 1,
      name: 'Trabajos Preliminares',
      description: 'Protección de accesos y demolición de revestimientos',
      iconName: 'Compass',
      items: [
        {
          id: 'ref-1-1',
          rubroId: 1,
          code: 'DEM-01',
          description: 'Picado y demolición de azulejos, pisos viejos y cañerías de plomo',
          unit: 'Global',
          quantity: 1,
          unitPrice: 780000,
          costType: 'labor',
          historicalBasePrice: 580000
        }
      ]
    },
    {
      id: 7,
      number: 7,
      name: 'Instalación Sanitaria y Gas',
      description: 'Cañerías nuevas termofusión y desagües',
      iconName: 'Droplet',
      items: [
        {
          id: 'ref-7-1',
          rubroId: 7,
          code: 'SAN-R1',
          description: 'Instalación completa de agua fría/caliente en termofusión para cocina y baño',
          unit: 'Global',
          quantity: 1,
          unitPrice: 950000,
          costType: 'material',
          historicalBasePrice: 720000
        },
        {
          id: 'ref-7-2',
          rubroId: 7,
          code: 'SAN-R2',
          description: 'Mano de obra sanitarista matriculado',
          unit: 'Global',
          quantity: 1,
          unitPrice: 1350000,
          costType: 'labor',
          historicalBasePrice: 1020000
        }
      ]
    },
    {
      id: 9,
      number: 9,
      name: 'Pisos y Revestimientos',
      description: 'Revestimiento cerámico y porcelanato',
      iconName: 'Grid',
      items: [
        {
          id: 'ref-9-1',
          rubroId: 9,
          code: 'PIS-R1',
          description: 'Porcelanato rectificado 60x120 símil calacatta + Klaukol',
          unit: 'm²',
          quantity: 55,
          unitPrice: 42000,
          costType: 'material',
          historicalBasePrice: 32000
        },
        {
          id: 'ref-9-2',
          rubroId: 9,
          code: 'PIS-R2',
          description: 'Colocación de porcelanatos en paredes y pisos con niveladores',
          unit: 'm²',
          quantity: 55,
          unitPrice: 21000,
          costType: 'labor',
          historicalBasePrice: 16000
        }
      ]
    },
    {
      id: 14,
      number: 14,
      name: 'Fletes y Transporte',
      description: 'Volquetes para escombros',
      iconName: 'Truck',
      items: [
        {
          id: 'ref-14-1',
          rubroId: 14,
          code: 'FLE-R1',
          description: 'Alquiler y retiro de volquetes cerrados para escombros (4 viajes)',
          unit: 'Viaje',
          quantity: 4,
          unitPrice: 72000,
          costType: 'overhead',
          historicalBasePrice: 52000
        }
      ]
    }
  ]
};
