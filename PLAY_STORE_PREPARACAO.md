# Jynlo Mobile — Preparação Android / Google Play

**Estado em 03-11-2026:** a conta Google Play Console Jynlo apresentou «Google is verifying your identity», com documentos já submetidos. A verificação do telefone só fica disponível depois de a Google aprovar a identidade. **Nenhuma APK/AAB foi compilada nem enviada à Play Console nesta entrega.**

## Perfis de compilação preparados

- `eas.json` → `preview`: **APK**, distribuição interna, para instalar num Android sem Play Store.
- `eas.json` → `production`: **AAB** para submeter à Play Console. O script `eas-build-pre-install` bloqueia o build de loja quando a app só tem dados de demonstração ou a URL da API não é HTTPS válida.
- `app.json` → Android `com.jynlo.app`: **identificador provisório**. Validar se é o identificador definitivo antes da primeira publicação; depois de publicado, não poderá ser alterado nessa ficha da aplicação.
- Versões Expo/React Native definidas no `package.json`: **ainda não instaladas nem compiladas**. Alinhar versões compatíveis com o SDK e executar `expo-doctor`, `tsc` e builds antes de distribuir.
- A API de produção `https://api.d24sports.com` é o backend **real**: nunca usar contas/dados de demonstração contra este URL. Idealmente, primeiro testes de escrita num backend/BD de staging isolado.

## Critérios mínimos de lançamento

1. Aprovação de identidade e contacto pela Google Play Console; concluir eventuais verificações adicionais do dispositivo Android.
2. Preparar backend de staging e testar login, MFA e refresh em dispositivo; criar e aderir a sessões, lista de espera, convites, logout, chat e permissões de comunidades com duas contas de teste.
3. Compilar APK de teste para dispositivos, confirmar permissões, performance e links; corrigir erros de compilação e runtime.
4. Confirmar iconografia, nome Jynlo, ficha da loja, screenshots reais, classificação etária e localização PT/EN.
5. Política de privacidade acessível, direitos de acesso/eliminação de conta **dentro e fora da app**, declaração Data Safety fidedigna, moderação/reporte/bloqueio de conteúdo e utilizadores, obrigações de UGC.
6. Preparar chave de assinatura/upload key/Google Play App Signing, versionCode e AAB assinado, nunca expor credenciais num repositório.
7. Testes internos/fechados apropriados à conta; garantir que os fluxos com erros de rede e sem permissões falham de forma segura.
8. Publicar na Play Console **apenas após** validação nativa e revisão de políticas. Não lançar um protótipo HTML como aplicação final.

## Sem comandos para o proprietário

O projeto é entregue em ZIP para desenvolvimento. Para gerar a APK/AAB serão necessários um ambiente de compilação e um projeto EAS autenticado, ou uma pipeline GitHub conectada. Estes recursos ainda não foram configurados/validados nesta conversa e o presente ambiente não consegue descarregar as dependências do npm. O proprietário não precisa de executar comandos para avaliar o documento, mas **a aplicação não está pronta para instalar**.

Referência técnica: https://docs.expo.dev/build/eas-json/ e https://docs.expo.dev/build-reference/apk/.

## Pipeline Android incluída, mas ainda não executada

`.github/workflows/android-preview.yml` contém um workflow **manual** (`workflow_dispatch`) que instala dependências numa máquina GitHub Actions, valida Expo/TypeScript/testes, gera o projeto Android e tenta compilar `app-debug.apk`. O ficheiro aparece como artefacto **apenas se** o workflow terminar com sucesso. É uma APK debug de teste, não um AAB de loja. O workflow não é executável enquanto não existir um repositório GitHub dedicado com estes ficheiros e Actions ativado. Não foram criados repositórios nem branches nesta entrega.
