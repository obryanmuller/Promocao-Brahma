const board = document.querySelector('#leaderboard');
const showAll = document.querySelector('#show-all');
const search = document.querySelector('#team-search');
const modeLabel = document.querySelector('#data-mode');
const dataNote = document.querySelector('#data-note');
const beerIcon = '<i data-lucide="beer" aria-hidden="true"></i>';
let allTeams = [];
let expanded = false;

const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

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
      <div class="team-name">${team.logo ? `<i class="api-crest"><img src="${escapeHtml(team.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer"></i>` : `<i style="--team:${escapeHtml(team.color)}">${escapeHtml(team.short)}</i>`}<strong>${escapeHtml(team.name)}</strong></div>
      <div class="sequence">${streakMarkup(team.streak)}</div>
      <span class="result ${team.lastResult === 'V' ? 'result-win' : ''}">${escapeHtml(team.lastResult)}</span>
      <div class="next"><strong>${escapeHtml(team.nextOpponent)}</strong><small>${escapeHtml(team.nextDate)}</small></div>
    </article>`).join('') : '<div class="empty-state">Nenhum clube encontrado. Tente outro nome.</div>';
  window.lucide?.createIcons();
  showAll.hidden = Boolean(term);
  showAll.innerHTML = expanded ? 'MOSTRAR MENOS <span aria-hidden="true">↑</span>' : 'VER TODOS OS 29 CLUBES <span aria-hidden="true">↓</span>';
}

async function loadRanking() {
  try {
    const response = await fetch('/api/ranking');
    if (!response.ok) throw new Error('Falha ao carregar');
    const data = await response.json();
    allTeams = data.teams;
    const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(data.updatedAt)).replace('.', '').toUpperCase();
    if (data.mode === 'public') {
      const resolved = data.coverage?.resolved ?? data.teams.length;
      modeLabel.textContent = `DADOS PÚBLICOS · ${resolved}/${data.teams.length} CLUBES · ${date}`;
      const issues = data.coverage?.unavailable || [];
      dataNote.textContent = issues.length
        ? `Resultados públicos da ESPN. Sem histórico nas competições monitoradas para: ${issues.join(', ')}.`
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

loadRanking();
