'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('Google sign-in is native and uses server-provided OAuth web client ID',()=>{
 const google=read('src/lib/google-credential.ts');
 assert.ok(google.includes("Platform.OS!=='android'"));
 assert.ok(google.includes("'/api/auth/google/config'"));
 assert.ok(google.includes('GoogleSignin.configure({webClientId,offlineAccess:false})'));
 assert.ok(google.includes('GoogleSignin.hasPlayServices'));
 assert.ok(google.includes('GoogleSignin.signIn()'));
 assert.ok(google.includes("result.type==='cancelled'"));
 assert.ok(google.includes('result.data.idToken'));
 assert.ok(google.includes('DEVELOPER_ERROR'));
 assert.ok(!google.includes('Linking.openURL'),'Google authentication must remain native');
});

test('server verifies Google credentials and onboarding remains inside the mobile application',()=>{
 const api=read('src/lib/google-auth-api.ts');
 const auth=read('src/lib/auth.tsx');
 const login=read('app/login.tsx');
 const onboarding=read('app/google-onboarding.tsx');
 assert.ok(api.includes("'/api/auth/google/login'"));
 assert.ok(api.includes("'/api/auth/google/register'"));
 assert.ok(auth.includes('googleLoginWithIdToken(credential)'));
 assert.ok(auth.includes('googleRegisterWithIdToken(googlePending.credential,input)'));
 assert.ok(login.includes("pathname:'/google-onboarding'"));
 assert.ok(onboarding.includes('completeGoogleRegistration'));
 assert.ok(!onboarding.includes('Linking.openURL'));
 assert.ok(!login.includes('Linking.openURL'));
});

test('Google signing diagnostics and build validation are preserved',()=>{
 const workflow=read('.github/workflows/build-android-signed-apk.yml');
 const validation=read('codemagic.yaml');
 const app=JSON.parse(read('app.json'));
 assert.equal(app.expo.android.package,'com.jynlo.app');
 assert.ok(workflow.includes('SHA1:'));
 assert.ok(workflow.includes('npm run typecheck'));
 assert.ok(workflow.includes('npm run test:all'));
 assert.ok(workflow.includes('apksigner'));
 assert.match(validation,/jynlo-mobile-validacao:/);
 assert.match(validation,/npm run typecheck/);
 assert.match(validation,/npm run test:all/);
});

test('a partially persisted token and username are deleted before reporting a failed login',()=>{
 const auth=read('src/lib/auth.tsx');
 assert.ok(auth.includes('Promise.allSettled([SecureStore.deleteItemAsync(TOKEN_KEY),SecureStore.deleteItemAsync(USER_KEY)])'));
 assert.ok(auth.includes('Não foi possível guardar a sessão em segurança'));
 assert.ok(auth.indexOf('setUsername(name);')>auth.indexOf('Promise.allSettled([SecureStore.deleteItemAsync(TOKEN_KEY)'));
});

test('Google native errors are classified across SDK initialization, Play Services and account picker',()=>{
 const google=read('src/lib/google-credential.ts');
 const start=google.indexOf("try{\n  const {GoogleSignin}=await import(");
 const caught=google.indexOf('}catch(error){',start);
 assert.ok(start>=0&&caught>start);
 assert.ok(google.indexOf('GoogleSignin.hasPlayServices',start)<caught);
 assert.ok(google.indexOf('result=await GoogleSignin.signIn()',start)<caught);
 for(const marker of ["code==='SIGN_IN_CANCELLED'","code==='12501'","code==='IN_PROGRESS'",
  "code==='12502'","code==='PLAY_SERVICES_NOT_AVAILABLE'","code==='DEVELOPER_ERROR'",
  "message.includes('Native module')","message.includes('TurboModule')"]){
  assert.ok(google.includes(marker),marker);
 }
 assert.ok(google.includes('return result.data.idToken'));
 assert.ok(!google.includes('Linking.openURL'));
});

test('Google and email registration use a touch-friendly birth date selector',()=>{
 const google=read('app/google-onboarding.tsx');
 const email=read('app/register.tsx');
 const picker=read('src/components/BirthDatePicker.tsx');
 for(const screen of [google,email]){
  assert.match(screen,/import BirthDatePicker from '\.\.\/src\/components\/BirthDatePicker'/);
  assert.match(screen,/<BirthDatePicker onChange=\{set(?:Birth|DateOfBirth)\} disabled=\{busy\}\/>/);
  assert.doesNotMatch(screen,/keyboardType="numbers-and-punctuation" placeholder="1998-05-24"/);
  assert.match(screen,/Escolhe dia, mês e ano/);
 }
 assert.match(picker,/const MONTHS=\[/);
 assert.match(picker,/Array\.from\(\{length:103\}/);
 assert.match(picker,/accessibilityRole="button"/);
 assert.match(picker,/const accepted=Boolean\(iso&&validAdultDate\(iso\)\)/);
 assert.match(picker,/onChange\(accepted\?iso:''\)/);
 assert.match(picker,/A data selecionada ainda não cumpre a idade mínima de 18 anos/);
 assert.match(picker,/minHeight:52/);
 assert.match(picker,/minHeight:48/);
 assert.match(google,/Cria o teu perfil Jynlo/);
 assert.doesNotMatch(google,/Conta Google confirmada: \{auth\.googleOnboardingEmail\}/);
});
