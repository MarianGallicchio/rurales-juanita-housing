# INSTRUCTIVO — Rurales Juanita · H.M Housing Module

Sistema de gestión integral (Cotizador · CRM · Producción ISO 9001 · Stock/BOM · Web pública 3D · Postventa · Panel).
Base local sin instalaciones raras. Actualizado a medida que crece el programa.

## 1. Requisitos

- Node.js 22+ (`node --version`)
- Nada más: la base local es PGlite (Postgres en archivo, sin Docker ni Postgres instalado).

## 2. Puesta en marcha (primera vez)

```bash
cd "E:\softwares\rurales-juanita-hm-housing-module"
npm install
npm run db:local:migrate   # crea las tablas Fase 0–8
npm run db:local:seed      # datos empresa (categorías, modelos, cliente demo)
npm run db:local:mejoras   # fotos, fichas, cotización demo, OP demo
npm run db:sitio-real      # alinea con ruralesjuanita.com.ar (6 líneas, ficha RJ, YPF/Dipp/Isamar)
npm run dev                # http://localhost:3000
```

Web pública: http://localhost:3000/web

## 3. Uso diario por rol

Entrás en `/ingresar` con email + PIN (inicial de todos: **1234**, se cambia en Usuarios).
Cada pantalla exige su rol: sin sesión vuelve al login.

| Rol | Hace |
|---|---|
| Administrador | Todo + /config (dólar, IVA, margen) + Panel |
| Ventas | Cotizador (4 pasos), CRM kanban, web leads |
| Producción | Checklist apto/no apto, panel por estación, NC |
| Compras | Stock, movimientos, BOM por modelo |
| Postventa | Tickets por serie de unidad |

Flujo de punta a punta: **Cotizador → Enviar → Aceptar (crea OP + unidades + 10 etapas solas) → Producción checklist → Ficha trazabilidad PDF → Postventa**.

## 4. Reglas que el sistema impone solo
- Cotización enviada se congela (precio + dólar). Cambios = nueva versión.
- Transiciones válidas: borrador→enviada→aceptada/rechazada/vencida. Las enviadas vencen solas por validez.
- Un `no apto` crea no conformidad y bloquea la unidad hasta cerrarla con verificación.
- Stock nunca se edita: solo movimientos. Ajuste negativo exige motivo.
- Modelo con cotizaciones no se borra: se desactiva.
- CUIT con dígito verificador; duplicados no se crean dos veces.

## 5. Visual 3D (ThreeUI)
- Paquete `@designcodeio/threeui` (MIT). Hero de /web = `LandscapeScene` atardecer (campo bonaerense) vía `public/landscape.html`.
- Ojo: importar **siempre por ruta profunda** (`@designcodeio/threeui/components/X`), nunca el barril principal: arrastra shaders viejos incompatibles con `three` moderno y rompe el build.
- Componentes 3D van con `next/dynamic` + `ssr:false` (ver `components/hero-3d.tsx`).

## 5b. Identidad real del sitio (ruralesjuanita.com.ar)

- Paleta: bosque `#07503f` · lima `#e8fe85` · hueso `#f1efdf` · carbón `#212529`. Fuentes: Cormorant Garamond (títulos), Inter (texto), JetBrains Mono (etiquetas).
- Contactos reales en `lib/empresa.ts`: WA +54 9 2317 44-9700, Ventas@ruralesjuanita.com.ar, Ruta 65 km 177,9, Lun–Vie 8–17h.
- 7 líneas = las 6 tarjetas del sitio + Petroleros. Ficha real: chasis RJ-SR-300, módulo RJ-MH-01, 220V + Aqua-System.
- Clientes homologados de verdad: YPF, Servicios Dipp, Procesos Patagónicos, Isamar (+ Pluspetrol demo). CUITs de prueba: reemplazar por reales al homologar ARCA.

## 6. Validación y calidad

```bash
npm run validar   # 100+ chequeos: fichas, fórmula, RLS, series, stock, sitio real
npm run build     # debe compilar sin errores
```

Si `validar` da FALLOS: corregí datos o código y volvé a correr hasta 100%.

## 7. Pasar a la nube (cuando quieras)

1. Creá proyecto en Supabase (Postgres 15+).
2. Corré en el SQL Editor, en orden: `supabase/migrations/0001…0009`.
3. Creá `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `USE_LOCAL_DB=0`.
4. Creá los 5 usuarios en Auth y cargalos en `perfiles` (ver `supabase/seed_fase0.sql`).

## 8. Fotos, firma, PWA y respaldo (nuevos procesos)

- **Fotos reales**: /catalogo → “Subir foto real” (JPG/PNG/WebP, máx 3MB, desde el celu). Se guarda en `public/fotos/` y aparece en catálogo, web y PDF. Marcá una como portada.
- **Firma digital**: abrí el PDF de una cotización *enviada* → el cliente firma con el dedo en el pad → “Firmar y aceptar” crea la OP sola. La firma queda guardada en `public/firmas/` con nombre y fecha, visible en el PDF.
- **PWA taller**: desde el celu, “Agregar a pantalla de inicio”. Abre como app (`RJ Housing`, colores empresa).
- **Respaldo**: `npm run db:backup` copia base + fotos + firmas a `backups/<fecha>/`. Hacelo antes de cualquier cambio grande. Automático en Windows: `schtasks /create /tn "RJ-backup" /tr "node E:\softwares\rurales-juanita-hm-housing-module\scripts\backup-local.mjs" /sc daily /st 20:00`.
- **REGLA DE ORO local**: nunca corras scripts (`migrate`, `seed`, `validar`) con el servidor prendido y viceversa: dos procesos sobre `.pglite` la parten. Apagá uno antes de usar el otro.

## 9. Lotes A/B/C: qué se agregó

- **Versiones**: desde enviada/rechazada/vencida → “Nueva versión” copia todo en borrador v+1.
- **Márgenes**: bajo el mínimo → pide aprobación del Administrador antes de enviar.
- **Envíos**: cada PDF/WhatsApp/mail se registra con ✓ envío (canal + fecha).
- **Ficha web**: cada modelo tiene ficha descargable `/web/ficha/CODIGO`.
- **Compras**: /stock genera lista sugerida (OPs − stock) con proveedor sugerido + conteo físico.
- **Homologaciones**: /crm con alerta a 60 días del vencimiento.
- **Auditoría**: /auditoria (quién/qué/cuándo, inmutable). **Usuarios**: /usuarios (rol + activo).
- **Checklist con foto**: el operario adjunta foto del control; queda en la unidad.
- **Garantía**: /postventa fija entrega → calcula vigencia (MESES_GARANTIA) + manual por modelo.
- **Panel**: filtros fecha/cliente/modelo + ventas por línea.
- **SEO**: sitemap + robots + datos estructurados en /web.

## 10. ARCA: cómo homologar de verdad
1. Cargá CUIT y punto de venta en /config (tabla configuracion).
2. Generá certificado fiscal en AFIP con tu CUIT (Administración de Certificados) y subilo en /config → se guarda en `certs/` (jamás en public/).
3. Probá la conexión en /facturacion (“Probar WSAA + WSFE”). Si dice App/DB/Auth OK, pedí el primer CAE en modo `homologacion`.
4. Recién ahí el CAE es válido. Lo simulado sirve para el circuito interno.
5. Factura **A** sale sola para Responsable Inscripto; **B** para el resto. El buscador encuentra clientes por nombre o CUIT/CUIL.
6. WSFE homologación oficial: `https://wswhomo.afip.gov.ar/wsfev1/service.asmx` (manual v2.22). Producción: `https://servicios1.afip.gov.ar/wsfev1/service.asmx`. Ticket WSAA dura 12 h (el sistema lo renueva solo).
7. ISO 9001:2026 publicada el 16/09/2026, reemplaza a 2015 con transición hasta el 30/09/2029. El sistema cita “ISO 9001” genérico: vale para ambas. Coordiná con Bureau Veritas el plan de transición.

## 10b. Última vuelta: colores, opciones y cierre del loop
- Paleta extendida del sitio real: oro `#c9a86a` (títulos), pasteles cielo/durazno/salvia (tarjetas), carbón blueprint `#1c1c1c` (datos técnicos).
- Cotizador con **equipamiento**: tildás opciones (fijo, por m² con superficie, por unidad) y el costo BOM sugiere los materiales.
- **Reserva** automática al aceptar; **descuento real** al aprobar cada etapa según su BOM; despacho con **remito** imprimible.
- Home con resumen diario (tareas, aprobaciones, stock, NC); PDF con **diff de versiones**; export CSV; gráficos en panel; login con PIN; páginas por línea; plano blueprint; mapa; service worker offline.

## 10c. Referencias aplicadas: HUD, formularios, CPQ, MES

- **HUD**: la barra superior muestra dólar, tareas, NC y stock en vivo, con atajos. Los héroes internos pueden llevar fondo 3D (`vivo`).
- **Formularios completos**: contacto, oportunidad, material, proveedor, opción + vínculo a modelo, ítem de ficha, homologación, tarea.
- **Cotización estilo CPQ** (referencias: Mimeeq, Combeenation, MODULIX): medidas por ítem, modalidad venta/alquiler, **link público** `/s/TOKEN` para el cliente sin login, diff entre versiones.
- **Tablero estilo MES** (referencia: ERPNext, Cetec): dona de calidad apto/no apto, antigüedad de OPs, drill-down a cada módulo, resumen diario en home.
- **Competidores** (Petrohard, Codelco, I9J): alquiler + venta + reparación ya cubiertos; flota/logística propia queda como mejora (módulo de traslados).

## 11. Problemas comunes
- **Puerto 3000 ocupado**: cerrá la otra ventana de `npm run dev`.
- **Página sin datos**: corré migrate + seed + mejoras (punto 2).
- **Build roto tras agregar 3D**: revisá que el import sea profundo (punto 5).
- **Dólar viejo**: /config avisa si tiene +24 h; cargá el del día.

- **Foto que no sube**: revisá tipo (JPG/PNG/WebP) y peso (máx 3MB).
- **Firma que no guarda**: tiene que estar la cotización en *enviada* y el nombre cargado.
- **Base partida o tablas que “desaparecen”**: dos procesos sobre `.pglite` a la vez. Borrá `.pglite` y reconstruí (punto 2 con servidor apagado).
- **“Sin sesión” en loop**: entrá por `/ingresar` (PIN 1234 inicial).

Mejora futura reservada: solo ARCA producción (certificado real).
