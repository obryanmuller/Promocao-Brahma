# 5 Vitórias — S.A.B. Brahma

Landing page responsiva para acompanhar a promoção “Promessa S.A.B.”. O projeto usa apenas Node.js no servidor e HTML/CSS/JavaScript no cliente, sem dependências externas de runtime.

## Rodar localmente

Requer Node.js 20 ou superior.

```bash
npm start
```

Acesse `http://127.0.0.1:4173`.

Sem configuração adicional, a página já consulta os resultados públicos e sinaliza qualquer clube sem cobertura suficiente.

## Dados públicos sem chave

O projeto consulta diretamente os endpoints JSON públicos da ESPN. Não é necessário criar conta, cadastrar cartão, gerar token ou configurar segredo.

Por padrão, o backend agrega resultados de:

- Brasileirão Séries A, B, C e D;
- Copa do Brasil;
- Paulista, Carioca, Gaúcho e Mineiro;
- Copa do Nordeste;
- Libertadores e Sul-Americana;
- amistosos de clubes.

O servidor baixa os placares do período, elimina partidas duplicadas, combina os jogos de todas as competições, ordena por data e conta as vitórias até o primeiro empate ou derrota. A resposta fica em cache por 15 minutos.

O endpoint `GET /api/data-status` informa o período consultado, cobertura e feeds que falharam.

### Configuração opcional

O site funciona sem arquivo `.env`. Para alterar o período ou a lista de campeonatos, copie `.env.example` para `.env`:

```env
ESPN_LOOKBACK_DAYS=180
ESPN_LEAGUES=bra.1,bra.2,bra.3,bra.4,bra.copa_do_brazil
```

> Importante: o endpoint da ESPN é acessível publicamente, mas não é uma API comercial documentada com SLA. A cobertura de estaduais menores e amistosos não é garantida. Para uma promoção oficial, mantenha uma forma de auditoria/correção manual ou contrate uma fonte licenciada.

## Estrutura

- `public/`: interface, estilos e imagem de campanha.
- `server/data/teams.js`: relação dos 29 clubes e dados demonstrativos.
- `server/services/espn.js`: coleta pública, normalização e cálculo das sequências.
- `server.mjs`: servidor estático e rota `/api/ranking`.

## Verificação

```bash
npm run check
```

## Publicar na Vercel

O projeto já inclui `vercel.json` e duas Vercel Functions:

- `/api/ranking` — ranking consumido pelo site;
- `/api/data-status` — diagnóstico de cobertura.

Os arquivos de `public/` são publicados no CDN e as respostas da API usam cache compartilhado de 15 minutos. Não é necessário cadastrar variável de ambiente.

1. Envie o projeto para um repositório GitHub.
2. Na Vercel, selecione **Add New → Project** e importe o repositório.
3. Mantenha **Framework Preset: Other**.
4. Não preencha Build Command nem variáveis de ambiente.
5. Clique em **Deploy**.

Para testar com a CLI da Vercel, se estiver instalada:

```bash
vercel dev
```

Regulamento: https://ge.globo.com/especiais-publicitarios/b/sab_brahma_lp/regulamento.html

Fonte dos resultados: https://www.espn.com.br/futebol/
