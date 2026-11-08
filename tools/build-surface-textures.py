#!/usr/bin/env python3
"""Bake canonical ecology controls and an original illustrated world-pigment atlas.

Requires NumPy, Pillow and Node. Row zero is world minZ; runtime samples the
atlases with flipY=false. Controls are linear; painted albedo is sRGB.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BOUNDS = {'minX': -1600, 'minZ': -1600, 'width': 3200, 'depth': 3200}


def canonical_ecology(size):
    """Query physical ecology, social clearings and the shared botanical style."""
    program = r"""
      import { sampleTerrainEcology } from './range/world.js';
      import { sampleAlpineSiteGround } from './range/alpine-sites.js';
      import { sampleGroundStyle } from './range/surface-style.js';
      const size = Number(process.argv[1]);
      const data = new Float32Array(size * size * 8);
      for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
        const wx = -1600 + (x + .5) * 3200 / size, wz = -1600 + (z + .5) * 3200 / size;
        const e = sampleTerrainEcology(wx, wz), site = sampleAlpineSiteGround(wx, wz);
        const base = sampleGroundStyle(wx, wz, { moisture: e.moisture });
        const t = Math.max(0, Math.min(1, (base.variation - .32) / .42));
        const edgeWear = site.clearing * (.12 + .43 * t * t * (3 - 2 * t));
        // Reserve busy footprints and footpaths while leaving irregular grass
        // islands through the outer yard. A full ellipse looked like bare sand.
        e.path = Math.max(e.path, site.path * .95, (site.occupied || 0) * .90, edgeWear);
        const style = sampleGroundStyle(wx, wz, { moisture: e.moisture, path: e.path });
        const i = (z * size + x) * 8;
        data[i] = e.rock; data[i+1] = e.talus;
        data[i+2] = e.moisture; data[i+3] = e.path;
        data[i+4] = style.patch;
        data[i+5] = style.color[0]; data[i+6] = style.color[1]; data[i+7] = style.color[2];
      }
      process.stdout.write(Buffer.from(data.buffer));
    """
    raw = subprocess.check_output(['node', '--input-type=module', '-e', program, str(size)], cwd=ROOT)
    result = np.frombuffer(raw, dtype='<f4').reshape(size, size, 8)
    if not np.isfinite(result).all() or result.min() < 0 or result.max() > 1:
        raise ValueError('sampleTerrainEcology must return finite 0..1 weights')
    return result


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
    geology = canonical_ecology(size)
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
    moisture = geology[:, :, 2]
    # Use opaque RGB: browser image decoding can premultiply transparent PNG
    # pixels, making alpha-packed control data corrupt the other channels.
    controls = np.stack([trail, moisture, landing_field], axis=-1)
    ecology = np.stack([geology[:, :, 0], geology[:, :, 1], geology[:, :, 4]], axis=-1)
    files = []
    for name, data in [('terrain-control.png', controls), ('terrain-ecology.png', ecology)]:
        path = out / name
        temporary = path.with_suffix('.png.pending')
        Image.fromarray(np.uint8(np.clip(data * 255 + .5, 0, 255))).save(temporary, format='PNG', optimize=True)
        temporary.replace(path)
        files.append({'file': name, 'sha256': digest(path), 'bytes': path.stat().st_size})
        print(f'{name}: {path.stat().st_size} bytes')
    pigment = geology[:, :, 5:8]
    srgb = np.where(pigment <= .0031308, pigment * 12.92, 1.055 * pigment ** (1 / 2.4) - .055)
    paint = out / 'terrain-paint.webp'
    temporary = paint.with_suffix('.webp.pending')
    Image.fromarray(np.uint8(np.clip(srgb * 255 + .5, 0, 255))).save(temporary, format='WEBP', quality=92, method=6)
    temporary.replace(paint)
    print(f'{paint.name}: {paint.stat().st_size} bytes')
    manifest = {
        'description': 'Original ecology controls and illustrated albedo pigment; no captured survey/height claim',
        'dimensions': [size, size], 'world_bounds_metres': BOUNDS,
        'linear': True, 'format': 'opaque RGB8 (no alpha data)', 'flipY': False, 'row_zero': 'minZ',
        'channels': {
            'terrain-control.png': {'R': 'worn path and social-site clearing', 'G': 'canonical soil moisture', 'B': 'protected landing meadow'},
            'terrain-ecology.png': {'R': 'exposed bedrock', 'G': 'talus/debris', 'B': 'shared 20–150m botanical patch field'},
        },
        'canonical_source': 'range/world.js:sampleTerrainEcology(x,z)',
        'world_source_sha256': digest(ROOT / 'range/world.js'),
        'geology_source_sha256': digest(ROOT / 'range/launch-geology.js'),
        'style_source_sha256': digest(ROOT / 'range/surface-style.js'),
        'site_source_sha256': digest(ROOT / 'range/alpine-sites.js'),
        'paint_atlas': {'file': paint.name, 'sha256': digest(paint), 'bytes': paint.stat().st_size,
                        'color_space': 'sRGB', 'flipY': False, 'encoding': 'RGB WebP quality92/method6',
                        'source': 'Original linear pigment field from range/surface-style.js; not directional light'},
        'builder_sha256': digest(Path(__file__)), 'files': files,
    }
    temporary = out / 'terrain-controls.json.pending'
    temporary.write_text(json.dumps(manifest, indent=2) + '\n')
    temporary.replace(out / 'terrain-controls.json')


if __name__ == '__main__':
    main()
