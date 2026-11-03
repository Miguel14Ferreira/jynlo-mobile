# JYNLO MOBILE — Android / iOS

**v0.9.0 — Páginas de equipas, grupos e jogos por fase (3 de novembro de 2026)**

- Consultar a **fase de grupos** em torneios por equipas, com classificações oficiais de `GET /teams/groups` e estado `knockoutStarted` fornecido pelo servidor.
- Consultar **eliminatórias** e calendário por rondas, usando apenas `GET /teams/matches?page=N`. O progresso e os vencedores **não são inferidos** a partir de resultados.
- Página individual por equipa com **plantel**, partilha de convite, adesão explícita pelo jogador e jogos da própria equipa via `GET /teams/{teamId}/matches?page=N`.
- Ecrã de equipas compacto, em vez de mostrar os plantéis de todas as equipas na mesma página.
- Sem tabelas genéricas de futebol para outras modalidades: jogos por equipas nesta fase só são renderizados em **Futebol/Futsal** sem `scoringMode` específico. As restantes modalidades exigem UI própria validada.
- Demonstração offline consistente com equipas, duas fases de grupos e uma final fictícia; sem pedidos à produção.
- Testes locais: **66 testes passaram**, sintaxe TypeScript/TSX sem erros. A compilação Android e os testes em dispositivo **não estão confirmados nesta fase**.
- Nenhuma alteração aos repositórios web ou backend. Desenvolvimento exclusivo em `develop` do repositório mobile.

---

**v0.8.0 — Descoberta de torneios e classificação adaptada à modalidade, 3 novembro 2026**

- Pesquisa de torneios por nome, comunidade e desporto (acentos ignorados).
- Filtros por estado e modalidade, derivados dos torneios acessíveis à conta.
- Os torneios a decorrer aparecem antes dos que estão em preparação e dos concluídos.
- Sem suposições de tabela de futebol para Voleibol, Cricket, Golfe ou modalidades novas.
- Consulta de todas as comunidades do utilizador em lotes limitados a quatro pedidos simultâneos, sem truncar silenciosamente após 12.
- Validação local: testes Node + sintaxe TS/TSX aprovados; ainda falta teste em dispositivo.

---

# JYNLO MOBILE — Android / iOS

**v0.7.0 — Percurso de sessões e preparação Android/Play Console, 3 novembro de 2026**

Nesta fase trabalhou-se no **projeto nativo**, não numa nova demonstração HTML:

- Detalhes de sessão: confirmação de presença, lista de espera quando o servidor a permite, palavra-passe para sessões privadas, inscrições programadas, identificação de «apenas membros» distinta de privada.
- Cancelar a minha presença/espera; opções do organizador para enviar convites, cancelar a sessão e abrir inscrições manualmente. As ações POST **não são automaticamente repetidas**.
- «Quem vai» e localização/ponto de encontro apenas quando a API devolve autorização e o utilizador é participante ou organizador; a apresentação anónima não expõe estes dados.
- Nova caixa de convites em Notificações: `GET /api/session-invites/pending` + aceitar/recusar via `POST /api/sessions/{id}/invites/{inviteId}/accept|decline`.
- Demo totalmente isolada: existe agora uma sessão fictícia organizada pelo Tiago, que pode convidar o André. Links de sessões fictícias **não são partilhados para o site de produção**.
- `eas.json`: perfil Android **APK** para testes internos e **AAB** para Play Store; `scripts/verify-release.cjs` bloqueia um build de loja quando não existe URL HTTPS da API configurada.
- `PLAY_STORE_PREPARACAO.md` + `.github/workflows/android-preview.yml`: o que falta para distribuição e tentativa de APK na cloud; a conta Google Play Console ainda se encontra em verificação de identidade, conforme o último ecrã partilhado.
- **51 testes Node passaram**, verificação de sintaxe TS/TSX passou. **Não houve instalação do Expo, compilação nativa, testes de dispositivos ou publicação na Play Store.**

Referências de API: `src/app/services/session.service.ts` e DTOs de sessão do frontend Jynlo, branch `develop`.

---

**v0.6.0 — Recriação do Feed mobile a partir da Jynlo Web, 3 novembro de 2026**

## O que mudou realmente na v0.6

O Feed web passou a ser a referência visual e funcional, em vez da demonstração genérica v0.5. Os elementos reais verificados no Angular são: cabeçalho de conta ativa, hero de boas-vindas com imagem desportiva, Stories, «A minha semana desportiva», publicação com media, feed, gostos, comentários, pessoas e comunidades sugeridas. O primeiro separador mobile é agora **Feed**; «Explorar» continua com a descoberta de sessões.

### Módulos React Native implementados nesta entrega

- `app/(tabs)/index.tsx`: Feed principal (não mais `GET /api/feed` num ecrã secundário), Stories por utilizador/comunidade, visualizador de foto/vídeo, publicação, gostos, comentários, partilha, cartões da semana e sugestões de pessoas.
- `app/(tabs)/explore.tsx`: antigo ecrã inicial de sessões, agora na tab Explorar. Torneios acessíveis a partir das Comunidades.
- `app/people.tsx`: lista de sugestões baseada em `GET /api/profile/discover`; pesquisa local sobre resultados. Perfis detalhados continuam por implementar.
- `src/lib/social-feed-api.ts`: contratos de `GET /api/feed`, `GET /api/stories`, `GET /api/stories/mine`, `POST /api/stories`, `POST /api/feed/posts`, `POST/DELETE /api/feed/posts/{id}/likes`, `GET/POST /api/feed/posts/{id}/comments`, `GET /api/profile/discover`. Autorização JWT; gravação só após ação explícita.
- `src/lib/social-feed-core.cjs`: regras testáveis de Stories, sessão semanal e limites de media (5 MB para foto / 20 MB para vídeo).
- `assets/jynlo-feed-sports.png`: recorte da imagem do hero do Feed web, não uma criação visual distinta.
- Dependências adicionais: `expo-image-picker ~58.0.10` e `expo-video ~58.0.12` para galeria e vídeo, seguindo a SDK 58.

### Prévia que abre sem instalar nada

Abrir `JYNLO_MOBILE_V06_FEED_FIEL_PREVIA.html` diretamente no Edge ou Chrome. É uma **simulação offline** com uma única conta fictícia `@atleta_demo`; não chama a API. É possível abrir Stories, gostar, comentar, criar uma publicação, explorar e confirmar uma sessão fictícia, enviar mensagem e terminar/voltar a iniciar sessão. A prévia permite anexar foto/vídeo, mas o resultado existe apenas naquele navegador.

### Validação e limites

- **37 testes Node passaram** e **39 ficheiros TypeScript/TSX analisados sem erros de sintaxe** no projeto (a contagem pode mudar com novos ficheiros).
- E2E da prévia em Chromium (390×844): Stories, gostos, publicação, comentários, confirmação, mensagens, logout/login; sem erros JS nem scroll horizontal.
- **Não testado:** instalação de dependências, typecheck de tipos com módulos Expo instalados, build Android/iOS, carga da API real, upload de media e ligação a backend num dispositivo.
- **Ainda em falta face à web:** ações avançadas de Stories, moderação de posts, publicação ligada a sessão, notificações push, perfis e comunidades completos, chamadas, todas as modalidades e todas as competições. Seguir `PARIDADE_WEB_MOBILE.md`.
- **Troca de contas web:** permanece um problema independente. A app mantém uma única sessão autenticada e obriga logout/login, sem inventar alternância instantânea.
- **GitHub:** nenhuma branch nova, nem alteração aos repositórios FE/BE existentes; este projeto mobile continua num pacote independente.

---

**v0.5.0 — Paridade web/mobile, sessão única e ecrãs Feed/Recintos/Minhas sessões — 3 novembro 2026**

Este é um projeto React Native / Expo Router **dedicado à aplicação mobile**. Não é um WebView nem uma cópia do site Angular. Reutiliza os contratos da API Java Spring Boot existentes em `Miguel14Ferreira/desporto24BE` e o catálogo de 121 modalidades do frontend `develop`.

## v0.5 — Não é uma aplicação só para o anúncio

**Objetivo de produto: paridade funcional com a web.** Ler a matriz completa em `PARIDADE_WEB_MOBILE.md` antes de desenvolver novas funcionalidades. A v0.5 junta o primeiro lote de paridade real (leitura de feed, recintos e minhas sessões), além de manter as fases 1–4.

- Feed (consulta inicial via `GET /api/feed`), recintos (sugestões com `GET /api/venues/suggest`, detalhe com `/api/venues/{id}`) e as minhas sessões (`GET /api/sessions/mine`). Os modos de demonstração não fazem pedidos à produção.
- **Conta única:** perfil não apresenta mais «Trocar de personagem». Para usar outra conta, é preciso terminar a sessão e autenticar de novo, na app real ou na simulação. Tokens são limpos de `expo-secure-store` ao sair. O logout tenta revogar a sessão pelo backend antes da limpeza local.
- O navegador de ecrãs é reconstruído ao mudar a identidade, para não partilhar estado visual do utilizador anterior.
- Prévia v0.5: `JYNLO_MOBILE_V05_PREVIA_SEM_COMANDOS.html`; agora inclui o fluxo explícito sair → entrar com outra conta e atalhos Feed/Recintos/Minhas sessões.
- **Estado:** testes Node e verificação sintática passaram. O projeto ainda não passou build nativo ou testes de integração em dispositivo; `npm run typecheck` não é executável sem instalar Expo.

## O que está implementado

### Fase 4 — Tempo real, notificações e equipas (v0.4.0)
- **Mensagens em tempo real enquanto o chat está aberto:** WebSocket `wss://.../ws/chat`, envio de `{type:"AUTH",token}`, receção exclusiva de `COMMUNITY_CHAT_MESSAGE` após `AUTHENTICATED`. Envelopes sem autenticação ou de outra comunidade são ignorados; IDs são deduplicados e datas convertidas sem fabricar horários.
- **Segurança do canal:** ligação aberta apenas no ecrã ativo, destruída ao sair ou trocar de conta. Reconnect com espera 3s→6s→12s→24s→30s; código `1003` bloqueia reconexão por token inválido.
- **Leitura confirmada pelo servidor:** `PUT /api/messages/inbox/read`, depois de apresentar mensagens, sem inferir contagens a partir do WebSocket. Offline demo com contagens separadas por conta.
- **Notificações na app:** `GET /api/notifications/me`, marcação de leitura `PUT /api/notifications/{id}/read`, navegação segura para convite/comunidade/sessão. **Ainda não são push do sistema Android/iOS com a app fechada.**
- **Equipas:** lista `GET /api/communities/{c}/tournaments/{t}/teams`, criação explícita `POST /teams`, entrar na equipa `PUT /teams/{id}/players/me`. O backend decide quem pode criar/entrar, incluindo vagas e adesão à comunidade.
- **Partilha de convites:** link web canónico `https://d24sports.com/menu/communities/{id}?tab=tournaments&tournament={t}&team={team}&teamPage={team}` igual à Jynlo Web. Um link **não é** um token de acesso nem garante adesão.
- **Demonstração isolada:** Tiago cria equipa, convida André e André aceita, com alertas e chat offline. Na app real a partilha é pelo mecanismo nativo do telemóvel, em vez de fabricar uma notificação de convite para equipa no backend.
- **Prévia sem instalação:** `JYNLO_MOBILE_V04_PREVIA_SEM_COMANDOS.html` abre no navegador por duplo clique. A atualização de mensagens é simulada localmente; o WebSocket real apenas está implementado no código React Native.
- **Testes:** 26 testes Node PASS, 31 ficheiros TS/TSX sem erros sintáticos; E2E da prévia no Chromium com convites, chat, equipa e karting PASS, sem scroll horizontal a 393px.
- **Ainda não validado:** instalação real do Expo, typecheck completo contra node_modules, build Android/iOS, conexões WebSocket num aparelho e autenticação real em staging. Nenhum dado real foi alterado.

### Fase 3 — Chat, convites e torneios (v0.3.0)
- Cinco separadores de navegação: Sessões, Comunidades, Torneios, Mensagens e Perfil.
- Chat em comunidades: histórico e envio de texto usando `GET/POST /api/communities/{id}/messages`. Na demonstração, só membros podem enviar e ler; em produção, a API valida a autorização. Desde a v0.4 existe WebSocket enquanto o chat está aberto; esta nota descreve a implementação v0.3.
- Caixa de mensagens de comunidades via `POST /api/messages/inbox/summaries`, com prévia do último texto e contadores devolvidos pelo backend; convites a comunidades integrados no acesso às mensagens. **Ainda não existe push nativo**.
- Consulta de torneios de comunidades com `GET /api/communities/{id}/tournaments`, detalhe e classificações de leitura.
- **Futebol:** classificação por equipas ou individual com jogos e pontos. **Karting:** `/races`, classificações de pilotos por corridas, pódios e pontos, sem aplicar uma tabela de futebol. Modalidades com critérios de tempo, marca ou outros são explicitamente assinaladas como não implementadas, em vez de serem incorretamente convertidas.
- Demo offline: criou-se um exemplo de karting público para adesão e consulta; as competições e os resultados da demonstração são fictícios e não podem ser partilhados como resultados reais.
- Prévia HTML independente incluída também no pacote global `JYNLO_MOBILE_V03_PROJETO_E_PREVIA.zip`, pronta a abrir por duplo clique, **sem comandos**.


### Fase 1 — Sessões
- Descoberta de sessões (pesquisa por cidade e modalidade, vagas e detalhe público seguro).
- Login com username/password e desafio MFA; armazenamento do token em `expo-secure-store`.
- Inscrição através de `POST /api/sessions/{id}/join`, estado de participação e lista de participantes autorizados.
- Demonstração local isolada com Tiago e André, sem alterações a produção.

### Fase 2 — Comunidades
- Separador «Comunidades» com «As minhas», «Explorar» e pesquisa pública.
- Criação de comunidades com nome, descrição, modalidade selecionada do catálogo de 121 modalidades, privacidade e limites de criação devolvidos pelo servidor.
- Detalhe de comunidade: membros autorizados, desporto, sessões ligadas e opção de adesão ou pedido de entrada.
- Convites entre **contas Jynlo**: enviar, receber, aceitar e recusar. Aceitar adiciona o membro; o envio por si só não adiciona ninguém.
- Pedidos de adesão a grupos privados e aprovação pelo organizador.
- Partilha do URL web canónico em modo real, sem inventar links de acesso automáticos a grupos privados.
- **Demo local:** Tiago cria «Futeboladas à Balda», convida André, muda-se de personagem em Perfil, André aceita em Comunidades → Convites.

## Instalação e arranque (Windows PowerShell)

Requisitos: Node.js 22, npm, Android/iOS com Expo Go compatível com o SDK ou um development build apropriado.

```powershell
cd jynlo-mobile-starter
npm install
npx expo install --fix
npm run typecheck
npm run test:all
npx expo start
```

No modo por defeito **não é feita qualquer chamada à API real**. A demonstração utiliza estado em memória, por isso volta ao estado inicial quando reinicias a aplicação. Uma sessão só por vez; não existe alternância instantânea.

### Como testar o cenário dos dois amigos

1. Em «Perfil», inicia sessão como **Tiago**.
2. Em «Comunidades», seleciona «Criar comunidade», introduz o nome **Futeboladas à Balda**, deixa **Futebol** e **Privada**, e cria.
3. Nos detalhes da comunidade, escreve **André** e clica «Enviar convite».
4. Em «Perfil», escolhe «Terminar sessão», depois inicia sessão como André.
5. Em «Comunidades → Convites», aceita o convite. A comunidade passa a ter Tiago e André.

Podes também procurar a comunidade pública **Bola à Quinta** e experimentar a adesão direta.

## API existente

Para testar apenas com **contas e dados autorizados**, copia `.env.example` para `.env` e define:

```ini
EXPO_PUBLIC_JYNLO_API_URL=https://api.d24sports.com
```

**Aviso:** esta API é de produção; com a variável definida, criar comunidades, enviar convites e confirmar presenças são operações REAIS. É preferível apontar a app para um backend/BD de staging isolados antes dos primeiros testes de escrita.

Endpoints implementados na Fase 2, confirmados no `community-groups.service.ts` do frontend Jynlo:

| Ação | Método + endpoint |
| --- | --- |
| Explorar | `GET /api/communities/search?name=&sport=&page=0` |
| As minhas | `GET /api/communities/mine` |
| Detalhe autorizado | `GET /api/communities/{id}` |
| Apresentação limitada | `GET /api/communities/{id}/presentation` |
| Limites de criação | `GET /api/communities/creation-quota` |
| Criar | `POST /api/communities` |
| Aderir a pública | `POST /api/communities/{id}/join` |
| Pedir entrada | `POST /api/communities/{id}/join-requests` |
| Ver o meu pedido | `GET /api/communities/{id}/join-requests/me` |
| Pedidos recebidos | `GET /api/communities/{id}/join-requests` |
| Aprovar pedido | `POST /api/communities/{id}/join-requests/{requestId}/accept` |
| Enviar convite | `POST /api/communities/{id}/invites` |
| Meus convites | `GET /api/communities/invites/me` |
| Aceitar/recusar | `POST /api/communities/invites/{inviteId}/accept` ou `/reject` |
| Sessões do grupo | `GET /api/communities/{id}/sessions` |

## Validação realizada

- v0.3: **20 testes Node passaram** e 26 ficheiros TS/TSX sem erros de sintaxe.
- Prévia HTML: fluxo de criar comunidade → convidar → aceitar → conversar nos dois sentidos → organizar torneio → consultar classificação de karting passou em navegador Chromium.
- Testado também em viewport móvel (393×852), sem scroll horizontal.


- 14 testes Node sem dependências externas: regras de vagas, permissões na demo, convites, privacidade, limite de 2 criações/dia, não duplicação de participantes e retorno seguro após login/MFA.
- Análise sintática de todos os ecrãs TSX/TS e ficheiros de tipos.
- **Ainda não validado:** `npm install`, `npm run typecheck` com dependências reais, build nativo e testes E2E no telemóvel — o ambiente de produção do ZIP não permite resolver `registry.npmjs.org`.

## Limites desta fase e passos seguintes

1. **Validação real num Android/iPhone:** resolver dependências via `npm install`; corrigir qualquer erro de runtime, e percorrer sessões → comunidade → convite com duas contas descartáveis em staging.
2. **Chat e notificações:** o WebSocket autenticado e histórico/alertas in-app já têm integração; ainda faltam push nativo, validação em dispositivo e testes com contas reais em staging.
3. **Torneios e equipas:** acrescentar criação, convites para equipas e grelhas/jogos; ampliar classificações próprias das restantes modalidades (Karting nunca usa classificação de futebol).
4. **Autenticação mobile:** refresh seguro, logout servidor, Google OAuth nativo e deep links/universal links Jynlo.
5. **Qualidade de lançamento:** PT/EN, acessibilidade, imagens, testes de desempenho, SDK/versionamento e distribuição nas lojas.

### Segurança e consistência

- Nunca guardar passwords ou JWT em armazenamento comum: usar `expo-secure-store`.
- Nunca revelar uma morada exata ou lista nominal de participantes a visitantes anónimos.
- Escrever só mediante uma ação explícita do utilizador; **não repetir POST automaticamente** após timeouts.
- Em demonstração, não gerar links partilháveis que conduzam a comunidades fictícias no site público.
- As funcionalidades de comunidades no backend são a fonte de verdade; o cliente não contorna permissões de organização.

**GitHub:** este pacote não criou branches nem modificou os repositórios FE/BE, porque a aplicação nativa é um projeto independente e ainda não existe um repositório específico para ela na conta ligada.
