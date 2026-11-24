#!/usr/bin/env bash
# Wraps src/app.html (a page fragment) into a full standalone index.html.
set -euo pipefail
cd "$(dirname "$0")/.."
{
  echo '<!doctype html>'
  echo '<html lang="en">'
  echo '<head>'
  echo '<meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  echo '<meta name="theme-color" content="#141B2B">'
  echo '<link rel="manifest" href="manifest.webmanifest">'
  echo '<link rel="icon" href="icon.svg" type="image/svg+xml">'
  echo '</head>'
  echo '<body>'
  cat src/app.html
  echo '</body>'
  echo '</html>'
} > index.html
echo "Built index.html"
