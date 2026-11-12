<#
.SYNOPSIS
  Validate Jynlo Mobile on Windows without using GitHub Actions.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -NoInstall -Bundle
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -NoInstall -BuildApk
.NOTES
  -Bundle produces JavaScript assets, not an APK.
  -BuildApk explicitly opts in to an Expo EAS cloud build (subject to EAS quota).
  No APK build occurs during normal validation.
#>
[CmdletBinding()]
param(
    [switch]$NoInstall,
    [switch]$Bundle,
    [switch]$BuildApk
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$oldApi = [Environment]::GetEnvironmentVariable('EXPO_PUBLIC_JYNLO_API_URL','Process')
$oldGuard = [Environment]::GetEnvironmentVariable('JYNLO_REQUIRE_REAL_API','Process')
$api = 'https://desporto24-preview-api.onrender.com'

function Invoke-Checked {
    param([string]$Description,[string]$Executable,[string[]]$Arguments)
    Write-Host ""
    Write-Host ("==> " + $Description) -ForegroundColor Cyan
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw ("Falhou: " + $Description + " (exit code " + $LASTEXITCODE + ")")
    }
}

try {
    Push-Location $repoRoot
    Write-Host "Jynlo Mobile - Validacao local sem GitHub Actions" -ForegroundColor Green

    $node = (& node --version)
    if ($LASTEXITCODE -ne 0 -or -not $node -or $node -notmatch '^v(\d+)\.') {
        throw 'Instala Node.js 22 LTS antes de continuar.'
    }
    if ([int]$Matches[1] -lt 22) {
        throw ('Node.js 22 ou superior necessario. Encontrado: ' + $node)
    }
    Write-Host ("Node: " + $node)

    if (-not $NoInstall) {
        # No package-lock mutation and no lifecycle scripts, same as CI safeguards.
        Invoke-Checked 'Instalar dependencias (sem scripts e sem package-lock)' 'npm.cmd' @('install','--ignore-scripts','--package-lock=false','--no-audit','--no-fund')
    } elseif (-not (Test-Path (Join-Path $repoRoot 'node_modules\typescript'))) {
        throw 'Dependencias nao instaladas. Executa novamente sem -NoInstall.'
    }

    $env:EXPO_PUBLIC_JYNLO_API_URL = $api
    $env:JYNLO_REQUIRE_REAL_API = '1'

    Invoke-Checked 'Validar configuracao API real' 'npm.cmd' @('run','check:release')
    Invoke-Checked 'Verificar TypeScript' 'npm.cmd' @('run','typecheck')
    Invoke-Checked 'Validar sintaxe e contratos Node' 'npm.cmd' @('run','test:all')

    if ($Bundle) {
        Invoke-Checked 'Exportar bundle Android (NAO gera APK)' 'npx.cmd' @('--no-install','expo','export','--platform','android','--output-dir','dist/jynlo-local-android')
    }

    Write-Host ""
    Write-Host 'Validacao concluida com sucesso.' -ForegroundColor Green

    if ($BuildApk) {
        Write-Warning 'O EAS Build utiliza quota da conta Expo e pode ter custos se nao estiveres no plano gratuito.'
        Write-Warning 'Confirma primeiro a quota gratuita disponivel em https://expo.dev/accounts'
        $confirmation = Read-Host 'Para iniciar uma APK EAS preview, escreve CONSTRUIR_APK'
        if ($confirmation -ne 'CONSTRUIR_APK') {
            Write-Host 'Build cancelada. Nao foi iniciado qualquer trabalho na Expo.'
        } else {
            Invoke-Checked 'Pedir APK preview diretamente a Expo (sem GitHub Actions)' 'npx.cmd' @('--yes','eas-cli@latest','build','--platform','android','--profile','preview')
        }
    }
} catch {
    Write-Error ("Jynlo validacao falhou: " + $_.Exception.Message)
    exit 1
} finally {
    [Environment]::SetEnvironmentVariable('EXPO_PUBLIC_JYNLO_API_URL',$oldApi,'Process')
    [Environment]::SetEnvironmentVariable('JYNLO_REQUIRE_REAL_API',$oldGuard,'Process')
    Pop-Location
}
