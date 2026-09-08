import assert from 'node:assert/strict';
import { loadLibs, plain } from './harness.mjs';

const LIBS = ['js/lib/storage.jsx', 'js/lib/utils.jsx', 'js/lib/backup.jsx'];

let ok = 0;
function check(naam, fn) {
  try { fn(); ok++; console.log('  ok    ' + naam); }
  catch (e) { console.error('  FOUT  ' + naam + '\n        ' + e.message); process.exitCode = 1; }
}

// Opslag zoals ze er bij een echte gebruiker uitziet, inclusief een tweede
// gebruiker en de sleutels die níét geëxporteerd mogen worden.
function gevuldeOpslag() {
  const ctx = loadLibs(LIBS);
  ctx.lsSet('profile:jan-jansen', { weight: 80, height: 182 });
  ctx.lsSet('macros:jan-jansen', { targetKcal: 2200 });
  ctx.lsSet('daily-log:jan-jansen:2026-09-08', [{ name: 'Havermout', kcal: 350 }]);
  ctx.lsSet('custom-foods:jan-jansen', [{ id: 'c1', name: 'Eigen shake' }]);
  ctx.lsSet('weekschema-prefs:jan-jansen', { budget: 'normaal' });
  ctx.lsSet('weekschema-plan:jan-jansen', { days: [] });
  ctx.lsSet('shop-state:jan-jansen:2026-09-08:2026-09-14', { checked: ['melk'] });
  // Miniaturen uit de fotomodus: de dikste post in de opslag, en dus precies
  // wat een back-up moet redden.
  ctx.lsSet('meal-photos:jan-jansen:2026-09-08', { p1: 'data:image/jpeg;base64,AAA' });
  ctx.lsSet('profile:an-peeters', { weight: 60 });
  ctx.lsSet('qvolve-users-v2', [{ name: 'Jan Jansen', password: 'geheim' }]);
  ctx.lsSet('qvolve-session', { name: 'Jan Jansen', ts: 1 });
  return ctx;
}

console.log('backup.jsx');

check('keyBelongsToUser kijkt naar het tweede segment', () => {
  const ctx = loadLibs(LIBS);
  assert.equal(ctx.keyBelongsToUser('profile:jan-jansen', 'jan-jansen'), true);
  assert.equal(ctx.keyBelongsToUser('shop-state:jan-jansen:2026-09-08:2026-09-14', 'jan-jansen'), true);
  assert.equal(ctx.keyBelongsToUser('profile:an-peeters', 'jan-jansen'), false);
  assert.equal(ctx.keyBelongsToUser('qvolve-users-v2', 'jan-jansen'), false);
  assert.equal(ctx.keyBelongsToUser('qvolve-session', 'jan-jansen'), false);
});

check('de export bevat alle acht sleutels van deze gebruiker', () => {
  const data = gevuldeOpslag().collectUserData('jan-jansen');
  assert.deepEqual(Object.keys(data).sort(), [
    'custom-foods:jan-jansen',
    'daily-log:jan-jansen:2026-09-08',
    'macros:jan-jansen',
    'meal-photos:jan-jansen:2026-09-08',
    'profile:jan-jansen',
    'shop-state:jan-jansen:2026-09-08:2026-09-14',
    'weekschema-plan:jan-jansen',
    'weekschema-prefs:jan-jansen',
  ]);
});

check('de export laat data van een andere gebruiker staan', () => {
  const data = gevuldeOpslag().collectUserData('jan-jansen');
  assert.equal('profile:an-peeters' in data, false);
});

check('de export bevat geen wachtwoordenlijst en geen sessie', () => {
  const data = gevuldeOpslag().collectUserData('jan-jansen');
  assert.equal('qvolve-users-v2' in data, false);
  assert.equal('qvolve-session' in data, false);
});

check('waarden komen geparseerd mee, niet als tekst', () => {
  const data = gevuldeOpslag().collectUserData('jan-jansen');
  assert.deepEqual(plain(data['daily-log:jan-jansen:2026-09-08']), [{ name: 'Havermout', kcal: 350 }]);
});

check('onleesbare JSON gaat als ruwe tekst mee in plaats van verloren', () => {
  const ctx = loadLibs(LIBS);
  ctx.localStorage.setItem('profile:jan-jansen', '{kapot');
  const data = ctx.collectUserData('jan-jansen');
  assert.equal(data['profile:jan-jansen'], '{kapot');
});

check('buildExport zet app, versie, tijdstip en gebruiker in de kop', () => {
  const p = gevuldeOpslag().buildExport('Jan Jansen', 'jan-jansen', new Date('2026-09-08T10:00:00Z'));
  assert.equal(p.app, 'Qvolve');
  assert.equal(p.exportVersion, 1);
  assert.equal(p.exportedAt, '2026-09-08T10:00:00.000Z');
  assert.deepEqual(plain(p.user), { name: 'Jan Jansen', slug: 'jan-jansen' });
  assert.equal(Object.keys(p.data).length, 8);
});

check('de export overleeft JSON.stringify zonder verlies', () => {
  const p = gevuldeOpslag().buildExport('Jan Jansen', 'jan-jansen', new Date('2026-09-08T10:00:00Z'));
  const heen = JSON.parse(JSON.stringify(p));   // precies wat downloadJson wegschrijft
  assert.equal(heen.user.slug, 'jan-jansen');
  assert.equal(Object.keys(heen.data).length, 8);
  assert.deepEqual(heen.data['daily-log:jan-jansen:2026-09-08'], [{ name: 'Havermout', kcal: 350 }]);
  assert.deepEqual(heen.data['meal-photos:jan-jansen:2026-09-08'], { p1: 'data:image/jpeg;base64,AAA' });
});

check('de bestandsnaam draagt slug en datum', () => {
  const ctx = loadLibs(LIBS);
  assert.equal(ctx.buildExportFilename('jan-jansen', new Date(2026, 8, 8)),
    'qvolve-export-jan-jansen-2026-09-08.json');
});

check('een gebruiker zonder data levert een lege maar geldige export', () => {
  const ctx = loadLibs(LIBS);
  const p = ctx.buildExport('Nieuw', 'nieuw', new Date('2026-09-08T10:00:00Z'));
  assert.deepEqual(plain(p.data), {});
  assert.equal(p.exportVersion, 1);
});

check('exportUserData meldt de bestandsnaam en het aantal onderdelen', () => {
  const ctx = gevuldeOpslag();
  const gedownload = [];
  // downloadJson heeft een DOM nodig; hier vervangen we ze door een opnemer.
  ctx.downloadJson = (naam, obj) => gedownload.push([naam, obj]);
  const r = ctx.exportUserData('Jan Jansen', 'jan-jansen');
  assert.equal(r.ok, true);
  assert.equal(r.keyCount, 8);
  assert.match(r.filename, /^qvolve-export-jan-jansen-\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(gedownload.length, 1);
  assert.equal(gedownload[0][0], r.filename);
});

check('exportUserData geeft een leesbare fout terug in plaats van te crashen', () => {
  const ctx = gevuldeOpslag();
  ctx.downloadJson = () => { throw new Error('geen schrijfrechten'); };
  const r = ctx.exportUserData('Jan Jansen', 'jan-jansen');
  assert.equal(r.ok, false);
  assert.equal(r.error, 'geen schrijfrechten');
});

console.log(`\n${ok} controles geslaagd`);
