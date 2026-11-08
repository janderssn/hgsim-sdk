import { compassName } from '../src/wind.js';

const DEG = Math.PI / 180;

// How each launch site is launched from, and what C says it goes to.
const SITE_HINTS = {
  ramp: { pickUp: 'pick up and run down the ramp', go: 'go to the ramp' },
  cliff: { pickUp: 'pick up and step off the cliff', go: 'go to the cliff' },
  slope: { pickUp: 'pick up and run down the slope', go: 'go to the slope' },
};

function controlHints({ mode, padActive, pilotStand, launchPhase, realLaunch, launchSite, nextSite = 'cliff' }) {
  const flying = mode === 'gliding';
  if (padActive) {
    return flying
      ? '<b>B</b>mark this moment <b>RT</b>dive <b>LT</b>push out · on final hold it from about 3 m <b>LS</b>steer <b>D-pad ↑</b>back to launch <b>View</b>panel'
      : '<b>A</b>launch from the ridge <b>X</b>start over the field <b>View</b>panel';
  }
  if (flying) {
    return '<b>Space</b>' + (pilotStand ? 'go prone' : 'sit up (slow down)') +
      ' <b>N</b>mark this moment <b>W</b>pull in (dive) <b>S</b>push out · on final hold it from about 3 m <b>A</b><b>D</b>weight shift <b>R</b>back to launch <b>Tab</b>panel';
  }
  if (launchPhase && realLaunch) {
    return launchPhase === 'run'
      ? '<b>A</b><b>D</b>balance the wing <b>W</b><b>S</b>nose <b>Space</b>jump off as it lifts, or off the edge'
      : '<b>A</b><b>D</b>balance the wing <b>W</b><b>S</b>nose down / up <b>Space</b>' +
        (launchSite === 'cliff' ? 'step out and jump' : 'start the run');
  }
  return `<b>Space</b>${(SITE_HINTS[launchSite] ?? SITE_HINTS.ramp).pickUp} <b>C</b>${(SITE_HINTS[nextSite] ?? SITE_HINTS.cliff).go}` +
    ' <b>1</b>start over the field <b>Tab</b>panel';
}

/** Keeps DOM lookup and unchanged text/HTML writes out of the animation loop. */
export function createHud(root = document) {
  const ids = ['speed', 'vario', 'varioBox', 'agl', 'dist', 'alpha', 'hints', 'windNow'];
  const nodes = Object.fromEntries(ids.map(id => [id, root.getElementById(id)]));
  const previous = Object.create(null);

  function write(id, property, value) {
    const key = id + '.' + property;
    if (previous[key] === value) return;
    nodes[id][property] = value;
    previous[key] = value;
  }

  function update(snapshot) {
    const { mode, speed, verticalSpeed, agl, distance, alpha, stalled, wind } = snapshot;
    const flying = mode === 'gliding';
    write('speed', 'textContent', String(Math.round(speed * 3.6)));
    write('vario', 'textContent', (verticalSpeed >= 0 ? '+' : '') + verticalSpeed.toFixed(1));
    write('varioBox', 'className', 'vario ' + (verticalSpeed > .4 ? 'up' : verticalSpeed < -2.5 ? 'down' : ''));
    write('agl', 'textContent', String(Math.max(0, Math.round(agl - 2.3))));
    write('dist', 'textContent', String(Math.round(distance)));
    write('alpha', 'textContent', flying ? ((alpha || 0) / DEG).toFixed(0) + '°' + (stalled ? ' stall' : '') : '—');

    write('hints', 'innerHTML', controlHints(snapshot));
    write('windNow', 'innerHTML', `${wind.speed.toFixed(1)} m/s from the ${compassName(wind.from)} <small>(mean ${wind.meanSpeed.toFixed(1)} m/s from ${Math.round(wind.meanFrom)}°)</small>`);
  }

  return { update };
}
