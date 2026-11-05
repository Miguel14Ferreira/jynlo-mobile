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

**Certificado de upload atualmente usado no GitHub** (a impressão digital é pública, a chave privada NÃO). Confirmado por comparação independente dos AABs 0.14.0 e 0.16.0:
- SHA-1 da assinatura efetiva dos AABs 0.14.0 e 0.16.0: `0A:07:F6:39:81:AC:3D:04:F0:FA:97:D1:97:61:81:4B:AE:D5:BE:99`
- SHA-256 do certificado assinado nos AABs: `7A:55:D8:17:C0:89:EC:C4:91:07:61:DF:C1:AE:56:5F:9E:23:B0:A4:E9:CB:B9:58:FA:A9:0F:73:39:99:49:1A`
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


## Auditoria pública das páginas legais (05/11/2026)

Confirmação independente das três páginas públicas, sem autenticação:
- `https://d24sports.com/privacy` — acessível e apresenta política provisória.
- `https://d24sports.com/terms` — acessível e apresenta termos do piloto (idade mínima de 18 anos).
- `https://d24sports.com/delete-account` — acessível; indica eliminação na app/web, necessidade de transferir propriedade de comunidades e canal de suporte.

**Bloqueios reais à publicação pública e à declaração de conformidade:**
1. A política de privacidade afirma literalmente que a identificação jurídica completa do responsável pelo tratamento (nome/entidade, NIF e morada) está pendente. Recolher e validar informação com o proprietário; não inventar dados e não remover a ressalva sem confirmação.
2. A política afirma que os prazos de conservação de mensagens, presenças, contactos e contas inativas ainda serão formalizados. Definir prazos reais, processos de eliminação e exceções legais antes de assinalar a política como final.
3. A política afirma que a lista e as condições dos fornecedores de infraestrutura, email e autenticação ainda serão consolidadas. Verificar prestadores e adequação de transparência, incluindo Google Sign-In.
4. A política/termos descrevem mecanismos de exportação e eliminação em desenvolvimento. Confirmar o que já funciona efetivamente e atualizar apenas as afirmações fundamentadas.
5. Rever as declarações da Play Console (Data safety, conteúdo, público-alvo, account deletion, data access para revisores) contra as funcionalidades realmente ativadas. Não declarar conformidade sem essa revisão.

Isto não impede necessariamente a compilação ou o **teste interno**, mas impede que consideremos a documentação jurídica fechada para um lançamento público. A obrigação de assegurar conformidade cabe ao titular da conta.

## Continuidade de assinatura e backup (05/11/2026)

Os AABs `0.14.0` e `0.16.0` foram extraídos dos artefactos originais do GitHub Actions e analisados com `keytool -printcert -jarfile`. Ambos apresentam o mesmo SHA-1 `0A:07:F6:39:81:AC:3D:04:F0:FA:97:D1:97:61:81:4B:AE:D5:BE:99`, e a versão `0.16.0` passou em `jarsigner -verify` e no checksum SHA-256 da compilação.

**Importante:** o ZIP `Jynlo_Google_Play_Upload_Key_2026-11-04_GUARDAR_EM_SEGURANCA.zip` foi criado mais cedo (certificado SHA-1 `25:33:DB:E4:42:17:BA:8A:A3:42:A3:84:82:E4:49:5A:3D:69:5C:5D`) e **não corresponde ao certificado que assina atualmente os AABs da GitHub Actions**. Não o utilizar como backup definitivo para atualizações Play.

Uma nova chave RSA-4096 PKCS12 foi gerada na noite de 04/11/2026, com os quatro Secrets atualizados, e foi criado um backup cifrado AES-256-GCM: `jynlo-upload-backup-ENCRYPTED.bin`, acompanhado de `jynlo-upload-recovery-PRIVATE.txt`, também disponibilizados em `jynlo-recuperacao-e-configuracao-PRIVADO.zip`. Confirmar que o proprietário guardou ambos os ficheiros de recuperação em local seguro; sem eles, será necessário recuperar a chave ou pedir à Google a reposição da chave de upload, quando aplicável.

Este SHA-1 é da **upload key**. No Google Cloud OAuth Android da versão entregue pela Play, registar o SHA-1 da **Play App Signing key** obtido na Play Console, não assumir que coincide com este.
