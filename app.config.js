// Preserve static identifiers and signing metadata from app.json.
module.exports = ({config}) => {
  // Existing Expo project: tmf14s-team/jynlo. Keep all builds bound to this UUID.
  const projectId = '5628b5c4-513a-4b82-b0fb-7a50cace5cb6';
  const overriddenProjectId = (process.env.EXPO_PUBLIC_JYNLO_EAS_PROJECT_ID || '').trim();
  if (overriddenProjectId && overriddenProjectId !== projectId) {
    throw new Error('O EAS Project ID configurado não corresponde ao projeto Jynlo.');
  }
  const diagnostic = process.env.JYNLO_ANDROID_DIAGNOSTIC_NO_R8 === '1';
  const storeBuild = ['production', 'play-internal'].includes(process.env.EAS_BUILD_PROFILE);
  if (diagnostic && storeBuild) {
    throw new Error('BUILD BLOQUEADO: não desatives R8/minificação numa build destinada à Google Play.');
  }
  // Keep diagnostic and temporary Play crash-recovery builds unminified.
  // Never silently change the signed Play Store production profile.
  // A signed Android binary cannot initialize react-native-maps without a
  // configured Google Maps SDK key. Inject it at build time, never hardcode it.
  const mapsKey = (process.env.JYNLO_GOOGLE_MAPS_ANDROID_API_KEY || '').trim();
  if(storeBuild && !mapsKey)
    throw new Error('BUILD BLOQUEADO: falta JYNLO_GOOGLE_MAPS_ANDROID_API_KEY para ativar o mapa nativo na versão de loja.');
  if(mapsKey && !/^AIza[0-9A-Za-z_-]{35}$/.test(mapsKey))
    throw new Error('A chave da Google Maps Android não tem o formato esperado.');
  // Set GOOGLE_SERVICES_JSON as an EAS file environment variable holding the
  // Android Firebase google-services.json. Do not commit service account keys.
  const firebaseConfigFile = (process.env.GOOGLE_SERVICES_JSON || '').trim();
  const plugins = [
    ...(config.plugins || []),
    ...(mapsKey ? [['react-native-maps', {androidGoogleMapsApiKey: mapsKey}]] : []),
    // LiveKit WebRTC references an optional generated JNI bridge that is absent
    // from the bundled Android artifact. R8 treats that optional reference as a
    // missing-class error unless we explicitly suppress this single class.
    // Keep the JNI bootstrap names used at runtime by WebRTC native code.
    ['expo-build-properties', {android:{
      extraProguardRules: [
        '-dontwarn livekit.org.jni_zero.JniZeroJni',
        '-keep class livekit.org.jni_zero.JniInit { *; }',
        '-keep class livekit.org.jni_zero.** { *; }',
        // The earlier device log crashed before React Native while Room
        // resolved WorkDatabase.canonicalName. Its generated implementation
        // is looked up by the original class name, so R8 must preserve both.
        '-keep class androidx.work.impl.WorkDatabase { *; }',
        '-keep class androidx.work.impl.WorkDatabase_Impl { *; }',
        // Room and WorkManager instantiate implementations reflectively. R8
        // full mode must not discard their public no-argument constructors.
        '-keep class * extends androidx.room.RoomDatabase { public <init>(); }',
        '-keep class * extends androidx.work.InputMerger { public <init>(); }',
      ].join('\n'),
      // Emergency startup recovery: the real Play binary crashes during
      // androidx.startup WorkManager/Room initialization before React Native.
      // Disable R8 for the next store build as well as diagnostic APKs.
      // Keep package, signing identity, API, Maps and Firebase checks intact.
      // Re-enable only after a minified signed AAB passes device launch tests.
      ...(diagnostic || storeBuild ? {
        enableMinifyInReleaseBuilds: false,
        enableShrinkResourcesInReleaseBuilds: false,
      } : {}),
    }}],
  ];
  return {
    ...config,
    owner: 'tmf14s-team',
    slug: 'jynlo',
    plugins,
    android: {...(config.android || {}),...(firebaseConfigFile ? {googleServicesFile:firebaseConfigFile} : {})},
    // The native map UI must never mount in binaries without a configured SDK.
    ...(projectId
      ? {extra: {...(config.extra || {}), nativeGoogleMapsConfigured: Boolean(mapsKey), nativePushConfigured: Boolean(firebaseConfigFile),
          eas: {...(config.extra?.eas || {}), projectId}}}
      : {}),
  };
};
