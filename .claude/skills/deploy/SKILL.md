---
name: deploy
description: Zet de huidige wijzigingen live op Vercel — service-worker-cache bumpen, committen en pushen naar main.
disable-model-invocation: true
---

# Qvolve live zetten

Pushen naar `main` is deployen: Vercel bouwt automatisch en de vier gebruikers
krijgen de nieuwe versie. Er is geen staging. Doorloop daarom deze stappen in
deze volgorde en sla er geen over.

## 1. Controleer dat de app laadt

Draai eerst `/preview`. Een gebroken push is meteen zichtbaar voor iedereen,
want er zit geen build-stap of test tussen die het zou tegenhouden.

Vraag het de gebruiker als je de app niet zelf gecontroleerd hebt — beweer nooit
dat het werkt zonder het gezien te hebben.

## 2. Bekijk wat er weggaat

```
git status --short
git diff
```

Loop de diff na op de projectregels: geen `import`/`export` in browser-scripts,
gebruikte globals staan in een bestand dat *eerder* in `qvolve.html` geladen
wordt, nieuwe `.jsx`-modules staan als `<script>` in `qvolve.html`.

## 3. Bump de service-worker-cache

Bij elke wijziging in HTML, JS of JSX: verhoog `CACHE` in `sw.js` met één
(`qvolve-v6` → `qvolve-v7`). De fetch-strategie is network-first voor die
bestanden, maar de oude cache blijft anders als fallback rondhangen — en een
gebruiker met de PWA op zijn beginscherm zit dan op oude code.

Alleen `manifest.json`, iconen of de proxies in `api/` gewijzigd? Dan hoeft het niet.

## 4. Commit

Nederlandse commit-boodschap, in de stijl van de bestaande historie: een prefix
per module, dan wat er functioneel verandert.

```
Voeding: toon alle macro's per zoekresultaat
Docs: CLAUDE.md bijgewerkt met module-structuur
```

Sluit af met de `Co-Authored-By`-regel.

## 5. Push en controleer

```
git push origin main
```

Meld daarna aan de gebruiker dat Vercel aan het deployen is en dat de nieuwe
versie na een harde herlaad zichtbaar is. Wacht op vraag de deploy af met
`gh run list` of laat de gebruiker het Vercel-dashboard bekijken.

## Nooit doen

- **Geen sleutels committen.** `GEMINI_API_KEY` hoort als environment-variabele
  op Vercel, nooit in de client of in de repo. Google deactiveert sleutels die
  publiek op GitHub belanden. Zie je een sleutel in de diff: stop en meld het.
- **Niet force-pushen naar `main`.**
- **Geen `package.json`, bundler of npm-build toevoegen** om iets te laten
  werken. De front-end moet zonder build-stap blijven draaien.
