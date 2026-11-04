# Jynlo Mobile v0.14 — Jornadas específicas por modalidade

Na organização de torneios, OWNER/ADMIN podem associar e retirar jornadas existentes de campeonatos individuais de:
- **Corridas por pontos:** Karting, BMX e as modalidades de corrida validadas pelo backend (endpoint \`/races\`).
- **Provas cronometradas:** Natação, Canoagem, Remo, Atletismo pista (\`/times\`).
- **Provas por marca:** Atletismo saltos e lançamentos (\`/marks\`).

Ecrã: \`app/tournaments/[communityId]/[id]/events.tsx\`. Está acessível a partir do detalhe do torneio, sem o confundir com a gestão de confrontos/placares.

O GET devolve \`linkedRaces/availableRaces\` ou \`linkedRounds/availableRounds\`. Só são apresentadas jornadas com ID válido e sem duplicação. O cliente nunca calcula pontos, tempos, marcas, qualificação nem vencedores.

Ações protegidas:
- **Associar:** PUT \`/{roundId}\`. A primeira associação pode mudar DRAFT para IN_PROGRESS, conforme o servidor.
- **Retirar:** DELETE \`/{roundId}\`. A última remoção pode repor DRAFT; não elimina resultados da jornada original.
- **Pontos de corridas:** PUT \`/races/points\`, corpo \`{pointsByPlace:"25,18,15,..."}\`, apenas em DRAFT e antes de ter jornadas associadas; 1–20 posições, 0–1000, sequência não crescente.
- Todas as escritas exigem confirmação nativa, validação local, utilizador autenticado, papel OWNER/ADMIN e modo real (demonstração não escreve). O backend valida novamente permissões, regras de modalidade e elegibilidade dos resultados. Uma falha/timeout não é repetida automaticamente.

Não implementado nesta fase: gestão de estafetas (fluxo próprio de séries/finais/decisões), inserção de resultados brutos de jornadas, encerramento de campeonatos de corridas, modalidades sem endpoints compatíveis. Não alterar web, backend ou master.

Referências verificadas em \`Miguel14Ferreira/jynlo-web-BE/develop\`: CommunityTournamentRaceController, CommunityTournamentTimedController, CommunityTournamentMeasuredController e respetivos services.
