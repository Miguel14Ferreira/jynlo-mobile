# Jynlo Mobile 0.16.0 — Google e Play Store

## Autenticação Google
- O Android usa `@react-native-google-signin/google-signin` e obtém um token Google para o Web OAuth Client ID exposto pelo backend através de `GET /api/auth/google/config`.
- O backend verifica identidade com `POST /api/auth/google/login` ou registo com `POST /api/auth/google/register`; a sessão Jynlo só é iniciada após validação do servidor e eventual MFA.
- Confirmar que `GOOGLE_CLIENT_ID` está configurado no Render e corresponde ao OAuth Client ID do tipo **Web application** usado pela app.
- No Google Cloud Console, associar **com.jynlo.app** e o SHA-1 do certificado **App signing key certificate** da Play Console a um OAuth Client ID Android. Para instalações diretas fora da Play, poderá ser necessário registar separadamente o SHA-1 da upload key.
- O código fica pronto para teste, mas requer validação real de login existente, registo, MFA, cancelamento e casos de erro num dispositivo Android com Google Play Services. O CI não substitui estes testes.

## Versão 0.16.0
- Feed com título compacto, sem imagem cortada.
- Acesso às comunidades em vez de link para torneios na descoberta por visitante.
- Acesso Google no login, onboarding Jynlo e tratamento de MFA.
- AAB com `versionCode 7`, validado em CI e assinado no GitHub Actions.

## Publicação
O workflow de Play produz apenas o AAB: **não publica nada automaticamente**. Ao terminar com sucesso, enviar o `app-release.aab` ao **teste interno** da Play Console, selecionar testadores e concluir as declarações exigidas. A produção depende dos requisitos da Play Console, incluindo teste fechado para novas contas pessoais. Nunca enviar para produção sem autorização explícita.
