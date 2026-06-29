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
- Alle variabelen zijn globaal — laadvolgorde in `qvolve.html` bepaalt wat
  beschikbaar is. Modules mogen alleen globals gebruiken die eerder geladen zijn.
- Test na elke grote wijziging of de app nog laadt vóór je ze als af beschouwt.

## Bestandsstructuur

```
qvolve.html           — entry-point; laadt alle scripts in volgorde
manifest.json         — PWA-manifest
sw.js                 — service worker (network-first voor html/js/jsx)
vercel.json           — rewrite root → qvolve.html
api/
  gemini.js           — serverless proxy naar Gemini (GEMINI_API_KEY env-var)
  off-search.js       — serverless proxy naar Open Food Facts tekstzoeken
data/
  nevo-data.js        — NEVO_DATA array, 2328 items (geladen vóór alle jsx)
js/
  lib/
    utils.jsx         — lsGet/lsSet/lsDel, datum-helpers, normalizeMealTime,
                        groupByMeal, loadScript, humanizeCamError, React destructuring
    macros.jsx        — MEAL_TIMES, ACTIVITY_FACTORS, GOALS, MACRO_PROFILES,
                        calcBMR, calcMacros, applyKcalToMacros, NEVO_VERSION
    ai.jsx            — callGemini, parseJsonFromAI, estimateFoodWithAI,
                        suggestMealWithAI
    off.jsx           — mapOffProduct, offListToFoods, searchOpenFoodFacts,
                        lookupOffBarcode
    icons.jsx         — icons{} map + Icon({name,size,className}) component
  modules/
    auth/
      index.jsx       — DEFAULT_USERS, loadUsers/saveUsers, loadSession/saveSession,
                        AdminPanel, ChangePwScreen, AccessGate
    onboarding/
      index.jsx       — SetupWizard (profiel invullen, macro's berekenen)
    dashboard/
      index.jsx       — CalorieSummary, MacroRing, MacroBreakdownModal,
                        DateNav, KcalAdjuster, MealTimeSelector
    voeding/
      index.jsx       — BarcodeScanner, AddFoodOverlay (4 tabs: zoeken/manueel/
                        AI-schatting/AI-voorstel), DailyLogList, RepeatDayModal
    boodschappenlijst/
      index.jsx       — SHOP_CATEGORIES, SHOP_KEYWORDS, SYNONYMS, stemNL,
                        categorizeIngredient, parseIngredient, labelFor,
                        buildShoppingList, ShoppingListModal
    weekschema/
      index.jsx       — VRAGENLIJST, buildSchemaPrompt, VragenlijstStap,
                        printWeekSchema, ImportSchemaModal, WeekSchemaPanel
    training/
      index.jsx       — MAPS_ROUTINES (Hevy-stijl), tNewWorkoutFromRoutine,
                        lastPerformance, workoutVolume, RestTimer, SetRow,
                        ActiveWorkout, RoutineList, WorkoutHistory,
                        RoutineEditor, TrainingPanel
  app.jsx             — App root: state, routing tussen tabs, FAB-knop
```

### Laadvolgorde in qvolve.html (volgorde is cruciaal)
1. `data/nevo-data.js` (plain JS, geen Babel)
2. `js/lib/utils.jsx`
3. `js/lib/macros.jsx`
4. `js/lib/ai.jsx`
5. `js/lib/off.jsx`
6. `js/lib/icons.jsx`
7. `js/modules/auth/index.jsx`
8. `js/modules/onboarding/index.jsx`
9. `js/modules/dashboard/index.jsx`
10. `js/modules/voeding/index.jsx`
11. `js/modules/boodschappenlijst/index.jsx`
12. `js/modules/weekschema/index.jsx`
13. `js/modules/training/index.jsx`
14. `js/app.jsx`

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
  voegt de sleutel server-side toe en praat met Google. `callGemini()` in
  `js/lib/ai.jsx` POST't enkel `{ prompt, maxTokens }` naar die proxy.
- **De sleutel staat als environment-variabele op Vercel** (`GEMINI_API_KEY`),
  nooit in de client of in de repo. Google deactiveert sleutels die publiek op
  GitHub of in client-code belanden. Optioneel `ALLOWED_ORIGINS` (komma-gescheiden)
  beperkt welke origins de proxy mogen aanroepen.
- AI wordt gebruikt voor: weekschema genereren, maaltijd schatten uit tekst,
  maaltijdsuggestie op basis van resterende macro's.

## Gebruikers & opslag

- Geen centrale database. Alles in `localStorage`, per apparaat.
- Standaardgebruikers (in `DEFAULT_USERS` in `js/modules/auth/index.jsx`):
  Alvin Broers, Anthony Van Goethem, Quinten Brosens, Hanne Nelen.
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
- `shop-state:{slug}:{start}:{end}` — boodschappenlijst staat (afgevinkt, extra's)
- `training-routines:{slug}` — eigen/aangepaste trainingsroutines
- `training-active:{slug}` — lopende workout (overleeft refresh)
- `training-history:{slug}` — voltooide workouts (nieuwste eerst)
- `training-prefs:{slug}` — trainings-defaults (gereserveerd)

(`slug` = naam via `slugifyName()`, bv. "quinten-brosens".)

## Functionaliteit per module

### dashboard (`js/modules/dashboard/index.jsx`)
CalorieSummary (balk + tekst), MacroRing (SVG-donut, toont `gegeten/doel g`),
MacroBreakdownModal (taartdiagram + top-5 per macro), DateNav, KcalAdjuster,
MealTimeSelector.

### voeding (`js/modules/voeding/index.jsx`)
- **AddFoodOverlay**: fullscreen overlay met 4 tabs:
  - *Zoeken* — NEVO + eigen producten (instant) + Open Food Facts (debounced)
    + barcodescan (`html5-qrcode`, lazy van CDN)
  - *Zelf ingeven* — handmatige invoer per 100g, opslaan in eigen lijst
  - *AI-schatting* — vrije tekstbeschrijving → Gemini schat macro's
  - *AI Voorstel* — doel-macro's (standaard = resterend voor die dag) →
    Gemini stelt een maaltijd voor
- **DailyLogList**: dagboek gegroepeerd per eetmoment, + knop per maaltijd
- **RepeatDayModal**: huidige dag kopiëren naar weekdagen voor X weken
- **BarcodeScanner**: camera-overlay via html5-qrcode

### boodschappenlijst (`js/modules/boodschappenlijst/index.jsx`)
Aggregeert gelogde voeding over datumbereik. Groepeert per supermarkt-categorie
(NEVO-groep → NEVO_TO_SHOP, losse ingrediënten → SHOP_KEYWORDS + stemNL).
Functies: normalizeIngredientName, shouldDropIngredient, categorizeIngredient,
parseIngredient (qty+unit+name), labelFor (kg/l boven 1000).
ShoppingListModal: afvinken, hoeveelheid aanpassen, handmatig toevoegen,
extra persoon (factor 0.33–1.0), kopiëren, WhatsApp delen.

### weekschema (`js/modules/weekschema/index.jsx`)
10-staps VRAGENLIJST (budget, variatie, ontbijt, lunch, kooktijd, eetstijl,
dieet, niet_lust, snacks, extra) → buildSchemaPrompt → Gemini genereert 7-daags
schema (JSON). ImportSchemaModal: startdatum snapt naar maandag, weekdag-uitlijning,
X weken herhalen. printWeekSchema: pop-up printvenster.

### training (`js/modules/training/index.jsx`)
Workout-tracker in de stijl van **Hevy**. MAPS Anabolic is voorgeladen als
read-only routines (`MAPS_ROUTINES`): Pre Phase, Phase I/II/III foundational
workouts + 3 trigger sessions, met exacte sets/reps en fase-rusttijden. Eigen
routines zijn bewerkbaar en staan in localStorage.
- **TrainingPanel**: root, view-state `overview | active | history | editor`.
- **RoutineList**: routines gegroepeerd per fase + "Eigen routines"; start/hervat.
- **ActiveWorkout**: live loggen — per oefening setrijen (set# · vorige · kg ·
  reps · ✓). Set afvinken start de **RestTimer** (per-fase rusttijd, +15/-15/skip).
  De "vorige"-kolom toont je laatste prestatie via `lastPerformance(history,…)`.
  Lopende workout wordt live bewaard in `training-active` (overleeft refresh).
- **WorkoutHistory**: voltooide workouts met datum/duur/volume, uitklapbaar.
- **RoutineEditor**: eigen routine maken/bewerken met oefening-picker
  (`MAPS_EXERCISES`).

### auth (`js/modules/auth/index.jsx`)
Login (naam + wachtwoord), sessiebeheer (3 dagen sliding window), wachtwoord
verplicht wijzigen bij eerste login, admin-paneel voor gebruikersbeheer.

### onboarding (`js/modules/onboarding/index.jsx`)
SetupWizard: gewicht/lengte/leeftijd/geslacht/activiteit/doel/macroprofiel
→ calcMacros → opslaan in localStorage.

## Bekende beperkingen

- Omdat alles in `localStorage` zit, is data niet gedeeld tussen apparaten of
  gebruikers. Elk toestel staat op zichzelf.
- Service worker kan oude versies cachen; daarom network-first voor HTML/JS.
  Bump `CACHE` in `sw.js` bij grote wijzigingen (nu `qvolve-v4`).
- Een centrale database (bv. Firebase) zou nodig zijn voor gedeelde gebruikers
  of synchronisatie — bewust nog niet gedaan om het simpel en gratis te houden.

## Werkwijze

- Hou de app werkend zonder build-stap (zie boven).
- Wijzigingen gaan live door te pushen naar GitHub (branch `main`); Vercel
  deployt de site dan automatisch.
- Test na elke grote wijziging of de app nog laadt.
- Elke module is zelfstandig te bewerken; zorg dat globals die je gebruikt
  beschikbaar zijn in eerder geladen bestanden (zie laadvolgorde hierboven).

### Lokaal testen — altijd via een webserver, nooit via `file://`

- Open `qvolve.html` **niet** door te dubbelklikken (`file:///...`). Babel haalt
  de `.jsx`-bestanden op via fetch — dat blokkeert over `file://` → de app toont
  **"Script error. Regel 0"**. Hetzelfde geldt voor de auto-preview die het
  bestand direct opent.
- Start in de plaats de lokale dev-server en open de URL:
  `powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1`
  → `http://localhost:8765/qvolve.html`
- Op echte hosting (Vercel/`https://`) speelt dit niet — daar laadt alles gewoon.
- De proxy-functies (`/api/gemini`, `/api/off-search`) werken niet op de simpele
  dev-server (geen serverless). Wil je AI of OFF-tekstzoeken lokaal testen, gebruik
  `vercel dev`. OFF-zoeken valt op de dev-server terug op het legacy-endpoint (kan
  503 geven); **barcode scannen werkt wél lokaal** (rechtstreekse v2-API met CORS).
