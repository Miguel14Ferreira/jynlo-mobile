'use strict';
// Native push is optional at app startup. A broken/unavailable Expo native
// notifications module must not prevent rendering the authentication screen.
function getNativeNotifications(){
 try { return require('expo-notifications'); }
 catch { return null; }
}
module.exports={getNativeNotifications};
