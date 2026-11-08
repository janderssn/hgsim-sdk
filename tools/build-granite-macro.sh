#!/usr/bin/env bash
# Bake GPU-friendly macro maps from the retained original generated concept.
set -euo pipefail
asset_root=$(cd "$(dirname "$0")/.." && pwd)
macro_source=${1:-"$asset_root/docs/concept/granite-macro.png"}
output_dir="$asset_root/range/assets/materials/generated"
build_dir=$(mktemp -d "${TMPDIR:-/tmp}/hgsim-granite.XXXXXX")
trap 'rm -rf "$build_dir"' EXIT
if [[ ! -f "$macro_source" ]]; then
  printf 'Missing source image: %s\nPass the retained generated PNG as the first argument.\n' "$macro_source" >&2
  exit 1
fi
mkdir -p "$output_dir"
magick "$macro_source" -resize 1024x1024 -quality 92 "$output_dir/granite-macro-color.webp"
# A grayscale height proxy supplies broad lighting variation. This is an
# approximation derived from artwork, not measured elevation or a captured PBR map.
magick "$macro_source" -resize 1024x1024 -colorspace Gray -blur 0x2 "$build_dir/height.png"
magick "$build_dir/height.png" -virtual-pixel tile -fx 'dx=(u.p{i-1,j}.r-u.p{i+1,j}.r)*7;dy=(u.p{i,j-1}.r-u.p{i,j+1}.r)*7;0.5+0.5*dx/sqrt(1+dx*dx+dy*dy)' "$build_dir/nx.png"
magick "$build_dir/height.png" -virtual-pixel tile -fx 'dx=(u.p{i-1,j}.r-u.p{i+1,j}.r)*7;dy=(u.p{i,j-1}.r-u.p{i,j+1}.r)*7;0.5-0.5*dy/sqrt(1+dx*dx+dy*dy)' "$build_dir/ny.png"
magick "$build_dir/height.png" -virtual-pixel tile -fx 'dx=(u.p{i-1,j}.r-u.p{i+1,j}.r)*7;dy=(u.p{i,j-1}.r-u.p{i,j+1}.r)*7;0.5+0.5/sqrt(1+dx*dx+dy*dy)' "$build_dir/nz.png"
magick "$build_dir/nx.png" "$build_dir/ny.png" "$build_dir/nz.png" -combine -set colorspace sRGB -define webp:lossless=true "$output_dir/granite-macro-normal.webp"
printf 'Built geological macro albedo and approximate OpenGL normal maps.\n'
