// Preserve static identifiers and signing metadata from app.json.
module.exports = ({config}) => {
  const projectId = (process.env.EXPO_PUBLIC_JYNLO_EAS_PROJECT_ID || '').trim();
  const diagnostic = process.env.JYNLO_ANDROID_DIAGNOSTIC_NO_R8 === '1';
  // Disable native shrinking only in internal EAS diagnostic builds.
  // Never silently change the signed Play Store production profile.
  const plugins = diagnostic
    ? [...(config.plugins || []), ['expo-build-properties', {android:{
        enableMinifyInReleaseBuilds: false,
        enableShrinkResourcesInReleaseBuilds: false,
      }}]]
    : (config.plugins || []);
  return {
    ...config,
    owner: 'tmf14s-team',
    plugins,
    ...(projectId
      ? {extra: {...(config.extra || {}), eas: {...(config.extra?.eas || {}), projectId}}}
      : {}),
  };
};
