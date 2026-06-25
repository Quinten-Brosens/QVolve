// Vercel serverless functie — proxy naar Google Gemini.
//
// De API-sleutel staat NOOIT in de client of in de repo, maar als
// environment-variabele (GEMINI_API_KEY) op Vercel. De browser roept enkel
// deze functie aan; de sleutel wordt hier server-side toegevoegd.
//
// ENV-variabelen (in te stellen in het Vercel-dashboard):
//   GEMINI_API_KEY    (verplicht)  je Google Gemini-sleutel
//   ALLOWED_ORIGINS   (optioneel)  komma-gescheiden lijst van toegestane origins,
//                                  bv. "https://qvolve.vercel.app". Leeg = alles toegestaan.

const GEMINI_MODEL = 'gemini-2.5-flash';

const ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Alleen POST toegestaan.' });
    return;
  }

  // Lichte misbruikbescherming: enkel toegestane origins (indien geconfigureerd).
  const origin = req.headers.origin || '';
  if (ALLOWED.length && origin && !ALLOWED.includes(origin)) {
    res.status(403).json({ error: 'Origin niet toegestaan.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server: GEMINI_API_KEY ontbreekt.' });
    return;
  }

  try {
    const { prompt, maxTokens, thinkingBudget } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Geen geldige prompt.' });
      return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens || 1200,
        // "thinking" standaard uit (0) zodat korte antwoorden niet afgekapt raken.
        // Voor reken-intensieve calls (weekschema) stuurt de client een budget mee,
        // zodat de AI de dagmacro's correct kan uitrekenen.
        thinkingConfig: { thinkingBudget: typeof thinkingBudget === 'number' ? thinkingBudget : 0 },
        // Alle calls verwachten JSON. JSON-modus garandeert syntactisch geldige
        // output (geen losse aanhalingstekens / afgebroken strings → geen parse-fouten).
        responseMimeType: 'application/json',
      },
    });

    // Het flash-model raakt soms tijdelijk overbelast (503/429). Even opnieuw proberen
    // met oplopende wachttijd, zodat die pieken de gebruiker niet bereiken.
    let r;
    for (let attempt = 0; attempt < 4; attempt++) {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
      });
      if (r.status !== 503 && r.status !== 429) break;
      if (attempt < 3) await new Promise(done => setTimeout(done, 800 * (attempt + 1)));
    }

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'AI-aanvraag mislukt: ' + (e && e.message ? e.message : String(e)) });
  }
};
