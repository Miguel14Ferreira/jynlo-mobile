# JYNLO — Matriz de paridade funcional Web ⇄ Mobile

Data de auditoria: 03/11/2026. Fonte: `Miguel14Ferreira/desporto24FE`, branch `develop`; interfaces Angular e serviços HTTP. A base mobile auditada é **v0.7.0 local**, não a app da loja.

## Regra de produto

- Objetivo: **tudo o que funciona na web para os utilizadores deve existir também na app**; não se exige que a UI seja igual. Recintos, comunidades e modalidades não podem ficar reduzidos ao roteiro do anúncio.
- **Contas:** a web NÃO tem troca instantânea de contas funcional. A app não deve simular essa funcionalidade. Uma conta autenticada por dispositivo, com **Terminar sessão → Iniciar sessão com outra conta**. É um problema/limitação da web a tratar separadamente, não algo a ocultar com botões falsos. Mais tarde uma troca rápida pode ser desenhada com autorização explícita e isolamento total entre identidades.
- A Jynlo Web continua ativa. A aplicação nativa usa a **mesma API e base de dados**, respeitando permissões e quotas.
- `demo` não é produção: nada de `Tiago/André` em modo real sem autenticação; não mostrar moradas privadas a visitantes.

## Cobertura por área (não confundir «tem ecrã» com «tem todas as funções»)

| Área na web | Mobile v0.5 | Ainda falta para paridade | Prioridade |
|---|---|---|---|
| Autenticação email/username + MFA | Base API | Google nativo, registo, recuperação, refresh, revogação validada | P0 |
| Trocar entre contas | Não existe funcionalmente na web | Corrigir UX web; mobile obriga logout/login, sem alternância falsa | P0 |
| Identidade/segurança do perfil | Perfil mínimo | Dados completos, edição, fotografia, privacidade, palavras-passe | P0 |
| Feed de atividade | **v0.6: Feed nativo reformulado** — stories (leitura/criação), posts (texto/foto/vídeo), gostos, comentários, partilha de texto, semana e sugestões; integração API implementada no código | **Por validar em aparelho:** upload e playback; **por concluir:** resposta/remoção de Stories, report/remoção de posts, publicação ligada à sessão, layout adaptativo/testes de integração | P0 |
| Explorar / descobrir pessoas | Lista de sugestões e pesquisa local inicial (v0.6) | Pesquisa remota com filtros, perfis completos, localização e amizades | P1 |
| Amizades e pedidos | Não | Procurar, convidar, aceitar, bloquear, denunciar | P1 |
| Sessões / pesquisa | Base | GPS, filtros avançados, sessões repetidas, mapa | P0 |
| Detalhe e confirmação de sessão | **v0.7: fluxos de presença, espera, privada/password, convites, cancelamento e localização protegida** (contratos API implementados) | Validar com backend real, cobertura de todos os modos, testes em dispositivos | P0 |
| Criar sessão | Não | Convocatória, modalidades, capacidade, comunidade, recorrência | P0 |
| Minhas sessões | **Leitura + ações de saída e gestão no detalhe v0.7** | Histórico, assiduidade, disputas e testes de integração | P1 |
| Comunidades — explorar | Base | Paginação, filtros de modalidades, sugestões, imagens | P1 |
| Comunidades — criar | Base | Foto, quota detalhada, pós-criação, modo competição | P1 |
| Comunidades — membros | Base | Funções, administração, expulsar, adesões | P1 |
| Comunidades — convites | Base | Links e QR, partilhas nativas, convites externos, avisos | P1 |
| Comunidades — conteúdo e feed | Não | Posts, multimédia, pesquisa, reações | P2 |
| Chat comunidade | Texto + socket no código | Reações, imagens, GIF, áudio, respostas, busca, estados de leitura | P0 |
| Mensagens privadas e grupos | Caixa de entrada básica | Conversas completas, grupos privados, anexos, chamadas | P0 |
| Chamadas áudio/vídeo | Não | LiveKit, chamada recebida global, participantes, permissões | P1 |
| Notificações | **In-app + caixa de convites de sessões v0.7** | Push iOS/Android, preferências, deep link, notificações em background | P0 |
| Recintos — pesquisar | **Leitura inicial acrescentada** | GPS, mapa, filtros avançados, distância, paginação | P1 |
| Recintos — detalhe | **Leitura inicial acrescentada** | Contactos, fotos, avaliação, horários, condições e verificação | P1 |
| Recintos — contribuições | Não | Sugerir recinto, corrigir contactos, adicionar fotos, reportar | P2 |
| Torneios individuais | Leitura inicial | Criação, inscrições, calendário, resultados, classificações | P0 |
| Torneios equipas | Listar/criar/aderir equipa | Perfis completos das equipas, convites, calendário, jogos, gestão | P0 |
| Formatos fase grupos + eliminatórias | Não | Sorteios, tabelas, fase de grupos, eliminatórias, critérios | P1 |
| Karting / classificação corridas | Leitura específica | Registo de provas, sanções, pontuação e etapas | P1 |
| Outras modalidades / regras próprias | Parcial | Adaptadores para as 121 modalidades, sem forçar futebol | P0 |
| Estatísticas por comunidade | Não | Épocas, jogadores, comparações, líderes, importação | P1 |
| Gestão de épocas e classificações | Não | Épocas, arquivo, importação Excel, histórico | P1 |
| Rankings e histórico do utilizador | Não | Estatísticas individuais, troféus e histórico | P2 |
| PT/EN | Só PT na base | Traduções completas e persistência da preferência | P1 |
| Acessibilidade | Parcial | Leitores de ecrã, contraste, escalas, touch targets | P0 |
| Administração, auditoria e moderação | Não | Definir o que deve estar acessível em mobile com RBAC; não expor endpoints indiscriminadamente | P2 |

**Legenda:** «Base» = percurso e contratos iniciais; «Leitura inicial» = consulta limitada, sem ações avançadas; «Não» = não existe código native correspondente. Nenhuma área está validada ponta-a-ponta com backend real num dispositivo.

## Prioridade de implementação em lotes de funcionalidades completas

1. **Fundação real:** instalar dependências, resolver typecheck, build Android/iOS, testar com backend isolado e autenticação completa (incluindo login Google/MFA/logout). Sem isto não é uma app lançável.
2. **Sessões ponta-a-ponta:** pesquisa, criação, inscrição, lista de espera, convites, recorrência, cancelamento, gestão, testes com duas contas. Preservar as regras do backend.
3. **Social:** feed completo, perfis, amizades, chat privado/comunidade/sessão, notificações push e permissões.
4. **Comunidades e competições:** equipas em páginas próprias, torneios individuais/equipas, grupos/eliminatórias, classificações especializadas por modalidade, épocas/estatísticas.
5. **Recintos, qualidade e lançamento:** GPS/mapas, contactos, avaliações, contribuições, PT/EN, acessibilidade, segurança, distribuição nas lojas.

## Problema da web: troca de contas

A página Angular `login.component.ts` redireciona quem já possui token válido para o feed; `menu.component.ts` faz logout (servidor + limpeza local), mas não oferece uma verdadeira gestão de múltiplas contas. Não assumir que existe «Trocar de conta». Corrigir a experiência web com um percurso claro de sair/entrar e testes de limpeza do token, WebSocket, dados da conta anterior e refresh cookie; avaliar depois se «troca rápida» merece funcionalidade própria.

## Evidência e limites de validação

- Endpoints verificados na web para esta etapa: `GET /api/feed`, `POST /api/feed/posts`, `POST/DELETE /api/feed/posts/{id}/likes`, `GET/POST /api/feed/posts/{id}/comments`, `GET /api/stories`, `GET /api/stories/mine`, `POST /api/stories`, `GET /api/profile/discover`; além de `GET /api/venues/suggest`, `GET /api/venues/{id}`, `GET /api/sessions/mine`, sessões, comunidades, chat e torneios.
- Feed v0.6: o primeiro separador é **Feed**; «Explorar» mantém a descoberta de sessões. Navegação mobile: Feed / Explorar / Comunidades / Mensagens / Perfil. Torneios continuam acessíveis a partir de Comunidades, não desaparecem do projeto.
- O destaque desportivo na versão mobile é um recorte do próprio ecrã web fornecido; não é um novo produto inventado. As sugestões laterais da web passam para secções abaixo do feed em telemóvel.
- Projeto mobile **ainda sem `node_modules` instalado**; a verificação `npm run typecheck` falha por ausência do Expo e tipos React. Não afirmar build Android/iOS nem testes com backend real.
- A demonstração offline v0.6 tem uma única identidade `@atleta_demo`. Para sair e entrar é necessário utilizar o Perfil; não existe alternância rápida fictícia. Não há dados de produção.
- **Sem alterações a produção, nem ao GitHub**: v0.6 distribuída como pacote local com plano de migração.
