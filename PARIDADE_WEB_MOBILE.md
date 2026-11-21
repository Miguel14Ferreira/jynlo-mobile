# JYNLO — Matriz de paridade funcional Web ⇄ Mobile

Data de auditoria: 03/11/2026. Fonte: `Miguel14Ferreira/desporto24FE`, branch `develop`; interfaces Angular e serviços HTTP. A base mobile auditada é **v0.7.0 local**, não a app da loja.

## Regra de produto

- Objetivo: **tudo o que funciona na web para os utilizadores deve existir também na app**; não se exige que a UI seja igual. Recintos, comunidades e modalidades não podem ficar reduzidos ao roteiro do anúncio.
- **Contas:** a web NÃO tem troca instantânea de contas funcional. A app não deve simular essa funcionalidade. Uma conta autenticada por dispositivo, com **Terminar sessão → Iniciar sessão com outra conta**. É um problema/limitação da web a tratar separadamente, não algo a ocultar com botões falsos. Mais tarde uma troca rápida pode ser desenhada com autorização explícita e isolamento total entre identidades.
- A Jynlo Web continua ativa. A aplicação nativa usa a **mesma API e base de dados**, respeitando permissões e quotas.
- `demo` não é produção: nada de `Tiago/André` em modo real sem autenticação; não mostrar moradas privadas a visitantes.

## Auditoria de 21/11/2026 (substitui a tabela antiga v0.5/v0.6)

Método: todos os endpoints do servidor (666) cruzados com o código do web e da app,
e depois confirmados à mão nos ecrãs. 469 são usados pelos dois; ~158 só pelo web
(muitos são de administração da plataforma, que fica só no web de propósito).

### Já com paridade (não repetir trabalho)
Sessões (pesquisa com nível, criação, edição, presença, espera, convites, pagamentos,
equipas sugeridas, resultado), chats (privado, comunidade, sessão, equipa: anexos,
respostas, reações, GIF, sondagens, pesquisa), chamadas, diretos, Feed e Stories,
perfis sociais e seguidores, comunidades (detalhe, membros, convites, competições,
resultados, partilha pública), torneios (todos os motores, incluindo classificação
por provas), equipas, recintos (pesquisa, detalhe, sugerir e corrigir), notificações,
eliminação da conta na app.

### Em falta na app, por prioridade

| Prioridade | O quê | Porque importa | Estado |
|---|---|---|---|
| P0 | Denunciar publicação e comentário; bloquear/denunciar a partir do perfil | Obrigatório nas lojas para conteúdo de utilizadores (Apple 1.2 / Google UGC) | Feito (21/11) |
| P1 | Preferências de notificações por tipo (`/api/notifications/me/preferences`) | O web deixa escolher que avisos receber; a app não | Feito (21/11) |
| P1 | Organizador: "a sessão não aconteceu" / reportar problema (`/sessions/{id}/problems`) | Fecha corretamente sessões que não se realizaram | Feito (21/11) |
| P2 | Disputas de presença e fiabilidade do jogador | Contestar faltas marcadas | Feito (21/11) |
| P2 | Modelos de sessão (`/sessions/presets`) | Criar o jogo semanal mais depressa | Feito (21/11) |
| P2 | Grupos privados (`/api/private-groups`) | Conversas de grupo fora de comunidades | Por fazer |
| P2 | Publicações ocultadas (`/feed/posts/hidden`) | Ver/repor o que se ocultou do feed | Por fazer |
| P2 | Ativar MFA na app (`/profile/me/mfa/setup`) | Hoje só pelo web | Por fazer |
| Só web | Gestão avançada de comunidade (épocas, disciplina, arquivos históricos, importação) e administração da plataforma | Tarefas de administrador, melhor no ecrã grande | Fica no web |

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
