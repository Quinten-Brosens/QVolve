# Roadmap

Openstaand werk aan Qvolve. Eén kop per item, met genoeg detail om het koud op
te pikken.

## AI foto-modus — echte herkenning nog testen

**Status:** gemerged naar `main` en live op https://q-volve.vercel.app.

De keten is end-to-end bewezen op productie: een foto zonder eten leverde een
echt Gemini-antwoord op ("Er is geen voedsel zichtbaar op de afbeelding") en de
juiste melding in de UI. Dat dekt proxy → beeld → model → JSON → weergave.

Daarbij kwam één bug boven die lokaal onzichtbaar was: de client stuurde
`image.base64` terwijl de proxy `image.data` verwacht, waardoor élke foto werd
geweigerd. Opgelost in `eacd92f`. De les: de dev-server geeft 501 vóór de
validatie, dus de naad tussen client en proxy is lokaal niet te testen.

**Wat nog openstaat: de nauwkeurigheid op echt eten.** Er is nog nooit een foto
van een echte maaltijd door gegaan. Te testen door de besloten testgroep:
inloggen → FAB → tab **Foto** → foto van een bord eten.

**Waar je op let bij het testen:**

- Zijn de herkende items en de geschatte grammen plausibel?
- Kloppen de kcal per item? De prompt vraagt de macro's **per 100 g**, met het
  gewicht apart. Geeft het model ze per portie, dan zijn de cijfers stil
  verdubbeld of gehalveerd — dat is de enige fout die je niet aan de UI ziet.
- Een foto zonder eten hoort "Geen herkenbaar eten op de foto" te geven.

Blijkt de schatting structureel mis, dan zit de aanpassing in de prompt van
`analyzeMealPhotoWithAI` (`js/lib/ai.jsx`), niet in de UI eromheen.

**Wie test:** een besloten groep testers, op de live site. De feature is er
gekomen op vraag van een van hen.

Spec en plan: `docs/superpowers/specs/2026-09-08-ai-foto-modus-design.md` en
`docs/superpowers/plans/2026-09-08-ai-foto-modus.md`.

## training-module uitbouwen

`js/modules/training/index.jsx` is nog een placeholder (`TrainingPlaceholder`).
De tab staat wel al in de bottom-nav.
