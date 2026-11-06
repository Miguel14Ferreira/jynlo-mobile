// Keep the app config static unless the linked EAS project is supplied by CI.
// Never commit Expo access tokens or Android signing credentials.
const app = require('./app.json').expo;
const projectId = (process.env.EXPO_PUBLIC_JYNLO_EAS_PROJECT_ID || '').trim();

module.exports = {
  expo: {
    ...app,
    ...(projectId ? {extra: {...app.extra, eas: {...(app.extra?.eas || {}), projectId}}} : {}),
  },
};
