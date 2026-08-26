import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../public', import.meta.url));

export const slugify = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escapeXml = value => String(value).replace(/[<>&'"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]);

export async function renderTeamPage(team, pathname) {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const slug = slugify(team.name);
  const streak = team.streak ?? 0;
  const title = `${team.name} — Corrida das 5 Vitórias`;
  const description = `${team.name}: ${streak} vitórias consecutivas. Faltam ${Math.max(0, 5 - streak)} para a Brahma grátis.`;
  return html
    .replace('data-team-slug=""', `data-team-slug="${slug}"`)
    .replaceAll('5 Vitórias — S.A.B. Brahma', title)
    .replace('Acompanhe a corrida dos clubes da Sociedade Anônima da Brahma pelas cinco vitórias seguidas.', description)
    .replace('Acompanhe a corrida dos clubes pelas cinco vitórias seguidas.', description)
    .replace('/assets/torcida-hero.png" />', `/share/${slug}.svg" />`)
    .replace('<link rel="icon"', `<link rel="canonical" href="${pathname}" />\n    <link rel="icon"`);
}

async function imageDataUri(url) {
  if (!url) return '';
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return '';
    return `data:${response.headers.get('content-type') || 'image/png'};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
  } catch {
    return '';
  }
}

export async function shareSvg(team) {
  const streak = Number.isFinite(team.streak) ? team.streak : 0;
  const missing = Math.max(0, 5 - streak);
  const teamLogo = await imageDataUri(team.logo);
  const games = await Promise.all((team.nextGames || []).map(async (game, index) => {
    const logo = await imageDataUri(game.logo);
    const x = 78 + index * 170;
    return `<g transform="translate(${x} 438)"><rect width="132" height="70" rx="8" fill="#8e0718"/><rect x="12" y="14" width="38" height="38" rx="6" fill="${escapeXml(game.color || '#777')}"/>${logo ? `<image href="${logo}" x="15" y="17" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>` : `<text x="31" y="39" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="10" font-weight="700">${escapeXml(game.short)}</text>`}<text x="62" y="31" fill="#fff" font-family="Arial,sans-serif" font-size="11" font-weight="700">${game.isHome ? '⌂' : '✈'} ${escapeXml(game.date)}</text><text x="62" y="48" fill="#ffffffaa" font-family="Arial,sans-serif" font-size="9">${escapeXml(game.opponent).slice(0, 13)}</text></g>`;
  }));
  const logo = `<rect x="900" y="120" width="120" height="120" rx="20" fill="${escapeXml(team.color || '#777')}"/><text x="960" y="195" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="32" font-weight="900">${escapeXml(team.short)}</text>${teamLogo ? `<image href="${teamLogo}" x="850" y="105" width="220" height="150" preserveAspectRatio="xMidYMid meet"/>` : ''}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#c90920"/><circle cx="1040" cy="-40" r="360" fill="#8e0718"/><text x="78" y="92" fill="#ffd31a" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="5">CORRIDA DAS 5 VITÓRIAS</text><text x="78" y="190" fill="#fff" font-family="Arial,sans-serif" font-size="72" font-weight="900">${escapeXml(team.name).toUpperCase()}</text>${logo}<text x="78" y="236" fill="#f4efe6" font-family="Arial,sans-serif" font-size="28">${streak} vitórias consecutivas</text><text x="78" y="420" fill="#fff" font-family="Arial,sans-serif" font-size="34" font-weight="700">${missing ? `Faltam ${missing} para a Brahma grátis` : 'A Brahma é nossa!'}</text>${games.join('')}<text x="78" y="600" fill="#ffffffaa" font-family="Arial,sans-serif" font-size="17">Partidas oficiais e amistosas · Empate ou derrota interrompe a sequência</text></svg>`;
}
