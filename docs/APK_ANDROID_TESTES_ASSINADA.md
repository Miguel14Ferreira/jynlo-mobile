# Jynlo Mobile — APK assinada para testes Android

A partir da beta **0.15.0**, uma APK interna pode ser compilada com a mesma **upload key** protegida no GitHub usada para o AAB. O workflow requer execução manual e não publica nada. Liga-se ao backend preview integrado, que **pode criar/alterar dados reais**.

## Compilar
1. Em GitHub Actions, escolher **Jynlo Mobile - Android APK assinada (testes internos)**.
2. Clicar em Run workflow, branch `develop`, e escrever `TESTAR_API_REAL`.
3. Depois dos testes, TypeScript, validação API e compilação, a assinatura é verificada via `apksigner`.
4. Transferir o ZIP `jynlo-mobile-signed-internal-apk` e extrair `app-release.apk`. Inclui `android-build-info.json` e `android-build-sha256.txt` para rastreabilidade.
5. Esta APK destina-se apenas à instalação direta em Android; a Google Play exige um AAB criado pelo workflow separado.

## Instalar e atualizar
- A APK **0.13.0**, gerada anteriormente, usava assinatura de desenvolvimento. O Android poderá recusar a instalação de uma nova APK assinada por cima da antiga; nesse caso será necessário desinstalar a antiga. A desinstalação elimina dados locais não sincronizados; dados guardados no servidor permanecem sujeitos às regras da conta.
- APKs futuras deste workflow usam a mesma upload key, enquanto os segredos forem mantidos, permitindo atualização entre versões assinadas por esta mesma chave.
- O certificado de distribuição do **Google Play App Signing** pode ser diferente do certificado da upload key. Uma instalação direta pode não ser atualizável pela Play Store.
- Não publicar o ficheiro JKS, Base64 ou passwords. Se os segredos faltarem, o build falha em vez de usar debug signing.
