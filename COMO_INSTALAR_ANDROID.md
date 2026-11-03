# Instalar a Jynlo Mobile num Android (versão de teste)

## Antes de começar

Esta versão é uma **prévia isolada com dados fictícios**. Não é a Jynlo de produção nem está publicada na Google Play.

**Importante:** um ZIP do *código-fonte* não se instala num telemóvel. É necessário um ficheiro com extensão **.apk**. Um **.aab** também não é instalável diretamente.

## Obter a APK

1. Inicia sessão no GitHub com a conta que tem acesso a este repositório privado.
2. Abre [Actions — Jynlo Mobile](https://github.com/Miguel14Ferreira/jynlo-mobile/actions).
3. Entra na execução mais recente **Jynlo Mobile - Android APK instalável (testes)** da branch **develop**.
4. Confirma que a execução está **verde — Success**. Se ainda estiver a correr ou tiver falhado, não há APK utilizável.
5. No final da página, na secção **Artifacts**, descarrega **jynlo-mobile-android-installable-apk**.
6. Abre o ZIP descarregado e extrai o ficheiro **app-release.apk** (ou o nome .apk que lá constar).

## Instalar no telemóvel

1. Abre o ficheiro `.apk` extraído na aplicação **Ficheiros** / **Os Meus Ficheiros**.
2. Se o Android pedir autorização, ativa **Permitir desta fonte** apenas para a aplicação com que estás a abrir a APK (por exemplo, Chrome ou Ficheiros).
3. Confirma **Instalar** e, a seguir, **Abrir**.
4. Depois da instalação, desativa essa autorização de fontes desconhecidas se já não for necessária.

## Se não conseguires instalar

- **Não há Artifacts:** a compilação ainda não terminou com sucesso; verifica os passos da execução. Não tentes instalar o ZIP de código.
- **"Não foi possível abrir o ficheiro":** confirma que extraíste o ZIP e estás a abrir o `.apk`, não o `.zip` nem o `.aab`.
- **"Aplicação não instalada":** confirma que há espaço livre e que o Android é compatível. Se já instalaste outra APK com o mesmo identificador `com.jynlo.app` mas assinatura diferente, pode ser necessário desinstalar a versão anterior (isto **apaga os dados locais dessa app**).
- **"Instalação bloqueada":** concede temporariamente a permissão de instalação à aplicação Ficheiros/Chrome.
- **A app abre e pede Metro / não encontra o servidor de desenvolvimento:** estavas a usar uma APK de **debug**. Procura antes a APK **app-release.apk** do fluxo de testes em `develop`.
- **Play Protect:** se apresentar um aviso, verifica que a APK foi obtida do nosso workflow privado e que conheces a origem. Não desatives o Play Protect globalmente.

## Estado técnico

A pipeline em `develop` executa testes, valida TypeScript, prepara o Android, gera uma APK `assembleRelease` **assinada apenas com a chave de debug para testes** e verifica que a APK inclui o bundle JavaScript.

Essa assinatura **não é apropriada para publicar na Play Store**. Para a loja teremos de gerar um AAB, assinar com credenciais de lançamento adequadas e validar os requisitos da Google. A APK de demonstração **não utiliza contas reais nem escreve no backend de produção**.
