// ─── lib/off.jsx — Open Food Facts (merkproducten + barcode) ──────────────────
// Publieke read-API: geen sleutel, geen login, CORS toegestaan → rechtstreeks
// vanuit de browser. Resultaten gemapt op hetzelfde formaat als NEVO (per 100g).

function mapOffProduct(p) {
  if (!p) return null;
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'];
  const protein = n.proteins_100g;
  if (kcal == null || protein == null) return null;
  let name = (p.product_name_nl || p.product_name || '').trim();
  if (!name) return null;
  let brand = Array.isArray(p.brands) ? (p.brands[0] || '') : (p.brands ? String(p.brands).split(',')[0] : '');
  brand = brand.trim();
  if (brand) name = `${name} — ${brand}`;
  const round1 = v => Math.round((Number(v) || 0) * 10) / 10;
  const servingQty = Number(p.serving_quantity) || null;
  const servingLabel = servingQty
    ? (p.serving_size ? String(p.serving_size).trim() : `${servingQty} g`)
    : null;
  return {
    id: 'off-' + p.code,
    name,
    group: 'Open Food Facts',
    kcal: round1(kcal),
    protein: round1(protein),
    fat: round1(n.fat_100g),
    carbs: round1(n.carbohydrates_100g),
    fiber: round1(n.fiber_100g),
    perGram: true,
    source: 'off',
    servingQty,
    servingLabel,
  };
}

function offListToFoods(list) {
  const seen = new Set();
  const out = [];
  for (const p of (list || [])) {
    const m = mapOffProduct(p);
    if (!m) continue;
    const key = m.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key); out.push(m);
  }
  return out;
}

async function searchOpenFoodFacts(query) {
  try {
    const res = await fetch('/api/off-search?q=' + encodeURIComponent(query));
    if (res.ok) {
      const data = await res.json();
      const list = data.hits || data.products;
      if (Array.isArray(list)) return offListToFoods(list);
    }
  } catch (e) { /* proxy niet bereikbaar → fallback */ }

  const url = 'https://world.openfoodfacts.org/cgi/search.pl'
    + '?search_terms=' + encodeURIComponent(query)
    + '&search_simple=1&action=process&json=1&page_size=20&lc=nl'
    + '&fields=code,product_name,product_name_nl,brands,nutriments';
  const res2 = await fetch(url);
  if (!res2.ok) throw new Error('OFF-zoeken mislukt (' + res2.status + ')');
  const data2 = await res2.json();
  return offListToFoods(data2.products || []);
}

async function lookupOffBarcode(code) {
  const url = 'https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code)
    + '.json?fields=code,product_name,product_name_nl,brands,nutriments,serving_size,serving_quantity';
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Product opzoeken mislukt (' + res.status + ')');
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return mapOffProduct(data.product);
}
