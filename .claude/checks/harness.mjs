// Laadt Qvolve-libs (plain JS in een .jsx-bestand) in een vm-context met een
// nagebootste localStorage, zodat de logica in node te controleren is.
//
// Qvolve heeft geen testrunner — die komt in fase 2 en vervangt deze scripts.
// Tot dan zijn dit kale node-scripts zonder afhankelijkheden.
//
// Let op: alleen `function`-declaraties belanden als property op de context.
// Een `const fn = () => …` in een lib is vanuit een controlescript onzichtbaar.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Nabootsing van localStorage. `maxBytes` laat toe een vol quotum af te dwingen;
// echte browsers gooien dan een DOMException met naam QuotaExceededError.
export function makeLocalStorage({ maxBytes = Infinity } = {}) {
  const map = new Map();
  const size = () => [...map].reduce((n, [k, v]) => n + k.length + v.length, 0);
  return {
    get length() { return map.size; },
    key(i) { const ks = [...map.keys()]; return i < ks.length ? ks[i] : null; },
    getItem(k) { k = String(k); return map.has(k) ? map.get(k) : null; },
    setItem(k, v) {
      k = String(k); v = String(v);
      const oud = map.has(k) ? k.length + map.get(k).length : 0;
      if (size() - oud + k.length + v.length > maxBytes) {
        const e = new Error('opslag vol');
        e.name = 'QuotaExceededError';
        e.code = 22;
        throw e;
      }
      map.set(k, v);
    },
    removeItem(k) { map.delete(String(k)); },
    clear() { map.clear(); },
  };
}

// Waarden die uit de vm komen, hebben een ánder Object.prototype dan literals
// in het controlescript. node:assert/strict vergelijkt dat prototype mee, dus
// deepEqual op een vm-object faalt met "same structure but not reference-equal",
// hoe correct de code ook is. plain() haalt de waarde over naar deze realm.
export function plain(v) {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

export function loadLibs(files, { localStorage } = {}) {
  const ctx = {
    localStorage: localStorage || makeLocalStorage(),
    console,
    // utils.jsx destructureert React-hooks bij het laden; stubs volstaan.
    React: { useState: 0, useEffect: 0, useMemo: 0, useCallback: 0, useRef: 0 },
    navigator: {},
    document: { querySelector: () => null },
  };
  vm.createContext(ctx);
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}
