<#
.SYNOPSIS
  Usa Node.js 22 portatil, sem permissoes de administrador ou mudancas ao PATH global.
  Descarrega apenas de nodejs.org e verifica SHA256 oficial antes de extrair.
#>
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$version='22.23.3'
$arch=if([Environment]::Is64BitOperatingSystem){
 if($env:PROCESSOR_ARCHITECTURE -eq 'ARM64'){'arm64'}else{'x64'}
}else{throw 'Este build requer Windows 64-bit.'}
$package="node-v$version-win-$arch"
$tools=Join-Path $env:LOCALAPPDATA 'Jynlo\tools'
$nodeHome=Join-Path $tools $package
$nodeExe=Join-Path $nodeHome 'node.exe'
$origin="https://nodejs.org/dist/v$version"
$zipFile=Join-Path $tools "$package.zip"
$checksumFile=Join-Path $tools "SHASUMS256-v$version.txt"
$previousPath=$env:PATH
$previousNodeOptions=$env:NODE_OPTIONS
try {
 New-Item -ItemType Directory -Path $tools -Force | Out-Null
 if(-not (Test-Path $nodeExe)) {
  Write-Host "A preparar Node.js $version portatil (sem instalacao global)..." -ForegroundColor Cyan
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri "$origin/SHASUMS256.txt" -OutFile $checksumFile -UseBasicParsing
  $entry=Get-Content $checksumFile | Where-Object { $_ -match ("^[a-fA-F0-9]{64}\s+"+[regex]::Escape("$package.zip")+"$") } | Select-Object -First 1
  if(-not $entry){throw 'Nao foi encontrado o checksum oficial do ficheiro Node.'}
  $expected=($entry.Trim() -split '\s+')[0].ToLowerInvariant()
  Invoke-WebRequest -Uri "$origin/$package.zip" -OutFile $zipFile -UseBasicParsing
  $actual=(Get-FileHash -Path $zipFile -Algorithm SHA256).Hash.ToLowerInvariant()
  if($actual -ne $expected){throw "Checksum SHA256 do Node invalido. Esperado $expected, recebido $actual."}
  $temp=Join-Path $tools ("node-extract-"+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $temp -Force | Out-Null
  try {
   Expand-Archive -Path $zipFile -DestinationPath $temp -Force
   $expanded=Join-Path $temp $package
   if(-not (Test-Path (Join-Path $expanded 'node.exe'))){throw 'Arquivo Node incompleto.'}
   Move-Item -Path $expanded -Destination $nodeHome
  } finally { Remove-Item -Path $temp -Force -Recurse -ErrorAction SilentlyContinue }
  Remove-Item $zipFile -Force -ErrorAction SilentlyContinue
 }
 $env:PATH="$nodeHome;$previousPath"
 $actualVersion=& $nodeExe --version
 if($LASTEXITCODE -ne 0 -or $actualVersion -notmatch '^v22\.'){throw "Node portatil invalido: $actualVersion"}
 $npm=Join-Path $nodeHome 'npm.cmd'
 if(-not (Test-Path $npm)){throw 'npm.cmd nao encontrado na distribuicao Node portatil.'}
 Write-Host "Node para Jynlo: $actualVersion" -ForegroundColor Green
 Write-Host "npm para Jynlo: $(& $npm --version)"
 Write-Host 'O Node antigo instalado no Windows nao sera alterado.'
 & (Join-Path $PSScriptRoot 'validate-local.ps1') -LocalApk
 if(-not $?) { throw 'Validacao local da Jynlo terminou com falha.' }
} finally {
 $env:PATH=$previousPath
 $env:NODE_OPTIONS=$previousNodeOptions
}
