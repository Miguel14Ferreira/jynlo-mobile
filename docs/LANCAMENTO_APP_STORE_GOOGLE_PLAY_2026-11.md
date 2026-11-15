# Jynlo — preparação coordenada App Store + Google Play
Data da auditoria: 2026-11-15. Documento de preparação; **não é aprovação das lojas nem autorização de publicação**.
Branch de desenvolvimento: `develop`. Não modificar `master`.

## Estado comprovado
- iOS: a build `0.16.6 (1)` foi enviada ao App Store Connect, com TestFlight externo submetido para Beta App Review (estado reportado: Waiting for Review). A publicação pública é um processo distinto.
- Android: `app.json` declara `com.jynlo.app` e `versionCode: 13`; `eas.json` possui perfil `production` com Android `app-bundle`, separado da APK `preview`.
- Os workflows de Google Play existentes dependem do GitHub Actions, cuja quota foi atingida. Não executar builds ou tentar publicar automaticamente sem validação e assinatura.
- `scripts/verify-release.cjs --production` recusa o backend preview e exige Google Maps e Firebase configurados. Estes controlos devem continuar ativos.
- **Não verificado:** AAB `versionCode 13` assinado, `targetSdkVersion` real no manifest do bundle final, estado atual de verificação/produção da conta Play, entrada efetiva na Play Console, assinatura Play App Signing e funcionamento de OAuth Google na versão instalada da Play.

## Proposta de ficha pública (PT-PT) para as duas lojas
Nome: **Jynlo**
Assinatura de marca: **Encontra o teu desporto. Encontra as tuas pessoas.**

Descrição curta Google Play (máximo 80 caracteres):
**Encontra pessoas, sessões e comunidades para praticar desporto.**

Subtítulo App Store (validar limite no campo):
**Desporto, sessões e comunidade**

Descrição longa (copiar e ajustar às funcionalidades verificadas na build de produção):

Encontra o teu desporto. Encontra as tuas pessoas.

A Jynlo ajuda-te a descobrir oportunidades para praticar desporto, organizar sessões e conhecer pessoas com interesses semelhantes.

Descobre sessões e recintos desportivos, explora modalidades e junta-te a comunidades. Organiza atividades com outros participantes e acompanha a evolução dos jogos e competições que te interessam.

Com a Jynlo podes:
- Descobrir modalidades, recintos e sessões desportivas.
- Criar sessões, gerir participantes e confirmar presenças.
- Participar em comunidades desportivas.
- Consultar torneios, resultados e classificações disponíveis.
- Partilhar publicações e Stories.
- Conversar com outros membros através das mensagens disponíveis.

Algumas funcionalidades dependem da modalidade, das permissões e da disponibilidade das sessões ou comunidades. É necessário iniciar sessão para participar e publicar.

## Imagens e identidade
- Usar ícone Jynlo oficial; não criar logótipos alternativos.
- Capturas **reais da versão destinada à loja**. Roteiro recomendado: Explorar, detalhe de sessão, criar sessão, comunidade, torneios/classificações, Feed/Stories, chat.
- Evitar informações reais de participantes ou conversas privadas nas capturas. Usar contas/dados autorizados para demonstração.
- App Store: verificar requisitos de screenshot por dispositivo, iPhone com Dynamic Island. O projeto indica `ios.supportsTablet: false`.
- Google Play: preparar mínimo de duas capturas válidas, ícone e imagem de destaque da ficha. Não substituir capturas reais por mockups apresentados como funcionalidades prontas.

## Requisitos de conformidade e revisão — NÃO assinalar como concluídos sem auditoria
- Política de privacidade pública, declaração Data safety (Android), App Privacy (Apple), tratamento de localização, fotos, câmara, microfone, mensagens, autenticação e dados partilhados com prestadores.
- Eliminação de conta acessível **na app e fora dela**; testar o resultado real e a política de conservação de dados.
- Acesso para revisores: conta de teste funcional sem expor credenciais no repositório.
- Conteúdo criado por utilizadores: denúncia de conteúdo/utilizadores, bloqueio, moderação e resposta a abusos, incluindo mensagens privadas.
- Classificação etária, público-alvo, publicidade/monetização (se aplicável), regiões de distribuição, contacto oficial, suporte e declarações comerciais.
- Auditoria jurídica existente em `docs/GOOGLE_PLAY_SUBMISSAO_016.md` sinaliza identificação jurídica, retenção e prestadores ainda pendentes; revalidar antes de declarar conformidade.
- Política/termos/eliminar conta propostos na documentação anterior: `https://d24sports.com/privacy`, `https://d24sports.com/terms`, `https://d24sports.com/delete-account`. Não declarar que funcionam hoje sem voltar a verificar.

## Google Play: caminho de publicação
1. Abrir a Play Console e confirmar **verificação da conta** e estado da app `com.jynlo.app`, incluindo o acesso a produção.
2. Confirmar se é uma conta pessoal criada após 13-11-2023: nesse caso, antes de pedir acesso a produção, são exigidos pelo menos **12 testers inscritos num teste fechado continuamente por 14 dias**. O teste interno não substitui este requisito.
3. Preencher ficha principal, imagem de destaque, screenshots, acesso dos revisores, declarações de conteúdo e privacidade.
4. Configurar API de produção, chave Google Maps e `google-services.json` fora do Git. Confirmar SHA-1 de **Play App Signing** no cliente OAuth Google Android.
5. Validar `npm run typecheck`, `npm run test:all` e `scripts/verify-release.cjs --production` com os valores de ambiente seguros (não guardar secrets nos logs).
6. Gerar **AAB assinado** (não APK preview), confirmar `versionCode`, assinatura, nome do package e `targetSdkVersion >= 36` no artefacto final para nova submissão em novembro de 2026.
7. Enviar primeiro a teste interno/fechado conforme a situação da conta; nunca acionar produção sem autorização explícita.
8. Após teste fechado e acesso a produção aprovados, submeter o lançamento para revisão Google Play.

## Apple App Store: caminho de publicação
1. Manter TestFlight externo em revisão até à aprovação; aprovação beta **não** é aprovação App Store.
2. Completar a ficha iOS da versão pública: texto, screenshots, privacidade, suporte, idade e eventuais formulários pendentes.
3. Verificar backend adequado a produção (a IPA atual de TestFlight aponta para preview); validar autenticação, publicações, chats, chamadas e permissões em iPhones reais.
4. Selecionar a build pública validada e submeter em `Distribution > iOS App` para **App Review**. Não lançar sem autorização do titular da conta.

## Fontes oficiais para verificação
- Google Play: https://support.google.com/googleplay/android-developer/answer/14151465
- Target API: https://support.google.com/googleplay/android-developer/answer/11926878
- Play Store listing: https://support.google.com/googleplay/android-developer/answer/9859152
- Account deletion and privacy: https://support.google.com/googleplay/android-developer/answer/18265346
- Apple submission: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
- Apple screenshots: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
