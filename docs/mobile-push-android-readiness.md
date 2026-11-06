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
