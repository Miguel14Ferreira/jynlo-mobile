# Jynlo 0.16.0 — ficha e submissão Google Play (Portugal)

**Estado:** documentação preparada; AAB assinado de `0.16.0` (`versionCode 7`) solicitado no GitHub Actions `42023837920`; **não implica que tenha sido carregado ou publicado na Play Console**.

## Identidade técnica
- Nome: **Jynlo**
- Package Android imutável: `com.jynlo.app`
- Versão candidata: `0.16.0` — `versionCode 7`
- API real: `https://desporto24-preview-api.onrender.com` (ambiente de teste integrado; confirmar URL e proteção de dados antes de produção)
- O produto é uma rede desportiva de sessões, recintos, comunidades, feed, mensagens e competições; não anunciar funcionalidades ainda não testadas na versão distribuída.

## Ficha da loja — texto proposto, sujeito a revisão final

### Nome (até 30 caracteres)
Jynlo

### Descrição curta (até 80 caracteres)
Encontra desportos, sessões, comunidades e pessoas para jogar.

### Descrição completa
Encontra o teu desporto. Encontra as tuas pessoas.

A Jynlo aproxima quem quer praticar desporto, encontrar parceiros e fazer parte de comunidades. Descobre sessões, conhece os recintos e acompanha as atividades que te interessam.

Na Jynlo podes:
- Explorar sessões desportivas e procurar oportunidades de participação.
- Encontrar recintos e descobrir modalidades desportivas.
- Criar e participar em comunidades de uma ou várias modalidades.
- Consultar torneios, resultados e classificações suportadas.
- Acompanhar o feed, as Stories e os momentos partilhados pela comunidade.
- Conversar com outros participantes através das funcionalidades de mensagens disponíveis na aplicação.

Podes explorar parte do conteúdo como visitante. Para participar e partilhar, inicia sessão com a tua conta Jynlo. O acesso com Google requer configuração e validação do OAuth Android antes da distribuição.

A Jynlo está numa fase de evolução. Algumas funcionalidades dependem da modalidade, das permissões da comunidade e do estado da sessão.

### Categoria e contacto
- Proposta de categoria: **Desporto** (avaliar frente a Social conforme a proposta de valor e a taxonomia da consola).
- Contacto atualmente documentado na página legal da web: `desporto24app@gmail.com`. Confirmar se este continua a ser o canal oficial antes de publicar.
- Política de Privacidade: `https://d24sports.com/privacy`; Termos: `https://d24sports.com/terms`; eliminação de conta fora da app: `https://d24sports.com/delete-account`. As rotas existem no frontend `develop`; **confirmar que os três URLs estão acessíveis publicamente, sem autenticação**.

## OAuth Google — certificados distintos
O backend já expõe `GET /api/auth/google/config` com Web OAuth client ID. O Android usa `GoogleSignin.configure({webClientId})` e envia ID token para `/api/auth/google/login` ou `/api/auth/google/register`.

**Certificado de upload privado** (a impressão digital é pública, a chave privada NÃO):
- SHA-1 da upload key, calculado localmente por `keytool` e keystore guardada: `25:33:DB:E4:42:17:BA:8A:A3:42:A3:84:82:E4:49:5A:3D:69:5C:5D`
- SHA-256 da upload key: `7D:FA:10:A7:31:AE:FD:D1:62:0A:6D:47:21:D9:CD:2E:9C:CA:2B:48:40:EE:DE:FB:A8:1D:2D:15:1B:02:9B:F6`
- **Não confundir com a chave de distribuição da Play Store.** A app publicada pela Google Play é assinada com a **App Signing Key** gerida pela Google. É o SHA-1 desse certificado que tem de estar registado no cliente OAuth Android `com.jynlo.app` do Google Cloud. Obter na Play Console → App Integrity / Play App Signing depois de haver certificado associado à aplicação.
- Se a Play Console apresentar certificados distintos para dispositivos de gerações diferentes, registar todos os certificados de assinatura de distribuição aplicáveis.
- Manter o Web OAuth client usado pelo backend como público-alvo do ID token; não incluir `client_secret` nem credenciais privadas na app ou em commits.
- Confirmar no telemóvel login de conta existente, nova inscrição com consentimento, MFA, cancelamento do seletor e reabertura de sessão. Um CI bem-sucedido não prova que o OAuth cloud está configurado.

## Tarefas na Play Console, sem inventar declarações
1. Validar AAB final: release `0.16.0`, `versionCode 7`, `targetSdkVersion` exigido atualmente e assinatura. O AAB **não é** uma APK.
2. Enviar o AAB para o **teste interno**, não produção; selecionar testadores e confirmar rollout interno.
3. Terminar categoria, email de contacto e ficha da loja, com ícone, feature graphic e screenshots captados da versão final, não da antiga APK com layout cortado.
4. Preencher política de privacidade, detalhes de login para os revisores, classificação de conteúdos, público-alvo, segurança de dados e restantes formulários. Rever contra tratamento real de email, dados pessoais, mensagens, conteúdos, imagens/vídeos e permissões; **não assinalar “sem recolha de dados” por defeito**.
5. Verificar eliminação de conta na app e via web pública, de acordo com as regras da Google Play.
6. Confirmar Play App Signing SHA e testar Google Sign-In em instalação vinda da própria Play.
7. Organizar o teste fechado exigido nesta conta: 12 testadores aceites durante 14 dias consecutivos; depois pedir acesso à produção e aguardar decisão da Google.

## Estado operacional de 5-11-2026
- AAB anterior `0.14.0`: gerado com sucesso, mas **não contém login Google nativo**.
- AAB `0.16.0`: GitHub Actions `https://github.com/Miguel14Ferreira/jynlo-mobile/actions/runs/42023837920`, sujeito a conclusão e artefacto.
- A Play Console tinha lançamento interno em rascunho, sem testadores ativos e sem AAB enviado. Não declarar que a app está na loja até receber confirmação inequívoca da consola.

Fontes de configuração: Android `app.json`, código mobile `src/lib/google-credential.ts`, contrato backend `AuthenticationController.java`; Google: https://support.google.com/googleplay/android-developer/answer/9842756 .
