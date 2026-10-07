// Datos públicos reales de ruralesjuanita.com.ar — fuente única en la app.
export const EMPRESA = {
  nombre: 'Rurales Juanita · H.M Housing Module',
  corto: 'Rurales Juanita',
  tel: '2317-472390 / 457298',
  whatsapp: '+54 9 2317 44-9700',
  email: 'Ventas@ruralesjuanita.com.ar',
  direccion: 'Ruta 65 km 177,9 — 9 de Julio, Bs.As.',
  horario: 'Lun–Vie 8–17h',
  desde: 2010,
};

export const waLink = (msg: string) =>
  `https://wa.me/5492317449700?text=${encodeURIComponent(msg)}`;

export const WA_COTIZACION =
  'Buenos días. Visité el sitio web de Rurales Juanita y quisiera solicitar información y cotización sobre sus módulos habitacionales transportables. Quedo a la espera de su respuesta. Muchas gracias.';
export const WA_ALQUILER =
  'Buenos días. Visité el sitio web de Rurales Juanita y quisiera consultar disponibilidad y condiciones de alquiler de módulos. Quedo a la espera de su respuesta. Muchas gracias.';

export const CLIENTES_REALES = [
  'Pluspetrol',
  'YPF',
  'Servicios Dipp',
  'Procesos Patagónicos',
  'Isamar S.R.L.',
  'Bureau Veritas',
];

export const PRODUCTOS_CONTACTO = [
  'Módulos habitacionales',
  'Contenedores técnicos',
  'Shelters',
  'Petroleros / Campamentos',
  'Oficinas',
  'Casillas rurales',
  'Otro / Varios',
];
