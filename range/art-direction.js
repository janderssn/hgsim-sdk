/** One authored light and finishing palette for the illustrated flying range. */
export const ALPINE_ART = Object.freeze({
  name: 'Golden Range',
  // The launch and landing approach face +Z. A camera-side afternoon key
  // reveals timber/rock planes and foliage colours instead of silhouetting them.
  sunDirection: Object.freeze([.70, .48, -.55]),
  sunColor: Object.freeze([1, .79, .54]),
  sunIntensity: 3.8,
  exposure: .97,
  skyStyle: 'illustrated-alpine',
  grade: Object.freeze({
    saturation: 1.08,
    contrast: 1.035,
    shadows: Object.freeze([.97, 1.015, 1.075]),
    highlights: Object.freeze([1.04, 1.005, .94]),
    lift: Object.freeze([.0035, .007, .010]),
    vignette: .10,
    bloom: .035,
  }),
});

/** Display-linear balance: after the single tone map, before sRGB encoding. */
export const ART_GRADING_GLSL = /* glsl */`
  uniform bool artGradeEnabled;
  uniform float artSaturation, artContrast, artVignette;
  uniform vec3 artShadowBalance, artHighlightBalance, artShadowLift;
  vec3 artGrade(vec3 color, vec2 uv) {
    if (!artGradeEnabled) return color;
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float shadow = 1.0 - smoothstep(0.025, 0.38, luminance);
    float highlight = smoothstep(0.32, 0.90, luminance);
    color *= mix(vec3(1.0), artShadowBalance, shadow);
    color *= mix(vec3(1.0), artHighlightBalance, highlight);
    luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luminance), color, artSaturation);
    // A pivot near middle grey retains the open, blue-green shadow floor.
    color = max(vec3(0.0), (color - vec3(0.22)) * artContrast + vec3(0.22));
    color += artShadowLift * shadow * shadow;
    vec2 edge = (uv - 0.5) * vec2(1.0, 0.88);
    float frame = smoothstep(0.08, 0.44, dot(edge, edge));
    return max(vec3(0.0), color * (1.0 - frame * artVignette));
  }
`;
