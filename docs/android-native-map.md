# Jynlo Android — mapa integrado

O mapa de sessões usa react-native-maps 1.29.11 (Google Maps SDK no Android), com mosaicos públicos OpenStreetMap. Em APK/AAB próprias, a inicialização exige uma chave Google Maps Android válida. Sem configuração, o ecrã Explorar mantém uma alternativa externa e não monta MapView.

## Configuração necessária (não guardar a chave no Git)

1. Na Google Cloud Console, usar o projeto do OAuth da Jynlo.
2. Ativar **Maps SDK for Android** e configurar a faturação/quotas exigidas pelo Google Cloud.
3. Criar uma **API key**, com restrição de API para **Maps SDK for Android** e de aplicação para Android, pacote `com.jynlo.app`.
4. Na restrição Android, incluir os SHA-1 efetivos das assinaturas usadas:
   - APK da Expo: `41:60:E9:B0:B8:EF:82:C5:B4:F3:ED:C8:61:06:79:9E:1E:AB:22:0E`
   - Google Play App Signing: obter a impressão digital oficial na Play Console e registar em separado, caso seja diferente.
5. Disponibilizar a chave como variável de ambiente `JYNLO_GOOGLE_MAPS_ANDROID_API_KEY` para os perfis EAS usados. Para builds remotas, a variável precisa estar disponível na configuração EAS correspondente.
6. Gerar **nova APK** e testar no Android real: abrir Explorar → Mapa, mover o mapa, selecionar marcador e pesquisar nesta zona.

O `app.config.js` adiciona o plugin `react-native-maps` com `androidGoogleMapsApiKey` na fase de compilação e assinala `extra.nativeGoogleMapsConfigured` para controlar a interface. A ausência da chave não deve impedir builds: desativa apenas a vista nativa.

**Nota:** as restrições Google Cloud e a faturação devem ser confirmadas antes de ativar a chave. O funcionamento no Android só pode ser confirmado com uma compilação assinada e logs do dispositivo. Uma chave de Maps SDK não é um cliente OAuth nem substitui o login Google.

Nunca colocar a chave em `app.json`, documentação, capturas, PRs ou mensagens de chat.
