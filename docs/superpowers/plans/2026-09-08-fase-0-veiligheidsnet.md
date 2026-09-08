# Fase 0 — Veiligheidsnet: implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een gebruiker kan al zijn Qvolve-gegevens als één JSON-bestand downloaden, en een volle
`localStorage` maakt de app niet meer stil onbruikbaar maar toont een begrijpelijke waarschuwing.

**Architecture:** `lsGet`/`lsSet`/`lsDel` verhuizen uit `js/lib/utils.jsx` naar een eigen module
`js/lib/storage.jsx`, die quota-fouten herkent en aan geabonneerde luisteraars meldt in plaats van ze
te slikken. Een tweede module `js/lib/backup.jsx` bouwt de export door `localStorage` te doorlopen en
elke sleutel te nemen die aan de ingelogde gebruiker toebehoort — niet door een vaste lijst sleutels
af te lopen, zodat later toegevoegde soorten data (bv. `meal-photos:`) automatisch meegaan. Een nieuwe
UI-module `js/modules/gegevens/index.jsx` bevat de exportkaart en de waarschuwingsbanner.

**Tech Stack:** ongewijzigd — React 18 + Tailwind via CDN, `.jsx` in de browser gecompileerd door
Babel-standalone, alle variabelen globaal, geen build-stap. Verificatie met `node` (V8, geen
afhankelijkheden) plus Playwright tegen de lokale dev-server.

**Spec:** `docs/superpowers/specs/2026-09-08-tech-stack-design.md` (fase 0, sectie 7)

## Global Constraints

Overgenomen uit de spec en uit `CLAUDE.md`. Elke taak valt hieronder.

- **Geen build-stap.** Geen bundler, geen npm-build, geen `package.json`, geen `import`/`export` in
  browser-code. Losse JS laad je via `<script>`-tags in `qvolve.html`.
- **Alles is globaal.** De laadvolgorde in `qvolve.html` bepaalt wat beschikbaar is; een module mag
  alleen globals gebruiken die eerder geladen zijn.
- **Nieuwe `js/**/*.jsx` moet een `<script>`-tag krijgen in `qvolve.html`,** anders wordt ze nooit
  geladen en faalt ze stil. De hook `.claude/hooks/check-jsx.js` meldt dit.
- **UI-taal is Nederlands** (Vlaams register, zoals de bestaande teksten).
- **Kleurenschema** (uit `CLAUDE.md`, ongewijzigd): donker navy `#182a48`, diepste achtergrond
  `#14223c`, randen `#2b3e60`, inputs `#24375a`, helder blauw `#2f8bff`, oranje `orange-500` /
  `#f97316`, content-achtergrond `gray-50`. Lettertype voor wordmark en nav: `.font-logo` (Rajdhani).
- **Gemini-model** blijft `gemini-2.5-flash` — deze fase raakt AI niet aan.
- **Elke fase eindigt met een werkende, gedeployde app.** Na elke taak moet `qvolve.html` nog laden
  zonder console-fouten.
- **`js/lib/storage.jsx` en `js/lib/backup.jsx` bevatten geen JSX en verwijzen niet naar `React`.**
  Ze moeten in een kale `node`-vm draaibaar blijven; dat is wat taak 1 en 2 test.
- **Publieke functies in die twee modules zijn `function`-declaraties,** geen `const fn = () => …`.
  Alleen `function`-declaraties komen als property op de vm-context terecht en zijn dus testbaar.
- **Vergelijk een object dat uit de vm komt nooit rechtstreeks met een literal.** De vm is een eigen
  realm met een eigen `Object.prototype`, en `node:assert/strict` vergelijkt dat prototype mee — een
  correcte implementatie faalt dan met "same structure but not reference-equal". Haal de waarde eerst
  door `plain()` uit `harness.mjs`. Primitieven (getallen, strings, booleans) en arrays die het
  controlescript zelf aanmaakt, hebben dat niet nodig.

## Uitgangssituatie en aannames

- **Vertrekpunt is `main` op commit `9d37a3a`,** waarin de AI-fotomodus gemerged zit (`js/lib/image.jsx`,
  `js/modules/fotomodus/index.jsx`, de key `meal-photos:{slug}:{datum}`). Dit plan is tegen die staat
  geijkt: 15 bestaande `<script type="text/babel">`-tags in `qvolve.html`, na dit plan 18.
- De export selecteert sleutels op eigenaarschap (`<soort>:<slug>[:…]`) in plaats van op een vaste
  lijst. Daardoor gaan de foto-miniaturen vanzelf mee, en ook wat er later nog bijkomt, zonder
  wijziging aan `backup.jsx`.
- **De foto-miniaturen zijn precies de reden dat fase 0 nu moet.** `meal-photos:` zet data-URLs van
  5–8 KB per foto in `localStorage`; bij drie maaltijden per dag zit het quotum van ~5 MB binnen een
  half jaar tot een jaar vol. Vanaf dat moment blokkeert een niet-opgevangen `QuotaExceededError`
  *alle* opslag, niet enkel foto's.
- Er is nog geen testrunner; die komt in fase 2. De controlescripts uit dit plan zijn kale
  `node`-scripts zonder afhankelijkheden in `.claude/checks/`. Fase 2 zet er een echte runner naast en
  neemt deze gevallen over; dit plan voegt géén `package.json` toe.
- De lokale dev-server start met
  `powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1` en bedient
  `http://localhost:8765/qvolve.html`. **Nooit via `file://` openen** — Babel haalt de `.jsx` via
  fetch op en dat blokkeert daar.
- Login overslaan bij browsertests (recept uit `.claude/skills/preview/SKILL.md`):
  ```js
  localStorage.setItem('qvolve-users-v2', JSON.stringify(
    [{ name: 'Quinten Brosens', password: 'Testpw123!', mustChangePw: false }]));
  localStorage.setItem('qvolve-session', JSON.stringify(
    { name: 'Quinten Brosens', ts: Date.now() }));
  ```
  Daarna herladen.

## File Structure

| Bestand | Status | Verantwoordelijkheid |
|---|---|---|
| `js/lib/storage.jsx` | **nieuw** | `lsGet`/`lsSet`/`lsDel`, quota-detectie, meldingen aan luisteraars, opslaggebruik |
| `js/lib/backup.jsx` | **nieuw** | Gegevens van één gebruiker verzamelen, exportobject bouwen, als bestand aanbieden |
| `js/modules/gegevens/index.jsx` | **nieuw** | `DataExportCard` en `StorageWarningBanner` |
| `js/lib/utils.jsx` | wijzigen | `lsGet`/`lsSet`/`lsDel` eruit (verhuizen naar `storage.jsx`) |
| `js/lib/icons.jsx` | wijzigen | Iconen `Download` en `AlertTriangle` toevoegen |
| `js/modules/boodschappenlijst/index.jsx` | wijzigen | Rechtstreekse `localStorage`-aanroepen via `lsGet`/`lsSet` |
| `js/app.jsx` | wijzigen | Banner en exportkaart plaatsen |
| `qvolve.html` | wijzigen | Drie `<script>`-tags op de juiste plek in de volgorde |
| `sw.js` | wijzigen | `CACHE` bumpen, nieuwe bestanden in `ASSETS` |
| `CLAUDE.md` | wijzigen | Bestandsstructuur, laadvolgorde, cachenaam |
| `.claude/checks/harness.mjs` | **nieuw** | Laadt Qvolve-libs in een vm met nagebootste `localStorage` |
| `.claude/checks/storage.check.mjs` | **nieuw** | Controles op `storage.jsx` |
| `.claude/checks/backup.check.mjs` | **nieuw** | Controles op `backup.jsx` |

### Nieuwe laadvolgorde in `qvolve.html`

```
1.  data/nevo-data.js          (plain JS, geen Babel)
2.  js/lib/storage.jsx         ← NIEUW (vóór utils: levert lsGet/lsSet/lsDel)
3.  js/lib/utils.jsx
4.  js/lib/backup.jsx          ← NIEUW (na utils: gebruikt toDateStr)
5.  js/lib/image.jsx
6.  js/lib/macros.jsx
7.  js/lib/ai.jsx
8.  js/lib/off.jsx
9.  js/lib/icons.jsx
10. js/modules/auth/index.jsx
11. js/modules/onboarding/index.jsx
12. js/modules/dashboard/index.jsx
13. js/modules/fotomodus/index.jsx
14. js/modules/voeding/index.jsx
15. js/modules/boodschappenlijst/index.jsx
16. js/modules/weekschema/index.jsx
17. js/modules/training/index.jsx
18. js/modules/gegevens/index.jsx  ← NIEUW (na training, vóór app.jsx)
19. js/app.jsx
```

Dat zijn na afloop **18** `<script type="text/babel">`-tags (nu 15).

---

## Task 1: Opslagmodule met quota-detectie

**Files:**
- Create: `.claude/checks/harness.mjs`
- Create: `.claude/checks/storage.check.mjs`
- Create: `js/lib/storage.jsx`
- Modify: `js/lib/utils.jsx` (regels 4–11 verwijderen)
- Modify: `js/modules/boodschappenlijst/index.jsx:170` en `:187`
- Modify: `js/app.jsx:96` (overbodige `try`/`catch` rond `lsSet`)
- Modify: `qvolve.html` (script-tag voor `js/lib/storage.jsx` vóór `utils.jsx`)

**Interfaces:**
- Consumes: niets uit eerdere taken.
- Produces (globals, beschikbaar vanaf script 2):
  - `lsGet(key: string) → any|null` — geparste waarde, `null` bij ontbreken of onleesbare JSON.
  - `lsSet(key: string, value: any) → boolean` — `true` bij succes, `false` bij mislukking.
  - `lsDel(key: string) → void`
  - `isQuotaError(e: any) → boolean`
  - `onStorageError(fn: ({key: string, at: number}) => void) → () => void` — geeft een opzegfunctie terug.
  - `storageUsageBytes() → number`
  - `formatBytes(n: number) → string` — bv. `"1,4 MB"`.

---

- [ ] **Step 1: Schrijf de vm-harnas voor de controlescripts**

Maak `.claude/checks/harness.mjs`:

```js
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
```

- [ ] **Step 2: Schrijf de falende controles voor `storage.jsx`**

Maak `.claude/checks/storage.check.mjs`:

```js
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
```

- [ ] **Step 3: Draai de controles en zie ze falen**

```bash
node .claude/checks/storage.check.mjs
```

Verwacht: elke regel `FOUT` met een melding in de trant van
`ENOENT: no such file or directory, open '…js/lib/storage.jsx'`, en exitcode 1.

- [ ] **Step 4: Schrijf `js/lib/storage.jsx`**

```jsx
// ─── lib/storage.jsx — localStorage met quota-bewaking ───────────────────────
//
// Vroeger stonden lsGet/lsSet/lsDel in utils.jsx en slikte lsSet elke fout.
// Een vol quotum blokkeerde daardoor stil álle opslag: de app leek te werken,
// maar niets werd nog bewaard. Hier geeft lsSet expliciet false terug en
// krijgen geabonneerde luisteraars een melding, zodat de UI het kan zeggen.
//
// Geen JSX en geen React in dit bestand: het moet in een kale node-vm
// draaibaar blijven (zie .claude/checks/harness.mjs).

function lsGet(key) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : null;
  } catch { return null; }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // Enkel een vol quotum is iets waar de gebruiker aan kan doen. Een
    // geblokkeerde opslag (privémodus, cookies uit) is niet te verhelpen met
    // opruimen, dus die melden we niet als "maak ruimte vrij".
    if (isQuotaError(e)) emitStorageError(key);
    return false;
  }
}

function lsDel(key) {
  try { localStorage.removeItem(key); } catch {}
}

// Elke browser noemt het anders; code 22 en 1014 zijn de oudere varianten.
function isQuotaError(e) {
  if (!e) return false;
  return e.name === 'QuotaExceededError'
      || e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      || e.code === 22
      || e.code === 1014;
}

const _storageErrorListeners = [];

// Abonneer op mislukte schrijfacties. Geeft een opzegfunctie terug, geschikt
// als cleanup van een useEffect.
function onStorageError(fn) {
  _storageErrorListeners.push(fn);
  return function () {
    const i = _storageErrorListeners.indexOf(fn);
    if (i >= 0) _storageErrorListeners.splice(i, 1);
  };
}

function emitStorageError(key) {
  const melding = { key, at: Date.now() };
  // Kopie: een luisteraar mag zich tijdens de melding uitschrijven.
  for (const fn of _storageErrorListeners.slice()) {
    try { fn(melding); } catch {}
  }
}

// Ruwe schatting van het opslaggebruik. Browsers rekenen in UTF-16, dus twee
// bytes per teken, sleutel inbegrepen.
function storageUsageBytes() {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k === null) continue;
      const v = localStorage.getItem(k) || '';
      total += (k.length + v.length) * 2;
    }
  } catch {}
  return total;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} kB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
```

- [ ] **Step 5: Draai de controles en zie ze slagen**

```bash
node .claude/checks/storage.check.mjs
```

Verwacht: dertien regels `ok`, slotregel `13 controles geslaagd`, exitcode 0.

- [ ] **Step 6: Haal de oude helpers uit `utils.jsx`**

Verwijder in `js/lib/utils.jsx` de regels 4 t/m 11 — het commentaar `// localStorage helpers` en de
drie functies `lsGet`, `lsSet`, `lsDel`. Laat `requestPersistentStorage` en al de rest staan.

Zo ziet de kop er daarna uit:

```jsx
// ─── lib/utils.jsx — datum, sessie, misc helpers ─────────────────────────────
// localStorage-helpers staan in lib/storage.jsx (eerder geladen).
const { useState, useEffect, useMemo, useCallback, useRef } = React;

// Vraag de browser om opslag niet zomaar te wissen.
function requestPersistentStorage() {
```

- [ ] **Step 7: Voeg de script-tag toe in `qvolve.html`**

Zet de nieuwe regel direct vóór die van `utils.jsx` (rond regel 51):

```html
<script type="text/babel" data-presets="react,env" src="js/lib/storage.jsx"></script>
<script type="text/babel" data-presets="react,env" src="js/lib/utils.jsx"></script>
```

- [ ] **Step 8: Laat de boodschappenlijst via de opslagmodule lopen**

In `js/modules/boodschappenlijst/index.jsx` staan de enige twee rechtstreekse `localStorage`-aanroepen
buiten de opslagmodule. Zonder deze wijziging blijft een vol quotum daar stil.

Vervang regel 170:

```jsx
  function loadState() { try { return JSON.parse(localStorage.getItem(storeKey)) || {}; } catch { return {}; } }
```

door:

```jsx
  function loadState() { return lsGet(storeKey) || {}; }
```

En vervang in de `useEffect` rond regel 187:

```jsx
    try { localStorage.setItem(storeKey, JSON.stringify({ checked: [...checked], extras, overrides, extraPerson })); } catch {}
```

door:

```jsx
    lsSet(storeKey, { checked: [...checked], extras, overrides, extraPerson });
```

- [ ] **Step 9: Ruim de nu overbodige `try`/`catch` in `app.jsx` op**

`addLogEntries` wikkelde de foto-schrijfactie in een `try`/`catch` omdat `lsSet` toen nog kon gooien.
Sinds stap 4 gooit ze nooit meer, dus die `catch` vangt niets en verbergt alleen de bedoeling.
Vervang in `js/app.jsx` (rond regel 92–98):

```jsx
    if (Object.keys(photos).length) {
      const key = `meal-photos:${userSlug}:${dateStr}`;
      // Een volle localStorage mag nooit een maaltijd kosten: het logboek is
      // hierboven al opgeslagen, de foto is bijzaak. lsSet meldt een vol
      // quotum zelf aan de banner en geeft hier gewoon false terug.
      lsSet(key, { ...(lsGet(key) || {}), ...photos });
      setMealPhotos(lsGet(key) || {});
    }
```

- [ ] **Step 10: Controleer dat er nergens anders nog rechtstreeks naar `localStorage` gegrepen wordt**

```bash
grep -rn "localStorage\." --include=*.jsx js/ | grep -v "js/lib/storage.jsx"
```

Verwacht: geen enkele regel.

- [ ] **Step 11: Controleer in de browser dat de app nog laadt**

Start de server op de achtergrond:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1
```

Navigeer met Playwright naar `http://localhost:8765/qvolve.html`, zet de sessie met het recept uit
"Uitgangssituatie" hierboven en herlaad. Lees de console.

Verwacht: het dashboard verschijnt; geen `X is not defined`, geen 404 op een `.jsx`, geen
"Fout bij laden". Waarschuwingen van de Tailwind-CDN en van Babel over in-browser compilatie zijn
verwacht en onschuldig.

Open daarna de boodschappenlijst, vink een item af, sluit de modal en open ze opnieuw: het vinkje moet
er nog staan (bewijst dat `lsGet`/`lsSet` de oude sleutel `shop-state:…` correct lezen en schrijven).

- [ ] **Step 12: Commit**

```bash
git add js/lib/storage.jsx js/lib/utils.jsx js/modules/boodschappenlijst/index.jsx js/app.jsx qvolve.html .claude/checks/
git commit -m "Opslag: eigen module met quota-detectie in plaats van stille fouten

lsGet/lsSet/lsDel verhuizen uit utils.jsx naar lib/storage.jsx. lsSet slikte
elke fout, waardoor een vol quotum stil alle opslag blokkeerde; ze geeft nu
false terug en meldt quota-fouten aan geabonneerde luisteraars.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuWUbZAwaAX794DyfRfyRP"
```

---

## Task 2: Exportmodule

**Files:**
- Create: `.claude/checks/backup.check.mjs`
- Create: `js/lib/backup.jsx`
- Modify: `qvolve.html` (script-tag ná `utils.jsx`)

**Interfaces:**
- Consumes: `lsSet` uit taak 1 (alleen in de controles), `toDateStr(d: Date) → "YYYY-MM-DD"` uit
  `js/lib/utils.jsx`.
- Produces (globals):
  - `keyBelongsToUser(key: string, slug: string) → boolean`
  - `collectUserData(slug: string) → Record<string, any>`
  - `buildExport(userName: string, slug: string, now?: Date) → {app, exportVersion, exportedAt, user:{name,slug}, data}`
  - `buildExportFilename(slug: string, now?: Date) → string`
  - `downloadJson(filename: string, obj: any) → void`
  - `exportUserData(userName: string, slug: string) → {ok: true, filename: string, keyCount: number} | {ok: false, error: string}`

---

- [ ] **Step 1: Schrijf de falende controles voor `backup.jsx`**

Maak `.claude/checks/backup.check.mjs`:

```js
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
```

> **Let op bij het implementeren:** de laatste twee controles vervangen `ctx.downloadJson`. Dat werkt
> alleen als `exportUserData` de functie via de globale naam aanroept (`downloadJson(...)`), wat bij
> een `function`-declaratie in dezelfde vm-context het geval is.

- [ ] **Step 2: Draai de controles en zie ze falen**

```bash
node .claude/checks/backup.check.mjs
```

Verwacht: elke regel `FOUT`, met `ENOENT … 'js/lib/backup.jsx'`, exitcode 1.

- [ ] **Step 3: Schrijf `js/lib/backup.jsx`**

```jsx
// ─── lib/backup.jsx — alle gegevens van één gebruiker als JSON-bestand ───────
//
// Fase 0 van het migratieplan: zolang alles in localStorage staat, is een
// export het enige veiligheidsnet dat er is. Safari wist site-opslag na een
// week inactiviteit; zonder back-up is dat definitief.
//
// De export loopt localStorage af en neemt elke sleutel die aan deze gebruiker
// toebehoort, in plaats van een vaste lijst sleutels. Nieuwe soorten data
// (bv. meal-photos: uit de fotomodus) gaan daardoor vanzelf mee.
//
// Geen JSX en geen React in dit bestand — zie .claude/checks/harness.mjs.

const EXPORT_VERSION = 1;

// Alle Qvolve-sleutels hebben de vorm <soort>:<slug>[:<extra>…]. Sleutels
// zonder slug (qvolve-users-v2, qvolve-session) horen niet bij één gebruiker:
// de eerste bevat wachtwoorden, de tweede is een sessie. Beide blijven buiten
// de export.
function keyBelongsToUser(key, slug) {
  const delen = String(key).split(':');
  return delen.length >= 2 && delen[1] === slug;
}

// Bewust niet lsGet: die geeft null bij onleesbare JSON en gooit de inhoud dus
// weg. In een back-up is ruwe tekst altijd beter dan niets.
function readForExport(key) {
  let raw = null;
  try { raw = localStorage.getItem(key); } catch { return null; }
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function collectUserData(slug) {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === null || !keyBelongsToUser(key, slug)) continue;
      data[key] = readForExport(key);
    }
  } catch {}
  return data;
}

function buildExport(userName, slug, now) {
  return {
    app: 'Qvolve',
    exportVersion: EXPORT_VERSION,
    exportedAt: (now || new Date()).toISOString(),
    user: { name: userName, slug },
    data: collectUserData(slug),
  };
}

function buildExportFilename(slug, now) {
  return `qvolve-export-${slug}-${toDateStr(now || new Date())}.json`;
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Niet meteen vrijgeven: Safari heeft de URL nog even nodig na de klik.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportUserData(userName, slug) {
  try {
    const payload = buildExport(userName, slug);
    const filename = buildExportFilename(slug);
    downloadJson(filename, payload);
    return { ok: true, filename, keyCount: Object.keys(payload.data).length };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) };
  }
}
```

- [ ] **Step 4: Draai de controles en zie ze slagen**

```bash
node .claude/checks/backup.check.mjs
```

Verwacht: twaalf regels `ok`, slotregel `12 controles geslaagd`, exitcode 0.

- [ ] **Step 5: Voeg de script-tag toe in `qvolve.html`**

Direct ná die van `utils.jsx`:

```html
<script type="text/babel" data-presets="react,env" src="js/lib/utils.jsx"></script>
<script type="text/babel" data-presets="react,env" src="js/lib/backup.jsx"></script>
```

- [ ] **Step 6: Draai beide controlescripts nog eens samen**

```bash
node .claude/checks/storage.check.mjs && node .claude/checks/backup.check.mjs
```

Verwacht: `13 controles geslaagd` en `12 controles geslaagd`, exitcode 0.

- [ ] **Step 7: Controleer in de browser dat de app nog laadt**

Ga naar `http://localhost:8765/qvolve.html` (server draait nog uit taak 1; anders opnieuw starten) en
lees de console. Verwacht: geen fouten, dashboard zichtbaar.

Voer daarna in de console uit:

```js
JSON.stringify(buildExport('Quinten Brosens', 'quinten-brosens')).length
```

Verwacht: een getal groter dan 100 — bewijs dat de module geladen is en de opslag ziet.

- [ ] **Step 8: Commit**

```bash
git add js/lib/backup.jsx qvolve.html .claude/checks/backup.check.mjs
git commit -m "Export: alle gegevens van een gebruiker als JSON-bestand

Loopt localStorage af en neemt elke sleutel met deze slug, zodat later
toegevoegde soorten data automatisch meegaan. De wachtwoordenlijst en de
sessie blijven er bewust buiten.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuWUbZAwaAX794DyfRfyRP"
```

---

## Task 3: Exportkaart in de app

**Files:**
- Modify: `js/lib/icons.jsx` (icoon `Download` toevoegen)
- Create: `js/modules/gegevens/index.jsx`
- Modify: `qvolve.html` (script-tag ná `training`, vóór `app.jsx`)
- Modify: `js/app.jsx` (kaart onderaan de voeding-tab)

**Interfaces:**
- Consumes: `exportUserData`, `storageUsageBytes`, `formatBytes` uit taak 1 en 2; `Icon` uit
  `js/lib/icons.jsx`; `useState` uit `js/lib/utils.jsx`.
- Produces: `DataExportCard({ userName, userSlug })` — React-component.

---

- [ ] **Step 1: Voeg het `Download`-icoon toe**

In `js/lib/icons.jsx`, binnen het `icons`-object (bv. na `Copy`), in dezelfde stijl als de rest:

```jsx
  Download:        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
```

- [ ] **Step 2: Schrijf `js/modules/gegevens/index.jsx` met de exportkaart**

```jsx
// ─── modules/gegevens — back-up en opslagbewaking ────────────────────────────
//
// Zolang alles in localStorage staat is dit het veiligheidsnet: één knop die
// alles wat van jou is als bestand meegeeft. Later (fase 4, AVG) komt hier ook
// de verwijderknop bij.

function DataExportCard({ userName, userSlug }) {
  const [msg, setMsg] = useState(null);      // { ok: boolean, text: string }
  const [usage, setUsage] = useState(() => storageUsageBytes());

  function handleExport() {
    const r = exportUserData(userName, userSlug);
    if (r.ok) setMsg({ ok: true, text: `${r.filename} gedownload — ${r.keyCount} onderdelen bewaard.` });
    else setMsg({ ok: false, text: `Export mislukt: ${r.error}` });
    setUsage(storageUsageBytes());
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Je gegevens</h2>
      <p className="text-xs text-gray-500 mb-3">
        Alles staat enkel op dit toestel. Maak geregeld een back-up: bij het wissen van
        je browsergegevens is de rest weg.
      </p>
      <button onClick={handleExport}
        className="w-full flex items-center justify-center gap-2 bg-[#2f8bff] hover:bg-[#1f77e8] active:scale-[0.99] text-white rounded-xl py-2.5 text-sm font-medium transition-transform">
        <Icon name="Download" size={16}/> Exporteer alles als bestand
      </button>
      {msg && (
        <p className={`text-xs mt-2 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>
          {msg.ok ? '✓ ' : ''}{msg.text}
        </p>
      )}
      <p className="text-[10px] text-gray-400 pt-2">
        Gebruikte opslag op dit toestel: {formatBytes(usage)}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Voeg de script-tag toe in `qvolve.html`**

Ná `training`, vóór `app.jsx`:

```html
<script type="text/babel" data-presets="react,env" src="js/modules/training/index.jsx"></script>
<script type="text/babel" data-presets="react,env" src="js/modules/gegevens/index.jsx"></script>
<script type="text/babel" data-presets="react,env" src="js/app.jsx"></script>
```

- [ ] **Step 4: Plaats de kaart in `js/app.jsx`**

In de voeding-tab, binnen het blok `{profile && !editingProfile && macros && (…)}`, tussen de
`<DailyLogList …/>` en de FAB-knop:

```jsx
                <DailyLogList log={log} onRemove={removeLogEntry} onOpenAdd={openAddOverlay} mealPhotos={mealPhotos}/>

                <DataExportCard userName={userName} userSlug={userSlug}/>

                {/* FAB — voeg toe aan dagboek */}
```

- [ ] **Step 5: Controleer in de browser dat de kaart werkt**

Ga naar `http://localhost:8765/qvolve.html`, log in via het sessie-recept, scrol naar onder in de
voeding-tab.

Verwacht:
- Een witte kaart "Je gegevens" met een blauwe knop "Exporteer alles als bestand".
- Onderaan een regel "Gebruikte opslag op dit toestel: … kB".
- Geen console-fouten.

Klik op de knop. Verwacht: een download `qvolve-export-quinten-brosens-<vandaag>.json` en de groene
regel `✓ … gedownload — N onderdelen bewaard.`

Controleer de inhoud van het bestand:

```bash
node -e "const j=require('$HOME/Downloads/qvolve-export-quinten-brosens-2026-09-08.json'); console.log(j.app, j.exportVersion, j.user.slug, Object.keys(j.data))"
```

(Pas het pad aan naar waar de browser het bestand neerzette.)

Verwacht: `Qvolve 1 quinten-brosens [ 'profile:quinten-brosens', 'macros:quinten-brosens', … ]` en
géén `qvolve-users-v2` of `qvolve-session` in die lijst.

- [ ] **Step 6: Commit**

```bash
git add js/lib/icons.jsx js/modules/gegevens/index.jsx qvolve.html js/app.jsx
git commit -m "Gegevens: exportkaart onderaan de voeding-tab

Een knop die alles van de ingelogde gebruiker als JSON downloadt, plus een
regel met het huidige opslaggebruik. Fase 4 hangt hier de verwijderknop bij.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuWUbZAwaAX794DyfRfyRP"
```

---

## Task 4: Waarschuwing bij volle opslag

**Files:**
- Modify: `js/lib/icons.jsx` (icoon `AlertTriangle` toevoegen)
- Modify: `js/modules/gegevens/index.jsx` (`StorageWarningBanner` erbij)
- Modify: `js/app.jsx` (banner bovenaan tonen)

**Interfaces:**
- Consumes: `onStorageError` uit taak 1, `exportUserData` uit taak 2, `Icon`, `useState`, `useEffect`.
- Produces: `StorageWarningBanner({ userName, userSlug })` — React-component; rendert `null` zolang er
  geen schrijffout was.

---

- [ ] **Step 1: Voeg het `AlertTriangle`-icoon toe**

In `js/lib/icons.jsx`, binnen het `icons`-object:

```jsx
  AlertTriangle:   <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
```

- [ ] **Step 2: Voeg `StorageWarningBanner` toe aan `js/modules/gegevens/index.jsx`**

Boven `DataExportCard`, zodat de banner het eerste is dat je in dat bestand leest:

```jsx
// De banner verschijnt zodra één schrijfactie op een vol quotum stuit. Dat is
// het moment waarop de app stil begon te liegen: het scherm toont de maaltijd,
// de opslag heeft ze niet. Daarom staat de exportknop meteen in de melding.
function StorageWarningBanner({ userName, userSlug }) {
  const [fout, setFout] = useState(null);

  useEffect(() => {
    // onStorageError geeft de opzegfunctie terug; die is meteen de cleanup.
    return onStorageError(setFout);
  }, []);

  if (!fout) return null;

  function handleExport() {
    const r = exportUserData(userName, userSlug);
    if (r.ok) setFout(null);
  }

  return (
    <div className="rounded-2xl border border-orange-300 bg-orange-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-orange-500 shrink-0 mt-0.5"><Icon name="AlertTriangle" size={18}/></span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-orange-900">
            Opslag vol — je laatste wijziging is niet bewaard
          </h3>
          <p className="text-xs text-orange-800 mt-1">
            Dit toestel heeft geen ruimte meer voor Qvolve. Exporteer nu je gegevens als
            back-up en maak daarna ruimte vrij, anders gaat verloren wat je hierna logt.
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium">
              <Icon name="Download" size={13}/> Exporteer nu
            </button>
            <button onClick={() => setFout(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-orange-800 border border-orange-300">
              Sluiten
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Toon de banner in `js/app.jsx`**

De banner hoort bovenaan de inhoud, boven de tab-inhoud, zodat ze zichtbaar is welke tab je ook open
hebt. Zet ze als eerste kind van `<main>`:

```jsx
      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24">

        <div className="mb-4 empty:mb-0">
          <StorageWarningBanner userName={userName} userSlug={userSlug}/>
        </div>

        {tab === 'voeding' && (
```

- [ ] **Step 4: Dwing een vol quotum af in de browser en zie de banner**

Ga naar `http://localhost:8765/qvolve.html` en log in via het sessie-recept.

Vul de opslag in de console:

```js
try { const groot = 'x'.repeat(512 * 1024);
      for (let i = 0; i < 40; i++) localStorage.setItem('__vul' + i, groot); }
catch (e) { console.log('opslag vol na', e.name); }
```

Verwacht: `opslag vol na QuotaExceededError`.

Log nu een maaltijd (FAB → tab *Zelf* → naam, kcal, opslaan → toevoegen), of forceer eenvoudiger een
schrijfactie via de kcal-aanpasser.

Verwacht: de oranje banner "Opslag vol — je laatste wijziging is niet bewaard" verschijnt bovenaan,
met de knoppen "Exporteer nu" en "Sluiten". De app blijft bruikbaar; er staat geen fout in de console.

Klik "Sluiten". Verwacht: de banner verdwijnt.

Ruim daarna op:

```js
Object.keys(localStorage).filter(k => k.startsWith('__vul')).forEach(k => localStorage.removeItem(k));
location.reload();
```

Verwacht na herladen: geen banner meer, de app werkt normaal.

- [ ] **Step 5: Controleer dat "Exporteer nu" de banner sluit**

Herhaal stap 4 tot de banner er staat, klik nu op "Exporteer nu" in plaats van "Sluiten".

Verwacht: het JSON-bestand wordt gedownload en de banner verdwijnt. Ruim daarna weer op met het
script uit stap 4.

- [ ] **Step 6: Draai beide controlescripts nog eens (regressie)**

```bash
node .claude/checks/storage.check.mjs && node .claude/checks/backup.check.mjs
```

Verwacht: `13 controles geslaagd` en `12 controles geslaagd`, exitcode 0.

- [ ] **Step 7: Commit**

```bash
git add js/lib/icons.jsx js/modules/gegevens/index.jsx js/app.jsx
git commit -m "Gegevens: waarschuwing wanneer de opslag vol zit

Een vol quotum blokkeerde stil alle schrijfacties: het scherm toonde de
maaltijd, de opslag had ze niet. Nu verschijnt bovenaan een banner met de
exportknop erin.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuWUbZAwaAX794DyfRfyRP"
```

---

## Task 5: Documentatie, service worker en deploy

**Files:**
- Modify: `sw.js` (`CACHE` naar `qvolve-v8`, nieuwe bestanden in `ASSETS`)
- Modify: `CLAUDE.md` (bestandsstructuur, laadvolgorde, cachenaam, controlescripts)

**Interfaces:**
- Consumes: alles uit taak 1 t/m 4.
- Produces: geen code-interface.

---

- [ ] **Step 1: Bump de service-workercache en neem de nieuwe bestanden op**

In `sw.js`: zet `const CACHE = 'qvolve-v7';` op `'qvolve-v8'`.

De `ASSETS`-lijst bevat enkel `/manifest.json`, `/icon-192.png` en `/icon-512.png` — geen `.jsx`.
Laat die lijst ongemoeid: de service worker herzien staat expliciet in fase 1. Enkel de cachenaam
verandert hier, zodat gebruikers de nieuwe code krijgen.

- [ ] **Step 2: Werk `CLAUDE.md` bij — bestandsstructuur**

Vul in de boomstructuur onder `js/lib/` aan, in laadvolgorde:

```
  lib/
    storage.jsx     — lsGet/lsSet/lsDel, isQuotaError, onStorageError,
                      storageUsageBytes, formatBytes
    utils.jsx       — datum-helpers, normalizeMealTime, groupByMeal, loadScript,
                      humanizeCamError, React destructuring
    backup.jsx      — keyBelongsToUser, collectUserData, buildExport,
                      buildExportFilename, downloadJson, exportUserData
```

En onder `js/modules/`:

```
    gegevens/
      index.jsx     — StorageWarningBanner, DataExportCard
```

- [ ] **Step 3: Werk `CLAUDE.md` bij — laadvolgorde**

Vervang de genummerde lijst "Laadvolgorde in qvolve.html" door de volgorde uit de sectie
*File Structure* van dit plan: 19 regels, met `storage.jsx` op 2, `backup.jsx` op 4 en
`gegevens/index.jsx` op 18. De bestaande regels voor `image.jsx` (nu 5) en `fotomodus/index.jsx`
(nu 13) blijven staan — enkel hun nummer schuift op.

- [ ] **Step 4: Werk `CLAUDE.md` bij — opslag en beperkingen**

Onder "Bekende beperkingen", vervang de cachenaam `qvolve-v7` door `qvolve-v8`, en vervang de eerste
opsomming door:

```markdown
- Omdat alles in `localStorage` zit, is data niet gedeeld tussen apparaten of
  gebruikers. Elk toestel staat op zichzelf. Een exportknop onderaan de
  voeding-tab geeft alles als JSON-bestand mee; loopt het browserquotum vol,
  dan verschijnt bovenaan een waarschuwing in plaats van een stille blokkade.
```

Voeg onder "localStorage-keys" toe, na de laatste regel:

```markdown
Alle sleutels hebben de vorm `<soort>:<slug>[:<extra>]`. De export in
`js/lib/backup.jsx` gebruikt precies die vorm om te bepalen wat van wie is;
een nieuwe sleutel die dat patroon volgt, gaat automatisch mee in de back-up.
`qvolve-users-v2` en `qvolve-session` volgen het patroon bewust niet en blijven
buiten de export.
```

- [ ] **Step 5: Werk `CLAUDE.md` bij — controlescripts**

Onder `### Claude Code-hulpmiddelen (.claude/)`, na het punt over `hooks/check-jsx.js`:

```markdown
- `checks/` — kale node-controles zonder afhankelijkheden, voor de logica die
  niet in de browser hoeft: `node .claude/checks/storage.check.mjs` en
  `node .claude/checks/backup.check.mjs`. `harness.mjs` laadt een lib in een
  vm-context met een nagebootste `localStorage`. Fase 2 zet hier een echte
  testrunner naast en neemt deze gevallen over.
```

- [ ] **Step 6: Draai alles nog eens en laad de app**

```bash
node .claude/checks/storage.check.mjs && node .claude/checks/backup.check.mjs
grep -rn "localStorage\." --include=*.jsx js/ | grep -v "js/lib/storage.jsx"
grep -c "text/babel" qvolve.html
```

Verwacht: `13 controles geslaagd`, `12 controles geslaagd`, geen enkele grep-treffer op `localStorage.`,
en `18` script-tags met `text/babel`.

Laad `http://localhost:8765/qvolve.html` en klik alle drie de tabs door (Voeding, Weekplan, Training).
Verwacht: geen console-fouten, exportkaart zichtbaar onderaan Voeding.

- [ ] **Step 7: Commit**

```bash
git add sw.js CLAUDE.md
git commit -m "Fase 0 afgerond: documentatie bijgewerkt, cache naar qvolve-v8

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuWUbZAwaAX794DyfRfyRP"
```

**Niet pushen en niet mergen.** Dit werk staat op de branch `worktree-fase-0-veiligheidsnet`. Pushen
naar `main` deployt meteen naar Vercel; die stap hoort bij het afsluiten van de branch en is een
beslissing van de eigenaar, niet van een implementer.

---

## Klaar-criteria (uit de spec)

- [ ] **De export levert een volledig bestand op.** Alle sleutels met de slug van de ingelogde
  gebruiker zitten erin, geparseerd; de wachtwoordenlijst en de sessie niet.
- [ ] **Een vol quotum maakt de app niet meer onbruikbaar.** `lsSet` geeft `false` terug in plaats van
  te zwijgen, en de gebruiker krijgt een Nederlandstalige banner met een uitweg te zien.
- [ ] De app laadt zonder console-fouten en is gedeployd op Vercel.

## Wat dit plan bewust niet doet

- **Importeren van een exportbestand.** Fase 4 doet de migratie naar Supabase; een importknop bouwen
  die drie maanden later overbodig is, is verspilde moeite. Het bestand is leesbare JSON — in nood
  volstaat de console.
- **Data snoeien wanneer de opslag vol zit** (bv. oude foto's weggooien). Dat is een keuze over
  gebruikersdata die het waard is apart besproken te worden, en fase 4 haalt de foto's sowieso uit
  `localStorage`.
- **Een echte testrunner.** Dat is fase 2. De scripts in `.claude/checks/` zijn de kleinst mogelijke
  invulling tot dan.
- **De service worker herzien.** Staat expliciet in fase 1.
