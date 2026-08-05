// ─── lib/ai.jsx — Gemini API proxy + AI-hulpfuncties ──────────────────────────
// Sleutel zit server-side in /api/gemini (Vercel). Nooit in de client of de repo.

async function callGemini(prompt, maxTokens = 1200, thinkingBudget = 0, image = null) {
  const payload = { prompt, maxTokens, thinkingBudget };
  if (image) payload.image = { data: image.data, mimeType: image.mimeType };
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let data;
  try { data = await res.json(); }
  catch { throw new Error('Geen geldig antwoord van de AI-server (HTTP ' + res.status + ').'); }
  if (data.error) {
    const err = data.error;
    const code = err && err.code;
    const status = (err && err.status) || '';
    const raw = typeof err === 'string' ? err : ((err && err.message) || '');
    if (code === 429 || status === 'RESOURCE_EXHAUSTED' || /quota|rate limit/i.test(raw)) {
      const m = raw.match(/retry in ([\d.]+)s/i);
      const secs = m ? Math.ceil(parseFloat(m[1])) : null;
      throw new Error(secs
        ? `Even rustig aan — de AI-limiet is bereikt. Probeer over ${secs} seconden opnieuw.`
        : 'Even rustig aan — de AI-limiet is bereikt. Probeer over een minuutje opnieuw.');
    }
    if (code === 503 || status === 'UNAVAILABLE' || /overload|high demand|unavailable/i.test(raw)) {
      throw new Error('De AI is momenteel erg druk. Probeer het zo dadelijk opnieuw.');
    }
    throw new Error(raw || 'Er ging iets mis met de AI.');
  }
  const cand = data.candidates && data.candidates[0];
  if (!cand) throw new Error('Geen antwoord van AI ontvangen.');
  const text = cand.content && cand.content.parts && cand.content.parts[0] && cand.content.parts[0].text;
  if (!text) {
    if (cand.finishReason === 'MAX_TOKENS') throw new Error('Antwoord te lang voor de limiet. Probeer opnieuw.');
    throw new Error('Leeg antwoord van AI.');
  }
  return text;
}

function parseJsonFromAI(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  return JSON.parse(s >= 0 && e > s ? clean.slice(s, e + 1) : clean);
}

async function estimateFoodWithAI(description) {
  const text = await callGemini(
    `Schat de voedingswaarden van: "${description}". Geef ALLEEN een JSON object terug, niets anders, geen markdown: {"name":"...","kcal":number,"protein":number,"fat":number,"carbs":number,"portionDescription":"..."}`
  );
  return parseJsonFromAI(text);
}

// Foto van een maaltijd → lijst herkende onderdelen met geschatte macro's.
// image = { data: base64 (zonder data:-prefix), mimeType } — zie fileToResizedBase64.
async function estimateFoodFromPhoto(image, extra) {
  const text = await callGemini(
    `Je bent een voedingsexpert. Bekijk de foto en identificeer het eten of de drank.` +
    (extra && extra.trim() ? ` Extra context van de gebruiker: "${extra.trim()}".` : '') +
    ` Schat per herkend onderdeel de portiegrootte (zoals zichtbaar op de foto) en de voedingswaarden voor die portie. Gebruik Nederlandse namen. Geef ALLEEN JSON, niets anders: {"items":[{"name":"...","portionDescription":"bv. 150 g / 1 bord","kcal":number,"protein":number,"fat":number,"carbs":number}]}. Staat er geen eten of drank op de foto, geef dan {"items":[]}.`,
    2500, 800, image
  );
  const parsed = parseJsonFromAI(text);
  return Array.isArray(parsed.items) ? parsed.items.filter(it => it && it.name) : [];
}

async function suggestMealWithAI(targets, mealLabel) {
  const parts = [];
  if (targets.kcal)    parts.push(`${Math.round(targets.kcal)} kcal`);
  if (targets.protein) parts.push(`${Math.round(targets.protein)}g eiwit`);
  if (targets.fat)     parts.push(`${Math.round(targets.fat)}g vet`);
  if (targets.carbs)   parts.push(`${Math.round(targets.carbs)}g koolhydraten`);
  const text = await callGemini(
    `Stel een Belgische/Nederlandse maaltijd voor als ${mealLabel.toLowerCase()}, die voldoet aan: ${parts.join(', ')}. Geef de ingrediënten met exacte hoeveelheden (bv. "150g kipfilet", "60g havermout"), een korte bereidingstip (1 zin), en zorg dat de macro's overeenkomen met die ingrediënten. Geef ALLEEN JSON: {"title":"...","ingredients":["150g kipfilet","100g rijst gekookt"],"description":"...","kcal":number,"protein":number,"fat":number,"carbs":number}`,
    3000, 1500
  );
  return parseJsonFromAI(text);
}
