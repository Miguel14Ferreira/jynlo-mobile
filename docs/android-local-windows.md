# Jynlo: compilar APK Android no Windows sem esperar pela Expo

Este procedimento nao usa GitHub Actions nem a fila de builds da Expo. A compilacao local e gratuita, mas requer recursos e ferramentas no PC.

## Primeira vez no Windows
1. Instala **Node.js 22+**, **Git**, **Android Studio** e um **JDK compativel com Expo SDK 58** (por exemplo JDK 17, se aceite pelo Gradle instalado).
2. No Android Studio, abre **SDK Manager** e instala Android SDK Platform, Android SDK Build-Tools e Android SDK Platform-Tools. O caminho habitual e `%LOCALAPPDATA%\Android\Sdk`.
3. Configura `JAVA_HOME` para a pasta do JDK (que contem `bin\javac.exe`). Opcionalmente `ANDROID_HOME` para a pasta do SDK; o script reconhece o caminho habitual.
4. Faz `git clone https://github.com/Miguel14Ferreira/jynlo-mobile.git` numa pasta tua ou, se ja tens o repositorio, `git checkout develop` e `git pull --ff-only`.
5. Coloca o ficheiro **Android Firebase google-services.json** na raiz do repositorio. O ficheiro e privado e esta ignorado pelo Git. Em alternativa, define `GOOGLE_SERVICES_JSON` com o caminho completo. Nao uses uma service account JSON.
6. Para ativar mapas, define `JYNLO_GOOGLE_MAPS_ANDROID_API_KEY` com a chave Android do projeto (que tenha o package e SHA-1 apropriados). Sem ela a APK pode iniciar mas o mapa pode ficar indisponivel.

No **PowerShell**, na raiz do repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-local.ps1
```

O script instala dependencias, valida TypeScript/testes/API real, gera Android com `expo prebuild --clean`, ativa o modo de diagnostico **sem R8**, compila `:app:assembleRelease`, valida a assinatura via `apksigner` e copia a APK para:

```text
dist\android-local\jynlo-preview-local.apk
```

Para repetir depois da primeira execucao, usa `-SkipInstall` se `node_modules` ja existir. `-SkipChecks` so em investigacoes conscientes; nao e recomendado para partilhar uma APK.

## Seguranca e limites
- Esta APK local serve para diagnosticar o arranque e testar funcionalidades com o **backend real de preview**. Acoes feitas na app podem modificar dados reais.
- Nao assume nem descarrega a chave de assinatura da Expo/Play; a release gerada pode estar assinada com uma chave local. **Nao desinstales a APK antiga nem instales por cima** antes de comparar certificados e salvaguardar dados. Se `apksigner` indicar que nao ha assinatura, o script interrompe-se.
- O modo sem R8 e apenas para testes. A correção definitiva de R8/WorkManager em producao requer investigacao e testes de release.
- Este metodo nao precisa de conta Expo e nao altera o AAB da Play Store.
- A primeira build local pode ser longa devido ao download do SDK/dependencias. Compilacoes seguintes normalmente aproveitam caches locais.
- Se houver erros, recolhe o texto da consola. O script nao configura o computador por si proprio e nao foi executado neste Windows pela conversa.

## Fontes Expo
- https://docs.expo.dev/guides/local-app-development/
- https://docs.expo.dev/guides/local-app-production/
- https://docs.expo.dev/build-reference/local-builds/
