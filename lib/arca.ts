// ARCA real: WSAA (LoginCms con certificado fiscal) + WSFEv1 (CAE).
// Homologación por defecto. Producción = cambiar URLs + ARCA_MODO=produccion.
// Requiere: certificado .crt + .key de AFIP en certs/ (NUNCA en public/) y CUIT configurado.
import fs from 'node:fs';
import path from 'node:path';
import forge from 'node-forge';
import { queryLocal } from './db-local';

type ArcaCfg = { cuit: string; ptoVta: number; modo: string; wsaa: string; wsfe: string; cert: string; key: string };

export async function arcaCfg(): Promise<ArcaCfg> {
  const rows = await queryLocal<{ clave: string; valor: string }>(`select clave, valor from public.configuracion where clave like 'ARCA%'`);
  const g = (k: string) => rows.find((r) => r.clave === k)?.valor ?? '';
  return {
    cuit: g('ARCA_CUIT').replace(/\D/g, ''),
    ptoVta: Number((await queryLocal<{ valor: string }>(`select valor from public.configuracion where clave='ARCA_PTO_VTA'`))[0]?.valor ?? 1),
    modo: (await queryLocal<{ valor: string }>(`select valor from public.configuracion where clave='ARCA_MODO'`))[0]?.valor ?? 'simulado',
    wsaa: g('ARCA_WSAA_URL'), wsfe: g('ARCA_WSFE_URL'), cert: g('ARCA_CERT'), key: g('ARCA_KEY'),
  };
}

const taPath = (service: string) => path.join(process.cwd(), 'certs', `ta-${service}.json`);

function traXml(service: string): string {
  const now = Date.now();
  const fmt = (t: number) => new Date(t).toISOString().slice(0, 19) + '-03:00';
  return `<?xml version="1.0" encoding="UTF-8"?><loginTicketRequest version="1.0"><header><uniqueId>${Math.floor(now / 1000)}</uniqueId><generationTime>${fmt(now - 600000)}</generationTime><expirationTime>${fmt(now + 43200000)}</expirationTime></header><service>${service}</service></loginTicketRequest>`;
}

function firmarTRA(tra: string, certPem: string, keyPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  const key = forge.pki.privateKeyFromPem(keyPem);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({ key, certificate: cert, digestAlgorithm: forge.pki.oids.sha256, authenticatedAttributes: [
    { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
    { type: forge.pki.oids.messageDigest },
    { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
  ] });
  p7.sign();
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary').toString('base64');
}

async function soap(url: string, action: string, body: string): Promise<string> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: action },
    body: `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body>${body}</soapenv:Body></soapenv:Envelope>`,
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`ARCA HTTP ${r.status}: ${txt.slice(0, 300)}`);
  if (/<fault/i.test(txt)) throw new Error(`ARCA fault: ${txt.slice(0, 500)}`);
  return txt;
}

export async function ticketAcceso(service: 'wsfe'): Promise<{ token: string; sign: string; cuit: string }> {
  const cfg = await arcaCfg();
  if (!cfg.cuit) throw new Error('Falta ARCA_CUIT en /config');
  if (!cfg.cert || !cfg.key) throw new Error('Faltan certificado/clave fiscal (ver /facturacion)');
  const f = taPath(service);
  try {
    const ta = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (ta.expira > Date.now() + 600000 && ta.cuit === cfg.cuit) return { token: ta.token, sign: ta.sign, cuit: cfg.cuit };
  } catch { /* vencido o inexistente: renovar */ }
  const certPem = fs.readFileSync(path.join(process.cwd(), /*turbopackIgnore: true*/ cfg.cert), 'utf8');
  const keyPem = fs.readFileSync(path.join(process.cwd(), /*turbopackIgnore: true*/ cfg.key), 'utf8');
  const cms = firmarTRA(traXml(service), certPem, keyPem);
  const res = await soap(cfg.wsaa, 'loginCms', `<loginCms><in0>${cms}</in0></loginCms>`);
  const grab = (tag: string) => { const m = res.match(new RegExp(`<${tag}>([^<]+)</${tag}>`)); return m?.[1] ?? ''; };
  const token = grab('token'), sign = grab('sign'), expira = Date.parse(grab('expirationTime')) || Date.now() + 3600000;
  if (!token || !sign) throw new Error('WSAA no devolvió token (¿certificado vencido o CUIT sin permiso?)');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ token, sign, expira, cuit: cfg.cuit }));
  return { token, sign, cuit: cfg.cuit };
}

const authXml = (t: { token: string; sign: string; cuit: string }) =>
  `<Token>${t.token}</Token><Sign>${t.sign}</Sign><Cuit>${t.cuit}</Cuit>`;

export async function probarConexion(): Promise<string> {
  const cfg = await arcaCfg();
  const ta = await ticketAcceso('wsfe');
  const res = await soap(cfg.wsfe, 'http://ar.gov.afip.dif.FEV1/dummy',
    `<FEDummy xmlns="http://ar.gov.afip.dif.FEV1/"></FEDummy>`);
  const app = /<AppServer>([^<]+)/.exec(res)?.[1], db = /<DbServer>([^<]+)/.exec(res)?.[1], auth = /<AuthServer>([^<]+)/.exec(res)?.[1];
  return `App:${app} DB:${db} Auth:${auth} (modo ${cfg.modo})`;
}

export type DatoComp = {
  tipo: 'A' | 'B'; clienteCuit: string | null; condicionIva: string;
  neto: number; iva: number; total: number;
};

export async function ultimoNumero(tipo: 'A' | 'B'): Promise<number> {
  const cfg = await arcaCfg();
  const ta = await ticketAcceso('wsfe');
  const cbteTipo = tipo === 'A' ? 1 : 6;
  const res = await soap(cfg.wsfe, 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado',
    `<FECompUltimoAutorizado xmlns="http://ar.gov.afip.dif.FEV1/">${authXml(ta)}<PtoVta>${cfg.ptoVta}</PtoVta><CbteTipo>${cbteTipo}</CbteTipo></FECompUltimoAutorizado>`);
  return Number(/<CbteNro>(\d+)/.exec(res)?.[1] ?? 0);
}

export async function solicitarCAEReal(d: DatoComp): Promise<{ cae: string; vto: string; nro: number; qr: string; crudo: string }> {
  const cfg = await arcaCfg();
  const ta = await ticketAcceso('wsfe');
  const cbteTipo = d.tipo === 'A' ? 1 : 6; // 1=Factura A, 6=Factura B
  const ultimo = await ultimoNumero(d.tipo);
  const nro = ultimo + 1;
  const digits = (d.clienteCuit ?? '').replace(/\D/g, '');
  const docTipo = digits.length === 11 ? 80 : 99; // 80=CUIT, 99=Consumidor Final
  const docNro = digits.length === 11 ? digits : '0';
  const f = (n: number) => n.toFixed(2);
  const body = `<FECAESolicitar xmlns="http://ar.gov.afip.dif.FEV1/">${authXml(ta)}<FeCAReq><FeCabReq><CantReg>1</CantReg><PtoVta>${cfg.ptoVta}</PtoVta><CbteTipo>${cbteTipo}</CbteTipo></FeCabReq><FeDetReq><FECAEDetRequest><Concepto>1</Concepto><DocTipo>${docTipo}</DocTipo><DocNro>${docNro}</DocNro><CbteDesde>${nro}</CbteDesde><CbteHasta>${nro}</CbteHasta><CbteFch>${new Date().toISOString().slice(0, 10).replace(/-/g, '')}</CbteFch><ImpTotal>${f(d.total)}</ImpTotal><ImpTotConc>0</ImpTotConc><ImpNeto>${f(d.neto)}</ImpNeto><ImpOpEx>0</ImpOpEx><ImpTrib>0</ImpTrib><ImpIVA>${f(d.iva)}</ImpIVA><MonId>PES</MonId><MonCotiz>1</MonCotiz><Iva><AlicIva><Id>5</Id><BaseImp>${f(d.neto)}</BaseImp><Importe>${f(d.iva)}</Importe></AlicIva></Iva></FECAEDetRequest></FeDetReq></FeCAReq></FECAESolicitar>`;
  const res = await soap(cfg.wsfe, 'http://ar.gov.afip.dif.FEV1/FECAESolicitar', body);
  const resultado = /<Resultado>([^<]+)/.exec(res)?.[1];
  if (resultado !== 'A') {
    const obs = [...res.matchAll(/<Msg>([^<]+)/g)].map((m) => m[1]).join(' | ').slice(0, 400);
    throw new Error(`ARCA rechazó (${resultado}): ${obs || 'ver respuesta'}`);
  }
  const cae = /<CAE>(\d+)/.exec(res)?.[1] ?? '';
  const vto = /<CAEFchVto>(\d+)/.exec(res)?.[1] ?? '';
  const vtoFmt = `${vto.slice(0, 4)}-${vto.slice(4, 6)}-${vto.slice(6, 8)}`;
  const qrJson = { ver: 1, fecha: new Date().toISOString().slice(0, 10), cuit: Number(cfg.cuit), ptoVta: cfg.ptoVta, tipoCmp: cbteTipo, nroCmp: nro, importe: d.total, moneda: 'PES', ctz: 1, tipoDocRec: docTipo, nroDocRec: Number(docNro), tipoCodAut: 'E', codAut: Number(cae) };
  const qr = `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(qrJson)).toString('base64')}`;
  return { cae, vto: vtoFmt, nro, qr, crudo: res.slice(0, 2000) };
}
