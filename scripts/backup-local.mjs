// node scripts/backup-local.mjs — copia ./.pglite y public/fotos+firmas a ./backups/<fecha>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const stamp = new Date().toISOString().slice(0, 10);
const dest = path.join(root, 'backups', stamp);
fs.mkdirSync(dest, { recursive: true });
for (const carpeta of ['.pglite', path.join('public', 'fotos'), path.join('public', 'firmas')]) {
  const orig = path.join(root, carpeta);
  if (!fs.existsSync(orig)) { console.log(`(salteado, no existe) ${carpeta}`); continue; }
  fs.cpSync(orig, path.join(dest, carpeta.replace(/[/\\]/g, '_')), { recursive: true });
  console.log(`OK ${carpeta} → backups/${stamp}/`);
}
console.log('Respaldo listo. Para restaurar: cerrá el dev, copiá la carpeta de vuelta a su lugar.');
