import Link from 'next/link';
import { CollageHero, FotoCollage } from '@/components/collage';

export const dynamic = 'force-dynamic';

const FICHAS = [
  {
    slug: 'semirremolque',
    linea: 'Semirremolque · Módulo habitacional',
    titulo: 'Ficha técnica — Semirremolque módulo habitacional',
    foto: '/fotos/ficha-tecnica-semirremolque-modulo-habitacional-1--01-1415x1112.jpg',
    items: [
      ['Estructura', 'Chasis 2 vigas doble T de 300 mm, 7 mm de alma'],
      ['Suspensión', 'Elásticos estándar de ballesta, eje tubular 12 t con ABS'],
      ['Acoplado', 'También acoplable en tándem con equipo dolly'],
      ['Aislamiento', 'Aislamiento térmico con corte térmico, instalación rápida'],
      ['Eléctrica', 'Instalación eléctrica 220 V: caja disyuntora y térmica, plafones LED de iluminación'],
      ['Agua', 'Instalación de agua con cañería por termofusión de ½″'],
      ['Interior', 'Multilaminado fenólico, acrílico texturado, piso vinílico de alto tránsito, placa símil madera'],
      ['Clima', '3 equipos de aire acondicionado instalados'],
    ],
  },
  {
    slug: 'box-hotel',
    linea: 'Box modular hotel · 15 m²',
    titulo: 'Box modular hotel — 15 m²',
    foto: '/fotos/box-modular-hotel-01-1402x1122.jpg',
    items: [
      ['Unidad', '15 m² con dormitorio, baño completo y cocina equipada'],
      ['Dormitorio', 'Habitación con 1 cama de 2 plazas o 2 de 1 plaza'],
      ['Baño', 'Ducha, inodoro y bidet, con amplia ventilación'],
      ['Cocina', 'Mesada con heladera / frigobar + anafe'],
      ['Confort', 'Amplios, cálidos y resistentes; óptimo aislamiento anticondensación'],
      ['Eléctrica', 'Instalación eléctrica completa'],
      ['Planta', 'Distribución de planta con más versatilidad'],
    ],
  },
  {
    slug: 'contenedores',
    linea: 'Contenedores técnicos',
    titulo: 'Contenedor técnico — unidades transportables con módulos',
    foto: '/fotos/contenedores-2--01-800x533.jpg',
    items: [
      ['Uso', 'Unidades transportables con módulos rodantes, a medida según requerimientos térmicos'],
      ['Apoyo', 'Patín petrolero o skid; cárcamos de izaje'],
      ['Traslado', 'Sobre carretón deprimido (verificar término con ingeniería)'],
      ['Líneas', 'Líneas Standard y línea autoportante'],
      ['Acondicionamiento', 'Térmico y acústico — excelente inversión a largo plazo'],
      ['Eléctrica', 'Instalación eléctrica de acuerdo a norma, con ventilación'],
      ['Energía', 'Usinas de autogeneración'],
    ],
  },
  {
    slug: 'shelter',
    linea: 'Shelters TKR-antivandálicos',
    titulo: 'Shelter — telecomunicación y energía',
    foto: '/fotos/shelter-02-1280x1280.jpg',
    items: [
      ['Uso', 'Shelters de telecomunicación y de energía, módulos transportables y rodantes'],
      ['Seguridad', 'TKR-antivandálicos con acondicionamiento térmico y acústico'],
      ['Apoyo', 'Skid patín petrolero; cárcamos de izaje'],
      ['Líneas', 'Líneas Standard y línea autoportante'],
      ['Eléctrica', 'Instalación eléctrica de acuerdo a norma'],
    ],
  },
  {
    slug: 'trailers',
    linea: 'Trailers petroleros',
    titulo: 'Trailer petrolero — petróleo, gas y minería',
    foto: '/fotos/trailers-2--01-1132x891.jpg',
    items: [
      ['Uso', 'Módulos para la industria del petróleo, gas y minería; logística, confort y resistencia'],
      ['Operación', 'De forma autónoma o agrupados; Company Man, detector de humo'],
      ['Seguridad', 'Barreras antipánico, entre otros; electrodomésticos y calefacción'],
      ['Eléctrica', 'Instalación eléctrica completa'],
      ['Clima', 'Acondicionamiento térmico y acústico, ventilación'],
    ],
  },
  {
    slug: 'empresa',
    linea: 'Carta de presentación',
    titulo: 'Rurales Juanita — habitabilidad donde no llega la red',
    foto: '/fotos/carta-de-presentacion-rj--01-370x383.jpg',
    items: [
      ['Misión', 'Garantizar la habitabilidad en zonas críticas, con éxito probado en provisión'],
      ['I+D', 'Investigación e incorporación de nuevos compuestos'],
      ['Red', 'Red de concesionarios en todo el país; respaldo y servicio'],
      ['Energía', 'Operación en zonas aisladas de la red eléctrica'],
      ['Contacto', 'Ruta 65, km 177,9 — 9 de Julio · Alberto Germán Rinaldi'],
    ],
  },
];

export default function Fichas() {
  return (
    <div className="min-h-screen bg-[#f1efdf] text-[#212529]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
        <CollageHero
          kicker="Fichas corregidas · 6 líneas"
          titulo={<>Catálogo técnico con ortografía verificada.</>}
          bajada="Textos normalizados según revisión de los 6 PDF: tildes en mayúsculas, unidades con espacio (300 mm, 220 V, 15 m²), cocina/vanitorio en español y términos comerciales verificados."
          accion={<Link href="/web" className="rj-btn bg-white text-[#212529]">← Volver a la web</Link>}
          fotos={[
            { src: '/fotos/box-modular-hotel-01-1402x1122.jpg', alt: 'Box modular' },
            { src: '/fotos/shelter-02-1280x1280.jpg', alt: 'Shelter' },
            { src: '/fotos/trailers-2--01-1132x891.jpg', alt: 'Trailer' },
            { src: '/fotos/contenedores-2--01-800x533.jpg', alt: 'Contenedor' },
          ]}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FICHAS.map((f) => (
            <article key={f.slug} className="rj-card">
              <p className="collage-caption">{f.linea}</p>
              <h2 className="mt-2 font-display text-2xl font-medium">{f.titulo}</h2>
              <div className="mt-3"><FotoCollage src={f.foto} alt={f.titulo} caption={f.linea} /></div>
              <dl className="mt-3 space-y-1 text-sm">
                {f.items.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[110px_1fr] gap-2 border-b border-dashed border-[#07503f]/20 py-1">
                    <dt className="font-mono2 text-[10px] uppercase tracking-[.14em] text-[#07503f]">{k}</dt>
                    <dd className="text-[#212529]">{v}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
