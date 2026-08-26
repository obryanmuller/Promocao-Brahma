import { getRanking } from '../server/services/ranking.js';
import { teams as demoTeams } from '../server/data/teams.js';
import { renderTeamPage, slugify } from '../server/services/vercel-team-pages.js';

export default async function handler(request, response) {
  const slug = String(request.query?.slug || '').toLowerCase();
  try {
    let teams;
    try {
      teams = (await getRanking()).teams;
    } catch {
      teams = demoTeams;
    }
    const team = teams.find(item => slugify(item.name) === slug);
    if (!team) return response.status(404).send('Clube não encontrado');
    response.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    return response.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(await renderTeamPage(team, `/${slug}`));
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
