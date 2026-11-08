/** One authored light and finishing palette for the illustrated flying range. */
export const ALPINE_ART = Object.freeze({
  name: 'Golden Range',
  // The launch and landing approach face +Z. A camera-side afternoon key
  // reveals timber/rock planes and foliage colours instead of silhouetting them.
  sunDirection: Object.freeze([.70, .48, -.55]),
  sunColor: Object.freeze([1, .79, .54]),
  sunIntensity: 3.8,
  // Illustrated diffuse fill compensates for the sky-only probe's omission of
  // cloud-scattered light and local ground bounce; solar/sky radiance stay raw.
  diffuseSkyGain: 3,
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

// Daylight conditions stay above the low-sun limits of the local forest-shadow
// approximation. The advanced atmosphere derives solar colour from its LUTs;
// these colours only provide a matching direction for the lightweight fallback.
export const ALPINE_LIGHT_CONDITIONS = Object.freeze({
  afternoon: Object.freeze({ label: 'Afternoon', sunDirection: ALPINE_ART.sunDirection,
    sunColor: ALPINE_ART.sunColor, sunIntensity: ALPINE_ART.sunIntensity }),
  'late-sun': Object.freeze({ label: 'Late sun', sunDirection: Object.freeze([.748, .309, -.588]),
    sunColor: Object.freeze([1, .73, .47]), sunIntensity: 3.3 }),
  'clear-day': Object.freeze({ label: 'Clear day', sunDirection: Object.freeze([.3932, .8660, -.3089]),
    sunColor: Object.freeze([1, .97, .91]), sunIntensity: 3.8 }),
});

export function resolveArtDirection(condition = 'afternoon') {
  const key = Object.hasOwn(ALPINE_LIGHT_CONDITIONS, condition) ? condition : 'afternoon';
  return Object.freeze({ ...ALPINE_ART, ...ALPINE_LIGHT_CONDITIONS[key], condition: key });
}

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
