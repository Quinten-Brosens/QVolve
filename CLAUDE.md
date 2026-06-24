# Qvolve

Nederlandstalige fitness- en voedingstracker. Mobile-first web-app, draait als
installeerbare PWA. Gehost op GitHub Pages, geen backend.

Slogan: **Train. Fuel. Recover. Evolve.**

## Hosting & architectuur

- Volledig client-side. Geen server, geen build-stap.
- Eén HTML-bestand laadt React, Babel en Tailwind via CDN en draait een
  `<script type="text/babel">` blok dat in de browser wordt gecompileerd.
- Gehost op GitHub Pages: `https://quinten-brosens.github.io/QVolve/qvolve.html`
- **Belangrijk:** alles moet blijven werken zonder build-proces. Introduceer geen
  bundler, geen npm-build en geen `import`/`export` in de browser-scripts —
  GitHub Pages serveert de bestanden rechtstreeks. Als opsplitsen losse JS-bestanden
  oplevert, laad die dan via `<script>`-tags, niet via ES-modules.
- Na het opsplitsen: test dat de app nog laadt vóór je een wijziging als af beschouwt.

## Bestanden

- `qvolve.html` — de volledige app (wordt opgesplitst voor onderhoudbaarheid).
- `manifest.json` — PWA-manifest (naam, kleuren, icon-verwijzingen).
- `sw.js` — service worker. **Network-first voor HTML** zodat updates meteen
  doorkomen; cache-first voor iconen/manifest. Cacheversie staat in `CACHE` (nu `qvolve-v2`).
  Bump die versie bij grote wijzigingen.
- `icon-192.png`, `icon-512.png` — PWA-iconen (donkerblauwe achtergrond, witte Q).

## Kleurenschema

- Donkerblauw (`blue-900` / `blue-950`): header, bottom-nav, loginscherm, admin-paneel.
- Oranje (`orange-500` / `orange-400`): knoppen, acties, actieve states, het "volve" in het logo.
- Wit: de "Q" in het logo, nav-labels, tekst op donkere zones.
- Lichtgrijs (`gray-50`): content-achtergrond.
- Logo: "Q" is wit, "volve" is oranje.

## AI-functies (Google Gemini)

- Model: **`gemini-2.5-flash`**. Gebruik niet `gemini-1.5-flash` — dat model is
  door Google uitgeschakeld en geeft 404.
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- Authenticatie via de **`x-goog-api-key` header**, niet via `?key=` in de URL.
  De header-methode werkt met de nieuwe Google-sleutels die met `AQ.` beginnen.
- Elke gebruiker stelt een eigen gratis Gemini-sleutel in via het ⚙️-icoon in de
  header. Opgeslagen lokaal onder de key `qvolve-gemini-key`.
- **Geen API-sleutel hardcoden in de broncode.** Google deactiveert sleutels die
  publiek op GitHub belanden. De setup-flow (`SettingsModal`) test de sleutel met
  een mini-aanvraag voor hij wordt opgeslagen.
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
- `qvolve-gemini-key` — Gemini API-sleutel (per apparaat)
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
- Wijzigingen gaan live door te pushen naar GitHub (branch `main`); GitHub Pages
  werkt de site dan automatisch bij.
- Test na elke grote wijziging of de app nog laadt.
