const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const compile = file => ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
let wallNow = 100000, audioBlocked = false;
let timerId = 0;
const timers = new Map();
const intervals = new Map();
const setIntervalMock = fn => { const id = ++timerId; intervals.set(id, fn); return id; };
const clearIntervalMock = id => intervals.delete(id);
const setTimer = (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: wallNow + delay }); return id; };
const clearTimer = id => timers.delete(id);
function advance(ms) { wallNow += ms; for (const [id, timer] of [...timers]) if (timer.at <= wallNow) { timers.delete(id); timer.fn(); } }
const document = { hidden: false };
const recordings = [], contexts = [], fetched = [];
class Audio {
  constructor(src) { this.src = src; this.paused = true; this.plays = 0; this.duration = 120; this.currentTime = 0; this.playbackRate = 1; recordings.push(this); }
  play() { if (audioBlocked) return Promise.reject(Error('Autoplay blocked')); this.paused = false; this.plays++; return Promise.resolve(); }
  pause() { this.paused = true; }
  removeAttribute() { this.src = ''; }
  load() {}
}
class AudioContext {
  constructor() { this.currentTime = 10; this.state = 'suspended'; this.destination = {}; this.notes = []; contexts.push(this); }
  resume() { if (audioBlocked) return Promise.reject(Error('Autoplay blocked')); this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  decodeAudioData(bytes) { return Promise.resolve({ path: bytes.path }); }
  createGain() { return { gain: {}, connect() {}, disconnect() {} }; }
  createBufferSource() { const source = { connect() {}, disconnect() {}, start: at => { source.at = at; this.notes.push(source); }, stop: () => { source.stopped = true; source.onended?.(); } }; return source; }
}
const audioSandbox = { exports: {}, Audio, AudioContext, AbortController, document, Date: { now: () => wallNow }, setTimeout: setTimer, clearTimeout: clearTimer, setInterval: setIntervalMock, clearInterval: clearIntervalMock,
  fetch: async url => { fetched.push(url); return { ok: true, arrayBuffer: async () => ({ path: url }) }; } };
vm.runInNewContext(compile('src/OriginalAudio.ts'), audioSandbox);
const OriginalAudio = audioSandbox.exports.default;

function hooks() {
  const states = [], refs = [], effects = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0, initial = true;
  return { states, effects, reset() { stateIndex = refIndex = effectIndex = 0; }, done() { initial = false; }, react: {
    useState(value) { const i = stateIndex++; if (initial) states[i] = typeof value === 'function' ? value() : value; return [states[i], value => { states[i] = value; }]; },
    useRef(value) { const i = refIndex++; if (initial) refs[i] = { current: value }; return refs[i]; },
    useEffect(fn) { effects[effectIndex++] = fn; },
  } };
}
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' };
function surface() { return { handlers: new Map(), capture: new Map(), addEventListener(name, fn, capture) { this.handlers.set(name, fn); this.capture.set(name, capture); }, removeEventListener(name, fn) { if (this.handlers.get(name) === fn) this.handlers.delete(name); }, dispatchEvent(event) { this.handlers.get(event.type)?.(event); } }; }
class Element { constructor(disabled = false) { this.disabled = disabled; this.classList = { contains: () => false }; } closest() { return this; } matches() { return this.disabled; } }
class Event { constructor(type) { this.type = type; } }

async function verify() {
  audioBlocked = true;
  const player = new OriginalAudio();
  player.setMenuActive(true); player.unlock();
  await flush();
  const music = recordings[0];
  assert.equal(music.src, '/sounds/background-music.mp3');
  assert(music.paused, 'Respect blocked autoplay');
  audioBlocked = false; player.unlock(); await flush();
  assert(!music.paused && music.loop, 'Original music starts after gesture');
  const musicPlays = music.plays; player.setMenuActive(true); assert.equal(music.plays, musicPlays, 'No overlapping music');
  player.setMusicClock(70000);
  assert.equal(music.currentTime, 50, 'Music position follows server time');
  const secondPlayer = new OriginalAudio();
  wallNow += 60000;
  secondPlayer.setMenuActive(true); secondPlayer.setMusicClock(10000);
  assert.equal(recordings.at(-1).currentTime, music.currentTime, 'Different device clocks and late joins share one music position');
  secondPlayer.dispose(); wallNow -= 60000;
  music.currentTime = 49;
  for (const fn of intervals.values()) fn();
  assert.equal(music.currentTime, 50, 'Playback drift is corrected');
  music.currentTime = 42;
  player.setMenuActive(false); assert(music.paused, 'Starting the game stops music');
  assert.equal(music.currentTime, 0, 'Game start resets the music');
  player.setEnabled(false); player.setEnabled(true); player.unlock();
  assert(music.paused, 'Unmute and touches during the game do not restart music');
  const context = contexts[0];
  for (const [name, filename] of Object.entries(audioSandbox.exports.SOUND_FILES)) {
    assert(fs.statSync(path.join(root, 'public/sounds', filename)).size > 0, `Recording exists: ${filename}`);
    player.play(name, wallNow + 200);
    const note = context.notes.at(-1);
    assert.equal(note.buffer.path, `/sounds/${filename}`, `Use original recording: ${name}`);
    assert.equal(note.at, 10.2, 'Server timing preserved');
  }
  let count = context.notes.length;
  player.play('finish', wallNow - 2000); player.play('finish', wallNow + 6000);
  assert.equal(context.notes.length, count, 'Ignore stale and far-future events');
  player.setEnabled(false); assert(context.notes.every(note => note.stopped), 'Mute cancels scheduled sounds');
  player.play('click'); assert.equal(context.notes.length, count, 'Muted click silent');
  player.setEnabled(true); player.setMenuActive(true); assert(!music.paused, 'Unmute restarts menu music');
  document.hidden = true; player.visibilityChanged(); assert(music.paused && context.state === 'suspended');
  document.hidden = false; player.visibilityChanged(); await flush(); assert(!music.paused);
  player.dispose(); assert(music.paused && context.state === 'closed'); assert.equal(timers.size, 0); assert.equal(intervals.size, 0);
  // The first click uses the same original mp3 before Web Audio has decoded it.
  const firstClick = new OriginalAudio(); firstClick.play('click');
  assert(recordings.at(-1).src.endsWith('/ui-click.mp3') && recordings.at(-1).plays === 1);
  firstClick.dispose();

  const h = hooks(); const doc = Object.assign(surface(), { hidden: false, documentElement: { dataset: { appScreen: 'home' } } });
  const win = Object.assign(surface(), { matchMedia: () => ({ matches: false }) });
  const played = [], players = [];
  class PlayerStub { constructor() { this.enabled = true; players.push(this); } setEnabled(value) { this.enabled = value; } setMenuActive(value) { this.menuActive = value; } setMusicClock(value) { this.clock = value; } preload() {} unlock() {} visibilityChanged() {} dispose() { this.disposed = true; } play(name, at) { if (this.enabled) played.push({ name, at }); } }
  const shellSandbox = { exports: {}, require(name) { if (name === 'react') return h.react; if (name === 'react/jsx-runtime') return jsx; if (name === './OriginalAudio') return { __esModule: true, default: PlayerStub }; throw Error(name); }, document: doc, window: win, Element, Event, localStorage: { getItem: () => null, setItem() {} }, Date: { now: () => wallNow }, setTimeout: setTimer, clearTimeout: clearTimer };
  vm.runInNewContext(compile('src/ExperienceShell.tsx'), shellSandbox);
  function render() { h.reset(); const tree = shellSandbox.exports.default({ children: 'app' }); h.done(); return tree; }
  render(); const cleanups = h.effects.map(fn => fn()).filter(Boolean);
  win.dispatchEvent({ type: 'busbaas-music-clock', detail: 70000 });
  assert.equal(players[0].clock, 70000, 'Measured server offset reaches the audio player');
  for (const screen of ['home', 'settings', 'join', 'lobby', 'rules', 'howto']) {
    win.dispatchEvent({ type: 'busbaas-screen', detail: screen });
    assert(players[0].menuActive, `Music continues on ${screen}`);
  }
  win.dispatchEvent({ type: 'busbaas-screen', detail: 'game' });
  assert.equal(players[0].menuActive, false, 'All gameplay phases have no background music');
  win.dispatchEvent({ type: 'busbaas-screen', detail: 'home' });
  assert(players[0].menuActive, 'Returning to the menus enables music again');
  const sound = detail => win.dispatchEvent({ type: 'busbaas-sound-effect', detail });
  sound({ type: 'card', variant: 1, eventId: 'card' }); assert.equal(played.at(-1).name, 'card2');
  const beforeDuplicate = played.length; sound({ type: 'card', eventId: 'card' }); assert.equal(played.length, beforeDuplicate);
  sound({ type: 'bus-horn' }); assert.equal(played.at(-1).name, 'horn');
  sound({ type: 'card-result', result: 'disco' }); assert.equal(played.at(-1).name, 'disco');
  win.dispatchEvent({ type: 'busbaas-disco' }); advance(700); assert.equal(played.filter(x => x.name === 'disco').length, 1, 'Disco fallback does not double the server sound');
  wallNow += 1500; win.dispatchEvent({ type: 'busbaas-disco' }); advance(700); assert.equal(played.filter(x => x.name === 'disco').length, 2, 'Disco state recovers missing server sound');
  win.dispatchEvent({ type: 'busbaas-phase', detail: 'bus-finished' }); advance(700); assert.equal(played.at(-1).name, 'finish');
  sound({ type: 'finish' }); assert.equal(played.filter(x => x.name === 'finish').length, 1, 'Victory fallback does not double server sound');
  assert.equal(doc.capture.get('click'), true);
  doc.dispatchEvent({ type: 'click', target: new Element() }); assert.equal(played.at(-1).name, 'click');
  const beforeDisabled = played.length; wallNow += 100; doc.dispatchEvent({ type: 'click', target: new Element(true) }); assert.equal(played.length, beforeDisabled);
  render().props.children[1].props.onClick(); render(); h.effects[0]();
  wallNow += 100; doc.dispatchEvent({ type: 'click', target: new Element() }); assert.equal(played.length, beforeDisabled, 'Mute applies to original clicks');
  cleanups.forEach(fn => fn()); assert.equal(doc.handlers.size, 0); assert.equal(win.handlers.size, 0); assert.equal(timers.size, 0); assert(players[0].disposed);

  // Native endgame: slow preload must still show; no fill must free buttons.
  async function adCase({ native = true, ready = true, late = false, timeout = false, unmount = false } = {}) {
    const adHooks = hooks(); let resolvePreload, showCount = 0;
    const preload = new Promise(resolve => { resolvePreload = resolve; });
    const sandbox = { exports: {}, require(name) { if (name === 'react') return adHooks.react; if (name === 'react/jsx-runtime') return jsx; if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } }; if (name === './AdManager') return { prepareNativeInterstitial: () => preload, showNativeInterstitial: async () => { showCount++; return true; } }; throw Error(name); }, setTimeout: setTimer, clearTimeout: clearTimer };
    vm.runInNewContext(compile('src/ads/NativeEndgameAd.tsx'), sandbox);
    adHooks.reset(); sandbox.exports.default({ children: 'buttons' }); adHooks.done();
    const cleanup = adHooks.effects[0]();
    if (!native) { assert(adHooks.states[0]); assert.equal(showCount, 0); return; }
    if (unmount) cleanup();
    if (!late && !timeout) resolvePreload(ready);
    advance(3000); await flush();
    if (late) { assert.equal(showCount, 0); advance(2000); resolvePreload(ready); await flush(); }
    if (timeout) { advance(9000); await flush(); assert(adHooks.states[0], 'Timeout releases buttons'); resolvePreload(true); await flush(); }
    assert.equal(showCount, !unmount && !timeout && ready ? 1 : 0);
    if (!unmount) assert(adHooks.states[0], 'End controls become available');
    cleanup();
  }
  await adCase(); await adCase({ late: true }); await adCase({ ready: false }); await adCase({ timeout: true }); await adCase({ unmount: true }); await adCase({ native: false });
  assert.equal(timers.size, 0);
  console.log('PASS: all original sound files, synchronized samples, original menu music/clicks, mute/background cleanup, disco/victory fallbacks, duplicate events, slow native ads, no-fill/timeout, unmount and web behavior.');
}
verify().catch(error => { console.error(error); process.exitCode = 1; });


