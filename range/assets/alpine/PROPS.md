# Original alpine prop subset

`props.glb` retains BoulderA, BoulderB, Cairn, TrailSign, EquipmentCrate and Cabin
from this repository's original `environment.glb`. The original authoring source
is [tools/build-alpine-assets.py](../../../tools/build-alpine-assets.py); see the
[library provenance](README.md). These models and their materials are original
repository assets, with no newly downloaded or generated imagery in this subset.

The extractor preserves node and ancestor transforms, material definitions and
every retained geometry accessor byte. It compacts the referenced binary ranges
without quantization or geometric simplification. The old spruce meshes, atlas,
bark images and their texture/extension declarations are omitted. The result has
12 nodes, 6 meshes, 5 materials and no images or external dependencies.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| environment.glb (source) | 5,756,672 | `982dec67c5ec41dd2cc02123a15bd2a8f2156295a55f9ab34c1b96e37bfc47ff` |
| props.glb (subset) | 267,728 | `37ee4aed6770c2b87fb2b3313a5c90c3b6c1c49b1f053ab1768c31c2d40a1eb3` |

This removes 95.35% of the former startup library's bytes. It does not include the
separate forest assets or make a measured browser frame-rate claim.

Rebuild from the repository root, without Blender or browser tooling:

```sh
node tools/extract-environment-props.mjs
node --test tests/environment-props.test.mjs
```

The subset embeds the source checksum and extractor path in `asset.extras`.
Extraction is deterministic; the test compares the committed file byte for byte,
checks all six props' geometry/materials/world bounds, and exercises transformed
ancestor retention and sibling pruning. The original library stays available for
legacy asset tests and its Blender authoring workflow.
