const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const compile = file => ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' };
function target(extra = {}) {
  const listeners = new Map();
  return Object.assign({ dataset: {}, listeners,
    addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    fire(name) { for (const callback of listeners.get(name) ?? []) callback(); },
  }, extra);
}
const window = target({ location: { hostname: 'busbende.nl' }, adsbygoogle: [] });
const scripts = [];
const document = target({ hidden: false, documentElement: { dataset: {} },
  getElementById: id => scripts.find(script => script.id === id) ?? null,
  createElement: () => target(), head: { appendChild: script => scripts.push(script) },
});
let native = false, server = false;
let refs = [], effects = [], refIndex = 0;
const observers = { intersections: [], resizes: [], mutations: [] };
function observer(list) { return class { constructor(callback) { this.callback = callback; list.push(this); } observe() {} disconnect() { this.disconnected = true; } fire(value) { if (!this.disconnected) this.callback(value); } }; }
const react = { useRef(value) { const i = refIndex++; refs[i] ??= { current: value }; return refs[i]; }, useEffect: fn => effects.push(fn), useSyncExternalStore: (_, get, getServer) => server ? getServer() : get() };
function load(file, dependencies) {
  const sandbox = { exports: {}, window, document, IntersectionObserver: observer(observers.intersections), ResizeObserver: observer(observers.resizes), MutationObserver: observer(observers.mutations), require: name => {
    if (name.endsWith('.css')) return {};
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return jsx;
    if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    throw Error(`Unexpected dependency ${name}`);
  } };
  vm.runInNewContext(compile(file), sandbox, { filename: file });
  return sandbox.exports;
}
const loader = load('src/ads/WebAdSense.ts', {});
const display = load('src/ads/WebDisplayAd.tsx', { './WebAdSense': loader });
function mount({ banner = false, width = 300, available = width } = {}) {
  refs = []; effects = []; refIndex = 0;
  const tree = display.default({ placement: 'test', banner });
  const frame = target({ hidden: false, getBoundingClientRect: () => ({ width: available }) });
  const slot = { getBoundingClientRect: () => ({ width }), status: null, getAttribute() { return this.status; } };
  if (tree) { refs[0].current = frame; refs[1].current = slot; }
  let cleanups = effects.map(effect => effect());
  return { tree, frame, slot, near: () => observers.intersections.at(-1)?.fire([{ isIntersecting: true }]), resize: () => observers.resizes.at(-1)?.fire(),
    strictReplay() { cleanups.forEach(fn => fn?.()); cleanups = effects.map(effect => effect()); }, cleanup() { cleanups.forEach(fn => fn?.()); },
    setWidth(value) { width = value; available = value; },
  };
}
server = true; assert.equal(mount().tree, null, 'SSR contains no ad slot and hydrates using the server snapshot'); server = false;
window.location.hostname = 'localhost'; assert.equal(mount().tree, null);
window.location.hostname = 'busbende.nl'; native = true; assert.equal(mount().tree, null); native = false;
const first = mount({ banner: true });
assert.equal(window.adsbygoogle.length, 0, 'No ad request until near the viewport');
document.hidden = true; first.near(); assert.equal(window.adsbygoogle.length, 0, 'No request in a hidden tab');
document.hidden = false; document.fire('visibilitychange'); assert.equal(window.adsbygoogle.length, 1);
assert.equal(scripts.length, 1);
for (let i = 0; i < 10; i++) first.resize();
first.strictReplay(); first.near();
assert.equal(window.adsbygoogle.length, 1, 'No duplicate request on resize or StrictMode replay');
first.slot.status = 'unfilled'; observers.mutations.at(-1).fire(); assert(first.frame.hidden, 'Unfilled ad is collapsed');
first.cleanup();
const tooNarrow = mount({ banner: true, width: 280 }); tooNarrow.near(); assert.equal(window.adsbygoogle.length, 1);
tooNarrow.setWidth(300); tooNarrow.resize(); assert.equal(window.adsbygoogle.length, 2); assert.equal(scripts.length, 1, 'One loader for multiple placements'); tooNarrow.cleanup();
const content = mount({ width: 280 }); content.near(); assert.equal(window.adsbygoogle.length, 3, 'Responsive content slot fits a narrow phone'); content.cleanup();
const overflow = mount({ banner: true, width: 728, available: 700 }); overflow.near(); assert.equal(window.adsbygoogle.length, 3, 'Oversized banner is not requested'); overflow.cleanup();
window.adsbygoogle = { push() { throw Error('Blocked provider'); } };
const blocked = mount(); blocked.near(); assert(blocked.frame.hidden, 'Blocked ads never block the game'); blocked.cleanup();
window.adsbygoogle = [];
const loadError = mount(); loadError.near(); loadError.strictReplay(); scripts[0].fire('error'); assert(loadError.frame.hidden, 'Loader errors also collapse after StrictMode replay'); loadError.cleanup();
const later = mount(); later.near(); assert(later.frame.hidden, 'Failed loader is not retried endlessly'); later.cleanup();

const game = load('src/ads/GamePageAd.tsx', { './WebDisplayAd': display });
document.documentElement.dataset = { appScreen: 'home' }; assert.equal(game.default(), null);
for (const phase of ['cards-0', 'cards-3', 'tree', 'tree-tiebreak', 'bus-setup', 'bus']) {
  document.documentElement.dataset = { appScreen: 'game', gamePhase: phase };
  assert.equal(game.default().type, display.default, `Stable banner component during ${phase}`);
}
document.documentElement.dataset.gamePhase = 'bus-finished'; assert.equal(game.default(), null, 'No short end-screen display ad');
const shop = fs.readFileSync(path.join(root, 'src/CommerceShell.tsx'), 'utf8');
assert(!/fetch\(|shop-catalog|bb-market|Binnenkort beschikbaar/.test(shop), 'No shop UI or remote catalog request');
assert(shop.includes('busbaas-appearance-mode'), 'Saved appearance preference remains supported');
assert(fs.readFileSync(path.join(root, 'src/ads/web-display-ad.css'), 'utf8').includes('margin: 160px auto 0'), 'Game banner has space outside the controls');
console.log('PASS: production/native/SSR gating, viewport and width checks, one loader, no refresh/StrictMode duplicates, no-fill/adblock cleanup, phase visibility and shop removal.');
