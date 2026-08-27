import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDataStatus, getRanking } from './server/services/ranking.js';
import { teams as demoTeams } from './server/data/teams.js';

const root = fileURLToPath(new URL('./public', import.meta.url));

const slugify = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escapeXml = value => String(value).replace(/[<>&'"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]);

async function findTeam(slug) {
  try {
    const data = await getRanking();
    return data.teams.find(team => slugify(team.name) === slug);
  } catch {
    return demoTeams.find(team => slugify(team.name) === slug);
  }
}

async function imageDataUri(url) {
  if (!url) return '';
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return '';
    const type = response.headers.get('content-type') || 'image/png';
    return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
  } catch {
    return '';
  }
}

async function shareSvg(team) {
  const streak = Number.isFinite(team.streak) ? team.streak : 0;
  const cups = Array.from({ length: 5 }, (_, index) => {
    const x = 78 + index * 82;
    const color = index < streak ? '#ffd31a' : '#ffffff55';
    return `<path d="M${x} 270h42v54a10 10 0 0 1-10 10h-22a10 10 0 0 1-10-10zM${x + 42} 284h9a14 14 0 0 1 0 28h-9" fill="none" stroke="${color}" stroke-width="7" stroke-linejoin="round"/>`;
  }).join('');
  const missing = Math.max(0, 5 - streak);
  const gameLogos = await Promise.all((team.nextGames || []).map(game => imageDataUri(game.logo)));
  const games = (team.nextGames || []).map((game, index) => { const x = 64 + index * 170; const icon = game.isHome ? '<path d="M61 31l7-6 7 6v10h-5v-6h-4v6h-5z" fill="none" stroke="#ffd31a" stroke-width="2"/>' : '<path d="M61 39l14-12-5 1-5-5-2 2 3 5-6 7z" fill="none" stroke="#ffd31a" stroke-width="2" stroke-linejoin="round"/>'; return `<g transform="translate(${x} 445)"><rect width="148" height="78" rx="10" fill="#a3081d"/><rect x="12" y="16" width="42" height="42" rx="8" fill="${escapeXml(game.color || '#777')}"/>${gameLogos[index] ? `<image href="${gameLogos[index]}" x="17" y="21" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>` : `<text x="33" y="42" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="10" font-weight="700">${escapeXml(game.short)}</text>`}<svg x="63" y="15" width="18" height="18" viewBox="0 0 86 56">${icon}</svg><text x="84" y="29" fill="#fff" font-family="Arial,sans-serif" font-size="11" font-weight="700">${escapeXml(game.date)}</text><text x="63" y="51" fill="#ffffffbb" font-family="Arial,sans-serif" font-size="10">${escapeXml(game.opponent).slice(0, 15)}</text></g>`; }).join('');
  const teamLogoData = await imageDataUri(team.logo);
  const teamLogo = teamLogoData
    ? `<image href="${teamLogoData}" x="64" y="112" width="128" height="128" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="128" y="190" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="30" font-weight="900">${escapeXml(team.short)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#c90920"/><circle cx="1080" cy="-30" r="360" fill="#8e0718"/><circle cx="1080" cy="-30" r="245" fill="none" stroke="#ffffff18" stroke-width="2"/><text x="64" y="72" fill="#ffd31a" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="5">CORRIDA DAS 5 VITÓRIAS</text>${teamLogo}<text x="220" y="180" fill="#fff" font-family="Arial,sans-serif" font-size="68" font-weight="900">${escapeXml(team.name).toUpperCase()}</text><text x="220" y="226" fill="#f4efe6" font-family="Arial,sans-serif" font-size="25">${streak} vitórias consecutivas</text>${cups}<text x="64" y="405" fill="#fff" font-family="Arial,sans-serif" font-size="32" font-weight="700">${missing ? `Faltam ${missing} para a Brahma grátis` : 'A Brahma é nossa!'}</text><text x="64" y="434" fill="#ffffffaa" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="2">PRÓXIMOS JOGOS</text>${games}<text x="64" y="590" fill="#ffffffaa" font-family="Arial,sans-serif" font-size="16">Partidas oficiais e amistosas · Empate ou derrota interrompe a sequência</text></svg>`;
}

async function renderPage(team, pathname) {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const isTeamPage = Boolean(team);
  const title = isTeamPage ? `${team.name} — Corrida das 5 Vitórias` : '5 Vitórias — S.A.B. Brahma';
  const description = isTeamPage
    ? `${team.name}: ${team.streak ?? 0} vitórias consecutivas. Faltam ${Math.max(0, 5 - (team.streak ?? 0))} para a Brahma grátis.`
    : 'Acompanhe a corrida dos clubes da Sociedade Anônima da Brahma pelas cinco vitórias seguidas.';
  const slug = team ? slugify(team.name) : '';
  const image = team ? `${process.env.PUBLIC_ORIGIN || `http://${host}:${port}`}/share/${slug}.svg` : `${process.env.PUBLIC_ORIGIN || `http://${host}:${port}`}/assets/torcida-hero.png`;
  return html
    .replace('data-team-slug=""', `data-team-slug="${slug}"`)
    .replaceAll('5 Vitórias — S.A.B. Brahma', title)
    .replace('Acompanhe a corrida dos clubes da Sociedade Anônima da Brahma pelas cinco vitórias seguidas.', description)
    .replace('Acompanhe a corrida dos clubes pelas cinco vitórias seguidas.', description)
    .replace('/assets/torcida-hero.png" />', `${image}" />`)
    .replace('<link rel="icon"', `<link rel="canonical" href="${pathname === '/' ? '/' : pathname}" />\n    <link rel="icon"`);
}

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
    const pathname = request.url.split('?')[0];
    const shareMatch = pathname.match(/^\/share\/([a-z0-9-]+)\.svg$/);
    if (shareMatch) {
      const team = await findTeam(shareMatch[1]);
      if (!team) throw Object.assign(new Error('Clube não encontrado'), { code: 'ENOENT' });
      response.writeHead(200, { 'Content-Type': mime['.svg'], 'Cache-Control': 'public, max-age=900' });
      return response.end(await shareSvg(team));
    }
    const teamSlug = pathname.match(/^\/([a-z0-9-]+)\/?$/)?.[1];
    if (teamSlug && !pathname.includes('.')) {
      const team = await findTeam(teamSlug);
      if (!team) throw Object.assign(new Error('Clube não encontrado'), { code: 'ENOENT' });
      response.writeHead(200, { 'Content-Type': mime['.html'], 'Cache-Control': 'no-cache' });
      return response.end(await renderPage(team, `/${teamSlug}`));
    }
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
    const rawPath = request.url === '/' ? '/index.html' : pathname;
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
