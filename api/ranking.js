import { getRanking } from '../server/services/ranking.js';

export default async function handler(_request, response) {
  try {
    const data = await getRanking();
    response.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    return response.status(200).json(data);
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(502).json({ error: 'Não foi possível atualizar os resultados públicos.', detail: error.message });
  }
}
