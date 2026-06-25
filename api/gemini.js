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
    const { prompt, maxTokens } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Geen geldige prompt.' });
      return;
    }

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens || 1200 },
        }),
      }
    );

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'AI-aanvraag mislukt: ' + (e && e.message ? e.message : String(e)) });
  }
};
