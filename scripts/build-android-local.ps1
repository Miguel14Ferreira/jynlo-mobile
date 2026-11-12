<#
.SYNOPSIS
  Compila APK Android Jynlo localmente no Windows, sem EAS cloud / GitHub Actions.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\build-android-local.ps1
.NOTES
  Requer Node.js 22+, JDK 17, Android SDK (Android Studio), Firebase google-services.json.
  APK local e apenas de diagnostico. Nao substitui credenciais de assinatura Play.
#>
[CmdletBinding()]
param(
  [switch]$SkipChecks,
  [switch]$SkipInstall
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$names = @('EXPO_PUBLIC_JYNLO_API_URL','JYNLO_REQUIRE_REAL_API',
  'JYNLO_ANDROID_DIAGNOSTIC_NO_R8','GOOGLE_SERVICES_JSON')
$saved = @{}
foreach ($n in $names) { $saved[$n] = [Environment]::GetEnvironmentVariable($n,'Process') }
$pushed = $false

function Require-Tool([string]$name,[string]$installHint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name em falta. $installHint"
  }
}
function Run([string]$name,[string]$command,[string[]]$args) {
  Write-Host "==> $name" -ForegroundColor Cyan
  & $command @args
  if ($LASTEXITCODE -ne 0) { throw "$name falhou (exit $LASTEXITCODE)" }
}
try {
  Push-Location $root
  $pushed = $true
  Require-Tool 'node.exe' 'Instala Node.js LTS e reabre o terminal.'
  Require-Tool 'npm.cmd' 'Instala Node.js LTS e reabre o terminal.'
  Require-Tool 'java.exe' 'Instala JDK 17 e configura JAVA_HOME.'
  $nodeVersion = (& node.exe --version)
  if ($nodeVersion -notmatch '^v(\d+)\.' -or [int]$Matches[1] -lt 22) {
    throw "Node.js 22+ necessario; encontrado $nodeVersion."
  }
  if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\javac.exe'))) {
    throw 'Configura JAVA_HOME para um JDK completo (recomendado JDK 17 do Android Studio).'
  }
  $sdk = if($env:ANDROID_HOME){$env:ANDROID_HOME}elseif($env:ANDROID_SDK_ROOT){$env:ANDROID_SDK_ROOT}else{Join-Path $env:LOCALAPPDATA 'Android\Sdk'}
  if (-not (Test-Path (Join-Path $sdk 'platform-tools\adb.exe'))) {
    throw "Android SDK nao encontrado em $sdk. Instala Android Studio + SDK Platform-Tools e define ANDROID_HOME."
  }
  $env:ANDROID_HOME = $sdk
  $env:ANDROID_SDK_ROOT = $sdk

  $firebase = if($env:GOOGLE_SERVICES_JSON -and (Test-Path $env:GOOGLE_SERVICES_JSON)) {
    (Resolve-Path $env:GOOGLE_SERVICES_JSON).Path
  } elseif(Test-Path (Join-Path $root 'google-services.json')) {
    (Resolve-Path (Join-Path $root 'google-services.json')).Path
  } else { $null }
  if (-not $firebase) {
    throw 'Falta google-services.json: coloca o ficheiro Android Firebase na raiz do repositorio (ignorado pelo Git), ou define GOOGLE_SERVICES_JSON com o caminho.'
  }
  $env:GOOGLE_SERVICES_JSON = $firebase
  $env:EXPO_PUBLIC_JYNLO_API_URL = 'https://desporto24-preview-api.onrender.com'
  $env:JYNLO_REQUIRE_REAL_API = '1'
  $env:JYNLO_ANDROID_DIAGNOSTIC_NO_R8 = '1'
  if (-not $env:JYNLO_GOOGLE_MAPS_ANDROID_API_KEY) {
    Write-Warning 'Sem JYNLO_GOOGLE_MAPS_ANDROID_API_KEY: o mapa Google podera ficar indisponivel.'
  }
  if (-not $SkipInstall) {
    Run 'Instalar dependencias' 'npm.cmd' @('install','--no-audit','--no-fund','--package-lock=false')
  } elseif (-not (Test-Path 'node_modules\expo')) {
    throw 'Dependencias em falta: remove -SkipInstall.'
  }
  if (-not $SkipChecks) {
    Run 'Validar API real' 'npm.cmd' @('run','check:release')
    Run 'Validar TypeScript' 'npm.cmd' @('run','typecheck')
    Run 'Executar testes' 'npm.cmd' @('run','test:all')
  }
  Run 'Gerar Android nativo' 'npx.cmd' @('--no-install','expo','prebuild','--platform','android','--no-install','--clean')
  $gradle = Join-Path $root 'android\gradlew.bat'
  if (-not (Test-Path $gradle)) { throw 'Gradle wrapper nao foi gerado.' }
  # A release APK incorpora o JS e nao requer servidor Metro.
  Run 'Compilar release Android sem R8' $gradle @(':app:assembleRelease','--no-daemon')
  $apk = Join-Path $root 'android\app\build\outputs\apk\release\app-release.apk'
  if (-not (Test-Path $apk)) { throw "APK nao encontrada em $apk" }

  $buildTools = Join-Path $sdk 'build-tools'
  $signer = Get-ChildItem $buildTools -Recurse -Filter 'apksigner.bat' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $signer) { throw 'Falta apksigner no Android SDK Build-Tools. Instala as Build-Tools no Android Studio.' }
  Run 'Confirmar assinatura Android' $signer.FullName @('verify','--verbose',$apk)

  $output = Join-Path $root 'dist\android-local'
  New-Item -ItemType Directory -Path $output -Force | Out-Null
  $dest = Join-Path $output 'jynlo-preview-local.apk'
  Copy-Item $apk $dest -Force
  Write-Host ""
  Write-Host "APK GERADA: $dest" -ForegroundColor Green
  Write-Warning 'Esta build pode usar uma assinatura local diferente da APK Expo/Play. Verifica a assinatura antes de instalar por cima da atual; nao desinstales sem salvaguardar os dados.'
} finally {
  foreach($n in $names) { [Environment]::SetEnvironmentVariable($n,$saved[$n],'Process') }
  if ($pushed) { Pop-Location }
}
