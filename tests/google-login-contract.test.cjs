const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('Google sign-in obtains a native ID token for the backend web audience',()=>{
 const native=read('src/lib/google-credential.ts');
 assert.match(native,/GoogleSignin\.configure\(\{webClientId/);
 assert.match(native,/GoogleSignin\.hasPlayServices/);
 assert.match(native,/GoogleSignin\.signIn\(\)/);
 assert.match(native,/result\.data\.idToken/);
 assert.match(native,/\/api\/auth\/google\/config/);
 assert.doesNotMatch(native,/GoogleSignin\.getTokens|accessToken/);
});
test('backend is authoritative for login, registration and MFA',()=>{
 const api=read('src/lib/google-auth-api.ts');
 const auth=read('src/lib/auth.tsx');
 assert.match(api,/\/api\/auth\/google\/login/);
 assert.match(api,/\/api\/auth\/google\/register/);
 assert.match(auth,/googleResponse\.mfaRequired/);
 assert.match(auth,/googleResponse\.onboardingRequired/);
 assert.match(auth,/save\(.*googleResponse\.token/);
 assert.match(auth,/completeGoogleRegistration/);
 assert.doesNotMatch(api,/localStorage|AsyncStorage/);
});
test('Google onboarding requires explicit legal acceptance and verified server token',()=>{
 const screen=read('app/google-onboarding.tsx');
 assert.match(screen,/acceptedLegalTerms:true/);
 assert.match(screen,/auth\.completeGoogleRegistration/);
 assert.match(screen,/googleOnboardingEmail/);
 const login=read('app/login.tsx');
 assert.match(login,/chooseGoogleIdentity/);
 assert.match(login,/Continuar com Google/);
 assert.doesNotMatch(login,/login Google estão em desenvolvimento/);
});
test('Google native module is bundled in Play build, without client secrets',()=>{
 const p=JSON.parse(read('package.json')),a=JSON.parse(read('app.json'));
 assert.ok(p.dependencies['@react-native-google-signin/google-signin']);
 assert.ok(a.expo.plugins.some(plugin=>plugin==='@react-native-google-signin/google-signin'));
 assert.equal(a.expo.android.package,'com.jynlo.app');
});

test('registration and password recovery are native screens (no website redirect)',()=>{
 const login=read('app/login.tsx');
 const layout=read('app/_layout.tsx');
 const register=read('app/register.tsx');
 const api=read('src/lib/native-registration.ts');
 assert.match(login,/router\.push\('\/register'\)/);
 assert.match(login,/router\.push\('\/reset-password'\)/);
 assert.doesNotMatch(login,/Criar conta no website|registerNewUser/);
 const welcome=read('app/welcome.tsx');
 assert.match(welcome,/router\.push\('\/register'\)/);
 assert.doesNotMatch(welcome,/Criar conta na Jynlo Web|registerNewUser/);
 for(const screen of ['register','confirm-email','reset-password']){
  assert.ok(layout.includes('name="'+screen+'"'),screen);
 }
 assert.match(register,/registerNative/);
 assert.match(register,/acceptedLegalTerms:true/);
 assert.match(api,/\/api\/auth\/register\/mobile/);
 assert.match(api,/\/api\/auth\/register\/resend-confirmation/);
 assert.match(api,/\/api\/auth\/reset-password\/initiate/);
 assert.match(api,/\/api\/auth\/reset-password\/confirm/);
 assert.doesNotMatch(register,/Linking\.openURL\('https:\/\/d24sports\.com\/login/);
});

test('legal texts are accessible via native Jynlo screens',()=>{
 const welcome=read('app/welcome.tsx');
 const profile=read('app/(tabs)/profile.tsx');
 const google=read('app/google-onboarding.tsx');
 const register=read('app/register.tsx');
 const layout=read('app/_layout.tsx');
 assert.ok(layout.includes('name="legal"'));
 for(const source of [welcome,profile,google,register]){
  assert.equal(source.includes('Linking.openURL("https://d24sports.com/'),false);
 }
 assert.ok(register.includes("pathname:'/legal'"));
});

test('Google native sign-in is not imported during Expo Router startup',()=>{
 const native=read('src/lib/google-credential.ts');
 assert.doesNotMatch(native,/^import\s+\{GoogleSignin\}\s+from\s+'@react-native-google-signin\/google-signin'/m);
 assert.match(native,/const \{GoogleSignin\}=await import\('@react-native-google-signin\/google-signin'\)/);
 const serverConfig=native.indexOf("'/api/auth/google/config'");
 const checkClient=native.indexOf('GOOGLE_WEB_CLIENT_ID.test(webClientId)');
 const nativeImport=native.indexOf("await import('@react-native-google-signin/google-signin')");
 const sdkConfigure=native.indexOf('GoogleSignin.configure(');
 assert.ok(serverConfig>=0&&checkClient>serverConfig&&nativeImport>checkClient&&sdkConfigure>nativeImport);
 assert.match(native,/GoogleSignin\.hasPlayServices/);
 assert.match(native,/GoogleSignin\.signIn\(\)/);
});

test('Google sign-in maps common native Android errors without accepting OAuth failures as login',()=>{
 const native=read('src/lib/google-credential.ts');
 assert.match(native,/message\.includes\('ApiException: 10'\)/);
 assert.match(native,/code==='DEVELOPER_ERROR'/);
 assert.match(native,/code==='IN_PROGRESS'/);
 assert.match(native,/code==='PLAY_SERVICES_NOT_AVAILABLE'/);
 assert.match(native,/code==='CANCELED'/);
 assert.match(native,/result\.data\?\.idToken/);
});
