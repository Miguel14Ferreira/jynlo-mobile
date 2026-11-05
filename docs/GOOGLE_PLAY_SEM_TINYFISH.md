# Google Play da Jynlo sem TinyFish

**Objetivo:** enviar o AAB 0.16.0 já gerado, sem criar mais APKs nem navegar com ferramentas pagas. O GitHub Actions passa a usar a API oficial da Google Play, limitada à **faixa de teste interno**.

## Configuração única para autorizar a API

1. Na [Google Cloud Console](https://console.cloud.google.com/), cria/escolhe um projeto e ativa a [Google Play Developer API](https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com).
2. Cria uma **conta de serviço** (service account) nesse projeto, seguindo as instruções oficiais: https://developers.google.com/android-publisher/getting_started .
3. Na [Play Console](https://play.google.com/console/), abre **Utilizadores e permissões** e convida o email dessa conta de serviço, atribuindo apenas à app Jynlo as permissões necessárias para **lançamentos de teste**, incluindo *Release apps to testing tracks*. Não conceder acesso financeiro.
4. Cria uma chave JSON para essa conta de serviço apenas se for necessária; guarda-a como GitHub Actions repository secret **`JYNLO_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`** em https://github.com/Miguel14Ferreira/jynlo-mobile/settings/secrets/actions . **Nunca enviar a chave em mensagens ou fazer commit dela.**
5. Abre o [workflow de envio para o teste interno](https://github.com/Miguel14Ferreira/jynlo-mobile/actions/workflows/upload-play-internal.yml). Escolhe `develop`, introduz `ENVIAR_JYNLO_016_TESTE_INTERNO` e deixa o modo `draft` no primeiro envio. O modo `completed` distribui diretamente aos testadores autorizados se a Play Console o permitir.

## O que este workflow faz

- Transfere o AAB oficial do GitHub Actions run `42023837920` sem compilar outra vez.
- Confirma pacote `com.jynlo.app`, versão `0.16.0`, `versionCode 7`, SHA-256, commit de origem, manifesto e assinatura.
- Utiliza a API Google Play Developer com a credencial guardada no GitHub Secrets, sem revelá-la.
- A única faixa da API é `internal`; **não existe caminho para produção** nem agendamento de publicações.
- Se faltar a credencial, a execução falha sem enviar nada.

**Atenção:** o `versionCode 7` não deve ser reenviado após aceitação; para ativar um rascunho existente, usa a Play Console sem carregar novamente o mesmo AAB. A Google pode exigir ações iniciais, documentos e consentimentos que a API não substitui. O login Google no Android distribuído também exige o SHA-1 da chave **Play App Signing** no Google Cloud OAuth.

Referências: https://developers.google.com/android-publisher/getting_started e https://docs.expo.dev/submit/android/


**Execução sem navegador:** depois de o proprietário colocar o secret no GitHub, o assistente pode criar em `develop` o ficheiro `.github/jynlo-play-upload-016.request` com a linha `ENVIAR_JYNLO_016_TESTE_INTERNO`. Isto desencadeia o workflow com estado **draft**, sem ações da Play Store em produção. O código valida o pedido e a versão exata antes de usar as credenciais. Não criar este ficheiro enquanto faltar a autorização da conta de serviço.
