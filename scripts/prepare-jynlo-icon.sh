#!/usr/bin/env bash
set -euo pipefail

# Generate the Android icon from the exact, user-approved Jynlo artwork.
# This hook runs BEFORE Expo prebuild; post-install would be too late.
if [[ "${EAS_BUILD_PLATFORM:-android}" != "android" ]]; then
  exit 0
fi

SOURCE="assets/approved-jynlo-icon.webp.base64"
OUTPUT="assets/jynlo-icon.png"
if [[ ! -s "$SOURCE" ]]; then
  echo 'ERRO: falta o logótipo Jynlo aprovado.'
  exit 1
fi

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
base64 --decode "$SOURCE" > "$work_dir/approved.webp"

# EAS Ubuntu 26.04 does not include python3-venv/ensurepip.
# Install an isolated, pinned Node image processor without altering app deps.
npm install --prefix "$work_dir" --no-save --no-audit --no-fund --ignore-scripts 'sharp@0.34.5'

node - "$work_dir/node_modules/sharp" "$work_dir/approved.webp" "$OUTPUT" <<'JS'
'use strict';
const sharp=require(process.argv[2]);
const source=process.argv[3],destination=process.argv[4];
(async()=>{
  const meta=await sharp(source).metadata();
  if(meta.format!=='webp'||meta.width<128||meta.height<128)
    throw Error('A imagem aprovada tem formato ou resolução inválidos.');
  // Preserve original J, outline, proportions and glow; pad only to square.
  await sharp(source)
    .resize(1024,1024,{fit:'contain',background:'#041927'})
    .flatten({background:'#041927'})
    .png()
    .toFile(destination);
  console.log('Jynlo original aprovado convertido para ícone Android 1024x1024');
})().catch(error=>{console.error(error);process.exitCode=1;});
JS
