# Yosemite elevation backdrop

This terrain uses real USGS National Map 1 arc-second elevation data, distributed
as a signed RGB elevation tile by [Jaanga](https://github.com/jaanga/terrain-usgs-data-1second).
USGS-produced data are in the public domain; see the
[USGS copyrights and credits policy](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits).
The source URL and verified SHA-256 are retained in `yosemite-source.json` and the
binary asset header.

The 14 km square crop is sampled at 513 × 513 points. World +Z follows the valley
eastward; world +X is south. Elevations are shifted down by 1,210 m to place the
valley floor near the flight range's origin. Height differences retain metre
scale. Quantization to 16 bits adds at most about 1.2 cm of error, while the source
itself has approximately 30 m horizontal sampling and metre-scale elevations.

About 9.1% of the source crop contains missing elevations. These cells are filled
using harmonic interpolation constrained by valid USGS neighbours. The supplied
void mask identifies these inferred areas; they must not be presented as measured
cliff geometry. The hillshade is a review image of the processed elevation field,
not a photograph.

`yosemite-heightfield.bin` contains an `HGS1` header, little-endian JSON byte count,
JSON metadata, normalized little-endian uint16 heights, then RGBA8 macro normals.
Normals encode world-space XYZ in RGB (Y up); alpha contains baked ambient sky
visibility. Rows increase along world Z. PNG maps and the source metadata accompany
the runtime binary for inspection.

Rebuild with NumPy, SciPy and Pillow installed:

```sh
python3 tools/build-alpine-terrain.py
```

The builder downloads the checksum-verified source into ignored
`work/assets-cache/`, fills missing cells, and reproduces the maps and binary.
The runtime does not contact a terrain service. The existing numerical flight
world remains authoritative; this backdrop blends underneath it inside the
playable square and never participates in collisions.
