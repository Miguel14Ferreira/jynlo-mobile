@echo off
setlocal
cd /d "%~dp0"
title Jynlo Mobile - APK local gratuita

where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo ERRO: PowerShell nao esta disponivel neste Windows.
  pause
  exit /b 1
)
echo.
echo JYNLO MOBILE: validacao e APK Android local
echo Esta operacao usa o teu computador. Nao usa GitHub Actions, Codemagic nem EAS.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-with-portable-node.ps1"
set "RESULTADO=%ERRORLEVEL%"
if not "%RESULTADO%"=="0" (
  echo.
  echo A compilacao falhou. Verifica o erro acima.
  echo Node 22 portatil e preparado automaticamente. Confirma Java JDK 17 e Android SDK se necessário.
) else (
  echo.
  echo A APK foi gerada em dist\android-local\jynlo-preview-local.apk
  echo Nota: a assinatura local pode ser diferente da assinatura Expo.
)
echo.
pause
exit /b %RESULTADO%
