#!/usr/bin/env python3
"""Bake ecology controls, authored pigments and licensed aerial-sward luminance.

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
AERIAL_GRASS = ROOT / 'range/assets/materials/aerial-grass/color.jpg'
AERIAL_SPAN = 32.0  # Artistic community scale, not a measured capture footprint.


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
        const edgeWear = site.clearing * (.05 + .19 * t * t * (3 - 2 * t));
        // Reserve busy footprints and footpaths while leaving irregular grass
        // through the outer yard. Even a half-strength soil ellipse made this
        // grazed clearing look excavated; only real footprints need bare earth.
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


def _repeat_bilinear(image, u, v):
    """Sample a periodic linear image at texel centres, like a Repeat sampler."""
    height, width = image.shape
    x, y = u * width - .5, v * height - .5
    ix, iy = np.floor(x).astype(np.int32), np.floor(y).astype(np.int32)
    fx, fy = x - ix, y - iy
    a = image[iy % height, ix % width]
    b = image[iy % height, (ix + 1) % width]
    c = image[(iy + 1) % height, ix % width]
    d = image[(iy + 1) % height, (ix + 1) % width]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def _aerial_patch_sample(image, u, v):
    """Three translated patches with continuous, sharpened triangle weights.

    Offline adaptation of range/terrain-sampling.js, itself adapted from
    ZyFou's MIT-licensed ProceduralTerrains at revision
    8349b2c8c8637f355bfe17e01c76807d41994407. The full notice is retained below.
    Only translation is used; neighboring triangles share their vertex hashes.
    """
    skew_x, skew_y = u - v * .57735027, v * 1.15470054
    cell_x, cell_y = np.floor(skew_x), np.floor(skew_y)
    fx, fy = skew_x - cell_x, skew_y - cell_y
    lower = fx + fy < 1
    vertices = [
        (cell_x + np.where(lower, 0, 1), cell_y + np.where(lower, 0, 1)),
        (cell_x + np.where(lower, 1, 0), cell_y + np.where(lower, 0, 1)),
        (cell_x + np.where(lower, 0, 1), cell_y + np.where(lower, 1, 0)),
    ]
    weights = [np.where(lower, 1 - fx - fy, fx + fy - 1) ** 3,
               np.where(lower, fx, 1 - fx) ** 3,
               np.where(lower, fy, 1 - fy) ** 3]
    total = sum(weights)
    result = np.zeros_like(u)
    for (vx, vy), weight in zip(vertices, weights):
        vx, vy = vx + 53 * 17.13, vy + 53 * 17.13
        ox = np.mod(np.sin(vx * 127.1 + vy * 311.7) * 43758.5453, 1) * 4
        oy = np.mod(np.sin(vx * 269.5 + vy * 183.3) * 43758.5453, 1) * 4
        result += _repeat_bilinear(image, u + ox, v + oy) * weight / total
    return result


def aerial_sward(world_x, world_z, geology, trail, landing_field):
    """Bounded photographic sward structure; no imported hue or baked relief."""
    source_srgb = np.asarray(Image.open(AERIAL_GRASS).convert('RGB'), dtype=np.float32) / 255
    source_linear = np.where(source_srgb <= .04045, source_srgb / 12.92,
                             ((source_srgb + .055) / 1.055) ** 2.4)
    luminance = source_linear @ np.array([.2126, .7152, .0722], dtype=np.float32)
    # Average in linear light before sampling. At 2048 this retains 20 source
    # texels per 32 m patch; sub-3 m photographic blades/stones cannot alias into
    # giant dark flecks. Fine PBR detail remains the runtime material's job.
    texel_span = BOUNDS['width'] / world_x.shape[1]
    filtered_size = max(1, min(luminance.shape[1], round(AERIAL_SPAN / texel_span)))
    filtered = np.asarray(Image.fromarray(luminance).resize(
        (filtered_size, filtered_size), Image.Resampling.BOX))
    mean, deviation = float(filtered.mean()), max(float(filtered.std()), .005)
    grain = np.empty_like(world_x, dtype=np.float32)
    # Chunk rows so larger offline bakes do not retain twenty full-size arrays.
    for start in range(0, world_x.shape[0], 128):
        region = slice(start, start + 128)
        sampled = _aerial_patch_sample(filtered, world_x[region] / AERIAL_SPAN,
                                       world_z[region] / AERIAL_SPAN)
        grain[region] = np.tanh((sampled - mean) / deviation * .72)
    grain = np.clip(grain - grain.mean(dtype=np.float64), -1, 1)
    # Damp, dense sward has gentler structure than dry tussock shoulders. Mown
    # grass keeps subtle texture; explicit tracks/footprints retain their soil.
    contrast = .15 * (.78 + .22 * (1 - geology[:, :, 2]))
    contrast = contrast * (1 - landing_field) + .05 * landing_field
    path_weight = np.clip((trail - .18) / .47, 0, 1)
    path_weight = path_weight * path_weight * (3 - 2 * path_weight)
    eligible = (1 - path_weight) * (1 - geology[:, :, 0]) * (1 - geology[:, :, 1])
    factor = 1 + grain * contrast * eligible
    metadata = {
        'source': str(AERIAL_GRASS.relative_to(ROOT)), 'sha256': digest(AERIAL_GRASS),
        'license': 'CC0-1.0', 'provenance': 'range/assets/materials/aerial-grass/manifest.json',
        'provenance_sha256': digest(AERIAL_GRASS.parent / 'manifest.json'),
        'artistic_patch_span_metres': AERIAL_SPAN,
        'scale_note': 'Artistic sampling span, not a verified physical capture footprint',
        'processing': 'sRGB decode; linear luminance area-prefilter; three translated triangle patches; zero-centred bounded contrast',
        'filtered_source_dimensions': [filtered_size, filtered_size],
        'filtered_linear_luminance_mean': round(mean, 6),
        'filtered_linear_luminance_standard_deviation': round(float(filtered.std()), 6),
        'maximum_contrast': {'open_meadow': .15, 'protected_target': .05},
        'path_exclusion': 'Full exclusion above 0.65 canonical path/occupied coverage; soft verge from 0.18',
        'mean_gain': round(float(factor.mean(dtype=np.float64)), 6),
        'gain_standard_deviation': round(float(factor.std(dtype=np.float64)), 6),
        'gain_range': [round(float(factor.min()), 6), round(float(factor.max()), 6)],
    }
    return factor, metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    # 1.5625 m/texel retains the broken 4–8 m community edges and narrow paths.
    # Sub-metre scanned detail remains a separate repeating PBR material.
    parser.add_argument('--size', type=int, default=2048)
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
    sward, sward_metadata = aerial_sward(world_x, world_z, geology, trail, landing_field)
    pigment = np.clip(geology[:, :, 5:8] * sward[:, :, None], 0, 1)
    srgb = np.where(pigment <= .0031308, pigment * 12.92, 1.055 * pigment ** (1 / 2.4) - .055)
    paint = out / 'terrain-paint.webp'
    temporary = paint.with_suffix('.webp.pending')
    Image.fromarray(np.uint8(np.clip(srgb * 255 + .5, 0, 255))).save(temporary, format='WEBP', lossless=True, method=6)
    temporary.replace(paint)
    print(f'{paint.name}: {paint.stat().st_size} bytes')
    manifest = {
        'description': 'Original ecology controls and meadow pigments with licensed aerial-sward luminance; no captured survey/height claim',
        'dimensions': [size, size], 'world_bounds_metres': BOUNDS,
        'texel_size_metres': [BOUNDS['width'] / size, BOUNDS['depth'] / size],
        'linear': True, 'format': 'opaque RGB8 (no alpha data)', 'flipY': False, 'row_zero': 'minZ',
        'channels': {
            'terrain-control.png': {'R': 'worn path and social-site clearing', 'G': 'canonical soil moisture', 'B': 'protected landing meadow'},
            'terrain-ecology.png': {'R': 'exposed bedrock', 'G': 'talus/debris', 'B': 'shared 6–30m meadow communities with broken 4–8m edges'},
        },
        'canonical_source': 'range/world.js:sampleTerrainEcology(x,z)',
        'world_source_sha256': digest(ROOT / 'range/world.js'),
        'geology_source_sha256': digest(ROOT / 'range/launch-geology.js'),
        'style_source_sha256': digest(ROOT / 'range/surface-style.js'),
        'site_source_sha256': digest(ROOT / 'range/alpine-sites.js'),
        'paint_atlas': {'file': paint.name, 'sha256': digest(paint), 'bytes': paint.stat().st_size,
                        'color_space': 'sRGB', 'flipY': False, 'encoding': 'RGB lossless WebP/method6',
                        'source': 'Original linear pigments plus bounded CC0 aerial-sward luminance; not directional light',
                        'aerial_sward': sward_metadata,
                        'mean_linear_rgb': pigment.mean(axis=(0, 1), dtype=np.float64).round(6).tolist(),
                        'community_mean': round(float(geology[:, :, 4].mean(dtype=np.float64)), 6)},
        'builder_sha256': digest(Path(__file__)), 'files': files,
    }
    temporary = out / 'terrain-controls.json.pending'
    temporary.write_text(json.dumps(manifest, indent=2) + '\n')
    temporary.replace(out / 'terrain-controls.json')


if __name__ == '__main__':
    main()

# MIT License — triangular sampling adaptation above
# Copyright (c) 2026 ZyFou
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense,
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
