// Expo passes the merged static app.json configuration as 'config'.
// Keep static identifiers, permissions and signing metadata from app.json intact.
// The EAS project binding is injected only by the CI environment.
module.exports = ({config}) => {
  const projectId = (process.env.EXPO_PUBLIC_JYNLO_EAS_PROJECT_ID || '').trim();
  return {
    ...config,
    ...(projectId
      ? {extra: {...(config.extra || {}), eas: {...(config.extra?.eas || {}), projectId}}}
      : {}),
  };
};
