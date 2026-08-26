import { getRanking } from '../server/services/ranking.js';
import { teams as demoTeams } from '../server/data/teams.js';
import { shareSvg, slugify } from '../server/services/vercel-team-pages.js';

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
    response.setHeader('Content-Type', 'image/svg+xml');
    return response.status(200).send(await shareSvg(team));
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
