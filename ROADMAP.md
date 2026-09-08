# Roadmap

Openstaand werk aan Qvolve. Eén kop per item, met genoeg detail om het koud op
te pikken.

## AI foto-modus — echte herkenning nog testen

**Status:** code af en gepusht op `feature/ai-foto-modus` (9 commits). Nog niet
gemerged naar `main`.

De hele flow is geverifieerd met een **gestubde** AI-respons: tabs, itemlijst,
gram-herberekening, opslag van de miniatuur en het opruimen ervan. Wat nog nooit
gedraaid heeft, is de echte call naar Gemini met een foto. Dat kan niet lokaal —
de dev-server serveert geen serverless functies en geeft 501 op `/api/gemini`.

**Zo test je het:**

1. Open de Vercel preview-URL van `feature/ai-foto-modus` op een telefoon.
2. Inloggen → FAB → tab **Foto** → foto van een echte maaltijd.

**Waar het op vastloopt als er iets mist:**

| Melding | Oorzaak |
|---|---|
| "Server: GEMINI_API_KEY ontbreekt" | De sleutel staat niet aan voor de **Preview**-omgeving in Vercel, alleen voor Production |
| 403 / "Origin niet toegestaan" | `ALLOWED_ORIGINS` staat ingesteld en kent het preview-domein niet |

**Waar je op let bij het testen:**

- Zijn de herkende items en de geschatte grammen plausibel?
- Kloppen de kcal per item? De prompt vraagt de macro's **per 100 g**, met het
  gewicht apart. Geeft het model ze per portie, dan zijn de cijfers stil
  verdubbeld of gehalveerd — dat is de enige fout die je niet aan de UI ziet.
- Een foto zonder eten hoort "Geen herkenbaar eten op de foto" te geven.

Blijkt de schatting structureel mis, dan zit de aanpassing in de prompt van
`analyzeMealPhotoWithAI` (`js/lib/ai.jsx`), niet in de UI eromheen.

**Wie test:** een besloten groep testers, op de preview-URL. De feature is er
gekomen op vraag van een van hen.

Spec en plan staan op de branch, nog niet op `main`:
`docs/superpowers/specs/2026-09-08-ai-foto-modus-design.md` en
`docs/superpowers/plans/2026-09-08-ai-foto-modus.md`.

## training-module uitbouwen

`js/modules/training/index.jsx` is nog een placeholder (`TrainingPlaceholder`).
De tab staat wel al in de bottom-nav.
