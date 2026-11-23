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
adb logcat -c
adb shell screenrecord --time-limit 180 /sdcard/parte1.mp4 & rec1=$!
( sleep 178; adb shell screenrecord --time-limit 180 /sdcard/parte2.mp4 ) & rec2=$!
args=()
[ -n "${JYNLO_USER:-}" ] && args+=(-e "JYNLO_USER=$JYNLO_USER")
[ -n "${JYNLO_PASS:-}" ] && args+=(-e "JYNLO_PASS=$JYNLO_PASS")
maestro test "${args[@]}" --test-output-dir "$out/maestro" "$FLOW"
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
