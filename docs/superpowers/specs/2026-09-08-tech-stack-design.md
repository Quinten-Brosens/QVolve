# Qvolve — Tech stack en migratieplan

**Datum:** 2026-09-08
**Status:** goedgekeurd in gesprek, klaar voor implementatieplan
**Aanleiding:** doorlichting van de stack met het oog op echte gebruikers buiten de
eigen groep.
**Omvang:** dit document is de richting, niet één werkpakket. Elke fase uit sectie 7
krijgt haar eigen implementatieplan; er wordt er telkens één tegelijk uitgewerkt, te
beginnen met fase 0.

---

## 1. Uitgangspunt

Qvolve draait vandaag zonder build-stap: React, Babel en Tailwind komen van een CDN,
`.jsx` wordt in de browser gecompileerd, alle data zit in `localStorage`. Dat was de
juiste keuze voor een app voor vier mensen: nul toolchain-onderhoud en pushen naar
`main` is deployen.

Die opzet loopt vast op drie punten:

1. **Data is niet veilig en niet gedeeld.** `localStorage` is per toestel. Safari op
   iOS wist site-opslag na ongeveer zeven dagen inactiviteit als de PWA niet op het
   startscherm staat. Er is geen backup, geen export, geen sync. De "login" is
   schijn: wachtwoorden staan in leesbare vorm in `js/modules/auth/index.jsx` en in
   `localStorage`.
2. **De opstarttijd op mobiel.** Elke koude start haalt Babel-standalone (2,8 MB),
   de Tailwind play-CDN, React via unpkg en `data/nevo-data.js` (357 KB) op, en
   compileert daarna ongeveer 110 KB JSX op het toestel zelf. Bovendien werkt de PWA in
   de praktijk niet offline: `sw.js` doet network-first voor `.js`/`.jsx` met
   `fetch().catch(caches.match(...))`, maar zet die bestanden nooit in de cache — zonder
   netwerk valt de app terug op een lege cache.
3. **De AI-sleutel staat open.** `api/gemini.js` heeft geen authenticatie en geen
   rate limit. `ALLOWED_ORIGINS` filtert op de `Origin`-header, en die is triviaal te
   spoofen. Wie de URL kent, heeft een gratis Gemini-endpoint op onze rekening.

Sinds de fotomodus (commits `c263f0d`–`c584449`) is er een vierde punt met een datum
erop: `js/lib/image.jsx` bewaart miniaturen van 160 px als data-URL onder
`meal-photos:{slug}:{datum}`. Bij ruwweg 5–8 KB per miniatuur en een browserquotum van
ongeveer 5 MB zit de grens rond 500–800 foto's — bij drie maaltijden per dag ergens
tussen een half jaar en een jaar. Loopt het quotum vol, dan gooit `setItem` een
`QuotaExceededError`; niet opgevangen blokkeert dat *alle* opslag, niet enkel foto's.

## 2. Doelen

Vastgelegd in het gesprek:

- **Echt product met gebruikers** buiten de eigen groep, mogelijk ooit betalend.
- **Geen deadline** — kwaliteit boven snelheid, in fases die de app werkend houden.
- **Toekomstgericht en onderhoudsvriendelijk.**
- **Optimaal voor mobiel**, met als expliciete ambitie: **ooit echt in de App Store en
  Play Store**, inclusief koppeling met Apple Health / Google Fit.
- **De webversie blijft even belangrijk** als de app.

## 3. Gekozen richting

Eén codebase, twee doelen: de website en — later — een echte app uit dezelfde map.

| Laag | Keuze | Rol |
|---|---|---|
| Bouwen | **Vite** | Bundelt vooraf; geen compileerwerk meer op het toestel |
| Scherm | **React + Tailwind** (blijft) | Bestaande componenten blijven ongewijzigd |
| Data en login | **Supabase**, EU-regio | Postgres, auth, row level security, fotoopslag |
| Serverwerk | **Vercel functions** (blijft) | Gemini-proxy, straks achter een slot |
| App-versie | **Capacitor**, fase 5 | iOS/Android-build uit dezelfde codebase |

### Verworpen alternatieven

**Herbouw op Next.js.** Er is precies één stuk serverlogica (de Gemini-proxy) en geen
SEO-behoefte, want de app zit achter een login. Een framework-migratie kost de volle
prijs voor voordelen die nu niet gebruikt worden, en riskeert de moeizaam opgebouwde
domeinlogica: de NEVO-mapping, `categorizeIngredient` met `stemNL`, de kJ-naar-kcal-correctie,
`buildShoppingList`, `buildSchemaPrompt`. Vanuit de gekozen richting blijft de stap naar
Next.js klein als er ooit een publieke marketingpagina of server-side AI-orkestratie komt.

**Alleen Supabase erbij, zonder build-stap.** Lost punt 1 en 3 op, maar laat punt 2
staan: de Babel-download blijft, tests en types blijven onmogelijk, en de afhankelijkheid
van unpkg blijft. Precies de twee doelen "optimaal voor mobiel" en "onderhoudsvriendelijk"
blijven dan onopgelost.

**React Native / Expo.** Beste app-gevoel, maar de webversie wordt dan het stiefkind.
Dat is de omgekeerde prioriteit van wat is vastgelegd.

## 4. Wat de store-ambitie verandert

De build-stap gaat van verstandig naar **verplicht**. Apple staat niet toe dat een app
programmacode van het internet haalt en ter plaatse uitvoert — precies wat Babel nu doet
met de `.jsx`-bestanden. Zonder build-stap is de App Store geen optie.

Apple weigert daarnaast apps die enkel een website in een venster zijn (guideline 4.2,
"minimum functionality"). Er moet dus native functionaliteit zijn. De kandidaten liggen
al klaar: de bestaande barcodescanner wordt de native camerascanner, Apple Health /
Google Fit levert gewicht en verbruikte calorieën, en meldingen herinneren aan loggen.
Geen daarvan is nodig om te beginnen; ze horen in fase 5.

**Twee zaken moeten nu al goed staan, anders bijten ze in fase 5:**

- In een Capacitor-app draait de code niet op het eigen domein maar lokaal op het
  toestel. Relatieve verwijzingen zoals `/api/gemini` werken daar niet. Alle
  API-aanroepen moeten via één instelling met het volledige adres lopen.
- Alles wat nu tijdens gebruik van een CDN komt (Tailwind, React, `html5-qrcode`) moet
  ingebakken worden.

Beide worden in fase 1 meegenomen.

### Kosten

Supabase gratis tot ver voorbij de huidige schaal (betalen begint rond 500 MB data).
Vercel gratis, zoals nu. Apple Developer Program **99 euro per jaar**, Google Play **25
dollar eenmalig** — beide pas nodig op de dag dat er effectief gepubliceerd wordt.

## 5. Architectuurprincipes (vervangt de huidige regels)

De regel *"Introduceer geen bundler, geen npm-build en geen import/export"* in
`CLAUDE.md` is geschreven voor de vorige ambitie en wordt in fase 1 vervangen. Dat is in
het gesprek expliciet goedgekeurd. De nieuwe regels:

1. **Eén codebase voor web en app.** Niets mag aannemen dat het in een browser op een
   eigen domein draait.
2. **Geen code van derden tijdens gebruik ophalen.** Alle afhankelijkheden zijn
   build-time afhankelijkheden.
3. **Alle opslag loopt via één module.** Componenten weten niet waar data vandaan komt.
4. **Rekenlogica is getest.** Alles wat rekent of categoriseert heeft tests; UI niet
   verplicht.
5. **Elke fase eindigt met een werkende, gedeployde app.**

## 6. Datamodel (eerste opzet, definitief in fase 4)

Eén rij per gebruiker gekoppeld aan `auth.users`. Row level security op elke tabel:
`user_id = auth.uid()`, zonder uitzonderingen.

| Tabel | Vervangt | Inhoud |
|---|---|---|
| `profiles` | `profile:{slug}` | naam, gewicht, lengte, leeftijd, geslacht, activiteit, doel, macroprofiel |
| `macro_targets` | `macros:{slug}` | berekende macro's plus kcal-correctie |
| `food_log` | `daily-log:{slug}:{datum}` | één rij per gelogd item: datum, eetmoment, naam, gram, kcal/P/K/V, `source`, `photo_id` |
| `custom_foods` | `custom-foods:{slug}` | eigen producten per 100 g |
| `week_plans` | `weekschema-prefs/-plan:{slug}` | antwoorden vragenlijst plus gegenereerd schema |
| `shop_state` | `shop-state:{slug}:{start}:{end}` | afgevinkte items, extra's, personenfactor |
| `ai_usage` | — | teller per gebruiker per dag, voor de rate limit |
| Storage-bucket `meal-photos` | `meal-photos:{slug}:{datum}` | `{user_id}/{photo_id}.jpg`, privaat |

`qvolve-users-v2` en `qvolve-session` verdwijnen: Supabase auth neemt beide over.

De trainingsmodule krijgt haar eigen tabellen (`exercises`, `workouts`, `workout_sets`)
en wordt bewust pas na fase 4 uitgebouwd, zodat maanden progressiedata meteen veilig
staan.

## 7. Fases

Na elke fase is de app werkend en gedeployd. Er is geen moment waarop niet gelogd kan
worden.

### Fase 0 — Veiligheidsnet
- Exportknop: alle gegevens van de ingelogde gebruiker als JSON-download.
- `QuotaExceededError` opvangen rond alle schrijfacties, met een begrijpelijke melding
  in plaats van een stille blokkade.

*Klaar als:* de export een volledig bestand oplevert en een vol quotum de app niet meer
onbruikbaar maakt.

### Fase 1 — Build-stap
- Vite erin, Babel-standalone eruit, `.jsx` naar echte imports, module per module.
- Tailwind, React en `html5-qrcode` als build-afhankelijkheid in plaats van CDN.
- Alle API-aanroepen via één configuratiepunt met volledig adres.
- Service worker herzien zodat offline effectief werkt.
- `CLAUDE.md` herschreven naar de nieuwe werkwijze.

*Klaar als:* de app zonder netwerk opent, de Babel-download weg is, en een build plus
push naar `main` nog altijd automatisch deployt via Vercel.

### Fase 2 — Tests op de rekenlogica
Testrunner opzetten en tests schrijven voor `calcBMR`/`calcMacros`/`applyKcalToMacros`,
de kJ-naar-kcal-correctie in `mapOffProduct`, `parseIngredient`, `categorizeIngredient`
plus `stemNL`, `buildShoppingList`, `labelFor`, en de datumhelpers in `utils.jsx`.

*Klaar als:* één commando de rekenlogica controleert en in CI loopt bij elke push.

### Fase 3 — Opslaglaag afzonderen
Alle `lsGet`/`lsSet`/`lsDel`-aanroepen verhuizen naar één module met een expliciete
interface per soort gegeven. Componenten raken `localStorage` niet meer aan.

*Klaar als:* `localStorage` nergens buiten die ene module nog voorkomt, en de app
zichtbaar identiek werkt.

### Fase 4 — Supabase
- Project in een EU-regio, tabellen uit sectie 6, RLS op alles.
- Echte auth; de plaintext-wachtwoorden en het admin-paneel verdwijnen.
- Foto's naar de storage-bucket, niet meer als data-URL in de opslag.
- Eenmalige migratie: bij de eerste login zet de app bestaande `localStorage`-data over
  en markeert dat als gebeurd. Niemand verliest historiek, foto's, weekschema's of eigen
  producten.
- `api/gemini.js` verifieert het Supabase-token en handhaaft een limiet per gebruiker per
  dag via `ai_usage`. `api/off-search.js` idem.
- Offline schrijven (zie sectie 8).

*Klaar als:* op twee toestellen inloggen dezelfde data toont, de oude data mee is
verhuisd, en de proxy zonder geldige login weigert.

### Fase 5 — Klaar voor de stores *(pas op verzoek)*
Capacitor eromheen, native barcodescanner, Apple Health / Google Fit, pushmeldingen.
Vanaf hier lopen de store-kosten.

## 8. Offline en conflicten

Loggen gebeurt in een keuken of een sportzaal, waar het bereik vaak slecht is. Daarom:
**schrijven gaat altijd eerst lokaal**, en wordt daarna naar Supabase gestuurd zodra er
verbinding is (een eenvoudige wachtrij). Voor de gebruiker is dat onzichtbaar; loggen
werkt altijd.

Dit geldt **alleen voor `food_log` en later de trainingslogs** — de dingen die je
onderweg doet. Profiel, macro's, weekschema en boodschappenlijst gaan rechtstreeks naar
de server. Elke extra plek met een wachtrij is een extra plek waar iets kan botsen.

Bij gelijktijdige wijziging op twee toestellen **wint de laatste schrijfactie**. In de
praktijk logt niemand hetzelfde ontbijt tegelijk op telefoon en laptop; iets slimmers
kost veel en lost een probleem op dat we niet hebben.

## 9. Beveiliging en AVG

Zodra er gebruikers buiten de eigen groep bijkomen, valt Qvolve niet meer onder de
huishoudelijke uitzondering van de AVG. Gewicht, lengte, leeftijd, voedingsinname en
trainingsdata zijn gezondheidsgegevens — artikel 9, bijzondere categorie. Nodig vóór de
eerste externe gebruiker:

- Supabase-project in een **EU-regio** (daarom die keuze nu, niet later).
- Verwerkersovereenkomst met Supabase en Vercel.
- Privacyverklaring en expliciete toestemming bij registratie.
- Exportfunctie (bestaat na fase 0) en een **volledige verwijderfunctie**, inclusief
  foto's uit de storage-bucket.
- Bewaartermijn vastleggen voor accounts die niemand meer gebruikt.

Verder: RLS op elke tabel, privé storage-bucket, en de AI-proxy achter authenticatie met
een dagelijkse limiet.

## 10. Wat we bewust niet doen

TypeScript vanaf dag één (start met JS plus JSDoc; per bestand omschakelen kan later).
Next.js. React Native. Foutmeldingsdienst. Bezoekersstatistieken. Designsysteem.
Meertaligheid. Realtime samenwerking. Slimmere conflictoplossing. Allemaal verdedigbaar,
geen ervan nodig voor deze fases — en elk past er later bij zonder herbouw, wat precies
is waarvoor fase 1 en 3 betalen.

## 11. Kleiner onderhoud, mee te nemen onderweg

- `CLAUDE.md` vermeldt `qvolve-v4` als service-worker-cache, `sw.js` staat op `qvolve-v7`.
- `Logo Qvolve.png` en `logo-qvolve.png` zijn byte-identiek (2 x 973 KB in de repo).
- `data/nevo-data.js` (357 KB) wordt bij elke start volledig geladen; kandidaat om lazy
  te laden of naar de server te verplaatsen (fase 1 of later).

## 12. Openstaande vragen

- Trainingsmodule: welke oefeningen-database? Dat is de volgende grote datasetkeuze en
  hoort in een eigen brainstorm, na fase 4.
- Registreren nieuwe gebruikers zichzelf, of op uitnodiging? Bepaalt de auth-instelling
  in fase 4.
- Domeinnaam vóór de store-fase? Beïnvloedt de app-id en is achteraf lastig te wijzigen.
