const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const history = [];
const clients = new Set();

function broadcast(msg) {
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const res of clients) res.write(data);
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`event: history\ndata: ${JSON.stringify(history)}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (req.method === 'POST' && req.url === '/send') {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 10000) req.destroy();
    });
    req.on('end', () => {
      try {
        const { user, text } = JSON.parse(body);
        const u = String(user || '').trim().slice(0, 24);
        const t = String(text || '').trim().slice(0, 500);
        if (!u || !t) throw new Error('empty');
        const msg = { user: u, text: t, time: Date.now() };
        history.push(msg);
        if (history.length > 100) history.shift();
        broadcast(msg);
        res.writeHead(204).end();
      } catch {
        res.writeHead(400).end('Bad request');
      }
    });
    return;
  }
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
    return;
  }
  res.writeHead(404).end('Not found');
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Chat running at http://localhost:${PORT}`));
}
module.exports = server;
