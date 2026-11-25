const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const VIDEO_DIR = path.join(ROOT, 'video');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.md': 'text/markdown; charset=utf-8'
};

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/save-video') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      fs.mkdirSync(VIDEO_DIR, { recursive: true });
      const name = 'nem-riu-' + new Date().toISOString().replace(/[:.]/g, '-') + '.webm';
      const outPath = path.join(VIDEO_DIR, name);
      fs.writeFileSync(outPath, Buffer.concat(chunks));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, file: 'video/' + name }));
    });
    return;
  }
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(ROOT, urlPath === '/' ? 'Nem_Riu_3D.html' : urlPath);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(filePath).pipe(res);
}).listen(8765, () => console.log('Server running at http://localhost:8765/Nem_Riu_3D.html'));
