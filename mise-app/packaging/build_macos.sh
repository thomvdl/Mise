#!/bin/bash
# Construit "Mise.app" dans dist/macos/. Lancez depuis un venv où requirements-macos.txt est
# installé (voir README.md).
set -euo pipefail
cd "$(dirname "$0")/.."
pyinstaller packaging/macos.spec --distpath dist/macos --workpath build/macos -y
echo "App construite : dist/macos/Mise.app"
