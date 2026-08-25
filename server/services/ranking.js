import { teams } from '../data/teams.js';
import { DEFAULT_LEAGUES, fetchEspnRanking } from './espn.js';

let cache = { at: 0, data: null };

export async function getRanking() {
  if (cache.data && Date.now() - cache.at < 15 * 60_000) return cache.data;
  const configuredLeagues = (process.env.ESPN_LEAGUES || '').split(',').map(value => value.trim()).filter(Boolean);
  const live = await fetchEspnRanking({
    teams,
    leagues: configuredLeagues.length ? configuredLeagues : DEFAULT_LEAGUES,
    lookbackDays: process.env.ESPN_LOOKBACK_DAYS || 180
  });
  cache = { at: Date.now(), data: { mode: 'public', updatedAt: new Date().toISOString(), ...live } };
  return cache.data;
}

export async function getDataStatus() {
  const data = await getRanking();
  return {
    mode: data.mode,
    updatedAt: data.updatedAt,
    provider: data.provider,
    period: data.period,
    coverage: data.coverage
  };
}
