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
const navigations = [];
const window = target({ location: { hostname: 'busbende.nl', replace: url => navigations.push(url) }, adsbygoogle: [] });
const scripts = [];
const rootAttributes = new Set();
const document = target({ hidden: false, documentElement: { dataset: {}, removeAttribute(name) { rootAttributes.delete(name); }, toggleAttribute(name, on) { if (on) rootAttributes.add(name); else rootAttributes.delete(name); } },
  getElementById: id => scripts.find(script => script.id === id) ?? null,
  createElement: () => target(), head: { appendChild: script => scripts.push(script) },
});
let native = false, server = false;
let refs = [], effects = [], refIndex = 0;
const observers = { intersections: [], resizes: [], mutations: [] };
function observer(list) { return class { constructor(callback) { this.callback = callback; list.push(this); } observe() {} disconnect() { this.disconnected = true; } fire(value) { if (!this.disconnected) this.callback(value); } }; }
const react = { useRef(value) { const i = refIndex++; refs[i] ??= { current: value }; return refs[i]; }, useEffect: fn => effects.push(fn), useSyncExternalStore: (_, get, getServer) => server ? getServer() : get() };
function load(file, dependencies) {
  const sandbox = { exports: {}, window, document, URLSearchParams, IntersectionObserver: observer(observers.intersections), ResizeObserver: observer(observers.resizes), MutationObserver: observer(observers.mutations), require: name => {
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
observers.intersections.at(-2).fire([{ isIntersecting: true }]);
assert(!rootAttributes.has('data-bb-banner-visible'), 'An empty ad placeholder does not hide the controls');
first.slot.status = 'filled'; observers.mutations.at(-1).fire();
assert(rootAttributes.has('data-bb-banner-visible'), 'Floating controls stay away from a visible banner');
assert.equal(window.adsbygoogle.length, 0, 'No ad request until near the viewport');
document.hidden = true; first.near(); assert.equal(window.adsbygoogle.length, 0, 'No request in a hidden tab');
document.hidden = false; document.fire('visibilitychange'); assert.equal(window.adsbygoogle.length, 1);
assert.equal(scripts.length, 1);
for (let i = 0; i < 10; i++) first.resize();
first.strictReplay(); first.near();
assert.equal(window.adsbygoogle.length, 1, 'No duplicate request on resize or StrictMode replay');
first.slot.status = 'unfilled'; observers.mutations.at(-1).fire(); assert(first.frame.hidden, 'Unfilled ad is collapsed');
assert(!rootAttributes.has('data-bb-banner-visible'), 'Controls return when the unfilled banner disappears');
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

scripts.length = 0;
window.adsbygoogle = [];
const game = load('src/ads/GamePageAd.tsx', { './WebAdSense': loader });
function renderGame() { effects = []; assert.equal(game.default(), null, 'Google owns the anchor, not a publisher overlay'); effects.forEach(effect => effect()); }
document.documentElement.dataset = { appScreen: 'home' }; renderGame(); assert.equal(scripts.length, 0, 'No anchor on the game menu');
for (const phase of ['cards-0', 'cards-3', 'tree', 'tree-tiebreak', 'bus-setup', 'bus']) {
  Object.assign(document.documentElement.dataset, { appScreen: 'game', gamePhase: phase });
  renderGame();
  assert.equal(scripts.length, 1, `No new anchor loader for ${phase}`);
}
assert.equal(scripts[0].dataset.overlays, 'collapsed-bottom', 'Only the official ordinary bottom anchor is requested');
assert.equal(document.documentElement.dataset.bbAutoAnchors, 'true', 'Reserve room for the anchor');
native = true; assert.equal(loader.leaveWebAnchorPage(), false); native = false;
assert.equal(loader.leaveWebAnchorPage(), true); assert.deepEqual(navigations, ['/spelen/'], 'Return to a clean menu without manipulating the anchor');
assert.equal(window.adsbygoogle.length, 0, 'No manually refreshed anchor requests');
document.documentElement.dataset.gamePhase = 'bus-finished'; renderGame(); assert.equal(scripts.length, 1);
for (const url of ['/', '/spelregels/', '/veelgestelde-vragen/']) assert(loader.isAnchorContentPath(url));
for (const url of ['/privacy/', '/demo/', '/join/ABCDE', '/spelen/', '/over-busbende/']) assert(!loader.isAnchorContentPath(url), `${url} does not enable anchors at startup`);
scripts[0].fire('error'); assert.equal(document.documentElement.dataset.bbAutoAnchors, undefined, 'Failed anchor script releases reserved space');
assert.equal(loader.leaveWebAnchorPage(), false, 'No needless reload without an anchor');
const shop = fs.readFileSync(path.join(root, 'src/CommerceShell.tsx'), 'utf8');
assert(!/fetch\(|shop-catalog|bb-market|Binnenkort beschikbaar/.test(shop), 'No shop UI or remote catalog request');
assert(shop.includes('busbaas-appearance-mode'), 'Saved appearance preference remains supported');
assert(fs.readFileSync(path.join(root, 'src/ads/web-display-ad.css'), 'utf8').includes('margin: 160px auto 0'), 'Game banner has space outside the controls');
let previewClosed = false;
react.useState = () => [previewClosed, value => { previewClosed = value; }];
const preview = load('src/ads/AnchorPreview.tsx', {});
const previewScriptsBefore = scripts.length;
window.location.search = '?previewAds=1';
effects = []; assert.equal(preview.default(), null, 'No layout preview on the real domain'); effects.forEach(effect => effect());
window.location.hostname = 'localhost'; effects = [];
const previewTree = preview.default(); assert.equal(previewTree.type, 'aside');
const previewCleanup = effects.map(effect => effect());
assert.equal(document.documentElement.dataset.bbAutoAnchors, 'true', 'Local preview reserves the same space');
previewTree.props.children[1].props.onClick();
previewCleanup.forEach(cleanup => cleanup?.());
effects = []; assert.equal(preview.default(), null, 'Preview can be dismissed'); effects.forEach(effect => effect());
assert.equal(document.documentElement.dataset.bbAutoAnchors, undefined);
assert.equal(scripts.length, previewScriptsBefore, 'Layout preview never loads Google or requests ads');
console.log('PASS: production/native/SSR gating, viewport checks, one loader, no refresh/StrictMode duplicates, no-fill/adblock cleanup, official bottom-anchor configuration and page exclusions.');
