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
equipas sugeridas, resultado), chats (ver a tabela "Chats e feeds" abaixo), chamadas, diretos, Feed e Stories,
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
| P2 | Grupos privados (`/api/private-groups`) | Conversas de grupo fora de comunidades | Feito (21/11) |
| P2 | Publicações ocultadas (`/feed/posts/hidden`) | Ver/repor o que se ocultou do feed | Feito (21/11) |
| P2 | Ativar MFA na app (`/profile/me/mfa/setup`) | Ativar/desativar no Perfil › Verificação em dois passos | Feito (21/11) |
| Só web | Gestão avançada de comunidade (épocas, disciplina, arquivos históricos, importação) e administração da plataforma | Tarefas de administrador, melhor no ecrã grande | Fica no web |

### Acrescentado depois da auditoria (21/11/2026)

- Conversas de grupo privadas: lista, chat, membros, fotografia; aparecem em Mensagens e no contador.
- Avisos de mensagens de grupo e push das mensagens diretas (servidor).
- Contador de mensagens por ler no ícone de Mensagens (sem conversas silenciadas).
- Barra de baixo só com ícones; atalhos no Explorar (Comunidades, Torneios, Recintos, Equipas, Pessoas, Diretos).
- Comunidades e Torneios são ecrãs normais (`/communities`, `/tournaments`), não separadores escondidos.
- Adicionar a sessão ao calendário (Google Calendar, início e fim).

### Chats e feeds: comportamento igual em todo o lado (21/11/2026, 2.ª auditoria)

A primeira auditoria dizia que todos os chats tinham as mesmas funções; não era verdade.
Estado depois da correção (app e web):

| | Privado | Sessão | Comunidade | Equipa | Grupo privado |
|---|---|---|---|---|---|
| Fotos/vídeos, PDF, localização, GIF (mostrar) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Responder, reações, editar (15 min), apagar | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pesquisa | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sondagens | não (de propósito) | ✓ | ✓ | ✓ | ✓ |
| Menções @ | — | ✓ | ✓ | ✓ | — |
| Convocatória | ✓ | — (já é a sessão) | ✓ | — | — |
| Aviso no telemóvel, contador, silenciar | ✓ | ✓ | ✓ | ✓ | ✓ |

Feeds: o feed principal tem gostos e comentários; o feed da comunidade (agora também na app) e o
feed da equipa têm publicações com fotos/vídeos, menções, editar e apagar. Comentários/gostos no feed
da comunidade não existem em nenhum lado (servidor incluído): decisão de produto, não falha de paridade.

Outras novidades de 21/11: relatórios de erros (app e web → registos do Render, procurar `client_error`),
avisos de novos jogos perto de ti (Gerir notificações), "Quem pode?" em grupos e comunidades.

## Como verificar alterações na app

- `npm run -s typecheck` e `npm run -s test:all` (tem de dar 0 falhas).
- Verificação visual: exportar para web (`npx expo export --platform web`) com um shim temporário do
  `expo-secure-store` e simular a API com Playwright a 360 px. Os ecrãs com mapa nativo (sessão,
  criar sessão) e a galeria não abrem no browser: confirmar no APK.
- APK de teste: o título do squash-merge com `[jynlo-apk]` dispara o fluxo EAS `.eas/workflows/apk-teste.yml`.

## Pendente fora do código

- Notificações no telemóvel: no Render, `JYNLO_PUSH_ENABLED=true` e `JYNLO_PUSH_ACCESS_TOKEN` (Expo); no Android, configuração do Firebase.

## Decisões já tomadas (não repetir)

- Web, troca de contas: não há "Trocar de conta" separado; foi removido por duplicar "Terminar sessão", que já leva ao formulário de entrada (teste no navbar). Proposta revista e fechada em 21/11 (PR web #826).
- Perfil privado: exige migrar as fotografias e vídeos para armazenamento protegido no servidor antes de ligar; não fazer sem acordo do Miguel.
