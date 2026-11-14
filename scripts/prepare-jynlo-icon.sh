#!/usr/bin/env bash
set -euo pipefail

# Convert the exact, user-approved Jynlo artwork to a native PNG before Expo prebuild.
# This must run in the PRE-install hook; Android prebuild runs before post-install.
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

python_bin="python3"
if ! python3 -c 'from PIL import Image' >/dev/null 2>&1; then
  python3 -m venv "$work_dir/venv"
  "$work_dir/venv/bin/python" -m pip install --disable-pip-version-check --no-input 'Pillow==11.3.0'
  python_bin="$work_dir/venv/bin/python"
fi

"$python_bin" - "$work_dir/approved.webp" "$OUTPUT" <<'PY'
from PIL import Image, ImageOps
from pathlib import Path
import sys
original=Image.open(sys.argv[1])
assert original.format == "WEBP", 'A referência não é uma imagem WebP válida'
original=original.convert("RGBA")
assert original.width>=128 and original.height>=128, 'A referência tem resolução insuficiente'
# Keep the approved source unchanged visually; pad to a square and do not
# regenerate the J, colors, outlines, or the luminous effects.
scaled=ImageOps.contain(original,(1024,1024),Image.Resampling.LANCZOS)
canvas=Image.new("RGBA",(1024,1024),"#041927")
canvas.alpha_composite(scaled,((1024-scaled.width)//2,(1024-scaled.height)//2))
destination=Path(sys.argv[2])
canvas.convert("RGB").save(destination,format="PNG",optimize=True)
assert destination.stat().st_size>0
print('Jynlo original aprovado convertido para ícone Android',canvas.size)
PY
