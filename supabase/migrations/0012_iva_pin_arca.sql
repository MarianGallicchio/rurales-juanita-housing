-- 0012 Condición IVA (A/B), PIN local, ARCA real. Idempotente.
alter table public.cliente add column if not exists condicion_iva text not null default 'Consumidor Final'
  check (condicion_iva in ('Responsable Inscripto','Monotributo','Exento','Consumidor Final'));
-- RI => Factura A, resto => B (regla ARCA)
alter table public.perfiles add column if not exists pin_hash text;
alter table public.comprobante add column if not exists wsfe_resp jsonb;
alter table public.comprobante add column if not exists pto_vta int;
insert into public.configuracion (clave, valor, descripcion) values
 ('ARCA_WSAA_URL','https://wsaahomo.afip.gov.ar/ws/services/LoginCms','WSAA homologación. Producción: https://wsaa.afip.gov.ar/ws/services/LoginCms'),
 ('ARCA_WSFE_URL','https://wswhomo.afip.gov.ar/wsfev1/service.asmx','WSFE homologación (manual oficial v2.22). Producción: https://servicios1.afip.gov.ar/wsfev1/service.asmx'),
 ('ARCA_CUIT','', 'CUIT emisor sin guiones.'),
 ('ARCA_CERT','', 'Ruta al .crt fiscal dentro de certs/ (nunca en public/).'),
 ('ARCA_KEY','', 'Ruta a la .key fiscal dentro de certs/.')
on conflict (clave) do nothing;
