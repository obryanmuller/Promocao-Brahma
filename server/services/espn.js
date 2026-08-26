const BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

export const DEFAULT_LEAGUES = [
  'bra.1', 'bra.2', 'bra.3', 'bra.4', 'bra.copa_do_brazil',
  'bra.camp.paulista', 'bra.camp.carioca', 'bra.camp.gaucho',
  'bra.camp.mineiro', 'bra.copa_do_nordeste',
  'conmebol.libertadores', 'conmebol.sudamericana', 'club.friendly'
];

const ESPN_NAMES = {
  'Fluminense': ['Fluminense'], 'Grêmio': ['Gremio'], 'Botafogo': ['Botafogo'],
  'Internacional': ['Internacional'], 'Santos': ['Santos'], 'Vasco': ['Vasco da Gama', 'Vasco'],
  'São Paulo': ['Sao Paulo'], 'Cruzeiro': ['Cruzeiro'], 'Corinthians': ['Corinthians'],
  'Atlético Mineiro': ['Atletico-MG', 'Atletico Mineiro'], 'Flamengo': ['Flamengo'],
  'Guarani': ['Guarani'], 'Vila Nova': ['Vila Nova-GO', 'Vila Nova'], 'Coritiba': ['Coritiba'],
  'Ceará': ['Ceara'], 'Ponte Preta': ['Ponte Preta'], 'Portuguesa': ['Portuguesa-SP', 'Portuguesa'],
  'Operário': ['Operario-PR', 'Operario'], 'Goiás': ['Goias'], 'Avaí FC': ['Avai'],
  'Volta Redonda': ['Volta Redonda'], 'Vitória': ['Vitoria'], 'Sport Recife': ['Sport Recife', 'Sport'],
  'Fortaleza': ['Fortaleza'], 'Íbis': ['Ibis'], 'Remo': ['Remo'],
  'Athletico Paranaense': ['Athletico-PR', 'Athletico Paranaense'],
  'Atlético Goianiense': ['Atletico-GO', 'Atletico Goianiense'], 'Amazonas': ['Amazonas']
};

// IDs estáveis evitam homônimos internacionais. Ex.: Guarani (Campinas)
// e Club Guaraní (Paraguai) aparecem como "Guarani" em alguns feeds.
const ESPN_TEAM_IDS = {
  'Guarani': new Set(['3448'])
};

const ESPN_TEAM_LOGOS = {
  'Guarani': 'https://a.espncdn.com/i/teamlogos/soccer/500/3448.png'
};

const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const toEspnDate = date => [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('');

function campaignName(apiTeam, teams) {
  const apiId = String(apiTeam?.id || '');
  const byId = teams.find(team => ESPN_TEAM_IDS[team.name]?.has(apiId));
  if (byId) return byId.name;
  const normalized = normalize(apiTeam?.displayName || apiTeam?.name);
  return teams.find(team => !ESPN_TEAM_IDS[team.name] && (ESPN_NAMES[team.name] || [team.name]).some(alias => normalize(alias) === normalized))?.name || '';
}

async function requestLeague(slug, from, to) {
  const url = `${BASE_URL}/${encodeURIComponent(slug)}/scoreboard?dates=${from}-${to}&limit=1000`;
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  return { slug, name: payload.leagues?.[0]?.name || slug, events: payload.events || [] };
}

function parseEvent(event, league, teams) {
  const competition = event.competitions?.[0];
  if (!competition?.status?.type?.completed) return null;
  const home = competition.competitors?.find(item => item.homeAway === 'home');
  const away = competition.competitors?.find(item => item.homeAway === 'away');
  if (!home || !away) return null;
  const homeCampaign = campaignName(home.team, teams);
  const awayCampaign = campaignName(away.team, teams);
  if (!homeCampaign && !awayCampaign) return null;
  return {
    id: event.id, date: event.date, competition: league.name,
    home: { campaign: homeCampaign, name: home.team.displayName, score: Number(home.score), winner: home.winner === true, logo: home.team.logo },
    away: { campaign: awayCampaign, name: away.team.displayName, score: Number(away.score), winner: away.winner === true, logo: away.team.logo }
  };
}

function parseFixture(event, league, teams) {
  const competition = event.competitions?.[0];
  if (!competition || competition.status?.type?.completed) return null;
  const home = competition.competitors?.find(item => item.homeAway === 'home');
  const away = competition.competitors?.find(item => item.homeAway === 'away');
  if (!home || !away) return null;
  const homeCampaign = campaignName(home.team, teams);
  const awayCampaign = campaignName(away.team, teams);
  if (!homeCampaign && !awayCampaign) return null;
  return {
    id: event.id, date: event.date, competition: league.name,
    home: { campaign: homeCampaign, name: home.team.displayName, logo: home.team.logo },
    away: { campaign: awayCampaign, name: away.team.displayName, logo: away.team.logo }
  };
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)).replace('.', '').toUpperCase();
}

export async function fetchEspnRanking({ teams, leagues = DEFAULT_LEAGUES, lookbackDays = 180 }) {
  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setUTCDate(fromDate.getUTCDate() - Math.max(30, Number(lookbackDays)));
  const from = toEspnDate(fromDate);
  const toDate = new Date(now);
  toDate.setUTCDate(toDate.getUTCDate() + 90);
  const to = toEspnDate(toDate);
  const settled = await Promise.allSettled(leagues.map(slug => requestLeague(slug, from, to)));
  const successful = settled.filter(result => result.status === 'fulfilled').map(result => result.value);
  const failedFeeds = settled.flatMap((result, index) => result.status === 'rejected' ? [{ slug: leagues[index], error: result.reason.message }] : []);
  const unique = new Map();
  successful.flatMap(league => league.events.map(event => parseEvent(event, league, teams))).filter(Boolean).forEach(match => unique.set(match.id, match));
  const events = successful.flatMap(league => league.events.map(event => ({ event, league })))
    .map(({ event, league }) => parseFixture(event, league, teams)).filter(Boolean);
  const matches = [...unique.values()].sort((a, b) => new Date(b.date) - new Date(a.date));

  const ranked = teams.map(team => {
    const history = matches.filter(match => match.home.campaign === team.name || match.away.campaign === team.name);
    if (history.length === 0) return { ...team, logo: ESPN_TEAM_LOGOS[team.name], streak: null, lastResult: '—', nextOpponent: 'Sem cobertura', nextDate: 'VERIFICAR', source: 'unavailable' };
    let streak = 0;
    let lastResult = '—';
    for (const [index, match] of history.entries()) {
      const own = match.home.campaign === team.name ? match.home : match.away;
      const rival = match.home.campaign === team.name ? match.away : match.home;
      // A ESPN marca como `winner` quem avança nos pênaltis. Para a promoção,
      // empate no placar do jogo continua sendo empate, independentemente da disputa.
      const result = own.score > rival.score ? 'V' : own.score === rival.score ? 'E' : 'D';
      if (index === 0) lastResult = result;
      if (result !== 'V') break;
      streak += 1;
    }
    const last = history[0];
    const own = last.home.campaign === team.name ? last.home : last.away;
    const rival = last.home.campaign === team.name ? last.away : last.home;
    const remaining = Math.max(0, 5 - Math.min(streak, 5));
    const nextGames = events
      .filter(match => match.home.campaign === team.name || match.away.campaign === team.name)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, remaining)
      .map(match => {
        const isHome = match.home.campaign === team.name;
        const opponent = isHome ? match.away : match.home;
        const opponentTeam = teams.find(item => item.name === opponent.campaign);
        return { opponent: opponent.name, short: opponentTeam?.short || opponent.name.slice(0, 3).toUpperCase(), color: opponentTeam?.color || '#777', logo: opponent.logo, date: formatDate(match.date), isHome };
      });
    return { ...team, logo: ESPN_TEAM_LOGOS[team.name] || own.logo, streak: Math.min(streak, 5), lastResult, nextOpponent: rival.name, nextDate: formatDate(last.date), nextGames, lastCompetition: last.competition, source: 'espn-public' };
  }).sort((a, b) => {
    if (a.streak === null) return 1;
    if (b.streak === null) return -1;
    return b.streak - a.streak || a.id - b.id;
  });

  const unavailable = ranked.filter(team => team.source === 'unavailable').map(team => team.name);
  return { teams: ranked, coverage: { total: teams.length, resolved: teams.length - unavailable.length, unavailable, failedFeeds }, period: { from, to }, provider: 'ESPN public endpoint' };
}
