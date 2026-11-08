#!/usr/bin/env python3
"""Bake a real USGS Sierra Nevada elevation crop, macro normals, and review images.

Requires numpy, scipy, Pillow. The cached public-domain source is verified before
use. No runtime service or GIS dependency is needed by the browser.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import struct
import urllib.request

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, map_coordinates
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import cg

SOURCE_URL = 'https://raw.githubusercontent.com/jaanga/terrain-usgs-data-1second/gh-pages/images/n36w119.png'
SOURCE_SHA256 = '9dac84bde8f0f0920a7351c000b33eba827ab395155f493016179bbb73fb000a'


def harmonic_fill(height, missing):
    """Interpolate nodata using its valid boundary, not flat nearest-neighbour steps."""
    distances, nearest = distance_transform_edt(missing, return_indices=True)
    initial = height[tuple(nearest)]
    if not missing.any():
        return initial, distances
    ids = np.full(height.shape, -1, dtype=np.int32)
    ids[missing] = np.arange(missing.sum())
    yy, xx = np.nonzero(missing)
    row_ids = ids[yy, xx]
    rows, columns, values = [], [], []
    diagonal = np.zeros(len(row_ids), dtype=np.float64)
    rhs = np.zeros_like(diagonal)
    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        y, x = yy + dy, xx + dx
        valid = (y >= 0) & (y < height.shape[0]) & (x >= 0) & (x < height.shape[1])
        rid = row_ids[valid]
        y, x = y[valid], x[valid]
        diagonal[rid] += 1
        neighbour = ids[y, x]
        unknown = neighbour >= 0
        rows.extend(rid[unknown])
        columns.extend(neighbour[unknown])
        values.extend(np.full(unknown.sum(), -1.0))
        rhs[rid[~unknown]] += height[y[~unknown], x[~unknown]]
    rows.extend(row_ids)
    columns.extend(row_ids)
    values.extend(diagonal)
    matrix = coo_matrix((values, (rows, columns)), shape=(len(row_ids), len(row_ids))).tocsr()
    solved, status = cg(matrix, rhs, x0=initial[missing], rtol=1e-8, maxiter=2500)
    if status:
        raise RuntimeError(f'Void interpolation did not converge: {status}')
    filled = height.copy()
    filled[missing] = solved
    return filled, distances


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path('work/assets-cache/usgs-n36w119.png'))
    parser.add_argument('--output', type=Path, default=Path('range/assets/terrain'))
    args = parser.parse_args()
    if not args.source.exists():
        args.source.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(SOURCE_URL, timeout=90) as response:
            args.source.write_bytes(response.read())
    source_hash = hashlib.sha256(args.source.read_bytes()).hexdigest()
    if source_hash != SOURCE_SHA256:
        raise RuntimeError(f'Unexpected elevation source SHA-256: {source_hash}')
    args.output.mkdir(parents=True, exist_ok=True)

    rgba = np.asarray(Image.open(args.source), dtype=np.int32)
    raw = rgba[:, :, 0] + 256 * rgba[:, :, 1] + 65536 * rgba[:, :, 2]
    raw = np.where(raw >= 8388608, raw - 16777216, raw)
    count, extent = 513, 14000.0
    origin_lat, origin_lon = 36.58, -118.23
    south_offset, vertical_offset = 0.0, 2670.0
    latitude_metres = 111320.0
    longitude_metres = latitude_metres * math.cos(math.radians(origin_lat))
    coordinates = np.linspace(-extent / 2, extent / 2, count)
    # World +X is south, +Z is west: the Whitney ridge faces the flight corridor.
    source_rows = (37 - (origin_lat - (coordinates + south_offset) / latitude_metres)) * 3600
    source_columns = ((origin_lon - coordinates / longitude_metres) + 119) * 3600
    x0, x1 = math.floor(source_columns.min()) - 64, math.ceil(source_columns.max()) + 65
    y0, y1 = math.floor(source_rows.min()) - 64, math.ceil(source_rows.max()) + 65
    native = raw[y0:y1, x0:x1].astype(np.float64)
    missing = native == -32767
    filled, distances = harmonic_fill(native, missing)
    # Output rows increase along world Z, columns along world X.
    sample_y = np.broadcast_to((source_rows - y0)[None, :], (count, count))
    sample_x = np.broadcast_to((source_columns - x0)[:, None], (count, count))
    height = map_coordinates(filled, [sample_y, sample_x], order=1, mode='nearest') - vertical_offset
    void_samples = map_coordinates(missing.astype(np.uint8), [sample_y, sample_x], order=0).astype(bool)
    spacing = extent / (count - 1)
    dz, dx = np.gradient(height, spacing, spacing)
    normal = np.dstack((-dx, np.ones_like(height), -dz))
    normal /= np.linalg.norm(normal, axis=2)[:, :, None]
    # Macro sky visibility darkens the ambient bounce of enclosed gullies.
    # Bake it into the normal's spare alpha channel: no extra texture fetch.
    yy, xx = np.indices(height.shape)
    enclosure = np.zeros_like(height)
    for angle in np.linspace(0, math.tau, 8, endpoint=False):
        horizon = np.zeros_like(height)
        for radius in [2, 6, 16, 40]:
            sy = np.clip(yy + round(math.sin(angle) * radius), 0, count - 1)
            sx = np.clip(xx + round(math.cos(angle) * radius), 0, count - 1)
            horizon = np.maximum(horizon, (height[sy, sx] - height) / (radius * spacing))
        enclosure += horizon / np.sqrt(1 + horizon * horizon)
    ambient = np.clip(1 - enclosure / 8 * .58, .42, 1)
    normal_bytes = np.dstack((np.uint8(np.clip(normal * .5 + .5, 0, 1) * 255 + .5),
                             np.uint8(ambient * 255 + .5)))
    minimum, maximum = float(height.min()), float(height.max())
    encoded = np.uint16(np.clip((height - minimum) / (maximum - minimum), 0, 1) * 65535 + .5)
    metadata = {
        'name': 'Sierra Nevada / Mount Whitney — USGS-derived geological backdrop',
        'width': count, 'height': count,
        'bounds': {'minX': -extent / 2, 'minZ': -extent / 2, 'width': extent, 'depth': extent},
        'minimum': minimum, 'maximum': maximum,
        'spacingMetres': spacing, 'verticalOffsetMetres': vertical_offset,
        'sourceLatitude': origin_lat, 'sourceLongitude': origin_lon,
        'southOffsetMetres': south_offset,
        'worldAlignment': '+X south; +Z west; source absolute elevations minus 2670 m',
        'heightEncoding': 'uint16 little-endian normalized from minimum to maximum',
        'normalEncoding': 'RGBA8; RGB world-space normal * .5 + .5; A macro sky visibility; Y up; row0=zMin',
        'sourceUrl': SOURCE_URL, 'sourceSha256': source_hash,
        'sourceEncoding': 'Signed 24-bit little-endian RGB metres; -32767 is nodata',
        'sourceBounds': {'west': -119, 'east': -118, 'south': 36, 'north': 37},
        'worldCenterLatitude': origin_lat - south_offset / latitude_metres,
        'worldCenterLongitude': origin_lon,
        'sourceCropPixels': {'left': x0, 'right': x1, 'top': y0, 'bottom': y1},
        'sourceDataset': 'USGS National Map 1 arc-second elevation; public domain; Jaanga redistribution',
        'sourceAttributionUrl': 'https://github.com/jaanga/terrain-usgs-data-1second/blob/gh-pages/readme.md',
        'sourceLicenseUrl': 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits',
        'nodataSampleFraction': float(void_samples.mean()),
        'nodataFill': 'Harmonic interpolation constrained by valid USGS sample boundaries; not measured elevations in the masked areas',
    }
    header = json.dumps(metadata, separators=(',', ':')).encode()
    header += b' ' * ((4 - len(header) % 4) % 4)
    binary = b'HGS1' + struct.pack('<I', len(header)) + header + encoded.astype('<u2').tobytes() + normal_bytes.tobytes()
    (args.output / 'sierra-heightfield.bin').write_bytes(binary)
    (args.output / 'sierra-source.json').write_text(json.dumps(metadata, indent=2) + '\n')
    Image.fromarray(encoded).save(args.output / 'sierra-height.png')
    Image.fromarray(normal_bytes[:, :, :3]).save(args.output / 'sierra-normal.png')
    Image.fromarray(np.uint8(void_samples) * 255).save(args.output / 'sierra-filled-voids.png')

    light = np.array([-.68, .56, .47]); light /= np.linalg.norm(light)
    shade = .20 + .80 * np.clip(np.sum(normal * light, axis=2), 0, 1)
    slope = np.sqrt(dx * dx + dz * dz)
    rock_mix = np.clip((slope - .2) / .7, 0, 1)
    grass, rock = np.array([118, 135, 98]), np.array([168, 166, 155])
    color = grass[None, None] * (1 - rock_mix[:, :, None]) + rock[None, None] * rock_mix[:, :, None]
    color *= shade[:, :, None]
    preview = Image.fromarray(np.uint8(np.clip(color, 0, 255))).resize((1026, 1026), Image.Resampling.LANCZOS)
    preview.save(args.output / 'sierra-hillshade.jpg', quality=94)
    print(json.dumps({'output': str(args.output), 'metres': [minimum, maximum],
        'binaryBytes': len(binary), 'nodataFraction': metadata['nodataSampleFraction']}))


if __name__ == '__main__':
    main()
