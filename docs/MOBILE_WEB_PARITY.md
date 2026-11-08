# Jynlo — paridade funcional Website ↔ Android (regra de produto)

**Regra:** uma ação disponível a um utilizador no website deve poder ser concluída dentro da aplicação móvel, sem redirecionamento obrigatório para o browser. Interface nativa, mesmas validações e regras de autorização, reutilizando o backend da Jynlo. Não introduzir ações que silenciosamente abram o website como substituto da funcionalidade.

## Estado da auditoria inicial (2026-11-06)

| Domínio | Website (rotas/funcionalidades) | Android (ecrãs existentes) | Trabalho ainda necessário |
|---|---|---|---|
| Criar conta por email | `/login/registerNewUser` | `/register` neste PR | Teste E2E real; fotografia opcional; receber confirmação por app link |
| Login Google e MFA | `/login`, onboarding, MFA | `/login`, `/google-onboarding`, `/mfa` | Registar SHA-1 Play App Signing no OAuth Android, testar em dispositivo |
| Confirmar email / recuperar password | `/login/registerNewUser/confirmTokenRegistration/:token`, `/login/resetPassword/:token` | `/confirm-email`, `/reset-password` neste PR | Android App Links verificados para abrir diretamente links de email, sem copiar token |
| Perfil, alterar dados/password | `/menu/perfis`, `/menu/alterardados`, `/menu/alterarPassword` | separador de perfil | Auditar todas as edições, segurança e avatar; preencher lacunas |
| Feed, descobrir, eventos/sessões | `/menu/feed`, `/menu/discover`, `/menu/events`, `/menu/createEvent` | feed, explorar, criar sessão e detalhes | Comparar filtros, convites, repetições, presenças, estatísticas e ações do website |
| Comunidades, torneios/equipas | `/menu/communities` e subrotas | comunidades, competições, torneios e equipas | Verificação por modalidade e por modo de competição |
| Recintos | `/menu/venues`, criar/sugerir/editar | recintos e detalhes | Criar/sugerir recintos, fotos, contactos e moderação |
| Mensagens, amigos e grupos | `/menu/messages`, `/menu/friendList`, `/menu/groups` | separador mensagens e chat de comunidade | Comparar DM, grupos, multimédia, notificações e chamadas |
| Definições/conta/admin | notificações, dados de perfil, segurança e admin | perfil e notificações | Confirmar funcionalidades adequadas a cada papel, incluindo eliminação de conta |

### Critérios de aceitação

1. Todos os botões de ação utilizam ecrãs/fluxos nativos; nenhum botão obrigatório de criar conta envia para `d24sports.com`.
2. Cada operação usa os mesmos contratos e validações do backend; sem duplicar regras de autorização no cliente.
3. Testar Android real com conta nova, conta existente, credenciais inválidas, idade inferior a 18, email de confirmação, recuperação de password e MFA.
4. A confirmação e reposição via emails deverão abrir a aplicação com **Android App Links verificados** (não colocar tokens em links de esquemas customizáveis sem verificação do domínio).
5. Não publicar novas versões Google Play enquanto backend e mobile não forem integrados e testados. Cada nova release usa `versionCode` superior ao anterior.

### Escopo do primeiro PR de autenticação

O presente PR substitui o redirecionamento de registo por ecrã nativo, introduz o endpoint JSON no backend e disponibiliza confirmação/reenvio e recuperação diretamente dentro da aplicação. **Não significa que toda a paridade esteja pronta**. A fotografia opcional, os App Links verificados e as restantes lacunas deverão ser concluídos em PRs próprios, com testes.

## Auditoria incremental — 2026-11-08 (verificação de rotas Android)

Esta secção distingue **ecrã existente** de **paridade funcional validada**. A presença de uma rota não prova que todos os fluxos, permissões, chamadas de API ou estados de erro estejam corretos.

| Percurso prioritário | Evidência Android no repositório | Estado | Próxima validação |
|---|---|---|---|
| Comunidade → chat | `app/communities/[id].tsx` → `app/communities/[id]/chat.tsx` | Ecrã e navegação existentes | Enviar, receber, multimédia e permissões com duas contas reais |
| Comunidade → competições | `app/communities/[id].tsx` → `app/communities/[id]/competitions.tsx` | Ecrã e navegação existentes | Conferir todos os modos/modalidades e gestão de resultados |
| Comunidade → criar sessão | `app/communities/[id].tsx` → `app/sessions/create.tsx` | Ecrã e navegação existentes | Repetições, convocatórias, privacidade e presença com contas reais |
| Sessão → chat | `app/sessions/[id]/chat.tsx` | Ecrã existente | Restringir aos participantes autorizados e testar ciclo de vida |
| Torneio → detalhe | `app/tournaments/[communityId]/[id].tsx` | Ecrã existente | Grupos, eliminatórias, campeonato, resultados e estatísticas |
| Feed → stories/publicações | `app/(tabs)/index.tsx` | Redesign implementado e CI validado | Usabilidade e multimédia em Android real |
| Recintos | `app/venues.tsx`, `app/venues/` | Ecrãs existentes | Criar/sugerir contacto, localização, moderação e avaliações |
| Mensagens privadas | `app/(tabs)/messages.tsx`, `app/messages/[peer].tsx` | Ecrãs existentes | Testar entrega, não lidas, anexos e chamadas |

### Política de conclusão

- **Implementado**: código e ecrãs nativos presentes; não equivale a validado.
- **Validado automaticamente**: testes e TypeScript aprovados para o commit correspondente.
- **Validado ponta a ponta**: fluxo real exercitado em Android com backend e pelo menos duas contas quando aplicável.
- **Pronto para produção**: validação ponta a ponta, permissões, erros e regressões concluídos.

### Ordem de execução

1. Comunidades: criação, adesão, gestão, convites, chat e sessões.
2. Sessões: criação, repetições, confirmação, cancelamento, equipas e privacidade.
3. Competições: formatos por modalidade, campeonatos, classificações, resultados e estatísticas.
4. Mensagens e chamadas: conversas privadas/de grupo, multimédia e voz/vídeo.
5. Explorar, recintos, perfil, notificações e acabamento de release.

A APK interna assinada é um **artefacto de testes**, não prova de paridade nem autorização de publicação na Play Store.
