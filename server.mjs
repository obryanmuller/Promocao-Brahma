import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDataStatus, getRanking } from './server/services/ranking.js';

const root = fileURLToPath(new URL('./public', import.meta.url));

async function loadEnv() {
  try {
    const content = await readFile(fileURLToPath(new URL('./.env', import.meta.url)), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}
await loadEnv();

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };
const server = http.createServer(async (request, response) => {
  try {
    if (request.url === '/api/ranking') {
      const data = await getRanking();
      response.writeHead(200, { 'Content-Type': mime['.json'], 'Cache-Control': 'no-store' });
      return response.end(JSON.stringify(data));
    }
    if (request.url === '/api/data-status') {
      const data = await getDataStatus();
      response.writeHead(200, { 'Content-Type': mime['.json'], 'Cache-Control': 'no-store' });
      return response.end(JSON.stringify(data));
    }
    const rawPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
    const safePath = normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = join(root, safePath);
    if (!filePath.startsWith(root)) throw new Error('Caminho inválido');
    const file = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control': extname(filePath) === '.png' ? 'public, max-age=86400' : 'no-cache' });
    response.end(file);
  } catch (error) {
    const status = error.code === 'ENOENT' ? 404 : 500;
    response.writeHead(status, { 'Content-Type': mime['.json'] });
    response.end(JSON.stringify({ error: status === 404 ? 'Não encontrado' : error.message }));
  }
});

server.listen(port, host, () => console.log(`SAB Brahma disponível em http://${host}:${port}`));
