#!/usr/bin/env python3
"""Bake the original biome/path control data; runtime surfaces use sourced PBR maps."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

OUT = Path(__file__).resolve().parents[1] / 'range' / 'assets' / 'materials'
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(84321)
# Preserve the authored cover layout after retiring the old procedural colour
# swatches. Their random samples preceded this mask in the original art bake.
for _ in range(12):
    rng.random((512, 512))

size = 1024
field = gaussian_filter(rng.random((size, size)), 55, mode='wrap')
field = (field - field.mean()) / max(field.std(), 1e-8)
cover = np.clip(field * .19 + .5, 0, 1)
y, x = np.mgrid[:size, :size] / size
world_x, world_z = (x - .5) * 3200, (y - .5) * 3200
path_x = -110 + 45 * np.sin(world_z * .006) + 25 * np.sin(world_z * .0018)
trail = np.clip((4.1 - np.abs(world_x - path_x)) / 2, 0, 1)
trail *= np.clip((world_z + 1100) / 100, 0, 1) * np.clip((700 - world_z) / 160, 0, 1)
trail *= np.clip((np.hypot(world_x, world_z) - 145) / 35, 0, 1)
landing_field = np.clip((165 - np.hypot(world_x, world_z)) / 60, 0, 1)
# Linear data: R=footpath/bare soil, G=dry cover, B=protected landing field.
control = np.stack([trail * .95, cover, landing_field], axis=-1)
Image.fromarray(np.uint8(np.clip(control * 255, 0, 255))).save(OUT / 'terrain-control.png', optimize=True)
print('Generated terrain-control.png (linear biome data; no albedo replacement)')
