#!/usr/bin/env bash
# Corre dentro do emulador: instala a APK, grava o ecrã e executa o percurso Maestro.
set -uo pipefail
locale="${1:-pt-PT}"
out=walkthrough
mkdir -p "$out/screens"
exec > >(tee -a "$out/resumo.txt") 2>&1
echo "Emulador pronto; a instalar a APK."
adb install -r jynlo.apk || { echo '::error::Não foi possível instalar a APK no emulador.'; exit 1; }
# Idioma por app (Android 13+), sem mexer no resto do emulador.
adb shell cmd locale set-app-locales com.jynlo.app --locales "$locale" || true
# Hermes/Intl follows the system locale: switch the whole emulator when possible.
if adb root >/dev/null 2>&1; then sleep 3; adb wait-for-device
  adb shell "setprop persist.sys.locale $locale; setprop ctl.restart zygote" || true
  sleep 20; adb wait-for-device; until adb shell getprop sys.boot_completed | grep -q 1; do sleep 2; done
fi
# Never flash typed password characters on screen (the run is video-recorded).
adb shell settings put system show_password 0 || true
# Let System UI settle after the locale restart (avoids the emulator ANR dialog).
sleep 30
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
# 1) Login on its own, BEFORE any recording. Its output (logs, screenshots,
#    hierarchies) goes to a private folder that is deleted and never published.
if [ -n "${JYNLO_USER:-}" ] && [ -n "${JYNLO_PASS:-}" ]; then
  # Safe diagnosis: only the HTTP status of an API login with the same account (no body, no password).
  api="${EXPO_PUBLIC_JYNLO_API_URL:-https://desporto24-preview-api.onrender.com}"
  code=$(python3 -c 'import json,os;print(json.dumps({"username":os.environ["JYNLO_USER"],"password":os.environ["JYNLO_PASS"]}))' \
    | curl -s -o /dev/null -w '%{http_code}' --max-time 90 -H 'Content-Type: application/json' --data-binary @- "$api/api/auth/login" || echo erro)
  echo "Login na API ($api): HTTP $code"
  private="$(mktemp -d)"
  maestro test -e "JYNLO_USER=$JYNLO_USER" -e "JYNLO_PASS=$JYNLO_PASS" \
    --test-output-dir "$private" .maestro/entrar.yaml > "$private/consola.txt" 2>&1
  login=$?
  # Keep only step names and outcomes; drop every line that could carry typed text.
  grep -E "COMPLETED|FAILED|WARNED|SKIPPED" "$private/consola.txt" | grep -viE "input|text \"" \
    | JYNLO_PASS="$JYNLO_PASS" perl -pe 's/\Q$ENV{JYNLO_PASS}\E/[removida]/g' | sed 's/^/LOGIN-PASSO /' || true
  rm -rf "$private"
  if [ "$login" -ne 0 ]; then
    echo '::error::Não foi possível iniciar sessão com a conta de teste (sem capturas do login, por segurança).'
    exit 1
  fi
  echo "Sessão iniciada (passo não gravado)."
fi
# 2) Only now record the screen and run the walkthrough, already signed in.
adb logcat -c
adb shell screenrecord --time-limit 180 /sdcard/parte1.mp4 & rec1=$!
( sleep 178; adb shell screenrecord --time-limit 180 /sdcard/parte2.mp4 ) & rec2=$!
maestro test --test-output-dir "$out/maestro" "$FLOW"
status=$?
kill "$rec1" "$rec2" 2>/dev/null; sleep 3
adb pull /sdcard/parte1.mp4 "$out/" 2>/dev/null || true
adb pull /sdcard/parte2.mp4 "$out/" 2>/dev/null || true
find "$out/maestro" -name '*.png' -exec cp {} "$out/screens/" \; 2>/dev/null || true
# Maestro's own logs, command list and screen hierarchies contain the typed text
# (including the QA password): they are never kept or published.
rm -rf "$out/maestro"
find . -maxdepth 1 -name '*.png' -exec mv {} "$out/screens/" \; 2>/dev/null || true
adb logcat -d -v threadtime > "$out/logcat.txt"
grep -E "ReactNativeJS|FATAL EXCEPTION|AndroidRuntime" "$out/logcat.txt" > "$out/erros.txt" || true
# Belt and braces: scrub the QA password from every text file that will be published.
if [ -n "${JYNLO_PASS:-}" ]; then
  export JYNLO_PASS
  find "$out" -type f -name '*.txt' -exec perl -pi -e 's/\Q$ENV{JYNLO_PASS}\E/[removida]/g' {} +
  if grep -rlF -- "$JYNLO_PASS" "$out" >/dev/null 2>&1; then
    echo '::error::A palavra-passe QA aparece nos resultados; nada será publicado.'; rm -rf "$out"; exit 1
  fi
fi
echo "Maestro terminou com código $status"
exit $status
