import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'www');

const FILES = ['index.html', 'styles.css', 'manifest.webmanifest'];
const DIRS = ['src', 'assets', 'vendor'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const file of FILES) {
  const src = path.join(ROOT, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(OUT, file));
  }
}

for (const dir of DIRS) {
  const src = path.join(ROOT, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(OUT, dir), { recursive: true });
  }
}

console.log('Prepared clean web bundle in:', OUT);
