# Qvolve

Nederlandstalige fitness- en voedingstracker. Mobile-first web-app, draait als
installeerbare PWA. Gehost op Vercel (gekoppeld aan de GitHub-repo).

Slogan: **Train. Fuel. Recover. Evolve.**

## Hosting & architectuur

- Front-end volledig client-side, geen build-stap.
- Eén HTML-bestand laadt React, Babel en Tailwind via CDN en draait een
  `<script type="text/babel">` blok dat in de browser wordt gecompileerd.
- **Gehost op Vercel**, gekoppeld aan de GitHub-repo `Quinten-Brosens/QVolve`.
  Push naar `main` → Vercel deployt automatisch. `vercel.json` serveert
  `qvolve.html` op de root-URL.
- **Eén serverless functie**: `api/gemini.js` (Vercel) als proxy naar Gemini.
  Dat is de enige server-side code; de rest blijft statisch.
- **Belangrijk:** de front-end blijft werken zonder build-proces. Introduceer geen
  bundler, geen npm-build en geen `import`/`export` in de browser-scripts. Losse
  JS-bestanden laad je via `<script>`-tags, niet via ES-modules.
- Test na elke grote wijziging of de app nog laadt vóór je ze als af beschouwt.

## Bestanden

- `qvolve.html` — de volledige app (wordt opgesplitst voor onderhoudbaarheid).
- `manifest.json` — PWA-manifest (naam, kleuren, icon-verwijzingen).
- `sw.js` — service worker. **Network-first voor HTML én app-code** (`.html`/`.js`/
  `.jsx`) zodat updates meteen doorkomen; cache-first voor iconen/manifest.
  Cacheversie staat in `CACHE` (nu `qvolve-v4`). Bump die versie bij grote wijzigingen.
- `icon-192.png`, `icon-512.png` — PWA-iconen, gegenereerd uit `logo-qvolve.png`.
- `logo-qvolve.png` — het logo (Q-merkteken + wordmark + slogan), bron voor de stijl.
- `vercel.json` — Vercel-config (rewrite root → `qvolve.html`).
- `api/gemini.js` — serverless proxy naar Gemini (zie AI-functies).
- `api/off-search.js` — serverless proxy naar de Open Food Facts-zoekdienst
  (zie Voeding-tab). Barcode-lookups gaan rechtstreeks vanuit de client.

## Kleurenschema

Gebaseerd op het logo (`logo-qvolve.png`): donker navy met blauwe gloed, helder
blauw + oranje accenten.

- Donker navy (`#182a48` voor surfaces, `#14223c` diepste achtergrond, met radiale
  gloed `radial-gradient(ellipse at top, #26395f, #14223c)`): header, bottom-nav,
  loginscherm, admin-paneel. (Vroeger `blue-900/950` — niet meer gebruiken.)
- Helder blauw (`#2f8bff`): de **"Q"** in de wordmark, AI- en scan-knoppen, accenten.
- Oranje (`orange-500` / `#f97316`): primaire CTA's, actieve states, de **"volve"**
  in de wordmark.
- Randen op donker: `#2b3e60`; lichtere surfaces (inputs): `#24375a`.
- Lichtgrijs (`gray-50`): content-achtergrond (ongewijzigd, blijft licht).
- **Lettertype:** Rajdhani (Google Fonts) via de klasse `.font-logo` — gebruikt
  voor de wordmark in de header en de labels in de bottom-nav (hoofdletters).
  Rajdhani gaat tot gewicht 700 (geen 800/900).
- Logo: `logo-qvolve.png` (Q-merkteken met oranje pijl). Op het loginscherm wordt
  het beeld zelf getoond; in de header de tekst-wordmark (Q blauw, volve oranje).
- PWA-iconen (`icon-192.png` / `icon-512.png`) zijn uit dit logo gegenereerd.

## AI-functies (Google Gemini)

- Model: **`gemini-2.5-flash`**. Gebruik niet `gemini-1.5-flash` — dat model is
  door Google uitgeschakeld en geeft 404.
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- Authenticatie via de **`x-goog-api-key` header**, niet via `?key=` in de URL.
  De header-methode werkt met de nieuwe Google-sleutels die met `AQ.` beginnen.
- **Eén gedeelde sleutel via een serverless proxy.** Gebruikers stellen niets meer
  in. De browser roept `/api/gemini` aan (Vercel-functie in `api/gemini.js`); die
  voegt de sleutel server-side toe en praat met Google. `callGemini()` in `lib.jsx`
  POST't enkel `{ prompt, maxTokens }` naar die proxy.
- **De sleutel staat als environment-variabele op Vercel** (`GEMINI_API_KEY`),
  nooit in de client of in de repo. Google deactiveert sleutels die publiek op
  GitHub of in client-code belanden. Optioneel `ALLOWED_ORIGINS` (komma-gescheiden)
  beperkt welke origins de proxy mogen aanroepen.
- AI wordt gebruikt voor: weekschema genereren, maaltijd schatten uit tekst,
  maaltijdsuggestie op basis van resterende macro's.

## Gebruikers & opslag

- Geen centrale database. Alles in `localStorage`, per apparaat.
- Standaardgebruikers (in `DEFAULT_USERS`): Alvin Broers, Anthony Van Goethem,
  Quinten Brosens, Hanne Nelen.
- `loadUsers()` voegt nieuwe namen uit `DEFAULT_USERS` automatisch toe aan een
  bestaande lokale lijst — zo verschijnen nieuwe gebruikers ook op toestellen die
  de app al kenden.
- Standaardwachtwoord: `Qvolve123!`. Verplichte wijziging bij eerste login
  (min. 8 tekens, niet gelijk aan standaard).
- Admin-paneel via "Beheer" onderaan login. Admin-wachtwoord: `QvolveAdmin!`.
  Toevoegen/verwijderen/resetten van gebruikers.

### localStorage-keys

- `qvolve-users-v2` — gebruikerslijst
- `qvolve-session` — actieve login (naam + tijdstip, 3-dagen sliding window)
- `profile:{slug}` — profielgegevens
- `macros:{slug}` — berekende macro's
- `daily-log:{slug}:{datum}` — voedingslogboek per dag
- `custom-foods:{slug}` — eigen voedingsmiddelen
- `weekschema-prefs:{slug}` — antwoorden vragenlijst
- `weekschema-plan:{slug}` — gegenereerd weekschema

(`slug` = naam via `slugifyName()`, bv. "quinten-brosens".)

## Functionaliteit

- **Voeding-tab:** NEVO-databank doorzoeken (2328 items, ingebakken als
  `NEVO_DATA`), eigen producten, handmatige invoer, dagtotaal met macrobalken,
  caloriedoel aanpasbaar, datumnavigatie, 6 eetmomenten, daglogboek per maaltijd.
- **Plannen (Voeding-tab):** knoppen bij de datumnavigatie. "Boodschappenlijst"
  aggregeert de gelogde voeding over een datumbereik (van/tot, grammen opgeteld per
  product, gegroepeerd per voedingsgroep, met kopieerknop). "Dag herhalen" kopieert
  de huidige dag naar dezelfde weekdag voor X komende weken (overschrijft die dagen).
- **Open Food Facts (merkproducten + barcode):** gefedereerd zoeken — NEVO/eigen
  producten lokaal en instant, OFF-merkproducten online erbovenop (debounced, min.
  3 tekens). OFF-tekstzoeken loopt via `/api/off-search` (proxy, met fallback naar
  het legacy CORS-endpoint als de proxy ontbreekt). Barcode scannen via camera
  (`html5-qrcode`, lazy van CDN) → `lookupOffBarcode()` rechtstreeks op de v2-API.
  OFF-producten worden door `mapOffProduct()` op het NEVO-formaat gemapt (per 100g).
- **Weekplan-tab:** 11-stappen vragenlijst → Gemini genereert 7-daags menu met
  ingrediënten, hoeveelheden, tips, macros en boodschappenlijst. Knop "Laden in
  logboek" met datummapping (dag 0 = maandag huidige week).
- **Training-tab:** nu nog een placeholder. Nog uit te bouwen.
- Macroberekening: Harris-Benedict BMR × activiteitsfactor, met FitChef-,
  percentage- en keto-profielen.

## Bekende beperkingen

- Omdat alles in `localStorage` zit, is data niet gedeeld tussen apparaten of
  gebruikers. Elk toestel staat op zichzelf.
- Service worker kan oude versies cachen; daarom network-first voor HTML.
- Een centrale database (bv. Firebase) zou nodig zijn voor gedeelde gebruikers
  of synchronisatie — bewust nog niet gedaan om het simpel en gratis te houden.

## Werkwijze

- Hou de app werkend zonder build-stap (zie boven).
- Wijzigingen gaan live door te pushen naar GitHub (branch `main`); Vercel
  deployt de site dan automatisch.
- Test na elke grote wijziging of de app nog laadt.

### Lokaal testen — altijd via een webserver, nooit via `file://`

- Open `qvolve.html` **niet** door te dubbelklikken (`file:///...`). Sinds de
  opsplitsing in modules haalt de in-browser Babel de `js/*.jsx`-bestanden op via
  fetch, en dat blokkeert de browser over `file://` → de app toont
  **"Script error. Regel 0"**. Hetzelfde geldt voor de auto-preview die het bestand
  direct opent.
- Start in de plaats de lokale dev-server en open de URL:
  `powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1`
  → `http://localhost:8765/qvolve.html`
- Op echte hosting (Vercel/`https://`) speelt dit niet — daar laadt alles gewoon.
- De proxy-functies (`/api/gemini`, `/api/off-search`) werken niet op de simpele
  dev-server (geen serverless). Wil je AI of OFF-tekstzoeken lokaal testen, gebruik
  `vercel dev`. OFF-zoeken valt op de dev-server terug op het legacy-endpoint (kan
  503 geven); **barcode scannen werkt wél lokaal** (rechtstreekse v2-API met CORS).
