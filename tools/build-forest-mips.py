"""Build alpha-aware forest mip chains from the pinned/generated forest atlases.

Run: python3 tools/build-forest-mips.py
Authoring requires Pillow, numpy and scipy. No runtime dependency is introduced.
Input images and their provenance remain in range/assets/forest/README.md.
Output FMP1 gzip: LE uint32 magic,width,height,levels; then one LE uint32
width,height,offset,length entry per level; then vertically flipped RGBA8 pixels. The chain stops at 8x4 (one pixel per
view), preserving all 32 independent views at every stored level.
Offsets are absolute from the start of the decompressed file. gzip mtime is zero.
"""
from pathlib import Path
import gzip
import json
import struct
import hashlib
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'range/assets/forest'
CUTOFF = .38
CELL = 256
MAGIC = 0x31504D46


def srgb_to_linear(rgb):
    return np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)


def linear_to_srgb(rgb):
    return np.where(rgb <= .0031308, rgb * 12.92, 1.055 * np.maximum(rgb, 0) ** (1 / 2.4) - .055)


def reduce_mean(data, width, height):
    """Aligned power-of-two blocks never mix atlas cells through mip eight."""
    h, w = data.shape[:2]
    suffix = data.shape[2:]
    shape = (height, h // height, width, w // width) + suffix
    return data.reshape(shape).mean(axis=(1, 3))


def normalize(vectors):
    lengths = np.linalg.norm(vectors, axis=2, keepdims=True)
    out = vectors / np.maximum(lengths, 1e-10)
    out[lengths[:, :, 0] <= 1e-10] = [0, 1, 0]
    return out


def dilate_rgb(rgb, alpha, cell):
    """Fill invisible RGB from the nearest real surface, independently per view.

    Full-tile dilation also protects bilinear sampling at the coarsest mips.
    Visibility alpha is never dilated. At 1-pixel cells each view stays isolated.
    """
    out = rgb.copy()
    h, w = alpha.shape
    for y in range(0, h, cell):
        for x in range(0, w, cell):
            visibility = alpha[y:y + cell, x:x + cell]
            invisible = visibility <= 1e-6
            if not invisible.any() or invisible.all():
                continue
            _, nearest = distance_transform_edt(invisible, return_indices=True)
            tile = out[y:y + cell, x:x + cell]
            tile[invisible] = tile[nearest[0][invisible], nearest[1][invisible]]
    return out


def coverage(alpha):
    return float(np.mean(alpha >= CUTOFF))



def write_chain(filename, levels):
    header_bytes = 16 + 16 * len(levels)
    entries, payload, offset = [], [], header_bytes
    for rgba in levels:
        height, width = rgba.shape[:2]
        pixels = np.flip(rgba, axis=0).copy().tobytes()
        entries.append(struct.pack('<IIII', width, height, offset, len(pixels)))
        payload.append(pixels)
        offset += len(pixels)
    height, width = levels[0].shape[:2]
    raw = struct.pack('<IIII', MAGIC, width, height, len(levels)) + b''.join(entries) + b''.join(payload)
    with open(filename, 'wb') as stream:
        with gzip.GzipFile(filename='', mode='wb', fileobj=stream, mtime=0, compresslevel=9) as archive:
            archive.write(raw)
    return {'file': filename.name, 'bytes': filename.stat().st_size,
            'rawBytes': len(raw), 'sha256': hashlib.sha256(filename.read_bytes()).hexdigest(),
            'levels': len(levels)}


def build_variant(name):
    albedo_rgba = np.asarray(Image.open(OUT / f'{name}-albedo.png')).astype(np.float32) / 255
    normal_rgba = np.asarray(Image.open(OUT / f'{name}-normal.png')).astype(np.float32) / 255
    albedo = srgb_to_linear(albedo_rgba[:, :, :3])
    normals = normalize(normal_rgba[:, :, :3] * 2 - 1)
    alpha = albedo_rgba[:, :, 3]
    normal_alpha = normal_rgba[:, :, 3]
    weighted_albedo = albedo * alpha[:, :, None]
    weighted_normals = normals * normal_alpha[:, :, None]
    albedo_levels, normal_levels, diagnostics = [], [], []
    width, height = alpha.shape[1], alpha.shape[0]
    target_coverage = coverage(alpha)
    level = 0
    while True:
        visible = reduce_mean(alpha, width, height)
        normal_visible = reduce_mean(normal_alpha, width, height)
        corrected_alpha, scale = visible, 1.0  # Preserve mean visibility exactly.
        color = reduce_mean(weighted_albedo, width, height) / np.maximum(visible[:, :, None], 1e-10)
        vector = normalize(reduce_mean(weighted_normals, width, height))
        # Source visibility remains the weighting measure at every level; an
        # alpha-coverage correction never changes subsequent normal averages.
        tile_size = max(1, CELL >> level) if level <= 8 else max(width, height)
        color = dilate_rgb(color, visible, tile_size)
        vector = dilate_rgb(vector, normal_visible, tile_size)
        a = np.concatenate([linear_to_srgb(np.clip(color, 0, 1)), corrected_alpha[:, :, None]], axis=2)
        n = np.concatenate([vector * .5 + .5, normal_visible[:, :, None]], axis=2)
        albedo_levels.append(np.rint(np.clip(a, 0, 1) * 255).astype(np.uint8))
        normal_levels.append(np.rint(np.clip(n, 0, 1) * 255).astype(np.uint8))
        if level <= 5:
            mask = visible >= CUTOFF
            old_normal = normalize(reduce_mean(normal_rgba[:, :, :3], width, height) * 2 - 1)
            reference = normalize(reduce_mean(weighted_normals, width, height))
            old_align = np.sum(old_normal * reference, axis=2)
            new_align = np.sum(vector * reference, axis=2)
            old_color = reduce_mean(albedo, width, height)
            luma_weights = np.array([.2126, .7152, .0722])
            true_luma = color @ luma_weights
            old_luma = old_color @ luma_weights
            valid = mask & (true_luma > .0001)
            diagnostics.append({'level': level, 'width': width, 'height': height,
                'coverageBefore': coverage(visible), 'coverageAfter': coverage(corrected_alpha),
                'coverageRelativeToBase': coverage(corrected_alpha) / target_coverage,
                'alphaScale': scale,
                'normalAlignmentBefore': float(np.mean(old_align[mask])),
                'normalAlignmentAfter': float(np.mean(new_align[mask])),
                'wrongNormalFractionBefore': float(np.mean(old_align[mask] < .5)),
                'wrongNormalFractionAfter': float(np.mean(new_align[mask] < .5)),
                'albedoLumaFractionBefore': float(np.mean(old_luma[valid] / true_luma[valid])),
                'albedoLumaFractionAfter': 1.0})
        if level == 8:
            break
        width, height = max(1, width // 2), max(1, height // 2)
        level += 1
    result = {'albedo': write_chain(OUT / f'{name}-albedo-mips.bin.gz', albedo_levels),
              'normal': write_chain(OUT / f'{name}-normal-mips.bin.gz', normal_levels),
              'sourceImages': {filename: hashlib.sha256((OUT / filename).read_bytes()).hexdigest() for filename in [f'{name}-albedo.png', f'{name}-normal.png']},
              'levelLayout': [{'level': i, 'width': image.shape[1], 'height': image.shape[0], 'pixels': image.shape[0] * image.shape[1], 'bytes': image.nbytes, 'cellSize': CELL >> i} for i, image in enumerate(albedo_levels)],
              'diagnostics': diagnostics}
    print(name, result['albedo']['bytes'], result['normal']['bytes'], 'bytes', flush=True)
    return result


def main():
    manifest = json.loads((OUT / 'forest.json').read_text())
    report = {'format': 'FMP1 RGBA8 little-endian, vertical rows flipped; gzip mtime=0',
              'generator': 'tools/build-forest-mips.py', 'alphaCutoff': CUTOFF,
              'sourceProvenance': {'treeAuthor': 'Daniel Greenheck', 'upstream': 'https://github.com/dgreenheck/ez-tree', 'revision': 'dcf309bd86bd521083d9c70f01f2de45fdc7c457', 'texturePackage': '@dgreenheck/ez-tree@1.1.0', 'license': 'MIT', 'generatedSource': 'hgsim tools/build-forest-assets.mjs and tools/forest-bake.js', 'details': 'range/assets/forest/README.md'},
              'storedLevels': 9, 'smallestAtlas': [8, 4], 'smallestView': [1, 1],
              'method': 'original-visibility-weighted linear albedo and decoded unit normals; independent view tiles through level 8; nearest surface RGB dilation',
              'variants': {}}
    for variant in manifest['variants']:
        report['variants'][variant['id']] = build_variant(variant['id'])
    (OUT / 'mip-diagnostics.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
