// ─── modules/boodschappenlijst — boodschappenlijst logica + modal ─────────────

const SHOP_CATEGORIES = ['Groenten & fruit', 'Vlees & vis', 'Zuivel & eieren', 'Brood & granen', 'Noten, zaden & peulvruchten', 'Sauzen, beleg & oliën', 'Kruiden & specerijen', 'Dranken', 'Sport & supplementen', 'Overig'];

const NEVO_TO_SHOP = {
  'Groente': 'Groenten & fruit', 'Fruit': 'Groenten & fruit', 'Aardappelen en knolgewassen': 'Groenten & fruit',
  'Vlees en gevogelte': 'Vlees & vis', 'Vis, schaal- en schelpdieren': 'Vlees & vis', 'Vleeswaren': 'Vlees & vis',
  'Melk en melkproducten': 'Zuivel & eieren', 'Kaas': 'Zuivel & eieren', 'Vleesvervangers en zuivelvervangers': 'Zuivel & eieren', 'Eieren': 'Zuivel & eieren', 'Flesvoeding en preparaten': 'Zuivel & eieren',
  'Brood': 'Brood & granen', 'Graanproducten en meelsoorten': 'Brood & granen', 'Gebak en koek': 'Brood & granen',
  'Noten en zaden': 'Noten, zaden & peulvruchten', 'Peulvruchten': 'Noten, zaden & peulvruchten',
  'Hartige sauzen': 'Sauzen, beleg & oliën', 'Suiker, snoep, zoet beleg en zoete sauzen': 'Sauzen, beleg & oliën', 'Hartig broodbeleg': 'Sauzen, beleg & oliën', 'Vetten en oliën': 'Sauzen, beleg & oliën', 'Soepen': 'Sauzen, beleg & oliën', 'Samengestelde gerechten': 'Sauzen, beleg & oliën', 'Hartige snacks en zoutjes': 'Sauzen, beleg & oliën',
  'Kruiden en specerijen': 'Kruiden & specerijen',
  'Niet-alcoholische dranken': 'Dranken', 'Alcoholische dranken': 'Dranken',
};

const SHOP_KEYWORDS = [
  ['Groenten & fruit', ['appel', 'banaan', 'peer', 'sinaasappel', 'citroen', 'limoen', 'aardbei', 'framboos', 'frambozen', 'bes', 'bessen', 'bosbessen', 'blauwe bessen', 'druif', 'mango', 'ananas', 'kiwi', 'meloen', 'perzik', 'abrikoos', 'pruim', 'dadel', 'rozijn', 'avocado', 'tomaat', 'tomaten', 'cherrytomaat', 'komkommer', 'paprika', 'ui', 'sjalot', 'knoflook', 'look', 'wortel', 'wortelen', 'courgette', 'aubergine', 'broccoli', 'bloemkool', 'spinazie', 'sla', 'rucola', 'andijvie', 'prei', 'champignon', 'paddenstoel', 'boon', 'sperzieboon', 'sperziebonen', 'erwt', 'mais', 'maïs', 'pompoen', 'biet', 'radijs', 'selder', 'venkel', 'asperge', 'spruit', 'kool', 'aardappel', 'zoete aardappel', 'bataat', 'groente', 'fruit', 'augurk', 'mandarijn', 'mandarijnen', 'grapefruit', 'nectarine', 'vijg', 'radicchio', 'witloof', 'witlof', 'pastinaak', 'knolselder', 'paksoi', 'rucola', 'postelein', 'gemengd rood fruit', 'gemengde bessen', 'gemengde groenten']],
  ['Vlees & vis', ['kip', 'kipfilet', 'kalkoen', 'rund', 'rundvlees', 'biefstuk', 'gehakt', 'varken', 'varkens', 'spek', 'bacon', 'ham', 'worst', 'chorizo', 'salami', 'lamsvlees', 'lam', 'vis', 'zalm', 'tonijn', 'kabeljauw', 'tilapia', 'garnaal', 'garnalen', 'scampi', 'mossel', 'vlees', 'filet', 'roastbeef', 'rosbief', 'entrecote', 'ribstuk', 'ossenhaas', 'varkenshaas', 'kipshoarma', 'kipreep', 'sojaschnitzel']],
  ['Zuivel & eieren', ['melk', 'yoghurt', 'kwark', 'skyr', 'kaas', 'feta', 'mozzarella', 'parmezaan', 'room', 'slagroom', 'creme fraiche', 'crème fraîche', 'boter', 'ei', 'eieren', 'eiwit', 'eigeel', 'karnemelk', 'hüttenkäse', 'huttenkase', 'platte kaas', 'cottage cheese', 'ricotta', 'mascarpone', 'griekse yoghurt', 'griekse']],
  ['Brood & granen', ['brood', 'boterham', 'wrap', 'tortilla', 'pita', 'toast', 'crackers', 'beschuit', 'havermout', 'haver', 'muesli', 'granola', 'cornflakes', 'rijst', 'pasta', 'spaghetti', 'penne', 'macaroni', 'noedel', 'noodle', 'couscous', 'quinoa', 'bulgur', 'meel', 'bloem', 'tarwe', 'cracker', 'pannenkoekenmix', 'pannenkoek', 'volkoren', 'zemelenbrood', 'roggebrood']],
  ['Noten, zaden & peulvruchten', ['noot', 'noten', 'amandel', 'walnoot', 'cashew', 'pinda', 'hazelnoot', 'pistache', 'zaad', 'zaden', 'chiazaad', 'lijnzaad', 'sesam', 'pompoenpit', 'zonnebloempit', 'linze', 'linzen', 'kikkererwt', 'kidneyboon', 'zwarte boon', 'tofu', 'tempeh', 'pindakaas', 'notenpasta', 'notenmix', 'studentenhaver']],
  ['Sauzen, beleg & oliën', ['olie', 'olijfolie', 'azijn', 'mayonaise', 'ketchup', 'mosterd', 'sojasaus', 'soja', 'pesto', 'tomatensaus', 'passata', 'gepelde tomaten', 'tomatenpuree', 'bouillon', 'honing', 'jam', 'confituur', 'chocopasta', 'hagelslag', 'suiker', 'siroop', 'saus', 'blik', 'pakje', 'rijstazijn', 'vissaus', 'oestersaus', 'sambal', 'harissa', 'hummus']],
  ['Kruiden & specerijen', ['paprikapoeder', 'komijn', 'kurkuma', 'kerrie', 'curry', 'kaneel', 'oregano', 'basilicum', 'tijm', 'rozemarijn', 'peterselie', 'koriander', 'dille', 'bieslook', 'laurier', 'nootmuskaat', 'gember', 'chilipoeder', 'cayenne']],
  ['Dranken', ['sap', 'frisdrank', 'cola', 'thee', 'koffie', 'bier', 'wijn', 'melkdrank', 'smoothie', 'proteïneshake', 'eiwitshake']],
  ['Sport & supplementen', ['proteïnereep', 'eiwitreep', 'whey', 'eiwitpoeder', 'creatine', 'pre-workout', 'preworkout', 'proteïnepoeder']],
];

const PREP_WORDS = ['verse', 'vers', 'gedroogde', 'gedroogd', 'gehakte', 'gehakt', 'fijngehakte', 'fijngehakt', 'gesneden', 'fijngesneden', 'geraspte', 'geraspt', 'gekookte', 'gekookt', 'rauwe', 'rauw', 'geperste', 'geperst', 'gepelde', 'gepeld', 'geroosterde', 'geroosterd', 'gebakken', 'gestoomde', 'gestoomd', 'gemalen', 'grof', 'fijn', 'grove', 'fijne', 'kleine', 'grote', 'een', 'wat', 'handje', 'handvol', 'blokjes', 'reepjes', 'plakjes', 'stukjes', 'partjes', 'snippers', 'teen', 'teentje', 'teentjes', 'tenen', 'in', 'van'];

const DROP_EXACT = new Set(['peper', 'zout', 'peper en zout', 'zout en peper', 'water', 'kruiden', 'specerijen', 'kruidenmix', 'kruiden en specerijen', 'ijs', 'ijsblokjes', 'garnering', 'bouillonblokje']);
const DROP_CONTAINS = ['naar smaak', 'naar wens', 'snufje', 'scheutje', 'om te garneren', 'ter garnering', 'voor garnering', 'optioneel'];

const SYNONYMS = {
  'rosbief': 'roastbeef', 'rostbeef': 'roastbeef',
  'zucchini': 'courgette', 'courgettes': 'courgette',
  'kerstomaatjes': 'cherrytomaten', 'kersentomaat': 'cherrytomaat',
  'pompoenpitten': 'pompoenpit', 'zonnebloempitten': 'zonnebloempit',
  'aardbeien': 'aardbei', 'blauwe bessen': 'bosbes', 'bosbessen': 'bosbes',
  'mager gehakt': 'rundergehakt', 'kippengehakt': 'gehakt',
  'magere kwark': 'kwark', 'griekse yoghurt': 'yoghurt',
};

function normalizeIngredientName(raw) {
  let n = String(raw).toLowerCase();
  n = n.replace(/\([^)]*\)/g, ' ');
  n = n.replace(/[.,;:]+/g, ' ');
  let toks = n.split(/\s+/).filter(Boolean).filter(t => !PREP_WORDS.includes(t));
  return toks.join(' ').trim();
}
function shouldDropIngredient(name) {
  if (!name) return true;
  if (DROP_EXACT.has(name)) return true;
  if (name.startsWith('kruiden') || name.startsWith('specerij')) return true;
  return DROP_CONTAINS.some(x => name.includes(x));
}
function stemNL(n) {
  n = n.replace(/^(cherry|cocktail|mini|baby|wilde?)\s*/, '');
  if (n.endsWith('tjes')) n = n.slice(0, -4);
  else if (n.endsWith('tje')) n = n.slice(0, -3);
  else if (n.endsWith('jes')) n = n.slice(0, -3);
  else if (n.endsWith('je')) n = n.slice(0, -2);
  else if (n.endsWith('onen')) { n = n.slice(0, -4) + 'oon'; }
  else if (n.endsWith('zen')) { n = n.slice(0, -3) + 's'; }
  else if (n.endsWith('en')) {
    const z = n.slice(0, -2);
    if (z.endsWith('at')) n = z.slice(0, -2) + 'aat';
    else n = z;
  } else if (n.endsWith('s') && n.length > 4) n = n.slice(0, -1);
  return n.trim();
}
function categorizeIngredient(name) {
  const stem = stemNL(name);
  let bestCat = null, bestLen = 0;
  for (const [cat, words] of SHOP_KEYWORDS) {
    for (const w of words) {
      if ((name === w || stem === w) && w.length > bestLen) { bestCat = cat; bestLen = w.length; }
      else if ((name.includes(w) || stem.includes(w)) && w.length > bestLen) { bestCat = cat; bestLen = w.length; }
      else if (w.includes(stem) && stem.length > 2 && stem.length > bestLen) { bestCat = cat; bestLen = stem.length; }
    }
  }
  return bestCat || 'Overig';
}

function parseIngredient(raw) {
  let s = String(raw).trim();
  const unitRe = '(kg|g|gr|gram|ml|cl|l|liter|el|eetlepel|tl|theelepel|stuks?|st|teen|tenen)';
  let m = s.match(new RegExp('^([\\d]+(?:[.,]\\d+)?)\\s*' + unitRe + '?\\b\\s*(.+)$', 'i'));
  let qty, unit, name;
  if (m) { qty = parseFloat(m[1].replace(',', '.')); unit = m[2] || ''; name = m[3]; }
  else {
    m = s.match(new RegExp('^(.+?)\\s+([\\d]+(?:[.,]\\d+)?)\\s*' + unitRe + '?\\s*$', 'i'));
    if (m) { name = m[1]; qty = parseFloat(m[2].replace(',', '.')); unit = m[3] || ''; }
  }
  if (qty == null || isNaN(qty)) { name = normalizeIngredientName(s); return name ? { qty: 1, unit: 'st', name } : null; }
  unit = unit.toLowerCase();
  if (unit === 'kg') { qty *= 1000; unit = 'g'; }
  else if (unit === 'gr' || unit === 'gram') unit = 'g';
  else if (unit === 'l' || unit === 'liter') { qty *= 1000; unit = 'ml'; }
  else if (unit === 'cl') { qty *= 10; unit = 'ml'; }
  else if (unit === 'eetlepel') unit = 'el';
  else if (unit === 'theelepel') unit = 'tl';
  else if (unit === 'teen' || unit === 'tenen') unit = 'st';
  else if (unit === 'stuk' || unit === 'stuks') unit = 'st';
  if (!unit) unit = qty >= 15 ? 'g' : 'st';
  name = normalizeIngredientName(name);
  return name ? { qty, unit, name } : null;
}

function labelFor(name, unit, qty) {
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  let q = qty, u = unit;
  if (unit === 'g' && qty >= 1000) { q = Math.round(qty / 100) / 10; u = 'kg'; }
  else if (unit === 'ml' && qty >= 1000) { q = Math.round(qty / 100) / 10; u = 'l'; }
  else { q = Math.round(qty * 10) / 10; }
  const qs = Number.isInteger(q) ? String(q) : String(q).replace('.', ',');
  if (u === 'st') return qty > 1 ? `${cap} ×${Math.round(qty)}` : cap;
  return `${cap} — ${qs} ${u}`;
}

function buildShoppingList(userSlug, start, end) {
  if (!start || !end || start > end) return [];
  const agg = {};
  function addQty(name, unit, qty, cat) {
    name = SYNONYMS[name] || name;
    if (shouldDropIngredient(name)) return;
    const key = name + '|' + unit;
    if (!agg[key]) agg[key] = { key, name, unit, qty: 0, cat: cat || categorizeIngredient(name) };
    agg[key].qty += qty;
  }
  let d = start, guard = 0;
  while (d <= end && guard++ < 400) {
    const log = lsGet(`daily-log:${userSlug}:${d}`) || [];
    for (const e of log) {
      if (typeof e.grams === 'number' && e.grams > 0) {
        const nm = normalizeIngredientName(e.name);
        const cat = NEVO_TO_SHOP[e.group] || categorizeIngredient(nm);
        addQty(nm, 'g', e.grams, cat);
      } else if (Array.isArray(e.ingredients) && e.ingredients.length) {
        for (const ing of e.ingredients) {
          const parts = /\d/.test(ing) ? [ing] : String(ing).split(/\s+en\s+/i);
          for (const part of parts) {
            const p = parseIngredient(part.trim());
            if (p) addQty(p.name, p.unit, p.qty);
          }
        }
      }
    }
    d = addDays(d, 1);
  }
  const gramNames = new Set(Object.keys(agg).filter(k => k.endsWith('|g') || k.endsWith('|ml')).map(k => k.split('|')[0]));
  const groups = {};
  for (const a of Object.values(agg)) {
    if (a.unit === 'st' && gramNames.has(a.name)) continue;
    (groups[a.cat] = groups[a.cat] || []).push(a);
  }
  return SHOP_CATEGORIES
    .filter(c => groups[c]?.length)
    .map(category => ({ category, items: groups[category].sort((a, b) => a.name.localeCompare(b.name, 'nl')) }));
}

function ShoppingListModal({ userSlug, initialDate, onClose }) {
  const [start, setStart] = useState(initialDate);
  const [end, setEnd] = useState(addDays(initialDate, 6));
  const [copied, setCopied] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [editKey, setEditKey] = useState(null);
  const [editVal, setEditVal] = useState('');

  const storeKey = `shop-state:${userSlug}:${start}:${end}`;
  function loadState() { try { return JSON.parse(localStorage.getItem(storeKey)) || {}; } catch { return {}; } }
  const [checked, setChecked] = useState(() => new Set(loadState().checked || []));
  const [extras, setExtras] = useState(() => loadState().extras || []);
  const [overrides, setOverrides] = useState(() => loadState().overrides || {});
  const [extraPerson, setExtraPerson] = useState(() => loadState().extraPerson || null);
  const [showExtraPersonPanel, setShowExtraPersonPanel] = useState(false);

  React.useEffect(() => {
    const s = loadState();
    setChecked(new Set(s.checked || []));
    setExtras(s.extras || []);
    setOverrides(s.overrides || {});
    setExtraPerson(s.extraPerson || null);
    setEditKey(null);
  }, [storeKey]);

  React.useEffect(() => {
    try { localStorage.setItem(storeKey, JSON.stringify({ checked: [...checked], extras, overrides, extraPerson })); } catch {}
  }, [checked, extras, overrides, storeKey, extraPerson]);

  const baseList = useMemo(() => buildShoppingList(userSlug, start, end), [userSlug, start, end]);

  const list = useMemo(() => {
    if (!extras.length) return baseList;
    const result = baseList.map(g => ({ ...g, items: [...g.items] }));
    for (const ex of extras) {
      let grp = result.find(g => g.category === ex.cat);
      if (!grp) { grp = { category: ex.cat, items: [] }; result.push(grp); }
      if (!grp.items.find(it => it.key === ex.key)) grp.items.push(ex);
    }
    return result;
  }, [baseList, extras]);

  function toggleChecked(key) { setChecked(c => { const n = new Set(c); n.has(key) ? n.delete(key) : n.add(key); return n; }); }
  function startEdit(key, qty) { setEditKey(key); setEditVal(String(qty).replace('.', ',')); }
  function confirmEdit() {
    const q = parseFloat(editVal.replace(',', '.'));
    if (!isNaN(q) && q > 0) setOverrides(o => ({ ...o, [editKey]: q }));
    setEditKey(null);
  }
  function addExtra() {
    const raw = newItem.trim();
    if (!raw) return;
    const p = parseIngredient(raw);
    const nm = p ? p.name : normalizeIngredientName(raw);
    const unit = p ? p.unit : 'st';
    const qty = p ? p.qty : 1;
    const cat = categorizeIngredient(nm);
    const key = `extra-${nm}|${unit}-${Date.now()}`;
    setExtras(ex => [...ex, { key, name: nm, qty, unit, cat }]);
    setNewItem('');
  }

  const totalFactor = extraPerson ? 1 + extraPerson.factor : 1;

  function buildText() {
    let txt = list.map(g =>
      `${g.category}:\n` + g.items.map(it => {
        const qty = (overrides[it.key] ?? it.qty) * totalFactor;
        return `- ${labelFor(it.name, it.unit, qty)}`;
      }).join('\n')
    ).join('\n\n');
    if (extraPerson) txt = `👥 Personen: jij${extraPerson.name ? ` + ${extraPerson.name}` : '+ 1'} (×${totalFactor})\n\n` + txt;
    return txt;
  }
  function copy() { try { navigator.clipboard.writeText(buildText()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }
  function shareWhatsApp() { window.open('https://wa.me/?text=' + encodeURIComponent('🛒 Boodschappenlijst\n\n' + buildText()), '_blank'); }

  const totalCount = list.reduce((s, g) => s + g.items.length, 0);
  const checkedCount = [...checked].size;
  const leeg = totalCount === 0;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">🛒 Boodschappenlijst</span>
            {totalCount > 0 && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{checkedCount}/{totalCount}</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><Icon name="X" size={18}/></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Van</label>
              <input type="date" value={start} max={end} onChange={e => setStart(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tot en met</label>
              <input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button onClick={() => setShowExtraPersonPanel(v => !v)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50">
              <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                👥 Extra persoon
                {extraPerson && <span className="text-xs font-normal text-orange-500">{extraPerson.name || 'Ingeschakeld'} · ×{Math.round(totalFactor * 10) / 10}</span>}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d={showExtraPersonPanel ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}/></svg>
            </button>
            {showExtraPersonPanel && (
              <div className="border-t border-gray-100 p-3 space-y-3 bg-gray-50">
                <input value={extraPerson?.name || ''} onChange={e => setExtraPerson(p => ({ ...(p || { factor: 1 }), name: e.target.value }))}
                  placeholder="Voor wie? (optioneel, bv. partner)" className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                <div className="space-y-1.5">
                  {[
                    { label: 'Exact hetzelfde (volle portie)', factor: 1.0 },
                    { label: 'Iets minder — ¾ portie', factor: 0.75 },
                    { label: 'Halve portie', factor: 0.5 },
                    { label: 'Kind — ⅓ portie', factor: 0.33 },
                  ].map(opt => {
                    const active = extraPerson && Math.abs(extraPerson.factor - opt.factor) < 0.01;
                    return (
                      <button key={opt.label} onClick={() => setExtraPerson(p => ({ name: p?.name || '', factor: opt.factor }))}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${active ? 'border-orange-400 bg-orange-50 text-orange-700 font-medium' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'}`}>
                        {active && <Icon name="CheckCircle2" size={13} className="inline mr-1.5 text-orange-500"/>}{opt.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  {extraPerson && <button onClick={() => { setExtraPerson(null); setShowExtraPersonPanel(false); }} className="flex-1 border border-red-100 text-red-500 hover:bg-red-50 rounded-lg py-2 text-xs font-medium">Verwijderen</button>}
                  <button onClick={() => setShowExtraPersonPanel(false)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 text-xs font-medium">Opslaan</button>
                </div>
              </div>
            )}
          </div>

          {leeg ? (
            <p className="text-sm text-gray-400 text-center py-8">Geen voeding gelogd in dit bereik.</p>
          ) : (
            <>
              {list.map((g, gi) => (
                <div key={gi}>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{g.category}</p>
                  <div className="space-y-0.5">
                    {g.items.map(it => {
                      const on = checked.has(it.key);
                      const isExtra = it.key.startsWith('extra-');
                      const qty = overrides[it.key] ?? it.qty;
                      const isEditing = editKey === it.key;
                      return (
                        <div key={it.key} className={`flex items-center gap-1.5 px-1 py-1 rounded-lg hover:bg-gray-50 ${on ? 'opacity-50' : ''}`}>
                          <button onClick={() => toggleChecked(it.key)} className="shrink-0 p-0.5">
                            <Icon name={on ? 'CheckCircle2' : 'Circle'} size={17} className={on ? 'text-orange-500' : 'text-gray-300'}/>
                          </button>
                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <span className="text-sm text-gray-700 truncate">{it.name.charAt(0).toUpperCase() + it.name.slice(1)}</span>
                              <span className="text-gray-400 text-sm shrink-0">—</span>
                              <input autoFocus type="number" inputMode="decimal" value={editVal}
                                onChange={e => setEditVal(e.target.value)}
                                onBlur={confirmEdit}
                                onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditKey(null); }}
                                className="w-16 border border-orange-300 rounded-lg px-2 py-0.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300 shrink-0"/>
                              <span className="text-xs text-gray-400 shrink-0">{it.unit === 'st' ? 'st' : it.unit}</span>
                            </div>
                          ) : (
                            <span className={`text-sm flex-1 min-w-0 ${on ? 'line-through text-gray-400' : 'text-gray-700'}`}>{labelFor(it.name, it.unit, (overrides[it.key] ?? it.qty) * totalFactor)}</span>
                          )}
                          <button onClick={() => isEditing ? confirmEdit() : startEdit(it.key, qty)} className="shrink-0 text-gray-300 hover:text-blue-400 p-0.5 ml-auto">
                            {isEditing
                              ? <Icon name="CheckCircle2" size={15} className="text-orange-400"/>
                              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            }
                          </button>
                          {isExtra && (
                            <button onClick={() => setExtras(ex => ex.filter(e => e.key !== it.key))} className="shrink-0 text-gray-300 hover:text-red-400 p-0.5">
                              <Icon name="Trash2" size={13}/>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="border border-dashed border-gray-200 rounded-xl p-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Item toevoegen</p>
                <div className="flex gap-2">
                  <input value={newItem} onChange={e => setNewItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addExtra()}
                    placeholder="Bv. 2 pakjes pasta" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <button onClick={addExtra} disabled={!newItem.trim()} className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white rounded-lg px-4 py-2 text-sm font-semibold">+</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={copy} className="border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5">
                  <Icon name="Copy" size={14}/>{copied ? 'Gekopieerd!' : 'Kopieer lijst'}
                </button>
                <button onClick={shareWhatsApp} className="bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
