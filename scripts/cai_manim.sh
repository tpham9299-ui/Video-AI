#!/usr/bin/env bash
set -euo pipefail

packages=(texlive-xetex texlive-latex-extra texlive-fonts-recommended dvisvgm fonts-noto-core)
install_python=false
if ! /tmp/mv/bin/python -c 'import manim' >/dev/null 2>&1; then
  install_python=true
  packages+=(libpango1.0-dev libcairo2-dev pkg-config)
fi

missing=()
for package in "${packages[@]}"; do
  if [[ $(dpkg-query -W -f='${Status}' "$package" 2>/dev/null) != "install ok installed" ]]; then
    missing+=("$package")
  fi
done
if (( ${#missing[@]} )); then
  sudo apt-get update -qq
  sudo apt-get install -y -qq --no-install-recommends "${missing[@]}"
fi
if [[ $install_python == true ]]; then
  python3 -m venv --clear /tmp/mv
  /tmp/mv/bin/pip install -q "manim==0.22.1"
fi
