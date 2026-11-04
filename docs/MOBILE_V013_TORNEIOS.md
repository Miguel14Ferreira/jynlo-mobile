# Jynlo Mobile v0.13 — Criação de torneios

Primeira implementação do fluxo de criação de torneios na app nativa, baseada no contrato real do backend Jynlo em develop.

## Percurso
- **Torneios → Criar torneio** ou **Comunidade (organizador) → Criar torneio nesta comunidade**.
- Só aparecem elegíveis comunidades em que a pessoa é OWNER ou ADMIN; o backend volta a verificar a permissão.
- Pesquisa pelas 121 modalidades do catálogo fechado. A presença no catálogo não implica suporte de competição.
- Para modalidades com motor de resultados compatível: escolher individual/equipas, liga/eliminatórias/grupos quando suportado, parâmetros da prova e nome.
- Premir **Criar torneio**, confirmar no alerta nativo, chamar POST da API uma única vez e abrir o novo detalhe.

## Formatos explicitamente suportados por este fluxo
- Liga por equipas, eliminatórias e 2/4 grupos com eliminatórias: Futebol e Futsal.
- Liga numérica individual: Futebol, Futsal, Padel e Ténis.
- Xadrez individual: 2/1/0 pontos internos, correspondentes a 1/½/0 pontos exibidos.
- Campeonatos individuais por pontos de corrida: o subconjunto explicitamente validado no backend (karting, BMX corrida, ciclismo, etc.).
- Provas individuais por tempo: Natação em piscina 50m, Canoagem Velocidade K1, Remo skiff 1x, Atletismo pista.
- Provas individuais por marca: Atletismo saltos e lançamentos.
- Estafetas de Atletismo por tempo: equipas de quatro, 4×100m ou 4×400m.

As opções fora destes contratos não são inventadas: recebem aviso de indisponibilidade. Em particular, Voleibol, Cricket, Golfe e provas julgadas não devem herdar uma classificação de futebol.

## Segurança e estado
- Criação inicia no estado DRAFT, sem gerar jogos, confirmar inscrições ou publicar resultados.
- Registo só após confirmação do utilizador; o POST nunca é repetido automaticamente.
- Sem URL explícita da API, a app fica em modo de demonstração, com criação desativada.
- O cliente valida as opções; o backend continua a ser a autoridade sobre permissões, eventos, regras e estado.
- Nenhum commit nesta entrega altera a versão web, o backend ou a branch master.
- Exige validação de TypeScript, testes Node, Expo prebuild e APK no GitHub e testes num Android real.

## Referências de contratos, verificadas em develop
Backend: CreateCommunityTournamentRequest.java, CommunityTournamentService.java, CommunityTournamentEventType.java e CommunityTournamentRaceService.java.
Web: community-tournament-capabilities.ts e community-tournament-event-types.ts.

Esta fase é criação; o tratamento especializado de jornadas e resultados continua a ser desenvolvido progressivamente no mobile.
