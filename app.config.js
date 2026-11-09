// Preserve static identifiers and signing metadata from app.json.
module.exports = ({config}) => {
  // Existing Expo project: tmf14s-team/jynlo. Keep all builds bound to this UUID.
  const projectId = '5628b5c4-513a-4b82-b0fb-7a50cace5cb6';
  const overriddenProjectId = (process.env.EXPO_PUBLIC_JYNLO_EAS_PROJECT_ID || '').trim();
  if (overriddenProjectId && overriddenProjectId !== projectId) {
    throw new Error('O EAS Project ID configurado não corresponde ao projeto Jynlo.');
  }
  const diagnostic = process.env.JYNLO_ANDROID_DIAGNOSTIC_NO_R8 === '1';
  // Disable native shrinking only in internal EAS diagnostic builds.
  // Never silently change the signed Play Store production profile.
  // A signed Android binary cannot initialize react-native-maps without a
  // configured Google Maps SDK key. Inject it at build time, never hardcode it.
  const mapsKey = (process.env.JYNLO_GOOGLE_MAPS_ANDROID_API_KEY || '').trim();
  if(mapsKey && !/^AIza[0-9A-Za-z_-]{35}$/.test(mapsKey))
    throw new Error('A chave da Google Maps Android não tem o formato esperado.');
  const plugins = [
    ...(config.plugins || []),
    ...(mapsKey ? [['react-native-maps', {androidGoogleMapsApiKey: mapsKey}]] : []),
    ...(diagnostic ? [['expo-build-properties', {android:{
      enableMinifyInReleaseBuilds: false,
      enableShrinkResourcesInReleaseBuilds: false,
    }}]] : []),
  ];
  return {
    ...config,
    owner: 'tmf14s-team',
    slug: 'jynlo',
    plugins,
    // The native map UI must never mount in binaries without a configured SDK.
    ...(projectId
      ? {extra: {...(config.extra || {}), nativeGoogleMapsConfigured: Boolean(mapsKey),
          eas: {...(config.extra?.eas || {}), projectId}}}
      : {}),
  };
};
