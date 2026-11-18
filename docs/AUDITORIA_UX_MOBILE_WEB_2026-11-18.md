# Jynlo — auditoria integrada de usabilidade (Mobile + Web)

Data: 2026-11-18. Repositórios: `Miguel14Ferreira/jynlo-mobile` e `Miguel14Ferreira/jynlo-web-FE`; exclusivamente a branch existente `develop`.
Objetivo: tornar a Jynlo simples, apelativa, legível e fiável antes de distribuir uma nova versão.
**Estado: auditoria estática transversal em curso. Não equivale a ensaio completo em dispositivo, aprovação de testes integrais ou certificação WCAG.**

## Regras de aceitação, transversais

- Primazia do percurso **descobrir sessão → aderir → conversar → jogar → voltar**, com opções de criação claras.
- Ações táteis principais com alvo mínimo de 44 pontos CSS/dp; não reduzir a área clicável apenas para caber o texto.
- Contraste AA como baseline: **4,5:1 para texto normal**, 3:1 para texto grande/componentes aplicáveis; testar estados ativo, desativado, erro, foco e surfaces reais.
- Texto secundário legível: evitar legenda informativa de 9–11 pontos; permitir aumento de fonte, teclado aberto e ecrãs estreitos.
- Uma tarefa por fluxo: distinguir ações principais de atalhos secundários; menus expandíveis sem ocultar ações críticas.
- Falhas de rede: mensagem específica + recuperação visível; nunca duplicar publicação/sessão por repetição involuntária.
- Dados reais: nunca inventar métricas, sessões, jogadores, resultados ou disponibilidade para encher ecrãs vazios.
- Chats sem botão “Atualizar”; preservar autorização, bloqueios, privacidade e reconciliação de mensagens.
- Nenhuma release sem `typecheck`, suíte completa, build assinada e smoke test real (Android + iOS quando aplicável).

## Primeira passagem: ecrãs Mobile revistos estaticamente

| Percurso | Ecrãs/ficheiros analisados | Achados / decisão |
|---|---|---|
| Início, publicações, stories | `app/(tabs)/index.tsx` | Legendas 9–11 pt, botões 40–42 pt e alguns controlos demasiado pequenos. Fontes/áreas táteis corrigidas nesta passagem; criação, multimédia e publicação ainda exigem smoke test. |
| Explorar e encontrar sessões | `app/(tabs)/explore.tsx` | A pesquisa era empurrada para baixo por três atalhos verticais. Convertidos em três atalhos horizontais acessíveis; erro de pesquisa passa a oferecer “Tentar novamente”. Confirmar layout real a 320/360/390/430 dp. |
| Conversas | `app/(tabs)/messages.tsx` | Filtros de categoria com 38 pt; aumentados para 44 pt. Verificar chegada de novos chats e estados de leitura em duas contas reais. |
| Perfil | `app/(tabs)/profile.tsx` | Legendas pequenas; melhoradas. Continuação: grelha de posts, edição, privacidade pública/privada e ampliação de imagens. |
| Torneios | `app/(tabs)/tournaments.tsx` | Falta de recuperação visível para erro, nenhum torneio ou filtros sem resultados. Corrigido com novas opções de recuperação e etiquetas de acessibilidade. |
| Sessões (detalhe/criação) | `app/sessions/[id].tsx`, `app/sessions/create.tsx` | Indicadores de presença e linhas de equipas pequenas; melhoradas. Exige testes completos de criar/editar/cancelar/convocar/mapa e equipa equilibrada. |
| Equipas | `app/teams/index.tsx`, `app/teams/[id].tsx` | Histórico de sobreposição/ações pouco visíveis. Alterações anteriores de compacidade e controlos. Validar logótipo, equipamento, capitão, eliminação, chats e feed. |
| Comunidades | `app/(tabs)/communities.tsx`, `app/communities/[id].tsx`, `app/communities/create.tsx` | Melhorias anteriores de contraste, formulários e espaços. Validar convites, adesão e permissões. |
| Recintos | `app/venues/[id].tsx` | Hierarquia label/valor e contraste melhorados anteriormente. Testar endereços/mapas em dispositivos reais. |
| Componentes comuns / navegação | `src/components/UI.tsx`, `src/lib/theme.ts`, `app/(tabs)/_layout.tsx` | Alvos de toque e tons partilhados auditados. Investigar texto com escala de acessibilidade e teclado em Android/iPhone. |
| Conversas e chamadas | `app/messages/[peer].tsx`, `src/features/direct-call-screen.tsx` | Redesign anterior precisa de teste entre dois equipamentos, ecrã pequeno, microfone, câmara e encerramento. |

## Primeira passagem: Web revisto estaticamente

| Área | Ficheiros | Achados / decisão |
|---|---|---|
| Feed e semana desportiva | `src/app/pages/social-feed/social-feed.component.html`, `social-feed-neon-glass.css` | Grelha de três colunas com dois cartões gerava buraco. Corrigida para duas; ações e texto dos cartões eram pequenos; aumentados. |
| Diretório/comunidades, jornada | `src/app/pages/communities/communities.component.html`, `communities-v3-finish.css` | Controlo expansível de jornada e ações com 36 pt, texto secundário pequeno; corrigidos. |
| Restantes áreas Web | Torneios, equipas, recintos, chat, lives, configurações | **Não auditadas completamente nesta passagem**; rever componentes, tamanhos responsivos, comportamento real, estados de carregamento e permissões antes de declarar conformidade. |
| CSS em camadas | `social-feed.component.css`, `social-feed-concept-one-refresh.css`, `social-feed-neon-glass.css`, `social-feed-action-polish.css` | Múltiplas folhas de estilo sobrepõem regras. Risco de regressões por especificidade/ordem; consolidar gradualmente com testes visuais. |

## Riscos por prioridade

**P0 — funcionalidade/lançamento (não comprovados por revisão visual):**
1. Login Android/iOS, primeira abertura e credenciais por plataforma; TestFlight iOS 0.16.7 (2) ainda não compilado e instalado.
2. Criar publicação e Story com foto/vídeo, confirmar resposta e presença no feed/perfil após recarregar; falhas não podem consumir o rascunho.
3. Chat privado/comunidade/equipa/sessão em duas contas, mensagens em tempo real sem refresh manual, anexos e estados de autorização.
4. Criar/editar/cancelar sessões e avisar confirmados; localização deve abrir sempre a morada/pino efetivamente escolhido.
5. Chamada privada de voz/vídeo em dois dispositivos, self-view, permissões, ligação/encerramento.

**P1 — usabilidade e apresentação (em revisão):**
1. Controlos sobrepostos/cortados em Android pequeno e iPhone; teclado não deve tapar composer.
2. Navegação intuitiva: Início/Explorar/Criar/Mensagens/Perfil, acesso a comunidades, equipas, recintos, torneios.
3. Reduzir cartões vazios e espaçamentos; estados vazios informativos, sem inventar conteúdo.
4. Legibilidade e contraste transversal, textos num tamanho útil e sem perder hierarquia.
5. Equipas/torneios: estados de carregamento, transições rápidas, logótipos, equipamento, ações owner/capitão e chat/feed consistentes.

**P2 — polimento:** iconografia coerente, animações respeitando reduced motion, paginação/scroll/zoom, português e inglês, testes de loading e offline.

## Matriz mínima de aceitação antes de uma nova distribuição

- Android real: 320–360 dp e 390–430 dp; iPhone real com safe area; portrait, texto aumentado e teclado aberto.
- Uma conta nova + duas contas com dados reais autorizados; conferir também estado sem posts, sem sessões, sem equipas e sem mensagens.
- Rede normal, lenta, desligada e recuperação; não criar ações duplicadas ao tocar duas vezes.
- Inspecionar foco, teclado, navegação por VoiceOver/TalkBack e contraste das combinações efetivamente renderizadas.
- Executar `npm run typecheck` e `npm run test:all` no repositório mobile; web executar build/test Angular e testes de contrato; gerar build assinada.
- Envolver testers e registar erros com plataforma, versão, ecrã, passos e screenshot/log.
- A versão instalada nos testers não muda com commits na `develop`; não confundir código gravado, testes estáticos e IPA/APK validada.

## Alterações desta passagem

Mobile: aumentar legibilidade de Início/Stories/Feed, Explorar, Mensagens, Perfil, Torneios e detalhe de Sessão; atalhos horizontais na exploração, recuperação de erros de pesquisa e torneios; contrato `tests/mobile-cross-screen-ux-audit.test.cjs`.

Web: legibilidade do dashboard semanal em `social-feed-neon-glass.css`, legibilidade de jornada/ações em `communities-v3-finish.css`, testes em `scripts/qa/feed-publish-reconciliation.test.cjs` e `scripts/qa/community-ux-screen-contract.test.cjs`.

**Limites desta passagem:** verificações textuais e de contratos realizadas; `typecheck`, suíte integral, build e testes reais de dispositivos **não foram executados** nesta auditoria. Não considerar a auditoria total encerrada.
