# Jynlo — Google Play Internal Testing via GitHub OIDC

## Estado da configuração (5 de novembro de 2026)

- Repositório: `Miguel14Ferreira/jynlo-mobile`, branch `develop`
- Aplicação: `com.jynlo.app`
- AAB assinado: `0.16.0` / `versionCode 7`, artefacto `jynlo-google-play-internal-aab` do run `42023837920`
- Artefacto GitHub disponível até **12 de novembro de 2026**; depois é necessário gerar novo AAB assinado
- Projeto: `jynlo-play-store` (número `955491875786`)
- Provider OIDC: `projects/955491875786/locations/global/workloadIdentityPools/jynlo-github/providers/github-actions`
- Service Account: `jynlo-play-publisher@jynlo-play-store.iam.gserviceaccount.com`
- Permissões na Play Console: apenas visualizar a Jynlo e publicar nas faixas de teste; sem acesso a produção, finanças ou administração
- **Autenticação sem chave JSON**: GitHub Actions `google-github-actions/auth@v3` + Application Default Credentials. Confirmada em `https://github.com/Miguel14Ferreira/jynlo-mobile/actions/runs/42069971490`.

## Workflow

Abre [Jynlo Mobile — Enviar AAB à Google Play (teste interno)](https://github.com/Miguel14Ferreira/jynlo-mobile/actions/workflows/upload-play-internal.yml), escolhe branch `develop` e uma das opções:

1. `verify-auth` (padrão): valida a federação OIDC, sem transferir nem enviar o AAB.
2. `verify-artifact`: descarrega o AAB da execução original, valida metadados de pacote, versão, commit, SHA-256, manifesto e assinatura, **sem enviar nada para a Google Play**.
3. `upload`: requer no campo de confirmação o texto exato `ENVIAR_JYNLO_016_TESTE_INTERNO`. Por padrão, envia apenas um **rascunho** (`draft`) para a faixa `internal`. `completed` disponibiliza a versão a testadores elegíveis; utilizar apenas mediante autorização explícita.

O workflow só permite execução manual (`workflow_dispatch`); um push no repositório não inicia a publicação.

## Cuidados

- Não criar ou guardar chaves JSON da Service Account.
- Não enviar novamente um `versionCode` que já tenha sido aceite na Google Play; consultar a faixa interna antes de uma nova tentativa de upload.
- A primeira publicação pode exigir etapas e confirmações adicionais na Play Console.
- Para o login Google funcionar numa versão distribuída pela Play, verificar o SHA-1 da chave **Play App Signing** na configuração OAuth Android.
- Não criar novos ficheiros `.github/jynlo-play-upload-016.request`: o disparo por push foi removido.

Referências: https://developers.google.com/android-publisher/getting_started e https://github.com/google-github-actions/auth
