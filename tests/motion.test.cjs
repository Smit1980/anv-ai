const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/sculpture.js'), 'utf8');

function mount({ reduced = false, mobile = false, supported = true } = {}) {
  let draws = 0;
  let next = 1;
  const frames = new Map();
  const events = {};
  const attrs = {};
  const context = new Proxy({
    clearRect: () => draws++,
    createRadialGradient: () => ({ addColorStop() {} })
  }, { get: (target, key) => target[key] || (() => {}) });
  const shell = { getBoundingClientRect: () => ({ width: 560, height: 560 }), classList: { add() {} } };
  const toggle = { hidden: false, setAttribute: (key, value) => { attrs[key] = value; }, addEventListener: (_, fn) => { events.toggle = fn; } };
  const canvas = { closest: () => shell, getContext: () => supported ? context : null, style: {} };
  const queries = [{ matches: reduced }, { matches: mobile }];
  queries.forEach(q => { q.addEventListener = (_, fn) => { q.change = fn; }; });
  const document = { hidden: false, getElementById: id => id === 'sculpture' ? canvas : toggle, addEventListener: (event, fn) => { events[event] = fn; } };
  const window = { devicePixelRatio: 2, matchMedia: q => q.includes('reduced-motion') ? queries[0] : queries[1], requestAnimationFrame: fn => { const id = next++; frames.set(id, fn); return id; } };
  vm.runInNewContext(source, { window, document, IntersectionObserver: class { constructor(fn) { events.visibility = fn; } observe() {} }, ResizeObserver: class { constructor(fn) { events.resize = fn; } observe() {} } });
  const tick = time => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(time)); };
  return { get draws() { return draws; }, frames, events, attrs, toggle, document, queries, tick };
}

test('desktop animates; pause and resume update state', () => {
  const app = mount();
  app.tick(100); const initial = app.draws; app.tick(150);
  assert.ok(app.draws > initial);
  app.events.toggle(); app.tick(200); const paused = app.draws; app.tick(400);
  assert.equal(app.draws, paused); assert.equal(app.attrs['aria-pressed'], 'true');
  app.events.toggle(); app.tick(450); assert.ok(app.draws > paused);
});
test('reduced motion and mobile are static; resize retains visible frame', () => {
  for (const settings of [{ reduced: true }, { mobile: true }]) {
    const app = mount(settings); const initial = app.draws;
    app.tick(100); assert.equal(app.draws, initial); assert.equal(app.frames.size, 0);
    assert.equal(app.toggle.hidden, true);
    app.events.resize(); assert.ok(app.draws > initial);
  }
});
test('offscreen and hidden documents stop animation, visibility resumes it', () => {
  const app = mount(); app.tick(100);
  app.events.visibility([{ isIntersecting: false }]); app.tick(150);
  const stopped = app.draws; app.tick(200); assert.equal(app.draws, stopped);
  app.events.visibility([{ isIntersecting: true }]); app.tick(250); assert.ok(app.draws > stopped);
  app.document.hidden = true; app.events.visibilitychange(); app.tick(300);
  assert.equal(app.frames.size, 0);
  app.document.hidden = false; app.events.visibilitychange(); assert.equal(app.frames.size, 1);
});
test('mobile-to-desktop resumes unless user explicitly paused', () => {
  const app = mount({ mobile: true }); app.queries[1].matches = false; app.queries[1].change();
  assert.equal(app.frames.size, 1); assert.equal(app.toggle.hidden, false);
  app.events.toggle(); app.tick(100);
  app.queries[1].matches = true; app.queries[1].change();
  app.queries[1].matches = false; app.queries[1].change();
  assert.equal(app.attrs['aria-pressed'], 'true'); assert.equal(app.frames.size, 0);
});
test('unsupported canvas leaves the static fallback and hides motion control', () => {
  const app = mount({ supported: false }); assert.equal(app.draws, 0); assert.equal(app.toggle.hidden, true);
});
