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
githooks/
  pre-commit          — houdt AGENTS.md gelijk aan CLAUDE.md
api/
  gemini.js           — serverless proxy naar Gemini (GEMINI_API_KEY env-var)
  off-search.js       — serverless proxy naar Open Food Facts tekstzoeken
data/
  nevo-data.js        — NEVO_DATA array, 2328 items (geladen vóór alle jsx)
js/
  lib/
    storage.jsx       — lsGet/lsSet/lsDel, isQuotaError, onStorageError,
                        storageUsageBytes, formatBytes
    utils.jsx         — datum-helpers, normalizeMealTime, groupByMeal, loadScript,
                        humanizeCamError, React destructuring
    theme.jsx         — QV kleurtokens + gedeelde vormgeving: Eyebrow, Sheet,
                        PrimaryButton, SettingRow, initialen
    backup.jsx        — keyBelongsToUser, collectUserData, buildExport,
                        buildExportFilename, downloadJson, exportUserData
    image.jsx         — prepareMealPhoto (foto → 1024px JPEG + 160px thumbnail)
    macros.jsx        — MEAL_TIMES, ACTIVITY_FACTORS, GOALS, MACRO_PROFILES,
                        calcBMR, calcMacros, applyKcalToMacros, NEVO_VERSION
    ai.jsx            — callGemini, parseJsonFromAI, estimateFoodWithAI,
                        suggestMealWithAI, analyzeMealPhotoWithAI
    off.jsx           — mapOffProduct, offListToFoods, searchOpenFoodFacts,
                        lookupOffBarcode
    icons.jsx         — icons{} map + Icon({name,size,className}) component
  modules/
    auth/
      index.jsx       — DEFAULT_USERS, loadUsers/saveUsers, loadSession/saveSession/
                        refreshSession, biometrie (bioMogelijk/bioInschrijven/
                        bioAanmelden), LoginShell, VeldKaart, Schakelaar,
                        ScanOverlay, AdminPanel, ChangePwScreen, AccessGate
    onboarding/
      index.jsx       — SetupWizard (profiel invullen, macro's berekenen)
    dashboard/
      index.jsx       — DateNav, KcalHero, SlotBar, MacroDonut,
                        MacroBreakdownModal, KcalAdjuster, MealTimeSelector
    coach/
      index.jsx       — nextMoment, planSuggestion, historySuggestions,
                        coachSuggestions, coachLine, CoachCard,
                        loadCoachSkips/saveCoachSkips
    fotomodus/
      index.jsx       — PhotoTab (maaltijd loggen vanaf een foto)
    voeding/
      index.jsx       — BarcodeScanner, frequentFoods, AddFoodOverlay
                        (stappen: zoeken/afwegen/foto/zelf/AI-schatting/
                        AI-voorstel), DailyLogList, RepeatDayModal
    boodschappenlijst/
      index.jsx       — SHOP_CATEGORIES, SHOP_KEYWORDS, SYNONYMS, stemNL,
                        categorizeIngredient, parseIngredient, labelFor,
                        buildShoppingList, ShoppingListPanel
    weekschema/
      index.jsx       — VRAGENLIJST, buildSchemaPrompt, VragenlijstStap,
                        printWeekSchema, ImportSchemaModal, WeekSchemaPanel
    training/
      index.jsx       — TrainingPlaceholder (nog uit te bouwen)
    gegevens/
      index.jsx       — StorageWarningBanner, DataExportCard
    profiel/
      index.jsx       — ProfilePanel, MacroSettingsSheet, CustomFoodsSheet
  app.jsx             — App root: state, routing tussen de vier tabs, FAB,
                        toast met ongedaan maken
```

### Laadvolgorde in qvolve.html (volgorde is cruciaal)
1. `data/nevo-data.js` (plain JS, geen Babel)
2. `js/lib/storage.jsx`
3. `js/lib/utils.jsx`
4. `js/lib/theme.jsx` (ná utils: `Sheet` gebruikt de React-destructuring daar)
5. `js/lib/backup.jsx`
6. `js/lib/image.jsx`
7. `js/lib/macros.jsx`
8. `js/lib/ai.jsx`
9. `js/lib/off.jsx`
10. `js/lib/icons.jsx`
11. `js/modules/auth/index.jsx`
12. `js/modules/onboarding/index.jsx`
13. `js/modules/dashboard/index.jsx`
14. `js/modules/coach/index.jsx`
15. `js/modules/fotomodus/index.jsx` (vóór voeding: `AddFoodOverlay` rendert `PhotoTab`)
16. `js/modules/voeding/index.jsx`
17. `js/modules/boodschappenlijst/index.jsx`
18. `js/modules/weekschema/index.jsx`
19. `js/modules/training/index.jsx`
20. `js/modules/gegevens/index.jsx`
21. `js/modules/profiel/index.jsx` (ná training en gegevens: gebruikt
    `TrainingPlaceholder` en `DataExportCard`)
22. `js/app.jsx`

## Kleurenschema

De app-schil is **licht**: een warm gebroken wit als paginakleur, met donker navy
als *kaartkleur* — niet meer als header- en navigatiebalk. Het loginscherm en het
admin-paneel blijven wel volledig donker navy.

De hexcodes staan één keer in `js/lib/theme.jsx` als `QV`. Gebruik die waar JS de
kleur nodig heeft (SVG-stroke, inline style); elders dezelfde waarde als Tailwind
arbitrary value, bv. `bg-[#182a48]`.

| Rol | Waarde | Gebruik |
|---|---|---|
| Paginakleur | `#f7f5f0` | achtergrond van elk tabblad |
| Een tint dieper | `#e8e6e1` | `<body>`, buiten de max-width |
| Donker navy | `#182a48` | coachkaart, doelkaart, primaire knop, FAB, toast, loginscherm |
| Diepste navy | `#14223c` | primaire tekst, sheet-waas (`/40`) |
| Secundaire tekst | `#4a5568` | bijschriften |
| Inactief | `#8494aa` | nav-items uit, tertiaire tekst |
| Randen | `#dfe3ea` | kaarten, invoervelden, scheidingslijnen |
| Zacht vlak | `#eef1f6` | chips, donut-spoor |
| Blauwige chip | `#e6ecf6` | avatar, plus/kruis-knopjes |
| Helder blauw | `#2f8bff` | eiwit, afgevinkt, AI-knoppen, de **"Q"** in de wordmark |
| Blauw op licht | `#35507d` / `#1e3a8a` | icoon in een chip / nadruk, cijfers |
| Oranje | `#f97316` | accent **op donker** (coach-eyebrow, toast), de **"volve"** |
| Oranje op licht | `#c2410c` | accent op de lichte schil — donker genoeg voor contrast |
| Vet / koolhydraten | `#f59e0b` / `#6f8fd0` | macro-donuts en taartdiagram |

Let op: gebruik **niet** `#f97316` voor tekst op de lichte achtergrond — daar is
`#c2410c` de juiste tint. `gray-50` en `blue-900/950` zijn niet meer in gebruik.

- **Lettertype:** Rajdhani (Google Fonts) via `.font-logo` — voor cijfers, koppen
  en de nav-labels. Rajdhani gaat tot gewicht 700 (geen 800/900). Lopende tekst
  is `system-ui`. De kleine hoofdletterkopjes staan in `font-mono` en lopen via
  de `Eyebrow`-component.
- Logo: `logo-qvolve.png` (Q-merkteken met oranje pijl), enkel nog op het
  loginscherm; de app-schil heeft geen header meer.
- PWA-iconen (`icon-192.png` / `icon-512.png`) zijn uit dit logo gegenereerd.
- `theme-color` in `qvolve.html` staat op `#f7f5f0` (lichte statusbalk).

### Vormtaal

- Kaarten `rounded-[18px]`, donkere blokken `rounded-[22px]`/`rounded-[26px]`,
  sheets `rounded-t-[32px]`, knoppen `rounded-[20px]` op 56 px hoog.
- Aanraking geeft `active:scale-[.98]` (of `.95` op kleine knoppen), geen hover.
- Bewegingen staan als keyframes in `qvolve.html`: `qv-fade`, `qv-sheet`,
  `qv-card`, `qv-toast`. Ze zijn uitgeschakeld bij `prefers-reduced-motion`.

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
  Alvin Broers, Anthony Van Goethem, Quinten Brosens, Hanne Nelen, Jasha Bosmans.
- `loadUsers()` voegt nieuwe namen uit `DEFAULT_USERS` automatisch toe aan een
  bestaande lokale lijst — zo verschijnen nieuwe gebruikers ook op toestellen die
  de app al kenden.
- Standaardwachtwoord: `Qvolve123!`. Verplichte wijziging bij eerste login
  (min. 8 tekens, niet gelijk aan standaard).
- Admin-paneel via "Beheer" onderaan login. Admin-wachtwoord: `QvolveAdmin!`.
  Toevoegen/verwijderen/resetten van gebruikers. Een reset of verwijdering wist
  ook de biometrische sleutel van die persoon op dit toestel.
- **Onthoud mij op dit toestel** staat standaard aan: de sessie blijft dan staan
  tot je zelf uitlogt. Uit → het oude gedrag, drie dagen sliding window. Een
  sessie van vóór deze schakelaar mist het veld en valt dus terug op drie dagen.
- **Biometrie (WebAuthn).** Na een geslaagde login biedt de app aan om voortaan
  met Face ID, Touch ID, een vingerafdruk of Windows Hello te openen. Het toestel
  maakt en bewaart de sleutel zelf; wij houden alleen het id ervan bij, zodat we
  hem kunnen opvragen. Er is geen server die de handtekening controleert — dit is
  een slot op dit toestel, even sterk als het wachtwoord dat vandaag ook al
  gewoon in `localStorage` staat, niet meer. Vereist een beveiligde context
  (https of localhost); waar dat niet kan, blijft alleen het wachtwoord over.

### localStorage-keys

- `qvolve-users-v2` — gebruikerslijst
- `qvolve-session` — actieve login, `{ name, ts, remember }`. Zonder `remember`
  verloopt ze na drie dagen (sliding window); met `remember` pas bij uitloggen
- `qvolve-bio` — `{ name, credId, ts }`: welke gebruiker op dit toestel een
  biometrische sleutel heeft, en het id waarmee we die opvragen
- `qvolve-bio-skip` — namen die "Nu niet" antwoordden op de vraag om biometrie
  in te stellen; we vragen het hun niet opnieuw
- `profile:{slug}` — profielgegevens
- `macros:{slug}` — berekende macro's
- `daily-log:{slug}:{datum}` — voedingslogboek per dag
- `custom-foods:{slug}` — eigen voedingsmiddelen
- `weekschema-prefs:{slug}` — antwoorden vragenlijst
- `weekschema-plan:{slug}` — gegenereerd weekschema
- `shop-state:{slug}:{start}:{end}` — boodschappenlijst staat (afgevinkt, extra's)
- `meal-photos:{slug}:{datum}` — miniaturen uit de fotomodus, `{ photoId: dataUrl }`
  (één foto per `photoId`, ook als er meerdere items uit herkend zijn)
- `coach-skips:{slug}:{datum}` — eetmomenten die je die dag oversloeg, als array
  van `MEAL_TIMES`-keys; de coachkaart springt eroverheen

(`slug` = naam via `slugifyName()`, bv. "quinten-brosens".)

Alle sleutels hebben de vorm `<soort>:<slug>[:<extra>]`. De export in
`js/lib/backup.jsx` gebruikt precies die vorm om te bepalen wat van wie is;
een nieuwe sleutel die dat patroon volgt, gaat automatisch mee in de back-up.
`qvolve-users-v2`, `qvolve-session`, `qvolve-bio` en `qvolve-bio-skip` volgen het
patroon bewust niet en blijven buiten de export: ze horen bij dít toestel, niet
bij de gegevens van de gebruiker. Een biometrische sleutel kán ook niet mee — hij
verlaat het toestel nooit.

## Navigatie

Vier tabbladen in een lichte bottom-nav (`APP_TABS` in `js/app.jsx`):

| Tab | Inhoud |
|---|---|
| **Vandaag** | datumnavigatie + avatar, groot restcijfer, eetmomentenbalk, coachkaart, tijdlijn |
| **Week** | `WeekSchemaPanel` — vragenlijst of het gegenereerde 7-daags schema |
| **Lijst** | `ShoppingListPanel` — boodschappen uit wat je écht logde |
| **Profiel** | `ProfilePanel` — doel, instellingen, eigen producten, training, export, uitloggen |

De FAB (rechtsonder, boven de nav) staat alleen op Vandaag en opent het
toevoeg-sheet op het eerstvolgende open eetmoment. Elke log-actie geeft een
toast met **Ongedaan** (`z-[60]`, dus boven de sheets op `z-50`); die zet de
volledige vorige dagstand terug, foto's inbegrepen.

## Functionaliteit per module

### dashboard (`js/modules/dashboard/index.jsx`)
DateNav (pijlen + korte datum, tik op de datum = terug naar vandaag), KcalHero
(het grote restcijfer, tikbaar), SlotBar (zes segmenten: blauw gelogd, oranje
het huidige moment, grijs open), MacroDonut, MacroBreakdownModal (bottom sheet:
drie donuts + taartdiagram met doelverhouding + top-5 per macro), KcalAdjuster,
MealTimeSelector.

### coach (`js/modules/coach/index.jsx`)
De donkere kaart bovenaan Vandaag. `nextMoment()` zoekt het eerste eetmoment uit
`MEAL_TIMES` dat niet gelogd én niet overgeslagen is; `coachSuggestions()` geeft
er maximaal twee voorstellen bij, **zonder AI-oproep**:

1. `planSuggestion()` — de maaltijd uit `weekschema-plan:{slug}` voor die
   weekdag en dat eetmoment;
2. `historySuggestions()` — wat je op dat eetmoment het vaakst logde over de
   afgelopen 45 dagen (`COACH_HISTORY_DAYS`).

Daarom is de kaart altijd meteen klaar en werkt ze offline. Overslaan bewaart de
key in `coach-skips:{slug}:{datum}`.

### voeding (`js/modules/voeding/index.jsx`)
- **AddFoodOverlay**: één bottom sheet met stappen, geen tabbalk meer.
  - *Zoeken* (start) — zoekveld + barcode- en fotoknop; daaronder pillen naar
    Zelf ingeven, AI-schatting en AI-voorstel. Leeg zoekveld toont
    **"Wat je vaak eet"** (`frequentFoods`: namen uit je recente logboek
    opgezocht in de zoekpool, plus je eigen producten). Getypt: NEVO + eigen
    producten (instant) en Open Food Facts (debounced).
  - *Afwegen* — het gram-scherm: −/+ per 10 g, tikbaar cijfer, portiechips en
    een navy strook met de doorgerekende macro's. Bevestigen logt en keert terug
    naar Zoeken, zodat een maaltijd met meerdere ingrediënten in één keer gaat.
    Producten met een vaste portie slaan deze stap over.
  - *Foto* — `PhotoTab` uit de fotomodus-module (zie hieronder)
  - *Zelf* — handmatige invoer per 100g, opslaan in eigen lijst
  - *AI-schatting* — vrije tekstbeschrijving → Gemini schat macro's
  - *AI-voorstel* — doel-macro's (standaard = resterend voor die dag) →
    Gemini stelt een maaltijd voor
- **DailyLogList**: tijdlijn per eetmoment. Logregels hebben geen kloktijd, dus
  in de linkerkolom staat `MEAL_TIMES[].short` waar het ontwerp een tijdstip
  toont. Elk moment houdt zijn eigen plus-knop.
- **RepeatDayModal**: huidige dag kopiëren naar weekdagen voor X weken
- **BarcodeScanner**: camera-overlay via html5-qrcode

### fotomodus (`js/modules/fotomodus/index.jsx`)
`PhotoTab` — foto van een maaltijd → Gemini herkent de losse gerechten. De
native camera van de telefoon legt vast (`<input type="file" capture>`), niet
een eigen viewfinder. De AI geeft per item de macro's **per 100 g** plus een
geschat gewicht; het gram-veld herrekent lokaal, zoals bij NEVO-producten. Elk
item is aan/uit te vinken. Bevestigen levert logregels met `source: 'ai-photo'`,
een gedeeld `photoId` en de miniatuur in `_thumb` — die laatste wordt in
`app.jsx` van de regel gestript en apart opgeslagen.

### boodschappenlijst (`js/modules/boodschappenlijst/index.jsx`)
Aggregeert gelogde voeding over datumbereik. Groepeert per supermarkt-categorie
(NEVO-groep → NEVO_TO_SHOP, losse ingrediënten → SHOP_KEYWORDS + stemNL).
Functies: normalizeIngredientName, shouldDropIngredient, categorizeIngredient,
parseIngredient (qty+unit+name), labelFor (kg/l boven 1000).
ShoppingListPanel (het **Lijst**-tabblad, geen modal meer): afvinken, hoeveelheid
aanpassen, handmatig toevoegen, kopiëren, WhatsApp delen. Periode en extra
persoon (factor 0.33–1.0) zitten achter de uitklapper "Periode en personen",
zodat de lijst zelf de bladzijde vult.

### weekschema (`js/modules/weekschema/index.jsx`)
10-staps VRAGENLIJST (budget, variatie, ontbijt, lunch, kooktijd, eetstijl,
dieet, niet_lust, snacks, extra) → buildSchemaPrompt → Gemini genereert 7-daags
schema (JSON). Het **Week**-tabblad toont daarna de zeven dagpillen met de
maaltijdkaarten en het dagtotaal. De dagnummers zijn die van de *lopende* week
(`mondayOf(vandaag)`): zo landt het schema precies zoals je het ziet wanneer je
het importeert. ImportSchemaModal: startdatum snapt naar maandag,
weekdag-uitlijning, X weken herhalen. printWeekSchema: pop-up printvenster.
De AI-boodschappenlijst uit het schema zit achter de knop "AI-lijst" — die is
iets anders dan het Lijst-tabblad, dat op je échte logboek werkt.

### training (`js/modules/training/index.jsx`)
Placeholder — nog uit te bouwen. Bereikbaar via een rij op het profieltabblad;
de bottom-nav houdt de vier tabs uit het ontwerp.

### profiel (`js/modules/profiel/index.jsx`)
ProfilePanel: avatar met initialen, navy doelkaart (doel, kcal, eiwit, tekort in
%), en de instellingsrijen. MacroSettingsSheet stelt het caloriedoel bij
(KcalAdjuster) en laat het profiel opnieuw invullen; CustomFoodsSheet toont en
verwijdert je eigen producten. Daaronder de DataExportCard.

### auth (`js/modules/auth/index.jsx`)
Loginscherm uit het ontwerp: donkere kop met logo, wordmark en tagline, daaronder
een licht vel (`LoginShell`) dat overloopt in de app. Twee toestanden — nog geen
sleutel op dit toestel (naam, wachtwoord, "onthoud mij", Start), of wel een
sleutel (avatartegel met initialen, "Aanmelden met Face ID", terugvalknop naar
het wachtwoord, "Niet jij? Ander account"). Verder: sessiebeheer, verplicht
wachtwoord kiezen bij de eerste login, en het admin-paneel als bottom sheet.
`ScanOverlay` toont het scanvenster zolang het toestel om je gezicht of vinger
vraagt. "Wachtwoord vergeten" klapt een uitleg open in plaats van een e-mail te
sturen: er is geen server, een reset gebeurt via Beheer.

### onboarding (`js/modules/onboarding/index.jsx`)
SetupWizard: gewicht/lengte/leeftijd/geslacht/activiteit/doel/macroprofiel
→ calcMacros → opslaan in localStorage.

## Bekende beperkingen

- Omdat alles in `localStorage` zit, is data niet gedeeld tussen apparaten of
  gebruikers. Elk toestel staat op zichzelf. De exportknop op het profieltabblad
  geeft alles als JSON-bestand mee; loopt het browserquotum vol, dan verschijnt
  bovenaan een waarschuwing in plaats van een stille blokkade.
- Service worker kan oude versies cachen; daarom network-first voor HTML/JS.
  Bump `CACHE` in `sw.js` bij grote wijzigingen (nu `qvolve-v10`).
- De coachvoorstellen komen uit het weekschema en je loggeschiedenis. Een nieuwe
  gebruiker zonder schema krijgt daarom alleen de zoekknop te zien — dat is
  bedoeld, niet stuk.
- Een centrale database (bv. Firebase) zou nodig zijn voor gedeelde gebruikers
  of synchronisatie — bewust nog niet gedaan om het simpel en gratis te houden.

## Werkwijze

- Hou de app werkend zonder build-stap (zie boven).
- Wijzigingen gaan live door te pushen naar GitHub (branch `main`); Vercel
  deployt de site dan automatisch.
- Test na elke grote wijziging of de app nog laadt.
- Elke module is zelfstandig te bewerken; zorg dat globals die je gebruikt
  beschikbaar zijn in eerder geladen bestanden (zie laadvolgorde hierboven).

### Projectregels: `CLAUDE.md` is de bron, `AGENTS.md` de kopie

Claude Code leest `CLAUDE.md`, Codex leest `AGENTS.md`. Ze moeten identiek zijn,
dus **bewerk altijd `CLAUDE.md`** — `githooks/pre-commit` kopieert hem bij elke
commit naar `AGENTS.md` en zet die mee in de commit. Bewerk je per ongeluk enkel
`AGENTS.md`, dan blokkeert de hook de commit in plaats van je werk te
overschrijven.

De hook zit in `githooks/` in plaats van `.git/hooks/`, zodat hij mee de repo in
gaat. Eenmalig per kloon aanzetten:

```
git config core.hooksPath githooks
```

`.gitattributes` pint beide bestanden op LF; zonder dat ziet de hook op Windows
een verschil dat er niet is.

### Claude Code-hulpmiddelen (`.claude/`)

Deze map is versiebeheerd (alleen `settings.local.json`, `cost-log.json`,
`tools/` en `worktrees/` zijn genegeerd, net als `.superpowers/`, `.agents/` en
`.codex/` in de projectroot), zodat de hulpmiddelen mee in de repo zitten:

- `serve.ps1` — de lokale dev-server (zie hieronder).
- `hooks/check-jsx.js` — PostToolUse-hook, de vervanger voor de ontbrekende
  build-stap. Compileert elk gewijzigd `.jsx` met dezelfde Babel-versie en
  presets als `qvolve.html`, controleert `.js` met de V8-parser, en meldt een
  `js/**/*.jsx` dat niet als `<script>` in `qvolve.html` staat. Babel-standalone
  wordt één keer gedownload naar `.claude/tools/`; zonder netwerk slaat de hook
  de jsx-controle over in plaats van te blokkeren.
- `checks/` — kale node-controles zonder afhankelijkheden, voor de logica die
  niet in de browser hoeft: `node .claude/checks/storage.check.mjs` en
  `node .claude/checks/backup.check.mjs`. `harness.mjs` laadt een lib in een
  vm-context met een nagebootste `localStorage`. Fase 2 zet hier een echte
  testrunner naast en neemt deze gevallen over.
- `skills/preview/` — `/preview`: server starten, app in de browser laden,
  console-fouten nakijken. Bevat ook het recept om de login over te slaan.
- `skills/deploy/` — `/deploy`: `CACHE` in `sw.js` bumpen, committen, pushen.
- `agents/qvolve-reviewer.md` — reviewer die de projectregels kent (geen
  build-stap, globals en laadvolgorde, kleurenschema, Gemini-model, localStorage-keys).
- `.mcp.json` in de root voegt **context7** toe voor live documentatie van
  Vercel, Gemini, Open Food Facts en html5-qrcode.

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
