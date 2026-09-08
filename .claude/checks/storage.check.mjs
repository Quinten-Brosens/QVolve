import assert from 'node:assert/strict';
import { loadLibs, makeLocalStorage, plain } from './harness.mjs';

let ok = 0;
function check(naam, fn) {
  try { fn(); ok++; console.log('  ok    ' + naam); }
  catch (e) { console.error('  FOUT  ' + naam + '\n        ' + e.message); process.exitCode = 1; }
}

console.log('storage.jsx');

check('lsSet slaat op, lsGet leest terug', () => {
  const ctx = loadLibs(['js/lib/storage.jsx']);
  assert.equal(ctx.lsSet('a', { n: 1 }), true);
  assert.deepEqual(plain(ctx.lsGet('a')), { n: 1 });
});

check('lsGet geeft null voor een onbekende sleutel', () => {
  const ctx = loadLibs(['js/lib/storage.jsx']);
  assert.equal(ctx.lsGet('bestaat-niet'), null);
});

check('lsGet geeft null bij onleesbare JSON', () => {
  const ctx = loadLibs(['js/lib/storage.jsx']);
  ctx.localStorage.setItem('kapot', '{niet json');
  assert.equal(ctx.lsGet('kapot'), null);
});

check('lsDel verwijdert de sleutel', () => {
  const ctx = loadLibs(['js/lib/storage.jsx']);
  ctx.lsSet('a', 1); ctx.lsDel('a');
  assert.equal(ctx.lsGet('a'), null);
});

check('lsSet geeft false bij een vol quotum', () => {
  const ctx = loadLibs(['js/lib/storage.jsx'], { localStorage: makeLocalStorage({ maxBytes: 20 }) });
  assert.equal(ctx.lsSet('groot', 'x'.repeat(500)), false);
});

check('een vol quotum meldt de sleutel aan de luisteraars', () => {
  const ctx = loadLibs(['js/lib/storage.jsx'], { localStorage: makeLocalStorage({ maxBytes: 20 }) });
  const gezien = [];
  ctx.onStorageError(e => gezien.push(e.key));
  ctx.lsSet('daily-log:jan-jansen:2026-09-08', 'x'.repeat(500));
  assert.deepEqual(gezien, ['daily-log:jan-jansen:2026-09-08']);
});

check('een geslaagde schrijfactie meldt niets', () => {
  const ctx = loadLibs(['js/lib/storage.jsx']);
  let n = 0;
  ctx.onStorageError(() => { n++; });
  ctx.lsSet('a', 1);
  assert.equal(n, 0);
});

check('onStorageError geeft een werkende opzegfunctie terug', () => {
  const ctx = loadLibs(['js/lib/storage.jsx'], { localStorage: makeLocalStorage({ maxBytes: 20 }) });
  let n = 0;
  const stop = ctx.onStorageError(() => { n++; });
  stop();
  ctx.lsSet('a', 'x'.repeat(500));
  assert.equal(n, 0);
});

check('een luisteraar die zelf gooit, blokkeert de andere niet', () => {
  const ctx = loadLibs(['js/lib/storage.jsx'], { localStorage: makeLocalStorage({ maxBytes: 20 }) });
  let n = 0;
  ctx.onStorageError(() => { throw new Error('boem'); });
  ctx.onStorageError(() => { n++; });
  ctx.lsSet('a', 'x'.repeat(500));
  assert.equal(n, 1);
});

check('isQuotaError herkent de Chrome- en Firefox-variant', () => {
  const ctx = loadLibs(['js/lib/storage.jsx']);
  const chrome = new Error('vol'); chrome.name = 'QuotaExceededError';
  const firefox = new Error('vol'); firefox.name = 'NS_ERROR_DOM_QUOTA_REACHED';
  const oud = new Error('vol'); oud.code = 22;
  assert.equal(ctx.isQuotaError(chrome), true);
  assert.equal(ctx.isQuotaError(firefox), true);
  assert.equal(ctx.isQuotaError(oud), true);
  assert.equal(ctx.isQuotaError(new Error('iets anders')), false);
  assert.equal(ctx.isQuotaError(null), false);
});

check('een niet-quotafout meldt niets maar geeft wel false', () => {
  const kapot = makeLocalStorage();
  kapot.setItem = () => { throw new Error('security'); };
  const ctx = loadLibs(['js/lib/storage.jsx'], { localStorage: kapot });
  let n = 0;
  ctx.onStorageError(() => { n++; });
  assert.equal(ctx.lsSet('a', 1), false);
  assert.equal(n, 0);
});

check('storageUsageBytes telt sleutels en waarden in UTF-16', () => {
  const ctx = loadLibs(['js/lib/storage.jsx']);
  ctx.lsSet('ab', 1);   // sleutel 2 tekens + waarde "1" = 1 teken → 3 × 2 bytes
  assert.equal(ctx.storageUsageBytes(), 6);
});

check('formatBytes gebruikt Belgische komma en klimt netjes op', () => {
  const ctx = loadLibs(['js/lib/storage.jsx']);
  assert.equal(ctx.formatBytes(512), '512 B');
  assert.equal(ctx.formatBytes(2048), '2 kB');
  assert.equal(ctx.formatBytes(1024 * 1024 * 1.5), '1,5 MB');
});

console.log(`\n${ok} controles geslaagd`);
