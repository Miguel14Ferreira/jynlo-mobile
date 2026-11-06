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
