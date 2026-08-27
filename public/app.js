const board = document.querySelector('#leaderboard');
const showAll = document.querySelector('#show-all');
const search = document.querySelector('#team-search');
const modeLabel = document.querySelector('#data-mode');
const dataNote = document.querySelector('#data-note');
const teamSpotlight = document.querySelector('#team-spotlight');
const beerIcon = '<i data-lucide="beer" aria-hidden="true"></i>';
let allTeams = [];
let expanded = false;

const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const slugify = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function renderTeamSpotlight() {
  const slug = document.body.dataset.teamSlug;
  const team = allTeams.find(item => slugify(item.name) === slug);
  if (!team) return;
  const streak = Number.isFinite(team.streak) ? team.streak : 0;
  const missing = Math.max(0, 5 - streak);
  const nextGames = team.nextGames || [];
  const fixtureMarkup = nextGames.length
    ? `<div class="fixture-list"><strong>PRÓXIMOS JOGOS</strong>${nextGames.map(game => `<div class="fixture"><span class="fixture-crest" style="--team:${escapeHtml(game.color)}">${game.logo ? `<img src="${escapeHtml(game.logo)}" alt="" loading="lazy" />` : escapeHtml(game.short)}</span><span><b>${escapeHtml(game.opponent)}</b><small>${escapeHtml(game.date)}</small></span><i data-lucide="${game.isHome ? 'house' : 'plane'}" aria-label="${game.isHome ? 'Em casa' : 'Fora de casa'}"></i></div>`).join('')}</div>`
    : '<small class="fixture-empty">Agenda futura indisponível no momento.</small>';
  teamSpotlight.hidden = false;
  const teamLogo = team.logo ? `<img class="spotlight-logo" src="${escapeHtml(team.logo)}" alt="Escudo do ${escapeHtml(team.name)}" loading="lazy" referrerpolicy="no-referrer" />` : '';
  teamSpotlight.innerHTML = `<div class="spotlight-info"><span class="eyebrow eyebrow-dark"><span></span> CLUBE EM DESTAQUE</span><div class="spotlight-heading">${teamLogo}<h2>${escapeHtml(team.name)}</h2></div><p class="spotlight-streak">${beerIcon} <strong>${streak} vitórias consecutivas</strong></p><p class="spotlight-progress">${Array.from({ length: 5 }, (_, index) => `<span class="${index < streak ? 'active' : ''}"></span>`).join('')}</p><p>${missing ? `<strong>Faltam ${missing} vitórias para a Brahma grátis.</strong>` : '<strong>A Brahma é nossa!</strong>'}</p><small>Último resultado: ${escapeHtml(team.lastResult)} · Último adversário: ${escapeHtml(team.nextOpponent)}</small></div>${fixtureMarkup}<button id="share-team" class="button button-yellow" type="button"><span>Compartilhar clube</span><i data-lucide="share-2" aria-hidden="true"></i></button>`;
  document.querySelector('#share-team').addEventListener('click', async () => {
    const shareData = { title: `${team.name} — Corrida das 5 Vitórias`, text: `${team.name}: ${streak} vitórias consecutivas.`, url: window.location.href };
    if (navigator.share) await navigator.share(shareData).catch(() => {});
    else await navigator.clipboard?.writeText(window.location.href);
  });
}

function streakMarkup(streak) {
  if (streak === null || streak === undefined) {
    return `<div class="streak streak-unavailable" aria-label="Dados indisponíveis">${Array.from({ length: 5 }, () => `<span>${beerIcon}</span>`).join('')}</div><b class="streak-count">—/5</b>`;
  }
  return `<div class="streak" aria-label="${streak} de 5 vitórias">${Array.from({ length: 5 }, (_, index) => `<span class="${index < streak ? 'hit' : ''}">${beerIcon}</span>`).join('')}</div><b class="streak-count">${streak}/5</b>`;
}

function render() {
  const term = search.value.trim().toLocaleLowerCase('pt-BR');
  const filtered = allTeams.filter(team => team.name.toLocaleLowerCase('pt-BR').includes(term));
  const visible = term || expanded ? filtered : filtered.slice(0, 8);
  board.innerHTML = visible.length ? visible.map((team, index) => `
    <article class="team-row ${index < 3 && !term ? 'leader' : ''}">
      <span class="position">${String(allTeams.indexOf(team) + 1).padStart(2, '0')}</span>
      <a class="team-name team-link" href="/${slugify(team.name)}#corrida" aria-label="Ver página de ${escapeHtml(team.name)}">${team.logo ? `<i class="api-crest"><img src="${escapeHtml(team.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer"></i>` : `<i style="--team:${escapeHtml(team.color)}">${escapeHtml(team.short)}</i>`}<strong>${escapeHtml(team.name)}</strong></a>
      <div class="sequence">${streakMarkup(team.streak)}</div>
      <span class="result ${team.lastResult === 'V' ? 'result-win' : ''}">${escapeHtml(team.lastResult)}</span>
      <div class="last-game"><strong>${escapeHtml(team.lastOpponent || '—')}</strong><small>${escapeHtml(team.lastDate || 'VERIFICAR')}</small></div>
      <div class="next-game"><span class="next-game-heading">${team.nextGames?.[0] ? `<i data-lucide="${team.nextGames[0].isHome ? 'house' : 'plane'}" aria-label="${team.nextGames[0].isHome ? 'Em casa' : 'Fora de casa'}"></i>` : ''}<strong>${escapeHtml(team.nextOpponent || 'Sem próximo jogo')}</strong></span><small>${escapeHtml(team.nextDate || 'VERIFICAR')}</small></div>
    </article>`).join('') : '<div class="empty-state">Nenhum clube encontrado. Tente outro nome.</div>';
  window.lucide?.createIcons();
  showAll.hidden = Boolean(term);
  showAll.innerHTML = expanded
    ? 'MOSTRAR MENOS <span class="icon-inline" data-lucide="arrow-up" aria-hidden="true"></span>'
    : 'VER TODOS OS 29 CLUBES <span class="icon-inline" data-lucide="arrow-down" aria-hidden="true"></span>';
  window.lucide?.createIcons();
}

async function loadRanking() {
  try {
    const response = await fetch('/api/ranking');
    if (!response.ok) throw new Error('Falha ao carregar');
    const data = await response.json();
    allTeams = data.teams;
    renderTeamSpotlight();
    const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(data.updatedAt)).replace('.', '').toUpperCase();
    if (data.mode === 'public') {
      const resolved = data.coverage?.resolved ?? data.teams.length;
      modeLabel.textContent = `DADOS PÚBLICOS · ${resolved}/${data.teams.length} CLUBES · ${date}`;
      const issues = data.coverage?.unavailable || [];
      const emptyFeeds = data.coverage?.emptyFeeds || [];
      dataNote.textContent = issues.length
        ? `Resultados públicos da ESPN. Sem histórico nas competições monitoradas para: ${issues.join(', ')}.${emptyFeeds.includes('bra.3') ? ' ' : ''}`
        : 'Sequências calculadas com resultados públicos da ESPN, sem chave de autenticação.';
    } else {
      modeLabel.textContent = 'MODO DEMONSTRAÇÃO · DADOS ILUSTRATIVOS';
      dataNote.textContent = 'As sequências e próximos jogos acima são ilustrativos. Configure o token e os feeds da API-Futebol no servidor para publicar dados reais.';
    }
    render();
  } catch {
    modeLabel.textContent = 'PLACAR TEMPORARIAMENTE INDISPONÍVEL';
    board.innerHTML = '<div class="empty-state">Não foi possível atualizar agora. Tente novamente em instantes.</div>';
  }
}

showAll.addEventListener('click', () => { expanded = !expanded; render(); });
search.addEventListener('input', render);

const menu = document.querySelector('.menu-button');
menu.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
});
document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => document.body.classList.remove('menu-open')));

window.lucide?.createIcons();
loadRanking();
