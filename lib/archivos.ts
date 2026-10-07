// Guarda archivos subidos (fotos, firmas) en public/. Solo base local / servidor propio.
import fs from 'node:fs';
import path from 'node:path';

const MAX_BYTES = 3 * 1024 * 1024;

export async function guardarArchivo(file: File, carpeta: 'fotos' | 'firmas' | 'manuales', nombre: string): Promise<string> {
  const tipo = file.type || '';
  const esFirma = carpeta === 'firmas';
  const okTipo = esFirma ? tipo === 'image/png'
    : carpeta === 'manuales' ? tipo === 'application/pdf'
    : ['image/jpeg', 'image/png', 'image/webp'].includes(tipo);
  if (!okTipo) throw new Error('Tipo de archivo no permitido');
  const max = carpeta === 'manuales' ? 10 * 1024 * 1024 : MAX_BYTES;
  if (file.size <= 0 || file.size > max) throw new Error('Archivo vacío o muy pesado');
  const base = nombre.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').slice(0, 60) || 'archivo';
  const ext = esFirma ? 'png' : carpeta === 'manuales' ? 'pdf' : (tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : 'jpg');
  const dir = path.join(process.cwd(), 'public', carpeta);
  fs.mkdirSync(dir, { recursive: true });
  const nombreFinal = `${base}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, nombreFinal), buf);
  return `/${carpeta}/${nombreFinal}`;
}

export function guardarDataURL(dataUrl: string, carpeta: 'firmas', nombre: string): string {
  const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl ?? '');
  if (!m) throw new Error('Firma inválida');
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length <= 0 || buf.length > MAX_BYTES) throw new Error('Firma vacía o muy pesada');
  const dir = path.join(process.cwd(), 'public', carpeta);
  fs.mkdirSync(dir, { recursive: true });
  const nombreFinal = `${nombre.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').slice(0, 60) || 'firma'}-${Date.now()}.png`;
  fs.writeFileSync(path.join(dir, nombreFinal), buf);
  return `/${carpeta}/${nombreFinal}`;
}
