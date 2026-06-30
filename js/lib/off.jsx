// ─── lib/off.jsx — Open Food Facts (merkproducten + barcode) ──────────────────
// Publieke read-API: geen sleutel, geen login, CORS toegestaan → rechtstreeks
// vanuit de browser. Resultaten gemapt op hetzelfde formaat als NEVO (per 100g).

const KJ_PER_KCAL = 4.184;

// Bepaalt de energie per 100g in kcal en corrigeert een veelvoorkomende OFF-datafout:
// soms staat de waarde in kJ in het kcal-veld (bv. bosbessen "218 kcal" i.p.v. 52).
// We detecteren dat als het kcal-veld ≈ het kJ-veld is, óf als het ~4,18× hoger ligt
// dan de Atwater-energie van de macro's (4·eiwit + 4·KH + 9·vet). Alcohol (veel kcal,
// nul macro's) wordt zo niet vals gecorrigeerd: daar valt de Atwater-check weg.
function offEnergyKcal100(n) {
  const kcalRaw = Number(n['energy-kcal_100g']);
  const kj = Number(n['energy-kj_100g']) || Number(n['energy_100g']) || 0;
  const atwater = 4 * (Number(n.proteins_100g) || 0)
                + 4 * (Number(n.carbohydrates_100g) || 0)
                + 9 * (Number(n.fat_100g) || 0);
  if (kcalRaw > 0) {
    const looksLikeKj =
      (kj > 0 && kcalRaw >= kj * 0.9) ||
      (atwater >= 20 && kcalRaw >= atwater * 2.5
        && Math.abs(kcalRaw / KJ_PER_KCAL - atwater) < Math.abs(kcalRaw - atwater));
    return looksLikeKj ? kcalRaw / KJ_PER_KCAL : kcalRaw;
  }
  // Geen kcal-veld → uit kJ afleiden indien beschikbaar.
  return kj > 0 ? kj / KJ_PER_KCAL : null;
}

function mapOffProduct(p) {
  if (!p) return null;
  const n = p.nutriments || {};
  const protein = n.proteins_100g;
  const kcal = offEnergyKcal100(n);
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
