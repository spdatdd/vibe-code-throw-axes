const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const VIDEO_DIR = path.join(ROOT, 'video');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/save-video') {
    const chunks = [];
    let totalBytes = 0;
    let aborted = false;
    req.on('data', c => {
      if (aborted) return;
      totalBytes += c.length;
      if (totalBytes > MAX_VIDEO_BYTES) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Payload too large' }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (aborted) return;
      fs.mkdirSync(VIDEO_DIR, { recursive: true });
      const name = 'nem-riu-' + new Date().toISOString().replace(/[:.]/g, '-') + '.webm';
      const outPath = path.join(VIDEO_DIR, name);
      fs.writeFileSync(outPath, Buffer.concat(chunks));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, file: 'video/' + name }));
    });
    return;
  }
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    res.writeHead(400); res.end('Bad request'); return;
  }
  const filePath = path.resolve(ROOT, urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, ''));
  const rel = path.relative(ROOT, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(filePath).pipe(res);
}).listen(8765, () => console.log('Server running at http://localhost:8765/Nem_Riu_3D.html'));
