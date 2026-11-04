# Jynlo — Google Play: teste interno

O repositório contém um workflow **manual** para gerar um AAB assinado para a faixa **Teste interno** da Google Play. Este workflow não faz uploads à loja e não faz deploy da Jynlo Web.

## Segurança
- O package Android é `com.jynlo.app`, definido no `app.json`. Confirmar na Play Console antes do primeiro envio.
- O workflow exige a confirmação manual `PREPARAR_BETA_REAL` e usa `https://desporto24-preview-api.onrender.com`. **Apesar do nome "preview", a app pode criar e alterar dados reais nesse backend.** Verificar se é o ambiente apropriado antes do envio.
- A assinatura utiliza uma **upload key própria**, guardada fora do Git, em GitHub Actions Secrets. Nunca publicar a chave JKS, a sua codificação Base64 ou passwords em commits, issues ou logs.
- Depois do primeiro lançamento, preservar a upload key e usar a mesma nos próximos builds. Ativar Google Play App Signing na consola e guardar backup da chave e passwords num local seguro.
- A instalação por Play Store requer `.aab` assinado. Não usar as APKs demo ou as APKs de desenvolvimento.

## Segredos exigidos no GitHub Actions
Configurar em `Settings → Secrets and variables → Actions → New repository secret`:
- `JYNLO_PLAY_UPLOAD_KEYSTORE_BASE64`: conteúdo Base64 do ficheiro da upload keystore.
- `JYNLO_PLAY_UPLOAD_STORE_PASSWORD`: password da keystore.
- `JYNLO_PLAY_UPLOAD_KEY_ALIAS`: alias da chave privada.
- `JYNLO_PLAY_UPLOAD_KEY_PASSWORD`: password da chave.

A chave de upload deve ser criada de forma segura e guardada em backup pelo proprietário. Não existe chave de upload no repositório.

## Criar o AAB
1. Em GitHub → Actions, abrir **Jynlo Mobile - Google Play Internal AAB (manual)**.
2. `Run workflow`, branch `develop`, introduzir `PREPARAR_BETA_REAL`.
3. Quando os testes e o build terminarem com sucesso, transferir o artefacto `jynlo-google-play-internal-aab` e extrair `app-release.aab`.
4. Na Play Console → Jynlo → Teste interno → Criar lançamento → Upload app bundles, selecionar `app-release.aab`.
5. Preencher o nome do lançamento e notas; rever os avisos antes de iniciar a distribuição aos testadores.

Se faltarem secrets, a pipeline **falha de propósito**. Não é seguro contornar a assinatura com uma keystore de debug.

## Limites atuais
- Não existe upload automático para a Google Play, nem foi configurada uma chave na consola.
- Login, MFA, criação de sessões e permissões precisam de validação em Android real.
- Política de privacidade, Data Safety, denúncias/bloqueio e eliminação de conta devem ser revistos antes de público.
