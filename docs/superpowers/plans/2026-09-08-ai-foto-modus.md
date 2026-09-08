# AI foto-modus — implementatieplan

> **Voor agentische uitvoerders:** VEREISTE SUB-SKILL: gebruik
> `superpowers:subagent-driven-development` (aanbevolen) of
> `superpowers:executing-plans` om dit plan taak per taak uit te voeren.
> Stappen gebruiken checkbox-syntax (`- [ ]`) voor het bijhouden.

**Doel:** Een maaltijd loggen door er een foto van te maken: Gemini herkent de
losse gerechten, de gebruiker corrigeert de grammen, alles gaat in één keer het
dagboek in.

**Architectuur:** Een vijfde tab in de bestaande `AddFoodOverlay` rendert een
nieuwe module `PhotoTab`. De foto wordt in de browser verkleind, als base64 via
de bestaande `/api/gemini`-proxy naar Gemini gestuurd, en het JSON-antwoord
(macro's per 100 g + geschat gewicht) wordt lokaal doorgerekend tot logregels.
Een thumbnail gaat apart naar localStorage.

**Tech stack:** React 18 + Babel-standalone via CDN (géén build-stap), Tailwind
via CDN, Vercel serverless (Node) voor de proxy, Gemini `gemini-2.5-flash`.

**Spec:** `docs/superpowers/specs/2026-09-08-ai-foto-modus-design.md`

## Globale randvoorwaarden

Deze gelden voor élke taak hieronder:

- **Geen build-stap.** Geen bundler, geen npm-build, geen `import`/`export` in
  browser-scripts. Nieuwe JS laad je met een `<script>`-tag in `qvolve.html`.
- **Alles is globaal.** Modules mogen alleen globals gebruiken die eerder in
  `qvolve.html` geladen zijn. Nieuwe `.jsx` moet in de laadvolgorde staan; de
  hook `.claude/hooks/check-jsx.js` klaagt anders.
- **UI is Nederlandstalig.** Ook foutmeldingen.
- **Kleuren:** navy `#182a48` / `#14223c`, randen `#2b3e60`, invoervlakken
  `#24375a`, blauw `#2f8bff` (AI/scan), oranje `orange-500` (primaire CTA).
  Macro-kleuren in lijsten: kcal oranje, `E` `#2f8bff`, `KH` `#1e3a8a`, `V`
  `#f59e0b`.
- **Gemini-model:** `gemini-2.5-flash`, auth via de header `x-goog-api-key`.
  Nooit `gemini-1.5-flash`, nooit `?key=` in de URL.
- **Branch:** alle commits op `feature/ai-foto-modus`.

## Over testen in dit project

Qvolve heeft **geen testrunner en geen npm-setup** — dat is een bewuste keuze
(zie `CLAUDE.md`). Klassieke TDD met een watcher bestaat hier niet. In de plaats
daarvan heeft elke taak een concrete, uitvoerbare verificatie:

- **`api/gemini.js`** is gewone Node en wordt getest met een `node`-script dat
  `global.fetch` vervangt door een stub. Dat script leeft in de scratchpad, niet
  in de repo — we voeren geen testinfrastructuur in die het project niet heeft.
- **`js/lib/*.jsx`** wordt geverifieerd in de draaiende app: de dev-server
  starten en de functie aanroepen in de browserconsole. Alle globals zijn daar
  bereikbaar.
- **UI** wordt geverifieerd met de `/preview`-doorloop: laden zonder
  console-fouten, screenshot op 390×844, en het gewijzigde onderdeel doorklikken.

De dev-server draait met:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1
```

en serveert `http://localhost:8765/qvolve.html`. Hij kent **geen** serverless
functies: `/api/gemini` geeft daar 501. De echte AI-call test je pas in Taak 7.

---

### Taak 1: Proxy laat een afbeelding door

**Bestanden:**
- Wijzigen: `api/gemini.js:38-58`
- Test: `<scratchpad>/test-gemini-image.js` (niet committen)

**Interfaces:**
- Levert: het request-contract `{ prompt, maxTokens, thinkingBudget, image? }`
  waarbij `image = { mimeType: 'image/jpeg'|'image/png'|'image/webp', data: <base64 zonder data:-prefix> }`.
  Taak 3 stuurt dit; zonder `image` blijft het gedrag exact zoals nu.

- [ ] **Stap 1: Schrijf het testscript**

Maak `test-gemini-image.js` in de scratchpad-map van de sessie:

```js
// Smoke-test voor api/gemini.js — vervangt fetch door een stub en kijkt
// welke body de proxy naar Google zou sturen.
const path = require('path');
const handler = require(path.resolve('api/gemini.js'));

process.env.GEMINI_API_KEY = 'test-key';

let sent = null;
global.fetch = async (url, opts) => {
  sent = { url, opts };
  return { status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }) };
};

function fakeRes() {
  const res = { code: null, body: null };
  res.status = c => { res.code = c; return res; };
  res.json = b => { res.body = b; return res; };
  return res;
}

async function run(name, body, check) {
  sent = null;
  const res = fakeRes();
  await handler({ method: 'POST', headers: {}, body }, res);
  try { check(res, sent); console.log('PASS  ' + name); }
  catch (e) { console.log('FAIL  ' + name + ' — ' + e.message); process.exitCode = 1; }
}

const assert = require('assert');
const IMG = 'AAAA';

(async () => {
  await run('tekst-only blijft ongewijzigd', { prompt: 'hallo' }, (res, sent) => {
    const parts = JSON.parse(sent.opts.body).contents[0].parts;
    assert.strictEqual(parts.length, 1, 'verwacht 1 part, kreeg ' + parts.length);
    assert.strictEqual(parts[0].text, 'hallo');
  });

  await run('beeld komt vóór de tekst', { prompt: 'wat is dit?', image: { mimeType: 'image/jpeg', data: IMG } }, (res, sent) => {
    const parts = JSON.parse(sent.opts.body).contents[0].parts;
    assert.strictEqual(parts.length, 2, 'verwacht 2 parts, kreeg ' + parts.length);
    assert.deepStrictEqual(parts[0].inlineData, { mimeType: 'image/jpeg', data: IMG });
    assert.strictEqual(parts[1].text, 'wat is dit?');
  });

  await run('verkeerd mimetype wordt geweigerd', { prompt: 'x', image: { mimeType: 'application/pdf', data: IMG } }, (res, sent) => {
    assert.strictEqual(res.code, 400, 'verwacht 400, kreeg ' + res.code);
    assert.strictEqual(sent, null, 'er mocht geen call naar Google gaan');
  });

  await run('te groot beeld geeft 413', { prompt: 'x', image: { mimeType: 'image/jpeg', data: 'a'.repeat(3500001) } }, (res, sent) => {
    assert.strictEqual(res.code, 413, 'verwacht 413, kreeg ' + res.code);
    assert.strictEqual(sent, null, 'er mocht geen call naar Google gaan');
  });
})();
```

- [ ] **Stap 2: Draai de test en zie hem falen**

```bash
node "<scratchpad>/test-gemini-image.js"
```

Verwacht: `PASS` voor "tekst-only", en `FAIL` voor de drie beeld-tests (de proxy
negeert `image` nog, dus er komt maar 1 part en de validatie bestaat niet).

- [ ] **Stap 3: Bouw het beeld-pad in de proxy**

Zet boven in `api/gemini.js`, onder `const GEMINI_MODEL`:

```js
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// ~3,5 MB base64 ≈ 2,6 MB beeld. Vercel kapt requests boven ~4,5 MB af;
// deze grens geeft een nette fout in plaats van een afgebroken verbinding.
const MAX_IMAGE_CHARS = 3_500_000;
```

Vervang in de `try`-blok de destructurering en de body-opbouw door:

```js
    const { prompt, maxTokens, thinkingBudget, image } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Geen geldige prompt.' });
      return;
    }

    // Eén afbeelding is optioneel. Staat ze er, dan gaat ze vóór de tekst:
    // dat is wat Google aanraadt bij een enkel beeld.
    const parts = [];
    if (image) {
      if (typeof image.data !== 'string' || !ALLOWED_IMAGE_TYPES.includes(image.mimeType)) {
        res.status(400).json({ error: 'Ongeldige afbeelding meegestuurd.' });
        return;
      }
      if (image.data.length > MAX_IMAGE_CHARS) {
        res.status(413).json({ error: 'De foto is te groot. Probeer een kleinere foto.' });
        return;
      }
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    }
    parts.push({ text: prompt });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const body = JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        maxOutputTokens: maxTokens || 1200,
        thinkingConfig: { thinkingBudget: typeof thinkingBudget === 'number' ? thinkingBudget : 0 },
        responseMimeType: 'application/json',
      },
    });
```

De bestaande commentaarblokken bij `thinkingConfig` en `responseMimeType`
blijven staan. De 503-retry eronder verandert niet.

- [ ] **Stap 4: Draai de test opnieuw**

```bash
node "<scratchpad>/test-gemini-image.js"
```

Verwacht: vier keer `PASS`, exitcode 0.

- [ ] **Stap 5: Commit**

```bash
git add api/gemini.js
git commit -m "Proxy: laat optioneel een afbeelding mee naar Gemini"
```

---

### Taak 2: Foto verkleinen in de browser

**Bestanden:**
- Aanmaken: `js/lib/image.jsx`
- Wijzigen: `qvolve.html:51` (script-tag erbij)

**Interfaces:**
- Levert: `prepareMealPhoto(file) → Promise<{ base64, mimeType, thumb }>`.
  `base64` is een JPEG van max 1024 px zonder `data:`-prefix, `mimeType` is
  altijd `'image/jpeg'`, `thumb` is een volledige data-URL van max 160 px.
  Gooit een `Error` met Nederlandstalige tekst bij een onleesbaar bestand.
  Taak 3 en Taak 5 gebruiken dit.

- [ ] **Stap 1: Maak `js/lib/image.jsx`**

```jsx
// ─── lib/image.jsx — maaltijdfoto klaarmaken voor de AI ──────────────────────
// Een telefoonfoto is al snel 4 MB. Die ongemoeid doorsturen is traag, duur in
// tokens en loopt tegen de requestlimiet van Vercel aan. We verkleinen daarom
// in de browser, en maken meteen een miniatuur voor het dagboek.

const PHOTO_MAX_DIM = 1024;   // Gemini rekent per tegel van 768px; groter helpt niet
const PHOTO_QUALITY = 0.72;
const THUMB_MAX_DIM = 160;
const THUMB_QUALITY = 0.6;

function drawToCanvas(src, maxDim) {
  const scale = Math.min(1, maxDim / Math.max(src.width, src.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(src.width * scale));
  canvas.height = Math.max(1, Math.round(src.height * scale));
  canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// createImageBitmap draait de foto rechtop volgens de EXIF-oriëntatie. Zonder
// dat komt een staande telefoonfoto gekanteld bij de AI aan. Browsers die de
// optie niet kennen vallen terug op een gewone <img>.
async function decodeImageFile(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { /* val terug op <img> */ }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Deze foto kon niet gelezen worden.')); };
    img.src = url;
  });
}

async function prepareMealPhoto(file) {
  if (!file || !/^image\//.test(file.type || '')) throw new Error('Kies een afbeelding.');
  const src = await decodeImageFile(file);
  const full = drawToCanvas(src, PHOTO_MAX_DIM);
  const thumb = drawToCanvas(src, THUMB_MAX_DIM);
  if (src.close) src.close();
  const dataUrl = full.toDataURL('image/jpeg', PHOTO_QUALITY);
  return {
    base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mimeType: 'image/jpeg',
    thumb: thumb.toDataURL('image/jpeg', THUMB_QUALITY),
  };
}
```

- [ ] **Stap 2: Zet de script-tag in `qvolve.html`**

Direct ná de regel met `js/lib/utils.jsx` en vóór `js/lib/macros.jsx`:

```html
<script type="text/babel" data-presets="react,env" src="js/lib/image.jsx"></script>
```

- [ ] **Stap 3: Start de dev-server en laad de app**

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1
```

Open `http://localhost:8765/qvolve.html`. Verwacht: geen console-fouten, en
`200 /js/lib/image.jsx` in het serverlog.

- [ ] **Stap 4: Verifieer de functie in de browserconsole**

Voer uit in de console van de geladen pagina (maakt een testafbeelding van
2000×1000 en controleert het resultaat):

```js
(async () => {
  const c = document.createElement('canvas');
  c.width = 2000; c.height = 1000;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c00'; ctx.fillRect(0, 0, 2000, 1000);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
  const file = new File([blob], 'test.jpg', { type: 'image/jpeg' });

  const out = await prepareMealPhoto(file);
  const img = new Image();
  await new Promise(r => { img.onload = r; img.src = 'data:image/jpeg;base64,' + out.base64; });
  const th = new Image();
  await new Promise(r => { th.onload = r; th.src = out.thumb; });

  console.log('breedte groot :', img.width, '(verwacht 1024)');
  console.log('breedte thumb :', th.width, '(verwacht 160)');
  console.log('mimeType      :', out.mimeType, '(verwacht image/jpeg)');
  console.log('base64 prefix :', out.base64.slice(0, 5), '(mag NIET met "data:" beginnen)');
  console.log('thumb kB      :', Math.round(out.thumb.length / 1024));
})();
```

Verwacht: breedte 1024 en 160, `image/jpeg`, base64 zonder `data:`-prefix, en
een thumbnail onder de 12 kB.

- [ ] **Stap 5: Verifieer de foutmelding**

```js
prepareMealPhoto(new File(['x'], 'a.txt', { type: 'text/plain' }))
  .catch(e => console.log('foutmelding:', e.message));
```

Verwacht: `foutmelding: Kies een afbeelding.`

- [ ] **Stap 6: Commit**

```bash
git add js/lib/image.jsx qvolve.html
git commit -m "Lib: foto verkleinen en miniatuur maken voor de AI-fotomodus"
```

---

### Taak 3: AI-laag stuurt de foto en leest de items

**Bestanden:**
- Wijzigen: `js/lib/ai.jsx:4-12` (signatuur + body), einde bestand (nieuwe functie)

**Interfaces:**
- Gebruikt: het request-contract uit Taak 1.
- Levert:
  - `callGemini(prompt, maxTokens = 1200, thinkingBudget = 0, image = null)` —
    het vierde argument is nieuw; alle bestaande aanroepen blijven werken.
  - `analyzeMealPhotoWithAI(image) → Promise<{ items, note }>` waarbij elk item
    `{ name: string, grams: number, kcal: number, protein: number, fat: number, carbs: number }`
    is en de macro's **per 100 g** gelden. Taak 6 rekent ze door.

- [ ] **Stap 1: Breid `callGemini` uit**

Vervang in `js/lib/ai.jsx` de kop van de functie en de fetch-aanroep:

```js
async function callGemini(prompt, maxTokens = 1200, thinkingBudget = 0, image = null) {
  const payload = { prompt, maxTokens, thinkingBudget };
  if (image) payload.image = image;
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  // De lokale dev-server kent geen serverless functies. Zonder deze regel
  // krijgt de gebruiker daar een cryptische parse-fout te zien.
  if (res.status === 501) throw new Error('AI werkt niet op de lokale dev-server. Test dit op de Vercel-preview.');
  let data;
```

De rest van de functie (foutafhandeling, `candidates`, `MAX_TOKENS`) blijft
ongewijzigd.

- [ ] **Stap 2: Voeg `analyzeMealPhotoWithAI` toe**

Onderaan `js/lib/ai.jsx`:

```js
// Foto van een bord → losse herkende items. De macro's komen PER 100 GRAM
// terug, met daarnaast het geschatte gewicht op de foto. Die twee door elkaar
// halen is de meest waarschijnlijke fout van het model en achteraf niet meer
// te zien, dus de prompt zegt het expliciet en twee keer.
async function analyzeMealPhotoWithAI(image) {
  const text = await callGemini(
    'Je krijgt een foto van een maaltijd. Benoem in het Nederlands de afzonderlijke ' +
    'gerechten of ingrediënten die je herkent, maximaal 8. Schat per item hoeveel gram ' +
    'ervan op de foto ligt ("grams"). Geef de voedingswaarden PER 100 GRAM van dat ' +
    'ingrediënt, dus NIET voor de geschatte portie. Staat er geen eten op de foto, geef ' +
    'dan een lege items-lijst. Geef ALLEEN JSON, geen markdown: ' +
    '{"items":[{"name":"...","grams":number,"kcal":number,"protein":number,"fat":number,"carbs":number}],"note":"korte opmerking over de schatting"}',
    2000, 1024, image
  );
  const data = parseJsonFromAI(text);
  const items = (Array.isArray(data.items) ? data.items : [])
    .filter(it => it && it.name)
    .map(it => ({
      name: String(it.name),
      grams: Math.max(0, Number(it.grams) || 0),
      kcal: Math.max(0, Number(it.kcal) || 0),
      protein: Math.max(0, Number(it.protein) || 0),
      fat: Math.max(0, Number(it.fat) || 0),
      carbs: Math.max(0, Number(it.carbs) || 0),
    }));
  return { items, note: data.note ? String(data.note) : '' };
}
```

`thinkingBudget` staat op 1024: portiegrootte inschatten is redeneerwerk, net
als bij het weekschema. Zonder budget levert het model ronde gokgetallen.

- [ ] **Stap 3: Controleer dat bestaande calls niet gebroken zijn**

Herlaad `http://localhost:8765/qvolve.html` en voer in de console uit:

```js
console.log(callGemini.length, '(verwacht 1 — de rest heeft standaardwaarden)');
console.log(typeof analyzeMealPhotoWithAI, '(verwacht function)');
estimateFoodWithAI('100g rijst').catch(e => console.log('verwachte fout:', e.message));
```

Verwacht: `1`, `function`, en als fout exact
`AI werkt niet op de lokale dev-server. Test dit op de Vercel-preview.` — dat
bewijst dat het 501-pad klopt én dat de bestaande tekstcall nog dezelfde route
volgt.

- [ ] **Stap 4: Commit**

```bash
git add js/lib/ai.jsx
git commit -m "AI: foto-analyse van maaltijden via Gemini"
```

---

### Taak 4: PhotoTab — foto kiezen, analyseren, fouten tonen

**Bestanden:**
- Aanmaken: `js/modules/fotomodus/index.jsx`
- Wijzigen: `js/lib/icons.jsx` (icoon `Image` erbij)
- Wijzigen: `js/modules/voeding/index.jsx:240-249` (tab-rij) en het tab-blok
- Wijzigen: `qvolve.html:58` (script-tag erbij)

**Interfaces:**
- Gebruikt: `prepareMealPhoto` (Taak 2), `analyzeMealPhotoWithAI` (Taak 3),
  `Icon` uit `js/lib/icons.jsx`.
- Levert: `PhotoTab({ mealLabel, onConfirm })`. In deze taak roept de component
  `onConfirm` nog niet aan — de resultaatlijst komt in Taak 5. Wel al: de lege
  staat, het analyseren, en de foutmeldingen.

- [ ] **Stap 1: Voeg het `Image`-icoon toe**

In `js/lib/icons.jsx`, direct onder de regel `Camera:`:

```jsx
  Image:           <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
```

- [ ] **Stap 2: Maak `js/modules/fotomodus/index.jsx`**

```jsx
// ─── modules/fotomodus — maaltijd loggen vanaf een foto ──────────────────────
// De native camera van de telefoon doet het vastleggen (input met capture),
// niet een eigen viewfinder: dat werkt op iOS én Android zonder extra library
// en zonder videostream die opgeruimd moet worden.

function PhotoTab({ mealLabel, onConfirm }) {
  const [thumb, setThumb] = useState('');
  const [items, setItems] = useState(null);
  const [note, setNote] = useState('');
  const [photoId, setPhotoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    // Dezelfde foto twee keer kiezen moet opnieuw een change geven.
    e.target.value = '';
    if (!file) return;
    setError(''); setItems(null); setNote(''); setLoading(true);
    try {
      const photo = await prepareMealPhoto(file);
      setThumb(photo.thumb);
      setPhotoId(`p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      const res = await analyzeMealPhotoWithAI({ base64: photo.base64, mimeType: photo.mimeType });
      setItems(res.items);
      setNote(res.note);
    } catch (err) {
      setError(err.message || 'De foto kon niet geanalyseerd worden.');
    }
    setLoading(false);
  }

  function reset() {
    setThumb(''); setItems(null); setNote(''); setError(''); setPhotoId('');
  }

  return (
    <div className="space-y-3">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {!thumb && !loading && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3 text-center">
          <Icon name="Camera" size={30} className="text-gray-300 mx-auto"/>
          <p className="text-sm font-semibold text-gray-800">Maak een foto van je maaltijd</p>
          <p className="text-xs text-gray-500">De AI herkent de gerechten en schat de porties. Je past de grammen daarna zelf aan.</p>
          <button onClick={() => cameraRef.current.click()}
            className="w-full bg-[#2f8bff] hover:bg-[#2076e8] text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2">
            <Icon name="Camera" size={15}/> Foto maken
          </button>
          <button onClick={() => galleryRef.current.click()}
            className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2">
            <Icon name="Image" size={15}/> Kies uit galerij
          </button>
        </div>
      )}

      {(thumb || loading) && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-3">
            {thumb
              ? <img src={thumb} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
              : <div className="w-14 h-14 rounded-lg bg-gray-100 shrink-0" />}
            <div className="min-w-0 flex-1">
              {loading
                ? <p className="text-sm text-gray-600 flex items-center gap-2"><Icon name="Loader2" size={14}/> Foto analyseren…</p>
                : <p className="text-sm font-semibold text-gray-800">Herkend op de foto</p>}
              {!loading && note && <p className="text-[11px] text-gray-400 mt-0.5">{note}</p>}
            </div>
            {!loading && (
              <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-700 shrink-0">Opnieuw</button>
            )}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {items && items.length === 0 && !error && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Geen herkenbaar eten op de foto. Probeer een duidelijkere foto, of beschrijf de maaltijd via AI-schatting.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Stap 3: Zet de script-tag in `qvolve.html`**

Direct vóór de regel met `js/modules/voeding/index.jsx`:

```html
<script type="text/babel" data-presets="react,env" src="js/modules/fotomodus/index.jsx"></script>
```

`fotomodus` moet vóór `voeding` staan, want `AddFoodOverlay` rendert `PhotoTab`.

- [ ] **Stap 4: Hang de tab in `AddFoodOverlay`**

Vervang in `js/modules/voeding/index.jsx` de tab-array (nu vier items op één
regel) door vijf kortere labels, met een icoon op de Foto-tab:

```jsx
          {[{ id: 'search', label: 'Zoeken' }, { id: 'photo', label: 'Foto', icon: 'Camera' }, { id: 'manual', label: 'Zelf' }, { id: 'describe', label: 'Schatting' }, { id: 'suggest', label: 'Voorstel' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1 ${tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              {t.icon && <Icon name={t.icon} size={11}/>}{t.label}
            </button>
          ))}
```

En voeg direct ná het `{tab === 'search' && ( … )}`-blok toe:

```jsx
        {tab === 'photo' && (
          <PhotoTab
            mealLabel={MEAL_TIMES.find(m => m.key === activeMeal)?.label || 'maaltijd'}
            onConfirm={entries => { onAdd(entries, activeMeal); onClose(); }}
          />
        )}
```

- [ ] **Stap 5: Verifieer in de browser**

Herlaad `http://localhost:8765/qvolve.html`, log in via het recept uit
`.claude/skills/preview/`, open de FAB en ga naar de Foto-tab. Neem een
screenshot op **390×844**.

Verwacht:
- geen console-fouten, `200 /js/modules/fotomodus/index.jsx` in het serverlog;
- vijf tabs passen naast elkaar zonder afkapping of horizontale scroll;
- de lege staat toont beide knoppen.

- [ ] **Stap 6: Verifieer het foutpad**

Kies via "Kies uit galerij" een willekeurige afbeelding. Verwacht: de thumbnail
verschijnt, "Foto analyseren…" loopt, en daarna de melding
`AI werkt niet op de lokale dev-server. Test dit op de Vercel-preview.` in een
rood kader — geen crash, geen witte pagina.

- [ ] **Stap 7: Commit**

```bash
git add js/lib/icons.jsx js/modules/fotomodus/index.jsx js/modules/voeding/index.jsx qvolve.html
git commit -m "Fotomodus: tab met camera-invoer en analyse-toestanden"
```

---

### Taak 5: PhotoTab — resultaatlijst en toevoegen

**Bestanden:**
- Wijzigen: `js/modules/fotomodus/index.jsx`

**Interfaces:**
- Levert: `onConfirm(entries)` wordt aangeroepen met logregels in de vorm
  `{ id, name, grams, kcal, protein, fat, carbs, source: 'ai-photo', photoId, _thumb }`.
  De macro's zijn al doorgerekend naar het ingevulde gewicht. Taak 6 verwerkt
  `_thumb` en `photoId`.

- [ ] **Stap 1: Voeg selectie- en gramstaat toe**

Vervang in `PhotoTab` de regel `const [items, setItems] = useState(null);` door:

```jsx
  // rows = de items uit de AI, aangevuld met wat de gebruiker eraan verandert.
  const [rows, setRows] = useState(null);
```

en pas `handleFile` en `reset` aan zodat ze `rows` zetten in plaats van `items`:

```jsx
      const res = await analyzeMealPhotoWithAI({ base64: photo.base64, mimeType: photo.mimeType });
      setRows(res.items.map((it, i) => ({
        ...it,
        rowId: `r-${i}-${Math.random().toString(36).slice(2, 8)}`,
        grams: String(Math.round(it.grams) || 100),
        on: true,
      })));
      setNote(res.note);
```

In `reset`: `setRows(null);` in plaats van `setItems(null);`. Vervang ook de
lege-lijst-check `items && items.length === 0` door `rows && rows.length === 0`.

- [ ] **Stap 2: Voeg de rekenhulp en de handlers toe**

Boven de `return` van `PhotoTab`:

```jsx
  // De AI geeft macro's per 100g; het gram-veld herrekent lokaal — net zoals
  // NEVO-producten in de zoek-tab werken.
  function scaled(row) {
    const g = parseFloat(row.grams) || 0;
    return {
      kcal: (row.kcal * g) / 100,
      protein: (row.protein * g) / 100,
      fat: (row.fat * g) / 100,
      carbs: (row.carbs * g) / 100,
    };
  }

  const chosen = (rows || []).filter(r => r.on);
  const total = chosen.reduce((a, r) => {
    const s = scaled(r);
    return { kcal: a.kcal + s.kcal, protein: a.protein + s.protein, fat: a.fat + s.fat, carbs: a.carbs + s.carbs };
  }, { kcal: 0, protein: 0, fat: 0, carbs: 0 });

  function setRow(rowId, patch) {
    setRows(rs => rs.map(r => r.rowId === rowId ? { ...r, ...patch } : r));
  }

  function confirm() {
    const entries = chosen.map(r => {
      const s = scaled(r);
      return {
        id: `log-${Date.now()}-${Math.random()}`,
        name: r.name,
        grams: parseFloat(r.grams) || 0,
        kcal: s.kcal, protein: s.protein, fat: s.fat, carbs: s.carbs,
        source: 'ai-photo',
        photoId,
        _thumb: thumb,
      };
    });
    if (entries.length) onConfirm(entries);
  }

  const fmtG = v => { v = Number(v) || 0; return v > 0 && v < 10 ? Math.round(v * 10) / 10 : Math.round(v); };
```

- [ ] **Stap 3: Render de lijst en de knop**

Voeg binnen het `{(thumb || loading) && ( … )}`-blok, ná de lege-lijst-melding,
toe:

```jsx
          {rows && rows.length > 0 && (
            <div className="space-y-1.5">
              {rows.map(r => {
                const s = scaled(r);
                return (
                  <div key={r.rowId} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${r.on ? 'border-orange-100 bg-orange-50' : 'border-gray-100 bg-white opacity-60'}`}>
                    <button onClick={() => setRow(r.rowId, { on: !r.on })} className={r.on ? 'text-orange-500' : 'text-gray-300'}>
                      <Icon name={r.on ? 'CheckCircle2' : 'Circle'} size={18}/>
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 truncate">{r.name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px]">
                        <span className="text-orange-500 font-medium">{Math.round(s.kcal)} kcal</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-[#2f8bff]">E {fmtG(s.protein)}g</span>
                        <span className="text-[#1e3a8a]">KH {fmtG(s.carbs)}g</span>
                        <span className="text-[#f59e0b]">V {fmtG(s.fat)}g</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <input type="number" inputMode="decimal" value={r.grams}
                        onChange={e => setRow(r.rowId, { grams: e.target.value })}
                        className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      <span className="text-xs text-gray-400">g</span>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
                <span>{chosen.length} van {rows.length} geselecteerd</span>
                <span className="font-semibold text-gray-700">{Math.round(total.kcal)} kcal</span>
              </div>

              <button onClick={confirm} disabled={chosen.length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl py-2.5 text-sm font-medium">
                Voeg toe aan {mealLabel}
              </button>
            </div>
          )}
```

- [ ] **Stap 4: Verifieer met een gestubde AI**

De echte call kan lokaal niet. Vervang hem tijdelijk in de console vóór je een
foto kiest, zodat de lijst zonder Gemini te zien is:

```js
window.__echt = analyzeMealPhotoWithAI;
analyzeMealPhotoWithAI = async () => ({
  items: [
    { name: 'Kipfilet gebakken', grams: 150, kcal: 165, protein: 31, fat: 3.6, carbs: 0 },
    { name: 'Rijst gekookt',     grams: 200, kcal: 130, protein: 2.7, fat: 0.3, carbs: 28 },
    { name: 'Broccoli',          grams: 80,  kcal: 34,  protein: 2.8, fat: 0.4, carbs: 7 },
  ],
  note: 'Portie geschat op basis van het bord.',
});
```

Kies daarna een willekeurige afbeelding via "Kies uit galerij".

Verwacht: drie regels; kcal per regel is de waarde per 100 g maal de grammen
(kipfilet 150 g → **248 kcal**, rijst 200 g → **260 kcal**, broccoli 80 g →
**27 kcal**), totaal **535 kcal**. Zet je kipfilet op 300 g, dan verdubbelt zijn
regel naar 495 kcal en loopt het totaal mee. Een item uitvinken haalt het uit
het totaal en uit de teller "x van 3".

- [ ] **Stap 5: Verifieer dat de regels in het dagboek landen**

Klik "Voeg toe aan Ontbijt". Verwacht: de overlay sluit, de drie items staan
onder Ontbijt met hun grammen, en het Dagtotaal stijgt met 535 kcal. Neem een
screenshot op 390×844.

- [ ] **Stap 6: Commit**

```bash
git add js/modules/fotomodus/index.jsx
git commit -m "Fotomodus: bewerkbare itemlijst met totaal en toevoegen"
```

---

### Taak 6: Miniatuur bewaren en tonen

**Bestanden:**
- Wijzigen: `js/app.jsx:76-87` (`addLogEntries`, `removeLogEntry`)
- Wijzigen: `js/modules/voeding/index.jsx` (`DailyLogList`)

**Interfaces:**
- Gebruikt: `_thumb` en `photoId` op de logregels uit Taak 5.
- Levert: localStorage-key `meal-photos:{slug}:{datum}` met vorm
  `{ [photoId]: dataUrl }`; logregels bewaren alleen `photoId`.

- [ ] **Stap 1: Bewaar de thumbnail bij het toevoegen**

Vervang `addLogEntries` in `js/app.jsx`:

```jsx
  function addLogEntries(entries, mealOverride) {
    const meal = mealOverride || addOverlayMeal;
    // Foto's horen niet in de logregel zelf: alle items van één foto delen
    // hetzelfde photoId, dus we bewaren het beeld één keer apart.
    const photos = {};
    const clean = entries.map(e => {
      const { _thumb, ...rest } = e;
      if (_thumb && rest.photoId) photos[rest.photoId] = _thumb;
      return { ...rest, mealTime: meal };
    });
    const newLog = [...log, ...clean];
    setLog(newLog);
    lsSet(`daily-log:${userSlug}:${dateStr}`, newLog);
    if (Object.keys(photos).length) {
      const key = `meal-photos:${userSlug}:${dateStr}`;
      // Een volle localStorage mag nooit een maaltijd kosten: het logboek is
      // hierboven al opgeslagen, de foto is bijzaak.
      try { lsSet(key, { ...(lsGet(key) || {}), ...photos }); } catch (e) {}
    }
  }
```

- [ ] **Stap 2: Ruim de foto op bij het verwijderen**

Vervang `removeLogEntry`:

```jsx
  function removeLogEntry(id) {
    const gone = log.find(e => e.id === id);
    const newLog = log.filter(e => e.id !== id);
    setLog(newLog);
    lsSet(`daily-log:${userSlug}:${dateStr}`, newLog);
    // Laatste regel van deze foto weg → de foto ook, anders blijft er beeld
    // achter zonder maaltijd.
    if (gone && gone.photoId && !newLog.some(e => e.photoId === gone.photoId)) {
      const key = `meal-photos:${userSlug}:${dateStr}`;
      const photos = lsGet(key) || {};
      if (photos[gone.photoId]) { delete photos[gone.photoId]; lsSet(key, photos); }
    }
  }
```

- [ ] **Stap 3: Geef `DailyLogList` de foto's mee**

In `js/app.jsx`, waar `<DailyLogList … />` gerenderd wordt, voeg de prop toe:

```jsx
mealPhotos={lsGet(`meal-photos:${userSlug}:${dateStr}`) || {}}
```

- [ ] **Stap 4: Toon de miniatuur**

In `js/modules/voeding/index.jsx`: verander de signatuur naar

```jsx
function DailyLogList({ log, onRemove, onOpenAdd, mealPhotos = {} }) {
```

en vervang in de regel-render de naamregel door een variant met beeld ervoor:

```jsx
                      <div className="flex items-center justify-between">
                        {e.photoId && mealPhotos[e.photoId] && (
                          <img src={mealPhotos[e.photoId]} alt="" className="w-7 h-7 rounded object-cover mr-2 shrink-0" />
                        )}
                        <p className="text-sm text-gray-800 flex-1 min-w-0">{e.name}{e.grams ? ` · ${e.grams}g` : ''}</p>
```

De rest van het blok (kcal, verwijderknop) blijft ongewijzigd.

- [ ] **Stap 5: Verifieer opslag en opruiming**

Herhaal de stub uit Taak 5, voeg de drie items toe, en controleer in de console:

```js
const key = 'meal-photos:quinten-brosens:' + new Date().toISOString().slice(0, 10);
const p = JSON.parse(localStorage.getItem(key) || '{}');
console.log('aantal foto\'s:', Object.keys(p).length, '(verwacht 1 voor 3 items)');
console.log('kB totaal    :', Math.round((localStorage.getItem(key) || '').length / 1024));
```

Verwacht: **1** foto voor drie regels (niet 3), en ruim onder de 15 kB.
Verwijder daarna de drie regels in het dagboek en draai de check opnieuw:
verwacht **0**.

Verwacht ook: bij elke regel staat links een miniatuur van 28px.

- [ ] **Stap 6: Commit**

```bash
git add js/app.jsx js/modules/voeding/index.jsx
git commit -m "Dagboek: miniatuur bij maaltijden uit de fotomodus"
```

---

### Taak 7: Cache bumpen, volledige doorloop, echte AI-test

**Bestanden:**
- Wijzigen: `sw.js` (`CACHE`)
- Wijzigen: `CLAUDE.md` (module-overzicht en localStorage-keys)

- [ ] **Stap 1: Bump de service-worker cache**

In `sw.js`: `qvolve-v4` → `qvolve-v5`. Zonder dit blijven bestaande installaties
op de oude bestandenlijst hangen.

- [ ] **Stap 2: Werk `CLAUDE.md` bij**

Drie plekken:
- de bestandsstructuur: `js/lib/image.jsx` en `js/modules/fotomodus/index.jsx`;
- de laadvolgorde: `image.jsx` na `utils.jsx`, `fotomodus` vóór `voeding`;
- de localStorage-keys: `meal-photos:{slug}:{datum}` — foto-miniaturen per dag.

Noteer bij de voeding-module dat `AddFoodOverlay` nu vijf tabs heeft.

- [ ] **Stap 3: Volledige `/preview`-doorloop**

Herlaad met lege localStorage en loop het na: loginscherm → dashboard →
FAB → alle vijf tabs openen. Verwacht: geen console-fouten behalve de bekende
Tailwind- en Babel-waarschuwingen, en `501 /api/gemini` zodra je een foto kiest.
Screenshot op 390×844.

- [ ] **Stap 4: Commit en push de branch**

```bash
git add sw.js CLAUDE.md
git commit -m "Fotomodus: cache bumpen en documentatie bijwerken"
git push -u origin feature/ai-foto-modus
```

- [ ] **Stap 5: Controleer de Vercel-instellingen vóór de test**

De preview-deploy komt automatisch van de push. Twee dingen moeten kloppen in
het Vercel-dashboard, anders faalt de test om een reden die niets met de code te
maken heeft:

1. `GEMINI_API_KEY` moet ook voor de **Preview**-omgeving aan staan, niet alleen
   voor Production. Zo niet: 500 met "Server: GEMINI_API_KEY ontbreekt."
2. Staat `ALLOWED_ORIGINS` ingesteld, dan blokkeert die het preview-domein met
   een 403. Voeg het preview-domein toe of maak de variabele tijdelijk leeg.

- [ ] **Stap 6: Test de echte herkenning op de preview-URL**

Open de preview-URL op een telefoon, log in, en fotografeer een echte maaltijd.

Verwacht:
- binnen ~10 seconden een lijst herkende items met plausibele grammen;
- de macro's schalen mee als je een gramgetal aanpast;
- toevoegen laat het Dagtotaal met het getoonde totaal stijgen;
- de miniatuur staat bij de regels in het dagboek.

Controleer ook een foto **zonder** eten: verwacht de melding "Geen herkenbaar
eten op de foto", geen lege lijst zonder uitleg.

- [ ] **Stap 7: Rapporteer het resultaat**

Noteer wat de herkenning opleverde (welke items, welke grammen, hoe lang het
duurde). Wijken de porties er stelselmatig naast, dan is dat een promptkwestie
voor een vervolgcommit — niet iets om in dit plan stilzwijgend bij te sturen.

---

## Zelfcontrole van dit plan

**Dekking van de spec.** Elk onderdeel heeft een taak: proxy → 1, `image.jsx` →
2, `ai.jsx` → 3, `PhotoTab` → 4 en 5, tab-plaatsing en kortere labels → 4,
opslag en miniatuur → 6, cache/docs/preview-test → 7. De vier vastgelegde
beslissingen zitten in de code: losse items (Taak 5), native camera (Taak 4),
alleen een thumbnail (Taak 2 en 6), macro's per 100 g van de AI (Taak 3).

**Typeconsistentie.** `prepareMealPhoto` levert `{ base64, mimeType, thumb }` en
wordt in Taak 4 exact zo uitgepakt. `analyzeMealPhotoWithAI` levert
`{ items, note }` met per item `name/grams/kcal/protein/fat/carbs`; Taak 5 maakt
daar `rows` van met `rowId`, `grams` (string) en `on`. De logregels dragen
`photoId` en `_thumb`; Taak 6 strookt `_thumb` eraf. `mealPhotos` heeft in
`app.jsx` en `DailyLogList` dezelfde vorm.

**Bekende beperking.** Taak 5 verifieert met een gestubde AI, omdat de echte
call lokaal niet kan. De eerste echte herkenning gebeurt pas in Taak 7, op de
Vercel-preview. Blijkt de prompt daar niet te deugen, dan is dat een aanpassing
aan `analyzeMealPhotoWithAI` en niet aan de UI eromheen.
