const FOTMOB_TEAM_ID = 7817;
const FOTMOB_BASE_URL = 'https://www.fotmob.com/api/data/teams';

const formatDate = value => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)).replace('.', '').toUpperCase();
const logoUrl = id => id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : '';

function parseFixture(fixture) {
  const isHome = fixture.home?.id === FOTMOB_TEAM_ID;
  const opponent = isHome ? fixture.away : fixture.home;
  if (!opponent?.name) return null;
  const guaraniScore = Number((isHome ? fixture.home : fixture.away).score);
  const opponentScore = Number(opponent.score);
  return {
    id: String(fixture.id),
    date: fixture.status?.utcTime,
    completed: fixture.status?.finished === true,
    opponent: opponent.name,
    opponentId: opponent.id,
    logo: logoUrl(opponent.id),
    short: opponent.name.replace(/\b(FC|EC|SE|SP|RS|SC)\b/gi, '').trim().slice(0, 3).toUpperCase(),
    color: '#777',
    isHome,
    score: guaraniScore,
    opponentScore,
    competition: fixture.tournament?.name || 'Futebol'
  };
}

export async function fetchGuaraniRanking({ fromDate, toDate }) {
  const response = await fetch(`${FOTMOB_BASE_URL}?id=${FOTMOB_TEAM_ID}&ccode3=BRA`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`FotMob HTTP ${response.status}`);
  const payload = await response.json();
  const details = payload.details || {};
  const fixtures = (payload.fixtures?.allFixtures?.fixtures || [])
    .map(parseFixture)
    .filter(Boolean)
    .filter(fixture => {
      const timestamp = new Date(fixture.date).getTime();
      return timestamp >= fromDate.getTime() && timestamp <= toDate.getTime();
    });
  const history = fixtures.filter(fixture => fixture.completed).sort((a, b) => new Date(b.date) - new Date(a.date));
  const upcoming = fixtures.filter(fixture => !fixture.completed).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!history.length) return null;

  let streak = 0;
  for (const fixture of history) {
    if (fixture.score <= fixture.opponentScore) break;
    streak += 1;
  }
  streak = Math.min(streak, 5);
  const last = history[0];
  const nextGames = upcoming.slice(0, Math.max(0, 5 - streak)).map(fixture => ({
    opponent: fixture.opponent,
    short: fixture.short,
    color: fixture.color,
    logo: fixture.logo,
    date: formatDate(fixture.date),
    isHome: fixture.isHome
  }));
  return {
    logo: details.sportsTeamJSONLD?.logo || logoUrl(FOTMOB_TEAM_ID),
    streak,
    lastResult: last.score > last.opponentScore ? 'V' : last.score === last.opponentScore ? 'E' : 'D',
    nextOpponent: nextGames[0]?.opponent || 'Sem próximo jogo',
    nextDate: nextGames[0]?.date || 'VERIFICAR',
    nextGames,
    lastCompetition: last.competition,
    source: 'fotmob-public'
  };
}
