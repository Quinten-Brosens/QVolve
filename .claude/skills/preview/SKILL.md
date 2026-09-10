---
name: preview
description: Start de lokale dev-server en controleer via de browser of Qvolve laadt zonder console-fouten. Gebruik dit na elke grote wijziging, voor je iets als af beschouwt.
disable-model-invocation: true
---

# Qvolve lokaal bekijken en testen

Qvolve heeft geen build-stap en geen tests: of de app werkt, blijkt pas in de
browser. Deze skill doet die controle in vaste stappen.

**Open `qvolve.html` nooit rechtstreeks (`file://`).** Babel haalt de
`.jsx`-bestanden via fetch op; dat blokkeert over `file://` en de app toont dan
"Script error. Regel 0" — een fout die niets met de code te maken heeft.

## 1. Server starten

Start op de achtergrond (`run_in_background`), zodat de sessie niet blokkeert:

```
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1
```

De server logt elke request. Draait er al iets op poort 8765, dan meldt het
script dat en stopt het — hergebruik die server dan gewoon.

## 2. App openen

Navigeer met Playwright naar `http://localhost:8765/qvolve.html`.

De service worker registreert zich niet op localhost (bewust, zie `qvolve.html`),
dus je ziet altijd de verse code.

## 3. Console lezen — dit is de eigenlijke test

Vraag de console-berichten op. Let op:

- **"Fout bij laden"** in de pagina zelf → `window.onerror` sloeg aan; de tekst
  bevat de melding en het regelnummer.
- **`X is not defined`** → een module gebruikt een global uit een bestand dat
  later in `qvolve.html` staat, of het bestand staat er niet in. Volgorde
  aanpassen, niet de code.
- **404 op een `.jsx`** → script-tag verwijst naar een pad dat niet bestaat.
- Verwacht en onschuldig: waarschuwingen van de Tailwind-CDN en van Babel over
  in-browser compilatie.

Rapporteer console-fouten letterlijk. Geen fouten en een zichtbaar loginscherm =
de app laadt.

## 4. Doorklikken naar het dashboard

Het loginscherm dwingt een wachtwoordwijziging af bij de eerste login, wat elke
test drie extra stappen kost. Sla dat over door de sessie te zetten
(wachtwoorden staan als platte tekst in localStorage) en te herladen:

```js
localStorage.setItem('qvolve-users-v2', JSON.stringify(
  [{ name: 'Quinten Brosens', password: 'Testpw123!', mustChangePw: false }]));
localStorage.setItem('qvolve-session', JSON.stringify(
  { name: 'Quinten Brosens', ts: Date.now(), remember: true }));
```

Bestaat er nog geen profiel, dan komt de `SetupWizard` — vul die één keer door,
of zet `profile:quinten-brosens` en `macros:quinten-brosens` rechtstreeks.

## 5. Wat je wél in de browser moet nakijken

Neem een screenshot op mobiel formaat (**390×844**) — de app is mobile-first en
alleen zo zie je de echte layout. Test daarna het onderdeel dat je gewijzigd hebt:

| Wijziging in            | Kijk na                                                        |
|-------------------------|----------------------------------------------------------------|
| `voeding`               | Zoek-sheet openen, product kiezen, gram-scherm, toevoegen + toast |
| `dashboard`             | Tik het grote restcijfer → macro-sheet met drie donuts        |
| `coach`                 | Kaart toont het juiste eetmoment; overslaan schuift door        |
| `boodschappenlijst`     | Lijst-tab: categorieën, afvinken, hoeveelheid aanpassen        |
| `weekschema`            | Vragenlijst doorlopen; dagpillen; printvenster opent            |
| `profiel`               | Doelkaart, instellingsrijen, sheets openen, uitloggen           |
| `auth` / `onboarding`   | Login, wachtwoordwijziging, wizard — met lege localStorage      |
| biometrie in `auth`     | Zet een virtuele authenticator op (zie hieronder), anders zie je alleen het wachtwoordscherm |

## Wat hier niet werkt

`/api/gemini` en `/api/off-search` zijn Vercel-functies en bestaan niet op deze
server: de dev-server geeft er 501 op. Alles met AI (weekschema, AI-schatting,
AI-voorstel) en OFF-tekstzoeken test je met `vercel dev`. **Barcode scannen
werkt hier wel** — dat gaat rechtstreeks naar de OFF v2-API met CORS.

## 7. Biometrie testen zonder toestel

WebAuthn heeft een echte gezichts- of vingerafdruksensor nodig. In Chromium zet
je er een na via CDP, waarna in- en uitschrijven gewoon werken:

```js
const client = await page.context().newCDPSession(page);
await client.send('WebAuthn.enable');
await client.send('WebAuthn.addVirtualAuthenticator', { options: {
  protocol: 'ctap2', transport: 'internal', hasResidentKey: true,
  hasUserVerification: true, isUserVerified: true,
  automaticPresenceSimulation: true } });
```

Zonder die stap meldt `bioMogelijk()` netjes `false` en toont het loginscherm
enkel naam + wachtwoord — dat is ook wat een oude laptop te zien krijgt.
