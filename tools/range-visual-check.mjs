// Optional-asset and alternate-mode smoke checks; start the local server first.
// Uses low/basic rendering and deterministic flight ticks on CPU-only runners.
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { launchChrome, connect, sleep } from './cdp.mjs';

export function assertOptionalFallback(kind, asset, observation) {
  const { blockedUrls, warnings, visuals, hasAdvancedClouds, hasLakesideModels, waterTriangles } = observation;
  assert.ok(blockedUrls.some(url => new URL(url).pathname.endsWith('/' + asset)),
    `${kind}: the intended asset request was not blocked; fallback was not exercised`);
  if (kind === 'clouds') {
    assert.equal(visuals.clouds, 'basic');
    assert.equal(hasAdvancedClouds, false);
    assert.ok(warnings.some(message => message.startsWith('Cloud asset fallback:')),
      'cloud asset failure must report the fallback');
  } else if (kind === 'lakeside') {
    assert.equal(visuals.lakeside, 'fallback');
    assert.equal(hasLakesideModels, false);
    assert.ok(warnings.some(message => message.startsWith('Lakeside model fallback:')),
      'lakeside asset failure must report the fallback');
  } else throw new Error(`Unknown optional fallback: ${kind}`);
  assert.ok(Number.isFinite(waterTriangles) && waterTriangles > 0,
    'optional asset failures must preserve the lake geometry and dock');
}

export async function runVisualChecks({ url = 'http://127.0.0.1:4180', timeoutMs = 120000 } = {}) {
  assert.ok(Number.isFinite(timeoutMs) && timeoutMs > 0, '--timeout-ms must be positive');
  let browser, page, closing = false, documentId = 0;
  const errors = [], warnings = [], blockedUrls = [];
  try {
    const port = 9400 + Math.floor(Math.random() * 400);
    browser = await launchChrome({ port, width: 800, height: 500 });
    page = await connect({ port });
    page.on(message => {
      if (message.method === 'Runtime.exceptionThrown')
        errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Runtime.consoleAPICalled') {
        const text = message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ');
        if (message.params.type === 'error') errors.push(text);
        if (message.params.type === 'warning') warnings.push(text);
      }
      if (message.method === 'Fetch.requestPaused') {
        blockedUrls.push(message.params.request.url);
        void page.send('Fetch.failRequest', { requestId: message.params.requestId, errorReason: 'Failed' })
          .catch(error => { if (!closing) errors.push('Asset interception: ' + error.message); });
      }
    });
    await page.send('Network.enable');
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.__visualCheckDocument = new URL(location.href).searchParams.get('__visualCheck');
      const visualFetch = window.fetch;
      window.fetch = function(input, options) {
        if (String(input).endsWith('/__version')) return Promise.resolve(new Response('', {status:404}));
        return visualFetch.call(this, input, options);
      };` });
    async function block(patterns = []) {
      await page.send('Fetch.disable');
      blockedUrls.length = 0; warnings.length = 0;
      if (patterns.length) await page.send('Fetch.enable', {
        patterns: patterns.map(urlPattern => ({ urlPattern, requestStage: 'Request' })),
      });
    }
    async function open(query = '') {
      const target = new URL('range/', url.replace(/\/+$/, '') + '/');
      const params = new URLSearchParams(query);
      params.set('quality', 'low');
      if (!params.has('clouds')) params.set('clouds', 'basic');
      const token = String(++documentId); params.set('__visualCheck', token); target.search = params;
      await page.goto(target.href);
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        // A navigation may still expose the previous ready document briefly.
        if (await page.eval(`window.__visualCheckDocument === ${JSON.stringify(token)} && !!window.rangeDemo?.rig`)) {
          await page.eval(`(() => {
            const id = requestAnimationFrame(() => {});
            for (let n = Math.max(0, id - 32); n <= id; n++) cancelAnimationFrame(n);
            window.requestAnimationFrame = () => 0;
          })(); 1`);
          return;
        }
        await sleep(250);
      }
      throw new Error(`Range failed to load within ${timeoutMs}ms: ${target.href}\n${errors.join('\n')}`);
    }
    async function renderReady() {
      const result = await page.eval(`(() => {
        const d = rangeDemo; d.render();
        return { calls: d.renderer.info.render.calls, programs: d.renderer.info.programs.length,
          shaderErrors: d.renderer.info.programs.filter(p => p.diagnostics?.runnable === false).length,
          contextLost: d.renderer.getContext().isContextLost(), position: d.getState().position };
      })()`);
      assert.ok(result.calls > 0 && result.programs > 0, 'scene must actually draw');
      assert.equal(result.shaderErrors, 0, 'all compiled shader programs must run');
      assert.equal(result.contextLost, false); assert.ok(result.position.every(Number.isFinite));
      assert.equal(errors.length, 0, errors.join('\n'));
    }
    async function launch() {
      const result = await page.eval(`(() => {
        const d = rangeDemo; d.launch(); let seconds = 0;
        for (; seconds < 40; seconds += .25) {
          const mode = d.getState().mode;
          if (['gliding','crashed','tumbling'].includes(mode)) break;
          d.advance(.25, undefined, {render:false});
        }
        return {mode:d.getState().mode, seconds};
      })()`);
      assert.equal(result.mode, 'gliding', 'Launch must reach flight: ' + JSON.stringify(result));
      await renderReady();
    }
    const observation = async () => ({ blockedUrls: [...blockedUrls], warnings: [...warnings],
      ...await page.eval(`({visuals:rangeDemo.scene.userData.visuals,
        hasAdvancedClouds:!!rangeDemo.aerial.advancedClouds, hasLakesideModels:!!rangeDemo.lakesideModels,
        waterTriangles:rangeDemo.waterscape.stats.triangles})`) });

    let supportsAdvanced = false;
    for (const query of ['model=original', 'assist=on']) {
      await open(query);
      const data = await page.eval(`(() => {
        let bones=0; rangeDemo.player.traverse(o => {if(o.isBone)bones++});
        return {visuals:rangeDemo.scene.userData.visuals, bones,
          supportsAdvanced:rangeDemo.renderer.extensions.has('EXT_color_buffer_float')};
      })()`);
      assert.equal(data.visuals.forest, 'forest'); assert.equal(data.visuals.props, 'illustrated-kit');
      assert.equal(data.visuals.lakeside, 'blender-lakeside');
      assert.ok(data.visuals.forestMipLevels.length > 0 && data.visuals.forestMipLevels.every(level => level === 8));
      assert.equal(data.bones, 19); supportsAdvanced = data.supportsAdvanced;
      await launch(); console.log('PASS ' + query + ' assets, rig and launch');
    }
    await page.viewport(480, 720); await sleep(500);
    assert.ok(await page.eval('Math.abs(rangeDemo.camera.aspect-480/720)<.001'));
    await renderReady(); console.log('PASS portrait resize and shader programs');

    await block(['*assets/forest/*-mips.bin.gz*']); await open();
    const sourceAtlas = await page.eval('rangeDemo.scene.userData.visuals');
    assert.ok(blockedUrls.length > 0, 'prepared mip requests must be intercepted');
    assert.equal(sourceAtlas.forest, 'forest');
    assert.ok(sourceAtlas.forestMipLevels.length > 0 && sourceAtlas.forestMipLevels.every(level => level === 0));
    await launch(); console.log('PASS missing prepared mips fall back to PNG atlases and launch');

    await block(['*assets/forest/*', '*sierra-heightfield.bin*', '*assets/materials/*']); await open();
    const fallback = await page.eval('rangeDemo.scene.userData.visuals');
    assert.equal(fallback.models, 'fallback'); assert.equal(fallback.forest, 'fallback');
    assert.equal(fallback.terrain, false); assert.equal(fallback.surfaces, false);
    await launch(); console.log('PASS missing forest/elevation/surfaces preserve local props and launch');

    if (supportsAdvanced) for (const asset of ['atmosphere/transmittance.bin', 'shape.bin']) {
      await block([`*assets/clouds/${asset}*`]); await open('clouds=advanced');
      assertOptionalFallback('clouds', asset, await observation());
      await launch(); console.log(`PASS missing cloud ${asset} warns, activates basic sky and launches`);
    } else console.log('SKIP advanced cloud asset failures: float render targets unavailable; basic sky exercised');

    await block(['*assets/lakeside/lakeside.glb*']); await open();
    assertOptionalFallback('lakeside', 'lakeside.glb', await observation());
    await launch(); console.log('PASS missing lakeside GLB warns, preserves lake/dock and launches');
    await block();
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS no runtime or shader errors');
  } finally {
    closing = true; page?.close(); await browser?.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { url: { type: 'string', default: 'http://127.0.0.1:4180' },
    'timeout-ms': { type: 'string', default: '120000' } } });
  try { await runVisualChecks({ url: values.url, timeoutMs: Number(values['timeout-ms']) }); }
  catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}
