# Sierra Nevada / Mount Whitney backdrop

The current alpine art direction uses a real 14 km Sierra Nevada elevation crop
looking west toward the Whitney ridge. It replaces the Yosemite domes in the
runtime presentation; the earlier Yosemite asset remains available for comparison.
The flight world's numerical ground remains authoritative inside the playable area.

Source: [Jaanga's USGS National Map 1 arc-second RGB tile](https://github.com/jaanga/terrain-usgs-data-1second/blob/gh-pages/images/n36w119.png),
[dataset description](https://github.com/jaanga/terrain-usgs-data-1second/blob/gh-pages/readme.md).
USGS-produced elevations are public domain under the
[USGS copyrights and credits policy](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits).
The downloaded tile is checksum pinned in the builder and binary metadata:
`9dac84bde8f0f0920a7351c000b33eba827ab395155f493016179bbb73fb000a`.

The crop origin is 36.58°N, 118.23°W. World +X is south and +Z is west; the
real ridgeline therefore lies ahead of the launch, about 4–7 km away. Elevations
are offset by 2670 m without vertical exaggeration. The 513×513 output has a
27.34 m spacing. Encoded elevations span approximately -1223 to 1741 m relative
to that origin. Negative eastern elevations are valid and lie outside the
protected physical world, where the normal backdrop skirt blend applies.

Approximately 9.56% of source samples in the crop are nodata. These are harmonically
interpolated from valid neighbours, as in the earlier Yosemite pipeline. The
explicit `sierra-filled-voids.png` mask identifies inferred regions. Do not treat
those areas as measured peak/cliff detail. The hillshade is a generated review
image, not a photograph or game screenshot. Seasonal snow is a separately authored
material treatment, not a source-data claim.

All runtime files are local. Rebuild from the checksum-verified source using:

```sh
python3 tools/build-sierra-terrain.py
```

The builder uses NumPy, SciPy and Pillow only at authoring time, produces the same
HGS1 binary format, bakes world-space normals and sky visibility, and retains the
source metadata. No external service, API key or new runtime dependency is needed.
