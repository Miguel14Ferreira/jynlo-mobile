# Jynlo Mobile v0.12 — organização de torneios

A partir do detalhe do torneio, um OWNER/ADMIN da comunidade tem acesso a **Gerir competição**.

- Pode **publicar o calendário** de ligas individuais e de campeonatos por equipas suportados. O backend confirma os inscritos/plantéis e inicia a competição.
- Durante o torneio pode **registar ou corrigir resultados** de jogos, com validação de valores e confirmação explícita.
- Pode **encerrar ligas** apenas depois de carregar todas as páginas de jogos e todos os encontros estarem concluídos. O backend valida classificação, desempate e atribuição do vencedor.
- Para **grupos/eliminatórias**, o encerramento genérico de ligas não é disponibilizado. Competições por tempos, marcas, corridas e estafetas utilizam os seus próprios resultados.
- **Em modo demonstração, todas as alterações estão desativadas.** Nenhuma mutação é efetuada ao abrir o ecrã e as escritas nunca são repetidas automaticamente.

Estas verificações são apenas guardas de interface; o backend mantém toda a autoridade sobre permissões e regras desportivas. Sem uma API HTTPS explicitamente configurada, a aplicação permanece numa demonstração isolada.
