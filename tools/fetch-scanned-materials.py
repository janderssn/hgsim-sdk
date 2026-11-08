#!/usr/bin/env python3
"""Fetch pinned photographic PBR maps and build the range's runtime copies.

Requires Pillow. Downloaded bytes must match both their pinned Git blob and
SHA-256 before decoding. TLS verification and inherited proxy settings remain on.
Rebuild offline once the source cache is populated:
    python3 tools/fetch-scanned-materials.py --offline
"""
import argparse
import hashlib
import json
import shutil
import urllib.request
from pathlib import Path
from PIL import Image, __version__ as PILLOW_VERSION, features

SOURCE_REPOSITORY = 'RubenCUR/ArmorPaint-Blender-Materials-Latest-March-1st-CC0-Textures'
SOURCE_REVISION = '1b2a51fa95d6bc4c6f01336142b20f15f01dfa4b'
OUTPUT = Path(__file__).resolve().parents[1] / 'range' / 'assets' / 'materials' / 'scanned'
SOURCES = [{'path': 'README.md',
  'url': 'https://raw.githubusercontent.com/RubenCUR/ArmorPaint-Blender-Materials-Latest-March-1st-CC0-Textures/1b2a51fa95d6bc4c6f01336142b20f15f01dfa4b/README.md',
  'size': 817,
  'git_blob_sha1': '1d89c3f5100ec87b286ef0970a093aab2727fa4c',
  'sha256': 'd00b1be883049c10d05f6477ae5566f4390a882248f93d1daf0214283b40573b'},
 {'path': 'textures/Planks21_col.jpg',
  'url': 'https://raw.githubusercontent.com/RubenCUR/ArmorPaint-Blender-Materials-Latest-March-1st-CC0-Textures/1b2a51fa95d6bc4c6f01336142b20f15f01dfa4b/textures/Planks21_col.jpg',
  'size': 4385196,
  'git_blob_sha1': 'f51e067ad0567b7dc32f5537536bc44fe9a834e5',
  'sha256': '61064629fb219c08d37140a75850a507311bdd5178715963ad214921fda6fdc3'},
 {'path': 'textures/Planks21_nrm.jpg',
  'url': 'https://raw.githubusercontent.com/RubenCUR/ArmorPaint-Blender-Materials-Latest-March-1st-CC0-Textures/1b2a51fa95d6bc4c6f01336142b20f15f01dfa4b/textures/Planks21_nrm.jpg',
  'size': 6426690,
  'git_blob_sha1': '01fbd74c9a2629c066e982faf8bec6843db11266',
  'sha256': '7a11549518d022a86e9c729bf8d30adbce6975339ce8f03a4d12695e3eff2ff8'},
 {'path': 'textures/Planks21_rgh.jpg',
  'url': 'https://raw.githubusercontent.com/RubenCUR/ArmorPaint-Blender-Materials-Latest-March-1st-CC0-Textures/1b2a51fa95d6bc4c6f01336142b20f15f01dfa4b/textures/Planks21_rgh.jpg',
  'size': 2218122,
  'git_blob_sha1': '1cc8fd4de5296b7ba4f31b10c271d201ba504633',
  'sha256': 'acce36b9d0d1c84fe32561d04527b47c278db6472b7e0be8d9e3ae34246eeabd'},
 {'path': 'textures/Rock26_col.jpg',
  'url': 'https://raw.githubusercontent.com/RubenCUR/ArmorPaint-Blender-Materials-Latest-March-1st-CC0-Textures/1b2a51fa95d6bc4c6f01336142b20f15f01dfa4b/textures/Rock26_col.jpg',
  'size': 4778959,
  'git_blob_sha1': 'db4855d66cd2587ab4bb0718ad4ea89e32dfeb66',
  'sha256': 'bc411b4f43b99753082cf5fe87f122bc3b1d7eaac560ffae3bcbe5c497530674'},
 {'path': 'textures/Rock26_nrm.jpg',
  'url': 'https://raw.githubusercontent.com/RubenCUR/ArmorPaint-Blender-Materials-Latest-March-1st-CC0-Textures/1b2a51fa95d6bc4c6f01336142b20f15f01dfa4b/textures/Rock26_nrm.jpg',
  'size': 6255727,
  'git_blob_sha1': '96d0b6abdbc0bfae59e817b1c8ac9165d639d0a3',
  'sha256': '0f4c9eb51ec0d6a230695d4b6e9836fa8788187b058a0506b36dc8ecdb8168ca'},
 {'path': 'textures/Rock26_rgh.jpg',
  'url': 'https://raw.githubusercontent.com/RubenCUR/ArmorPaint-Blender-Materials-Latest-March-1st-CC0-Textures/1b2a51fa95d6bc4c6f01336142b20f15f01dfa4b/textures/Rock26_rgh.jpg',
  'size': 1626704,
  'git_blob_sha1': '09e0883bfd985e962c674fb97b2b5bbd23c35b5e',
  'sha256': '27d6ec1ba209360729ce36f49689631cb671a9742aa7e5f28e1d0c3772536bf2'}]


RUNTIME = {
    'Planks21_col.jpg': ('wood-color.webp', 2048, 'albedo', 90),
    'Planks21_nrm.jpg': ('wood-normal.webp', 1024, 'normal', None),
    'Planks21_rgh.jpg': ('wood-roughness.webp', 1024, 'roughness', 92),
    'Rock26_col.jpg': ('rock-color.webp', 2048, 'albedo', 90),
    'Rock26_nrm.jpg': ('rock-normal.webp', 1024, 'normal', None),
    'Rock26_rgh.jpg': ('rock-roughness.webp', 1024, 'roughness', 92),
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def verify(data, source):
    git_hash = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
    if (len(data) != source['size'] or sha256(data) != source['sha256']
            or git_hash != source['git_blob_sha1']):
        raise RuntimeError('Source checksum mismatch: ' + source['path'])


def obtain(source, cache, offline):
    path = cache / Path(source['path']).name
    if path.exists():
        data = path.read_bytes()
    elif offline:
        raise FileNotFoundError('Offline source cache is missing ' + str(path))
    else:
        with urllib.request.urlopen(source['url'], timeout=120) as response:
            data = response.read()
        verify(data, source)
        path.write_bytes(data)
    verify(data, source)
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path, default=Path('/tmp/hgsim-scanned-materials-src'))
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        'source_repository': 'https://github.com/' + SOURCE_REPOSITORY,
        'source_revision': SOURCE_REVISION,
        'source_notice': {
            'file': 'SOURCE-NOTICE.md',
            'url': SOURCES[0]['url'],
            'sha256': SOURCES[0]['sha256'],
            'declaration': 'The source README identifies the materials as CC0-Textures.',
            'qualification': 'No standalone LICENSE or per-material author metadata is included upstream.',
        },
        'normal_convention': 'The source Blender package supplies *_nrm maps. They are used as OpenGL tangent-space normals without a green-channel flip; no format label is supplied upstream.',
        'encoding': {'Pillow': PILLOW_VERSION, 'libwebp': features.version('webp')},
        'maps': [],
    }
    for source in SOURCES:
        original = obtain(source, args.cache_dir, args.offline)
        if original.name == 'README.md':
            shutil.copyfile(original, OUTPUT / 'SOURCE-NOTICE.md')
            continue
        name, target_size, semantic, quality = RUNTIME[original.name]
        with Image.open(original) as image:
            image.load()
            source_size = list(image.size)
            if image.size != (2048, 2048):
                raise ValueError('Unexpected source dimensions: ' + source['path'])
            image = image.convert('L' if semantic == 'roughness' else 'RGB')
            if image.size != (target_size, target_size):
                image = image.resize((target_size, target_size), Image.Resampling.LANCZOS)
            # WebP encodes grayscale as RGB; equal channels keep roughness.g valid.
            image = image.convert('RGB')
            output = OUTPUT / name
            if semantic == 'normal':
                image.save(output, 'WEBP', lossless=True, method=6)
            else:
                image.save(output, 'WEBP', quality=quality, method=6)
        encoded = output.read_bytes()
        with Image.open(output) as check:
            check.load()
            if check.size != (target_size, target_size):
                raise ValueError('Runtime image dimensions changed: ' + name)
        manifest['maps'].append({
            'file': name, 'semantic': semantic,
            'source_url': source['url'], 'source_path': source['path'],
            'source_bytes': source['size'], 'source_sha256': source['sha256'],
            'source_git_blob_sha1': source['git_blob_sha1'], 'source_dimensions': source_size,
            'output_dimensions': [target_size, target_size], 'output_bytes': len(encoded),
            'output_sha256': sha256(encoded),
            'transforms': ['JPEG decoded', 'Lanczos resize to ' + str(target_size) if target_size != 2048 else 'original 2048-pixel resolution retained',
                'grayscale replicated into RGB' if semantic == 'roughness' else 'RGB channels retained',
                'lossless WebP' if semantic == 'normal' else 'WebP quality ' + str(quality)],
        })
        print(name + ': ' + str(len(encoded)) + ' bytes')
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
