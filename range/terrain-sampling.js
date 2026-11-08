/**
 * Offset-only triangular stochastic sampling, adapted from ZyFou's
 * ProceduralTerrains SurfaceArrayGLSL.js (pbrPlane/pbrPatch), revision
 * 8349b2c8c8637f355bfe17e01c76807d41994407.
 * https://github.com/ZyFou/ProceduralTerrains/blob/8349b2c8c8637f355bfe17e01c76807d41994407/src/engine/terrain/surface/SurfaceArrayGLSL.js
 *
 * MIT License
 * Copyright (c) 2026 ZyFou
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense,
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export const TERRAIN_SAMPLING_GLSL = /* glsl */ `
  uniform float surfaceStochastic;
  struct SurfacePatch {
    vec2 a;
    vec2 b;
    vec2 c;
    vec3 weights;
  };
  vec2 surfacePatchHash(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
      dot(p, vec2(269.5, 183.3)))) * 43758.5453);
  }
  SurfacePatch surfacePatch(vec2 uv, float seed) {
    SurfacePatch cellSample;
    if (surfaceStochastic < 0.5) {
      cellSample.a = uv; cellSample.b = uv; cellSample.c = uv;
      cellSample.weights = vec3(1.0, 0.0, 0.0);
      return cellSample;
    }
    vec2 skew = vec2(uv.x - uv.y * 0.57735027, uv.y * 1.15470054);
    vec2 cell = floor(skew), f = fract(skew), a, b, c;
    if (f.x + f.y < 1.0) {
      a = cell; b = cell + vec2(1.0, 0.0); c = cell + vec2(0.0, 1.0);
      cellSample.weights = vec3(1.0 - f.x - f.y, f.x, f.y);
    } else {
      a = cell + vec2(1.0); b = cell + vec2(0.0, 1.0); c = cell + vec2(1.0, 0.0);
      cellSample.weights = vec3(f.x + f.y - 1.0, 1.0 - f.x, 1.0 - f.y);
    }
    cellSample.weights = cellSample.weights * cellSample.weights * cellSample.weights;
    cellSample.weights /= max(dot(cellSample.weights, vec3(1.0)), 0.0001);
    // Only translation: all PBR companions retain their normal-map axes.
    cellSample.a = uv + surfacePatchHash(a + seed * 17.13) * 4.0;
    cellSample.b = uv + surfacePatchHash(b + seed * 17.13) * 4.0;
    cellSample.c = uv + surfacePatchHash(c + seed * 17.13) * 4.0;
    return cellSample;
  }
  vec4 surfacePatchSample(sampler2D image, SurfacePatch cellSample, vec2 dx, vec2 dy) {
    // Gradients are from unwrapped world UVs, evaluated before any branch.
    vec4 sampled = textureGrad(image, cellSample.a, dx, dy);
    if (surfaceStochastic < 0.5) return sampled;
    return sampled * cellSample.weights.x
      + textureGrad(image, cellSample.b, dx, dy) * cellSample.weights.y
      + textureGrad(image, cellSample.c, dx, dy) * cellSample.weights.z;
  }
`;
