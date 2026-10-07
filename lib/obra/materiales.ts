import { MaterialItem } from './tipos';

export const MATERIALS_DATABASE: MaterialItem[] = [
  // CEMENTOS Y ÁRIDOS
  {
    id: 'mat-cemento-50',
    code: 'CEM-01',
    name: 'Cemento Portland Normal (Loma Negra / Holcim)',
    category: 'Cementos y Cal',
    unit: 'Bolsa 50 kg',
    referencePrice: 14850,
    source: 'CAMARCO',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 8200,
      '2025-06': 10500,
      '2026-01': 12800,
      '2026-08': 14850
    },
    brandExample: 'Loma Negra CPC 40 / Holcim Fuerte',
    specNotes: 'Apto para todo tipo de estructuras y hormigón elaborado'
  },
  {
    id: 'mat-cal-25',
    code: 'CAL-01',
    name: 'Cal Aérea Hidratada en Polvo (Cacique / El Milagro)',
    category: 'Cementos y Cal',
    unit: 'Bolsa 25 kg',
    referencePrice: 6200,
    source: 'CAMARCO',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 3500,
      '2025-06': 4400,
      '2026-01': 5300,
      '2026-08': 6200
    },
    brandExample: 'Cacique Máxima Pureza',
    specNotes: 'Para revoques y morteros de asiento aéreos'
  },
  {
    id: 'mat-arena-gruesa',
    code: 'ARI-01',
    name: 'Arena Gruesa de Río / Lavada',
    category: 'Áridos',
    unit: 'm³',
    referencePrice: 38500,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 21000,
      '2025-06': 27500,
      '2026-01': 33000,
      '2026-08': 38500
    },
    specNotes: 'Árido limpio clasificado para hormigón y contrapisos'
  },
  {
    id: 'mat-arena-fina',
    code: 'ARI-02',
    name: 'Arena Fina tamizada para enlucidos',
    category: 'Áridos',
    unit: 'm³',
    referencePrice: 42000,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 23000,
      '2025-06': 30000,
      '2026-01': 36500,
      '2026-08': 42000
    },
    specNotes: 'Para revoque fino interior y exterior'
  },
  {
    id: 'mat-piedra-partida',
    code: 'ARI-03',
    name: 'Piedra Partida Granítica 6-20 mm',
    category: 'Áridos',
    unit: 'm³',
    referencePrice: 52000,
    source: 'CAMARCO',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 28500,
      '2025-06': 37000,
      '2026-01': 45000,
      '2026-08': 52000
    },
    specNotes: 'Árido grueso para estructuras de hormigón armado H21/H30'
  },
  {
    id: 'mat-cascote-limpio',
    code: 'ARI-04',
    name: 'Cascote de Ladrillo Triturado y Limpio',
    category: 'Áridos',
    unit: 'm³',
    referencePrice: 24000,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 13000,
      '2025-06': 17000,
      '2026-01': 20500,
      '2026-08': 24000
    },
    specNotes: 'Para contrapisos sobre terreno natural y relleno'
  },

  // HIERROS Y ACEROS
  {
    id: 'mat-hierro-8',
    code: 'ACE-01',
    name: 'Hierro Conformado ADN 420 - Ø 8 mm (Barra 12m)',
    category: 'Aceros y Mallas',
    unit: 'Barra 12m',
    referencePrice: 11400,
    source: 'INDEC',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 6100,
      '2025-06': 7900,
      '2026-01': 9600,
      '2026-08': 11400
    },
    brandExample: 'Acindar / Acerbrag',
    specNotes: 'Acero de dureza natural para armaduras'
  },
  {
    id: 'mat-hierro-10',
    code: 'ACE-02',
    name: 'Hierro Conformado ADN 420 - Ø 10 mm (Barra 12m)',
    category: 'Aceros y Mallas',
    unit: 'Barra 12m',
    referencePrice: 17800,
    source: 'INDEC',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 9600,
      '2025-06': 12400,
      '2026-01': 15100,
      '2026-08': 17800
    },
    brandExample: 'Acindar / Acerbrag'
  },
  {
    id: 'mat-hierro-12',
    code: 'ACE-03',
    name: 'Hierro Conformado ADN 420 - Ø 12 mm (Barra 12m)',
    category: 'Aceros y Mallas',
    unit: 'Barra 12m',
    referencePrice: 25600,
    source: 'INDEC',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 13800,
      '2025-06': 17900,
      '2026-01': 21800,
      '2026-08': 25600
    },
    brandExample: 'Acindar / Acerbrag'
  },
  {
    id: 'mat-malla-sima',
    code: 'ACE-04',
    name: 'Malla Electrosoldada SIMA Q188 (15x15 cm Ø6mm - 6x2.40m)',
    category: 'Aceros y Mallas',
    unit: 'Panel 14.4 m²',
    referencePrice: 89500,
    source: 'CAMARCO',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 48000,
      '2025-06': 62500,
      '2026-01': 76000,
      '2026-08': 89500
    },
    specNotes: 'Para plateas de fundación, losas y pisos industriales'
  },
  {
    id: 'mat-alambre-fardo',
    code: 'ACE-05',
    name: 'Alambre de Fardo N° 16 para ataduras',
    category: 'Aceros y Mallas',
    unit: 'kg',
    referencePrice: 3400,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 1800,
      '2025-06': 2350,
      '2026-01': 2900,
      '2026-08': 3400
    }
  },

  // MAMPOSTERÍA Y LADRILLOS
  {
    id: 'mat-ladrillo-hueco-12',
    code: 'LAD-01',
    name: 'Ladrillo Cerámico Hueco 12x18x33 (6 tubos)',
    category: 'Mampostería',
    unit: 'Unidad',
    referencePrice: 890,
    source: 'INDEC',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 480,
      '2025-06': 620,
      '2026-01': 760,
      '2026-08': 890
    },
    brandExample: 'Cerámica Quilmes / Fanelli / Palmar',
    specNotes: 'Para muros interiores y tabiques divisorios (16 un/m²)'
  },
  {
    id: 'mat-ladrillo-hueco-18',
    code: 'LAD-02',
    name: 'Ladrillo Cerámico Hueco 18x18x33 (9 tubos)',
    category: 'Mampostería',
    unit: 'Unidad',
    referencePrice: 1250,
    source: 'INDEC',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 670,
      '2025-06': 870,
      '2026-01': 1060,
      '2026-08': 1250
    },
    brandExample: 'Cerámica Quilmes / Fanelli',
    specNotes: 'Para muros exteriores con aislación térmica'
  },
  {
    id: 'mat-ladrillo-portante-18',
    code: 'LAD-03',
    name: 'Ladrillo Portante Cerámico 18x19x33',
    category: 'Mampostería',
    unit: 'Unidad',
    referencePrice: 1620,
    source: 'CAMARCO',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 880,
      '2025-06': 1140,
      '2026-01': 1380,
      '2026-08': 1620
    },
    specNotes: 'Apto muros portantes de mampostería sismorresistente'
  },
  {
    id: 'mat-ladrillo-comun',
    code: 'LAD-04',
    name: 'Ladrillo Común de Campo Horneado',
    category: 'Mampostería',
    unit: 'Millar (1000 un)',
    referencePrice: 220000,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 120000,
      '2025-06': 155000,
      '2026-01': 188000,
      '2026-08': 220000
    },
    specNotes: 'Para cimientos, mampostería a la vista y capas aisladoras'
  },

  // HORMIGÓN ELABORADO
  {
    id: 'mat-hormigon-h21',
    code: 'HOR-01',
    name: 'Hormigón Elaborado H-21 con piedra partida en planta',
    category: 'Hormigón',
    unit: 'm³',
    referencePrice: 145000,
    source: 'CAMARCO',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 78000,
      '2025-06': 102000,
      '2026-01': 124000,
      '2026-08': 145000
    },
    specNotes: 'Resistencia característica 210 kg/cm² a los 28 días'
  },
  {
    id: 'mat-hormigon-bomba',
    code: 'HOR-02',
    name: 'Servicio de Bomba Pluma para Hormigonado (hasta 28m)',
    category: 'Hormigón',
    unit: 'Servicio / Viaje',
    referencePrice: 290000,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 155000,
      '2025-06': 205000,
      '2026-01': 248000,
      '2026-08': 290000
    }
  },

  // AISLACIONES Y QUÍMICOS
  {
    id: 'mat-hidrofugo-ceresita',
    code: 'AIS-01',
    name: 'Hidrófugo Químico Inorgánico Concentrado (Ceresita / Sika 1)',
    category: 'Aislaciones',
    unit: 'Balde 20 kg',
    referencePrice: 34500,
    source: 'CAMARCO',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 18500,
      '2025-06': 24200,
      '2026-01': 29500,
      '2026-08': 34500
    },
    brandExample: 'Ceresita Weber / Sika 1'
  },
  {
    id: 'mat-membrana-4mm',
    code: 'AIS-02',
    name: 'Membrana Asfáltica 4 mm con Aluminio No Crack (Rollo 10m²)',
    category: 'Aislaciones',
    unit: 'Rollo 10 m²',
    referencePrice: 58000,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 31000,
      '2025-06': 41000,
      '2026-01': 49500,
      '2026-08': 58000
    },
    brandExample: 'Megaflex / Ormiflex'
  },
  {
    id: 'mat-lana-vidrio-50',
    code: 'AIS-03',
    name: 'Lana de Vidrio Isover con barrera de vapor 50mm',
    category: 'Aislaciones',
    unit: 'Rollo 14.4 m²',
    referencePrice: 66000,
    source: 'Fabricante Directo',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 35500,
      '2025-06': 46500,
      '2026-01': 56500,
      '2026-08': 66000
    }
  },

  // PINTURA Y ACABADOS
  {
    id: 'mat-latex-interior',
    code: 'PIN-01',
    name: 'Pintura Látex Interior Mate Lavable Antihongo',
    category: 'Pinturas',
    unit: 'Balde 20 Litros',
    referencePrice: 94000,
    source: 'INDEC',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 51000,
      '2025-06': 66500,
      '2026-01': 80500,
      '2026-08': 94000
    },
    brandExample: 'Alba Albalatex / Tersuave / Plavicon'
  },
  {
    id: 'mat-latex-exterior',
    code: 'PIN-02',
    name: 'Impermeabilizante Frentes y Muros Exterior 100% Acrílico',
    category: 'Pinturas',
    unit: 'Balde 20 Litros',
    referencePrice: 135000,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 73000,
      '2025-06': 95000,
      '2026-01': 115000,
      '2026-08': 135000
    },
    brandExample: 'Recublock / Tersitech / Plavicon Frentes'
  },
  {
    id: 'mat-fijador-sellador',
    code: 'PIN-03',
    name: 'Fijador Sellador al Agua Concentrado',
    category: 'Pinturas',
    unit: 'Bidón 4 Litros',
    referencePrice: 18500,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 9900,
      '2025-06': 13000,
      '2026-01': 15800,
      '2026-08': 18500
    }
  },

  // PISOS Y REVESTIMIENTOS
  {
    id: 'mat-porcelanato-60x60',
    code: 'PIS-01',
    name: 'Porcelanato Pulido / Satinado Rectificado 60x60 1ra calidad',
    category: 'Pisos y Revestimientos',
    unit: 'm²',
    referencePrice: 32000,
    source: 'INDEC',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 17500,
      '2025-06': 22800,
      '2026-01': 27400,
      '2026-08': 32000
    },
    brandExample: 'Ilva / San Pietro / Cerro Negro'
  },
  {
    id: 'mat-ceramica-45x45',
    code: 'PIS-02',
    name: 'Cerámica Esmaltada Alto Tránsito 45x45',
    category: 'Pisos y Revestimientos',
    unit: 'm²',
    referencePrice: 16500,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 8900,
      '2025-06': 11600,
      '2026-01': 14100,
      '2026-08': 16500
    },
    brandExample: 'Cortines / Cañuelas / Lourdes'
  },
  {
    id: 'mat-pegamento-porcelanato',
    code: 'PIS-03',
    name: 'Mezcla Adhesiva Impermeable para Porcelanatos (Klaukol / Weber)',
    category: 'Pisos y Revestimientos',
    unit: 'Bolsa 30 kg',
    referencePrice: 15400,
    source: 'CAMARCO',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 8400,
      '2025-06': 10900,
      '2026-01': 13200,
      '2026-08': 15400
    },
    brandExample: 'Klaukol Porcellanato / Weber Porcelanato'
  },

  // INSTALACIONES SANITARIAS Y GAS
  {
    id: 'mat-termofusion-20',
    code: 'SAN-01',
    name: 'Caño Termofusión PN 20 Ø 20 mm x 4 metros (Agua Fría/Caliente)',
    category: 'Instalación Sanitaria',
    unit: 'Tira 4m',
    referencePrice: 12800,
    source: 'Fabricante Directo',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 6900,
      '2025-06': 9000,
      '2026-01': 10900,
      '2026-08': 12800
    },
    brandExample: 'Acqua System / Saladillo H3'
  },
  {
    id: 'mat-pvc-110',
    code: 'SAN-02',
    name: 'Caño PVC Cloacal Reforzado Ø 110 mm x 4 metros',
    category: 'Instalación Sanitaria',
    unit: 'Tira 4m',
    referencePrice: 23500,
    source: 'Fabricante Directo',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 12600,
      '2025-06': 16500,
      '2026-01': 20100,
      '2026-08': 23500
    },
    brandExample: 'Awaduct / Tigre'
  },
  {
    id: 'mat-tanque-1000',
    code: 'SAN-03',
    name: 'Tanque de Agua Cuatricapa 1000 Litros',
    category: 'Instalación Sanitaria',
    unit: 'Unidad',
    referencePrice: 198000,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 105000,
      '2025-06': 139000,
      '2026-01': 170000,
      '2026-08': 198000
    },
    brandExample: 'Rotoplas / Eternit'
  },

  // INSTALACIÓN ELÉCTRICA
  {
    id: 'mat-cable-25',
    code: 'ELE-01',
    name: 'Cable Unipolar Flexible Normalizado IRAM 2.5 mm²',
    category: 'Instalación Eléctrica',
    unit: 'Rollo 100m',
    referencePrice: 64000,
    source: 'INDEC',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 34500,
      '2025-06': 45000,
      '2026-01': 54800,
      '2026-08': 64000
    },
    brandExample: 'Prysmian / Kalop / Argenplas'
  },
  {
    id: 'mat-corrugado-blanco',
    code: 'ELE-02',
    name: 'Caño Corrugado Blanco Ignífugo 3/4" (Ø 19mm)',
    category: 'Instalación Eléctrica',
    unit: 'Rollo 25m',
    referencePrice: 14200,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 7600,
      '2025-06': 9900,
      '2026-01': 12100,
      '2026-08': 14200
    }
  },
  {
    id: 'mat-disyuntor-40',
    code: 'ELE-03',
    name: 'Disyuntor Diferencial Bipolar 40A 30mA (Schneider / Sica)',
    category: 'Instalación Eléctrica',
    unit: 'Unidad',
    referencePrice: 42500,
    source: 'Fabricante Directo',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 23000,
      '2025-06': 30000,
      '2026-01': 36500,
      '2026-08': 42500
    }
  },

  // CARPINTERÍAS Y ABERTURAS
  {
    id: 'mat-ventana-modena-150',
    code: 'CAR-01',
    name: 'Ventana de Aluminio Línea Módena 1.50 x 1.10 m con DVH 4/9/4',
    category: 'Carpinterías',
    unit: 'Unidad',
    referencePrice: 285000,
    source: 'Fabricante Directo',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 152000,
      '2025-06': 200000,
      '2026-01': 244000,
      '2026-08': 285000
    },
    specNotes: 'Color blanco/negro microtexturado con rodamientos reforzados'
  },
  {
    id: 'mat-puerta-placa-cedro',
    code: 'CAR-02',
    name: 'Puerta Placa Interior Enchapada Cedro 0.80 x 2.00 marco chapa 18',
    category: 'Carpinterías',
    unit: 'Unidad',
    referencePrice: 138000,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 74000,
      '2025-06': 97000,
      '2026-01': 118000,
      '2026-08': 138000
    }
  },
  {
    id: 'mat-puerta-seguridad',
    code: 'CAR-03',
    name: 'Puerta de Entrada Chapa Inyectada Reforzada Multianclaje 0.90x2.00',
    category: 'Carpinterías',
    unit: 'Unidad',
    referencePrice: 340000,
    source: 'Fabricante Directo',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 180000,
      '2025-06': 238000,
      '2026-01': 290000,
      '2026-08': 340000
    }
  },

  // EQUIPOS, FLETES Y SERVICIOS
  {
    id: 'mat-volquete-5m3',
    code: 'SER-01',
    name: 'Servicio de Volquete 5m³ para retiro de escombros y tierra',
    category: 'Servicios y Fletes',
    unit: 'Viaje / Unidad',
    referencePrice: 75000,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 40000,
      '2025-06': 52000,
      '2026-01': 64000,
      '2026-08': 75000
    }
  },
  {
    id: 'mat-alquiler-andamio',
    code: 'EQU-01',
    name: 'Alquiler de Cuerpo de Andamio Tubular con tablones (por mes)',
    category: 'Equipos y Maquinarias',
    unit: 'Cuerpo / Mes',
    referencePrice: 38000,
    source: 'Corralón Mayorista',
    lastUpdated: '2026-08',
    historicalPrices: {
      '2025-01': 20000,
      '2025-06': 26500,
      '2026-01': 32500,
      '2026-08': 38000
    }
  }
];
