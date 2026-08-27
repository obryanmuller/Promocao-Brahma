import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../public', import.meta.url));

export const slugify = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escapeXml = value => String(value).replace(/[<>&'"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]);

export async function renderTeamPage(team, pathname, origin = '') {
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
    .replaceAll('/assets/torcida-hero.png" />', `${origin}/share/${slug}.svg" />`)
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
  const cups = Array.from({ length: 5 }, (_, index) => {
    const x = 220 + index * 58;
    const color = index < streak ? '#ffd31a' : '#ffffff66';
    return `<path d="M${x} 300h35v42a9 9 0 0 1-9 9h-17a9 9 0 0 1-9-9zM${x + 35} 311h8a12 12 0 0 1 0 24h-8" fill="none" stroke="${color}" stroke-width="6" stroke-linejoin="round"/>`;
  }).join('');
  const teamLogo = await imageDataUri(team.logo);
  const games = await Promise.all((team.nextGames || []).map(async (game, index) => {
    const logo = await imageDataUri(game.logo);
    const x = 64 + index * 170;
    const icon = game.isHome ? '<path d="M61 31l7-6 7 6v10h-5v-6h-4v6h-5z" fill="none" stroke="#ffd31a" stroke-width="2"/>' : '<path d="M61 39l14-12-5 1-5-5-2 2 3 5-6 7z" fill="none" stroke="#ffd31a" stroke-width="2" stroke-linejoin="round"/>';
    return `<g transform="translate(${x} 445)"><rect width="148" height="78" rx="10" fill="#a3081d"/><rect x="12" y="16" width="42" height="42" rx="8" fill="${escapeXml(game.color || '#777')}"/>${logo ? `<image href="${logo}" x="17" y="21" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>` : `<text x="33" y="42" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="10" font-weight="700">${escapeXml(game.short)}</text>`}<svg x="63" y="15" width="18" height="18" viewBox="0 0 86 56">${icon}</svg><text x="84" y="29" fill="#fff" font-family="Arial,sans-serif" font-size="11" font-weight="700">${escapeXml(game.date)}</text><text x="63" y="51" fill="#ffffffbb" font-family="Arial,sans-serif" font-size="10">${escapeXml(game.opponent).slice(0, 15)}</text></g>`;
  }));
  const logo = teamLogo
    ? `<image href="${teamLogo}" x="64" y="112" width="128" height="128" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="128" y="190" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="30" font-weight="900">${escapeXml(team.short)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#c90920"/><circle cx="1080" cy="-30" r="360" fill="#8e0718"/><circle cx="1080" cy="-30" r="245" fill="none" stroke="#ffffff18" stroke-width="2"/><text x="64" y="72" fill="#ffd31a" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="5">CORRIDA DAS 5 VITÓRIAS</text>${logo}<text x="220" y="180" fill="#fff" font-family="Arial,sans-serif" font-size="68" font-weight="900">${escapeXml(team.name).toUpperCase()}</text><text x="220" y="226" fill="#f4efe6" font-family="Arial,sans-serif" font-size="25">${streak} vitórias consecutivas</text>${cups}<text x="64" y="405" fill="#fff" font-family="Arial,sans-serif" font-size="32" font-weight="700">${missing ? `Faltam ${missing} para a Brahma grátis` : 'A Brahma é nossa!'}</text><text x="64" y="434" fill="#ffffffaa" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="2">PRÓXIMOS JOGOS</text>${games.join('')}<text x="64" y="590" fill="#ffffffaa" font-family="Arial,sans-serif" font-size="16">Partidas oficiais e amistosas · Empate ou derrota interrompe a sequência</text></svg>`;
}
