#!/usr/bin/env python3
"""Bake ecological control data from the shared physical world, never colour maps.

Requires NumPy, Pillow, SciPy and Node. Row zero is world minZ; runtime samples
these linear data textures with flipY=false. Rebuild after changing world.js.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT = Path(__file__).resolve().parents[1]
BOUNDS = {'minX': -1600, 'minZ': -1600, 'width': 3200, 'depth': 3200}


def canonical_ecology(size):
    """Query the same rock, talus, path and moisture source used by dressing."""
    program = r"""
      import { sampleTerrainEcology } from './range/world.js';
      const size = Number(process.argv[1]);
      const data = new Float32Array(size * size * 4);
      for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
        const e = sampleTerrainEcology(-1600 + (x + .5) * 3200 / size,
          -1600 + (z + .5) * 3200 / size);
        const i = (z * size + x) * 4;
        data[i] = e.rock; data[i+1] = e.talus;
        data[i+2] = e.moisture; data[i+3] = e.path;
      }
      process.stdout.write(Buffer.from(data.buffer));
    """
    raw = subprocess.check_output(['node', '--input-type=module', '-e', program, str(size)], cwd=ROOT)
    result = np.frombuffer(raw, dtype='<f4').reshape(size, size, 4)
    if not np.isfinite(result).all() or result.min() < 0 or result.max() > 1:
        raise ValueError('sampleTerrainEcology must return finite 0..1 weights')
    return result


def field(rng, size, metres):
    """Band-limited control variation at a stated physical scale."""
    value = gaussian_filter(rng.random((size, size)), metres * size / 3200, mode='reflect')
    value = (value - value.mean()) / max(value.std(), 1e-8)
    return np.clip(.5 + .19 * value, 0, 1)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--size', type=int, default=1024)
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'range/assets/materials')
    args = parser.parse_args()
    if args.size < 64 or args.size > 4096:
        parser.error('--size must be between 64 and 4096')
    out, size = args.output_dir, args.size
    out.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(84321)
    geology = canonical_ecology(size)
    middle, broad = (field(rng, size, metres) for metres in (23, 115))
    y, x = (np.mgrid[:size, :size] + .5) / size
    world_x, world_z = (x - .5) * 3200, (y - .5) * 3200
    distance = np.hypot(world_x, world_z)
    landing_field = np.clip((165 - distance) / 60, 0, 1)

    # The valley access path joins the canonical launch approach, fading before
    # the landing target. Sampled coverage keeps its soft, narrow verges.
    path_x = -110 + 45 * np.sin(world_z * .006) + 25 * np.sin(world_z * .0018)
    trail = np.clip((4.5 - np.abs(world_x - path_x)) / 2.5, 0, 1)
    trail *= np.clip((world_z + 1100) / 100, 0, 1) * np.clip((700 - world_z) / 160, 0, 1)
    trail *= np.clip((distance - 145) / 35, 0, 1)
    trail = np.maximum(trail, geology[:, :, 3]) * (1 - landing_field)
    moisture = np.clip(geology[:, :, 2] * .72 + broad * .28, 0, 1)
    # Use opaque RGB: browser image decoding can premultiply transparent PNG
    # pixels, making alpha-packed control data corrupt the other channels.
    controls = np.stack([trail, moisture, landing_field], axis=-1)
    ecology = np.stack([geology[:, :, 0], geology[:, :, 1], middle], axis=-1)
    files = []
    for name, data in [('terrain-control.png', controls), ('terrain-ecology.png', ecology)]:
        path = out / name
        Image.fromarray(np.uint8(np.clip(data * 255 + .5, 0, 255))).save(path, optimize=True)
        files.append({'file': name, 'sha256': digest(path), 'bytes': path.stat().st_size})
        print(f'{name}: {path.stat().st_size} bytes')
    manifest = {
        'description': 'Original ecological control data, not photographic albedo or height data',
        'seed': 84321, 'dimensions': [size, size], 'world_bounds_metres': BOUNDS,
        'linear': True, 'format': 'opaque RGB8 (no alpha data)', 'flipY': False, 'row_zero': 'minZ',
        'channels': {
            'terrain-control.png': {'R': 'worn path', 'G': 'soil moisture including 115m variation', 'B': 'protected landing meadow'},
            'terrain-ecology.png': {'R': 'exposed bedrock', 'G': 'talus/debris', 'B': '23m patch variation'},
        },
        'canonical_source': 'range/world.js:sampleTerrainEcology(x,z)',
        'world_source_sha256': digest(ROOT / 'range/world.js'),
        'geology_source_sha256': digest(ROOT / 'range/launch-geology.js'),
        'builder_sha256': digest(Path(__file__)), 'files': files,
    }
    (out / 'terrain-controls.json').write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
