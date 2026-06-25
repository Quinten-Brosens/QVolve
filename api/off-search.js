// Vercel serverless functie — proxy naar de OFF-zoekdienst (Search-a-licious).
//
// Waarom een proxy? De betrouwbare zoek-endpoint (search.openfoodfacts.org)
// stuurt geen CORS-headers, dus de browser mag hem niet rechtstreeks aanroepen.
// De legacy CORS-endpoint (cgi/search.pl) is dan weer vaak overbelast (503).
// Server-side is er geen CORS-probleem en gebruiken we de betrouwbare dienst.
//
// Geen sleutel nodig; OFF is publiek. Barcode-lookups gaan rechtstreeks vanuit
// de client (die endpoint heeft wél CORS).

const OFF_FIELDS = 'code,product_name,product_name_nl,brands,nutriments';

module.exports = async (req, res) => {
  const q = (req.query && req.query.q ? String(req.query.q) : '').trim();
  if (!q) { res.status(400).json({ error: 'Geen zoekterm.' }); return; }

  try {
    const url = 'https://search.openfoodfacts.org/search'
      + '?q=' + encodeURIComponent(q)
      + '&page_size=20&lang=nl&fields=' + encodeURIComponent(OFF_FIELDS);
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Qvolve/1.0 (https://github.com/Quinten-Brosens/QVolve)' },
    });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'OFF-zoeken mislukt: ' + (e && e.message ? e.message : String(e)) });
  }
};
