# Notificações push — preparação Android

A Jynlo Mobile utiliza `expo-notifications` (SDK 58) e o serviço de registo de dispositivos do backend. **Não atives o envio em produção sem testes reais.**

## 1. Associar o projeto Expo EAS

Obtém o **projectId real** do projeto Expo/EAS que pertence à Jynlo. Não uses o package Android, slug ou identificadores de outro projeto.

Configura a variável pública em EAS (ou no ambiente local de build):

```powershell
$env:EXPO_PUBLIC_JYNLO_EAS_PROJECT_ID = "COLOCA_AQUI_O_UUID_REAL"
npm run check:push
```

O ID do projeto não é segredo; nunca coloques a chave JSON FCM, tokens de acesso privados ou credenciais de serviço em variáveis `EXPO_PUBLIC_*`.

## 2. Preparar credenciais Android

Configura FCM v1 no projeto EAS e associa as credenciais à aplicação com package `com.jynlo.app`. A verificação dessas credenciais é feita na consola Expo/Google, não pelo script local.

Para testar notificações remotas no Android, instala uma **build própria de desenvolvimento ou preview**: o Expo Go não suporta push remoto em Android neste SDK.

## 3. Testar apenas em ambiente controlado

1. Confirma que o backend de staging tem a migração de dispositivos e recibos aplicada.
2. Confirma que o dispositivo Android abre a Jynlo e inicia sessão na conta de teste.
3. No ecrã Notificações, escolhe **Ativar notificações neste dispositivo** e aceita a permissão.
4. Confirma o registo autenticado no backend, sem expor tokens em logs.
5. Só depois de validar as credenciais, a emissão, os tickets e os recibos de entrega numa instalação real, considera ativar o envio no backend.
6. Confirma que tocar no aviso abre apenas a caixa autenticada de notificações e que o logout revoga o registo.

O script `npm run check:push` apenas confirma os requisitos que consegue conhecer **localmente**: projectId EAS, pacote de notificações e plugin nativo. Não prova que FCM/APNs, credenciais, permissões, rede ou servidor estejam funcionais.

## 4. Segurança

O backend mantém o envio desativado por defeito. Os avisos não contêm texto privado e respeitam preferências e conversas silenciadas; o histórico e as autorizações são confirmados novamente ao abrir a aplicação.

Documentação oficial: https://docs.expo.dev/push-notifications/push-notifications-setup/


## APK de validação separada

O perfil `push-test` está definido em `eas.json` e gera uma **APK de instalação interna**, com a API HTTPS real e a proteção que impede compilar o modo demonstração:

```powershell
npx eas-cli build --profile push-test --platform android
```

Este comando só deve ser executado depois de associar o projeto EAS correto e configurar FCM v1. **Criar o perfil não executa a build.** O backend Render atualmente tem deploy automático desligado e pode ainda não ter os endpoints de registo de dispositivos: validar antes de testar a ativação na app.

O workflow `mobile-push-validation.yml` verifica também a geração do bundle Android (`expo export --platform android`) sem construir um APK nem enviar notificações. O resultado final do CI e a configuração EAS real ainda precisam de verificação.


## Bloqueio real de 11-11-2026: FirebaseApp não inicializada

Uma APK Android sem `google-services.json` integrado pode abrir normalmente e
mostrar notificações internas da API, mas ao pedir o token push a biblioteca
Firebase apresenta `Default FirebaseApp is not initialized`.

**Não se resolve com a chave da Google Maps nem com o projectId Expo.**

Para desbloquear a próxima APK Android:

1. Na consola Firebase, utilizar um projeto Firebase que pertença à Jynlo e
   registar uma aplicação Android com o **package exato `com.jynlo.app`**.
2. Descarregar o `google-services.json` dessa aplicação Android.
3. Em **Expo → Jynlo → Environment variables → Preview**, criar uma variável
   **tipo File**, com o nome `GOOGLE_SERVICES_JSON`, e carregar esse ficheiro.
   O `app.config.js` associa o caminho dessa variável a
   `android.googleServicesFile`. Não usar o conteúdo JSON como texto normal.
4. Em **Expo → Jynlo → Credentials → Android → `com.jynlo.app` → FCM V1**,
   associar a conta de serviço FCM V1 do **mesmo projeto Firebase**. Essa
   credencial é privada: não a colocar no repositório nem em `EXPO_PUBLIC_*`.
5. Gerar uma **nova APK `diagnostic`** no ambiente Preview. A versão
   previamente instalada não recebe estas configurações retroativamente.
6. Confirmar a permissão Android e o registo do token; depois verificar no
   backend o envio, tickets e recibos da entrega, sem mostrar tokens em logs.

O ecrã de notificações mobile deixa de oferecer ativação push quando a APK
não inclui o ficheiro Firebase e continua a permitir ler a caixa de entrada
obtida da API. Uma configuração nativa presente **não prova por si só** que o
envio remoto está operacional: requer testes end-to-end.

Referência: https://docs.expo.dev/push-notifications/fcm-credentials/

## Recuperação de falhas do token e troca de conta

- A ativação push distingue explicitamente falhas de Firebase/FCM de falhas de conectividade/Google Play Services.
- Se o registo no servidor for confirmado mas o armazenamento seguro local falhar, a app tenta revogar o registo com a sessão que o criou e informa o utilizador caso a revogação não seja confirmada.
- A API bloqueia, por segurança, a apropriação do mesmo dispositivo/token por outra conta. É necessário iniciar sessão na conta original e desativar push antes da troca; **não limpar o identificador ou registar com outra conta por tentativa**.
- A limpeza dos avisos locais no logout é de melhor esforço, de forma a não impedir o encerramento de sessão se o módulo nativo de notificações estiver indisponível.
