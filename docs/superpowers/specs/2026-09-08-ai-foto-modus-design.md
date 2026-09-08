# AI foto-modus — design

**Datum:** 2026-09-08
**Branch:** `feature/ai-foto-modus`
**Status:** ontwerp, goedgekeurd — klaar voor implementatieplan

## Doel

Een maaltijd loggen door er een foto van te maken. De AI herkent de losse
gerechten op het bord, schat per gerecht het gewicht, en de gebruiker corrigeert
de grammen voor hij alles in één keer in het dagboek zet. Vergelijkbaar met
CalZen, Fitatu, SnapCalorie en Yazio.

## Beslissingen

Vier keuzes liggen vast en sturen de rest van dit ontwerp:

1. **Losse items, geen totaalschatting.** De AI geeft een lijst terug
   (`kipfilet 150g`, `rijst 200g`, `broccoli 80g`), niet één regel voor het hele
   bord. Per item aan/uit te vinken en in grammen bij te stellen.
2. **Native camera, geen eigen viewfinder.** Een `<input type="file"
   accept="image/*" capture="environment">` opent de camera-app van de telefoon;
   een tweede knop zonder `capture` opent de galerij. Werkt op iOS en Android
   zonder extra library en zonder een videostream die opgeruimd moet worden.
3. **Thumbnail bewaren, originele foto weggooien.** 160px JPEG bij het dagboek;
   de 1024px-versie die naar de AI ging wordt niet opgeslagen.
4. **AI levert de macro's, geen NEVO-matching.** De AI geeft per item de
   waarden *per 100 g* plus een geschat gewicht. Daardoor herrekent het
   gram-veld lokaal, net als bij NEVO-producten — één rekenpad, geen fuzzy
   naamkoppeling die kan misgrijpen.

## Plaatsing in de UI

Een vijfde tab in `AddFoodOverlay`, naast Zoeken / Zelf ingeven / AI-schatting /
AI Voorstel. De overlay heeft de maaltijdkiezer, de gedeelde macro-opmaak en de
route naar het dagboek al; een tweede toevoeg-flow ernaast zou die verdubbelen.

Vijf labels passen niet op 390px met de huidige tekst. De labels worden korter:

```
Zoeken │ Foto │ Zelf │ Schatting │ Voorstel
```

De Foto-tab krijgt het `Camera`-icoon vóór het label; de andere blijven tekst.

## Architectuur

| Bestand | Aard | Verantwoordelijkheid |
|---|---|---|
| `api/gemini.js` | wijziging | optioneel `image` doorgeven aan Gemini |
| `js/lib/image.jsx` | **nieuw** | foto verkleinen + thumbnail maken |
| `js/lib/ai.jsx` | wijziging | `callGemini` met beeld; `analyzeMealPhotoWithAI` |
| `js/lib/icons.jsx` | wijziging | `Image`-icoon toevoegen (galerij-knop) |
| `js/modules/fotomodus/index.jsx` | **nieuw** | `PhotoTab` — de volledige foto-flow |
| `js/modules/voeding/index.jsx` | wijziging | 5e tab; miniatuur in `DailyLogList` |
| `js/app.jsx` | wijziging | thumbnail opslaan/opruimen bij log-mutaties |
| `qvolve.html` | wijziging | twee script-tags |
| `sw.js` | wijziging | `CACHE` bumpen naar `qvolve-v5` |

De flow krijgt een eigen module omdat `voeding/index.jsx` al 535 regels telt.
Er nog tweehonderd regels camera- en beeldlogica in schuiven maakt dat bestand
onwerkbaar; `PhotoTab` is los te lezen en los te testen.

### Laadvolgorde

`js/lib/image.jsx` komt na `utils.jsx` en vóór `ai.jsx`. `js/modules/fotomodus/`
komt vóór `js/modules/voeding/`, omdat `AddFoodOverlay` `PhotoTab` rendert.

```
… utils.jsx → image.jsx → macros.jsx → ai.jsx → off.jsx → icons.jsx
   → auth → onboarding → dashboard → fotomodus → voeding → … → app.jsx
```

De hook `.claude/hooks/check-jsx.js` meldt elke `js/**/*.jsx` die niet als
`<script>` in `qvolve.html` staat — beide nieuwe bestanden moeten er dus in.

## Componenten

### `js/lib/image.jsx`

Twee functies, geen React, geen globale state.

```
prepareMealPhoto(file) → Promise<{ base64, mimeType, thumb }>
```

- Decodeert met `createImageBitmap(file, { imageOrientation: 'from-image' })`
  zodat een staande telefoonfoto niet gekanteld bij de AI aankomt. Browsers
  zonder die optie vallen terug op `<img>` + `URL.createObjectURL`.
- Schaalt de langste zijde naar max **1024 px**, tekent op een canvas en
  exporteert als JPEG **q 0.72** → `base64` zonder `data:`-prefix, plus
  `mimeType: 'image/jpeg'`.
- Maakt uit dezelfde bitmap een tweede canvas van max **160 px**, JPEG **q 0.6**
  → `thumb` als volledige data-URL (~5–8 kB).
- Gooit een `Error` met Nederlandstalige tekst als het bestand geen beeld is of
  niet decodeert.

Waarom 1024 px: Gemini rekent beeld af per tegel van 768 px; groter levert voor
een bord eten geen betere herkenning, maar wel meer tokens en een trager
antwoord. En het houdt de request ruim onder de limiet van Vercel (~4,5 MB).

### `api/gemini.js`

Het contract wordt uitgebreid, niet vervangen:

```js
{ prompt, maxTokens, thinkingBudget, image?: { mimeType, data } }
```

- Zonder `image` verandert er niets — bestaande calls (weekschema, schatting,
  voorstel) blijven exact hetzelfde werken.
- Met `image` wordt de body:
  `contents: [{ parts: [{ inlineData: { mimeType, data } }, { text: prompt }] }]`.
  Het beeld staat vóór de tekst: dat is wat Google aanraadt bij één afbeelding.
- Validatie server-side, want dit is de enige plek waar we het kunnen afdwingen:
  `mimeType` moet `image/jpeg`, `image/png` of `image/webp` zijn, en `data` een
  string van ten hoogste 3,5 MB (≈ 2,6 MB beeld). Daarboven een 413 met
  Nederlandstalige uitleg in plaats van een afgekapte request van Vercel.
- De bestaande 503-retry en de `responseMimeType: 'application/json'` blijven
  ongewijzigd van toepassing.

### `js/lib/ai.jsx`

`callGemini(prompt, maxTokens = 1200, thinkingBudget = 0, image = null)` — het
vierde argument gaat mee in de body als het gezet is. Alle bestaande
aanroepplaatsen blijven ongewijzigd.

```
analyzeMealPhotoWithAI({ base64, mimeType }) → Promise<{ items, note }>
```

Vraagt om strikte JSON:

```json
{
  "items": [
    { "name": "Kipfilet gebakken", "grams": 150,
      "kcal": 165, "protein": 31, "fat": 3.6, "carbs": 0 }
  ],
  "note": "Portiegrootte geschat op basis van het bord."
}
```

De prompt legt expliciet vast dat `kcal`/`protein`/`fat`/`carbs` **per 100 g**
gelden en `grams` het geschatte gewicht op de foto is — die twee door elkaar
halen is de meest waarschijnlijke fout, en ze zijn achteraf niet te
onderscheiden. Verder: Nederlandstalige namen, maximaal 8 items, en een lege
`items`-array als er geen eten op de foto staat.

`maxTokens` 2000 en `thinkingBudget` 1024: portiegrootte inschatten is
redeneerwerk, net als bij het weekschema, en zonder budget levert het model
gokwerk op ronde getallen.

### `js/modules/fotomodus/index.jsx`

```
PhotoTab({ mealLabel, onConfirm })
```

Eén component met vier zichtbare toestanden: **leeg** (twee knoppen: Foto maken
/ Kies uit galerij), **bezig** (thumbnail + spinner), **resultaat** (itemlijst)
en **fout** (melding + opnieuw proberen).

De resultaatlijst per item: vinkje, naam, gram-veld, en de herrekende macro's
eronder in de bestaande opmaak (`kcal` oranje, `E` blauw, `KH` donkerblauw, `V`
amber). Onderaan het totaal van de aangevinkte items en één knop
*"Voeg toe aan {mealLabel}"*.

`onConfirm(entries)` krijgt kant-en-klare logregels:

```js
{ id, name, grams, kcal, protein, fat, carbs,
  source: 'ai-photo', photoId, _thumb }
```

De macro's zijn hier al doorgerekend naar het ingevulde gewicht, zoals
`confirmAll()` dat nu doet voor NEVO-items. `PhotoTab` raakt localStorage niet
aan en kent de gebruiker niet — het geeft alleen regels terug.

Alle regels uit één foto delen hetzelfde `photoId` en dragen dezelfde `_thumb`;
`app.jsx` schrijft die thumbnail één keer weg onder dat id. `PhotoTab` genereert
het id bij het analyseren.

### `js/modules/voeding/index.jsx`

- Tab-array krijgt `{ id: 'photo', label: 'Foto', icon: 'Camera' }` op de tweede
  plaats; de labels van de andere vier worden ingekort.
- `{tab === 'photo' && <PhotoTab mealLabel={…} onConfirm={entries => { onAdd(entries, activeMeal); onClose(); }} />}`
- `DailyLogList` toont links van de naam een 28px miniatuur als de regel een
  `photoId` heeft waarvoor een foto bestaat; anders verandert er niets aan de
  weergave.

### `js/app.jsx`

`addLogEntries` haalt `_thumb` van de regels af vóór het opslaan en schrijft de
foto's naar een aparte key:

```
meal-photos:{slug}:{datum} → { [photoId]: dataUrl }
```

Zo staat één foto er één keer in plaats van één keer per herkend item.
`removeLogEntry` gooit een foto weg zodra de laatste regel met dat `photoId`
verdwenen is, zodat de opslag niet volloopt met beelden zonder maaltijd.

Faalt `lsSet` met een quota-fout, dan wordt de foto overgeslagen en logt de
maaltijd gewoon door — een miniatuur is nooit een reden om een log te verliezen.

## Datastroom

```
foto → prepareMealPhoto()  → base64 (1024px JPEG) + thumb (160px)
     → POST /api/gemini { prompt, image }
     → Gemini: inlineData + text, JSON-modus
     → { items: [{name, grams, kcal/100g, …}], note }
     → PhotoTab: lijst, vinkjes, gram-velden, totaal
     → onConfirm(entries)  → onAdd(entries, meal)
     → app.jsx: _thumb → meal-photos:…   |   regels → daily-log:…
```

## Foutafhandeling

| Situatie | Gedrag |
|---|---|
| Bestandkiezer geannuleerd | Niets; scherm blijft in de lege staat |
| Bestand is geen beeld / decodeert niet | "Deze foto kon niet gelezen worden." |
| Foto te groot na verkleinen (>3,5 MB) | 413 van de proxy, melding in de tab |
| `items: []` | "Geen herkenbaar eten op de foto" + verwijzing naar AI-schatting |
| 429 / 503 van Gemini | Bestaande gehumaniseerde meldingen in `callGemini` |
| 501 op `/api/gemini` (dev-server) | "AI werkt niet op de lokale dev-server." |
| localStorage vol | Foto overslaan, maaltijd wel loggen |

## Testen en verificatie

Dit project heeft geen testrunner; verificatie gebeurt in de browser via
`/preview`. De foto-analyse valt niet volledig lokaal te testen: de dev-server
serveert geen serverless functies en geeft 501 op `/api/gemini`.

**Lokaal (`/preview`)** — dat de app laadt zonder console-fouten, dat de
Foto-tab opent, dat de vijf tabs op 390px passen, dat een gekozen foto verkleind
wordt (thumbnail verschijnt) en dat de 501 als nette melding landt in plaats van
als crash.

**Vercel branch-preview** — de echte herkenning. Een push van
`feature/ai-foto-modus` levert automatisch een preview-URL op. Twee
voorwaarden in het Vercel-dashboard, allebei te controleren vóór de eerste test:

1. `GEMINI_API_KEY` moet ook voor de **Preview**-omgeving aan staan, niet alleen
   voor Production — anders geeft de proxy een 500 over een ontbrekende sleutel.
2. Staat `ALLOWED_ORIGINS` ingesteld, dan blokkeert die de preview-URL (een
   ander domein dan productie) met een 403. Voor de test moet het
   preview-domein erbij, of de variabele tijdelijk leeg.

De Vercel CLI is op deze machine niet geïnstalleerd en er is geen npm-setup;
`vercel dev` zou een globale install plus `vercel login` en `vercel env pull`
vragen. De branch-preview gebruikt de koppeling die er al is.

## Buiten scope

Bewust weggelaten, elk vervangbaar door iets dat al bestaat:

- Live viewfinder in de app (de native camera doet dit).
- NEVO-koppeling van herkende items (zie beslissing 4).
- Meerdere foto's per maaltijd.
- Een herkend item bijsturen met vrije tekst (de AI-schatting-tab doet dit).
- Foto's bewaren over dagen heen of terugkijken in een galerij.
- Offline wachtrij voor analyses.
