/** Precomputed cutout mip chains retain leaf color and real surface normals. */
export function decodeForestMipChain(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 32 || view.getUint32(0, true) !== 0x31504d46) throw new Error('Invalid forest mip chain');
  const width = view.getUint32(4, true), height = view.getUint32(8, true), count = view.getUint32(12, true);
  if (!width || !height || (!count || count > 1 + Math.floor(Math.log2(Math.max(width, height)))) || 16 + count * 16 > view.byteLength) throw new Error('Incomplete forest mip chain');
  const mipmaps = [];
  for (let level = 0; level < count; level++) {
    const header = 16 + level * 16;
    const w = view.getUint32(header, true), h = view.getUint32(header + 4, true);
    const offset = view.getUint32(header + 8, true), length = view.getUint32(header + 12, true);
    if (w !== Math.max(1, width >> level) || h !== Math.max(1, height >> level) || length !== w * h * 4 || offset < 16 + count * 16 || offset + length > view.byteLength) throw new Error('Invalid forest mip level');
    mipmaps.push({ width: w, height: h, data: new Uint8Array(buffer, offset, length) });
  }
  return { width, height, mipmaps };
}

export async function loadForestMipTexture(THREE, url, colorSpace) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Forest mip chain: HTTP ${response.status}`);
  // Static hosting usually serves this as octet-stream; hosts that declare
  // Content-Encoding:gzip have already decoded the body in fetch().
  const transport = await response.arrayBuffer();
  const isGzip = new Uint8Array(transport, 0, Math.min(2, transport.byteLength));
  const decoded = isGzip[0] === 0x1f && isGzip[1] === 0x8b
    ? await new Response(new Blob([transport]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    : transport;
  const { width, height, mipmaps } = decodeForestMipChain(decoded);
  const texture = new THREE.DataTexture(mipmaps[0].data, width, height, THREE.RGBAFormat);
  texture.name = new URL(url).pathname.split('/').pop();
  texture.colorSpace = colorSpace;
  texture.mipmaps = mipmaps;
  // Three r180 allocates exactly mipmaps.length immutable texStorage2D levels.
  // Stopping at one texel per view prevents unrelated atlas views mixing.
  texture.userData.forestMipMaxLevel = mipmaps.length - 1;
  texture.generateMipmaps = false;
  // Authoring writes the chain bottom-up, so DOM image premultiplication never
  // discards the RGB padding of transparent texels or changes normal data.
  texture.flipY = false;
  texture.unpackAlignment = 1;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
