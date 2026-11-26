// Local preview with automatic reload; no dependencies or production-file edits.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const clients = new Set();
const types = { '.pdf': 'application/pdf', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const reload = `<script>(()=>{const events=new EventSource('/__preview_events');events.onmessage=()=>location.reload();})();</script>`;
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url === '/__preview_events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (req.url === '/api/product-assistant') {
    if (req.method !== 'POST') {
      res.writeHead(405, { Allow: 'POST' }).end();
      return;
    }
    const { POST } = await import('../api/product-assistant.mjs');
    const request = new Request('http://127.0.0.1:4173/api/product-assistant', {
      method: 'POST', headers: req.headers, body: req, duplex: 'half'
    });
    const response = await POST(request);
    res.writeHead(response.status, Object.fromEntries(response.headers)).end(await response.text());
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(root, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(/[\\/]/).some(part => part.startsWith('.'))) {
      res.writeHead(403).end('Forbidden'); return;
    }
    let content = await fs.promises.readFile(filename);
    const extension = path.extname(filename).toLowerCase();
    if (extension === '.html') content = Buffer.from(content.toString().replace(/<\/body>/i, reload + '</body>'));
    res.writeHead(200, { 'Content-Type': types[extension] || 'application/octet-stream', 'Content-Length': content.length });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
let debounce;
const watcher = fs.watch(root, { recursive: true }, (_, filename) => {
  if (!filename || /(^|[\\/])\./.test(filename)) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => { for (const client of clients) client.write('data: reload\n\n'); }, 150);
});
server.on('error', error => { console.error(error.message); watcher.close(); process.exitCode = 1; });
server.listen(4173, '127.0.0.1', () => console.log('Live preview: http://127.0.0.1:4173'));
