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

// ─── Boodschappen — volwaardig tabblad ───────────────────────────────────────
// Aggregeert de gelogde voeding over een datumbereik. Periode en extra persoon
// zitten achter een uitklapper zodat de lijst zelf de bladzijde vult.
function ShoppingListPanel({ userSlug, initialDate }) {
  const [start, setStart] = useState(initialDate);
  const [end, setEnd] = useState(addDays(initialDate, 6));
  const [copied, setCopied] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [editKey, setEditKey] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [showInstellingen, setShowInstellingen] = useState(false);

  const storeKey = `shop-state:${userSlug}:${start}:${end}`;
  function loadState() { return lsGet(storeKey) || {}; }
  const [checked, setChecked] = useState(() => new Set(loadState().checked || []));
  const [extras, setExtras] = useState(() => loadState().extras || []);
  const [overrides, setOverrides] = useState(() => loadState().overrides || {});
  const [extraPerson, setExtraPerson] = useState(() => loadState().extraPerson || null);

  useEffect(() => {
    const s = loadState();
    setChecked(new Set(s.checked || []));
    setExtras(s.extras || []);
    setOverrides(s.overrides || {});
    setExtraPerson(s.extraPerson || null);
    setEditKey(null);
  }, [storeKey]);

  useEffect(() => {
    lsSet(storeKey, { checked: [...checked], extras, overrides, extraPerson });
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
    setExtras(ex => [...ex, { key: `extra-${nm}|${unit}-${Date.now()}`, name: nm, qty, unit, cat }]);
    setNewItem('');
  }

  const totalFactor = extraPerson ? 1 + extraPerson.factor : 1;

  function buildText() {
    let txt = list.map(g =>
      `${g.category}:\n` + g.items.map(it => `- ${labelFor(it.name, it.unit, (overrides[it.key] ?? it.qty) * totalFactor)}`).join('\n')
    ).join('\n\n');
    if (extraPerson) txt = `Personen: jij${extraPerson.name ? ` + ${extraPerson.name}` : ' + 1'} (x${totalFactor})\n\n` + txt;
    return txt;
  }
  function copy() { try { navigator.clipboard.writeText(buildText()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) {} }
  function shareWhatsApp() { window.open('https://wa.me/?text=' + encodeURIComponent('Boodschappenlijst\n\n' + buildText()), '_blank'); }

  const totalCount = list.reduce((s, g) => s + g.items.length, 0);
  const checkedCount = list.reduce((s, g) => s + g.items.filter(it => checked.has(it.key)).length, 0);
  const kort = d => new Date(d + 'T00:00:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }).replace('.', '');

  return (
    <div className="pt-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>{kort(start)} – {kort(end)}</Eyebrow>
          <p className="mt-2 mb-0 font-logo font-bold text-[30px] leading-[1.1] tracking-[-.01em] text-[#14223c]">Boodschappen</p>
        </div>
        <div className="text-right shrink-0">
          <p className="m-0 font-logo font-bold text-[26px] text-[#1e3a8a]">
            {checkedCount}<span className="text-[#8494aa]">/{totalCount}</span>
          </p>
          <p className="mt-0.5 mb-0 text-[11px] font-medium text-[#4a5568]">in de kar</p>
        </div>
      </div>

      <button onClick={() => setShowInstellingen(v => !v)}
        className="mt-4 w-full flex items-center gap-2 bg-white border border-[#dfe3ea] rounded-[18px] px-4 py-3 text-left">
        <span className="text-[#35507d] shrink-0"><Icon name="Settings" size={16}/></span>
        <span className="flex-1 min-w-0 text-[14px] font-semibold text-[#14223c]">Periode en personen</span>
        {extraPerson && <span className="text-[12px] font-semibold text-[#c2410c] shrink-0">x{Math.round(totalFactor * 10) / 10}</span>}
        <span className="text-[#8494aa] shrink-0" style={{ transform: showInstellingen ? 'rotate(90deg)' : 'none' }}>
          <Icon name="ChevronRight" size={15}/>
        </span>
      </button>

      {showInstellingen && (
        <div className="mt-2 bg-white border border-[#dfe3ea] rounded-[18px] p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Eyebrow className="mb-1.5">Van</Eyebrow>
              <input type="date" value={start} max={end} onChange={e => setStart(e.target.value)}
                className="w-full border border-[#dfe3ea] rounded-xl px-3 py-2 text-sm text-[#14223c] focus:outline-none focus:border-[#182a48]"/>
            </div>
            <div>
              <Eyebrow className="mb-1.5">Tot en met</Eyebrow>
              <input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)}
                className="w-full border border-[#dfe3ea] rounded-xl px-3 py-2 text-sm text-[#14223c] focus:outline-none focus:border-[#182a48]"/>
            </div>
          </div>
          <div>
            <Eyebrow className="mb-2">Extra persoon</Eyebrow>
            <input value={extraPerson?.name || ''} placeholder="Voor wie? (optioneel, bv. partner)"
              onChange={e => setExtraPerson(p => ({ ...(p || { factor: 1 }), name: e.target.value }))}
              className="w-full bg-[#f7f5f0] border border-[#dfe3ea] rounded-xl px-3 py-2.5 text-sm text-[#14223c] focus:outline-none focus:border-[#182a48]"/>
            <div className="mt-2 space-y-1.5">
              {[
                { label: 'Exact hetzelfde (volle portie)', factor: 1.0 },
                { label: 'Iets minder — driekwart portie', factor: 0.75 },
                { label: 'Halve portie', factor: 0.5 },
                { label: 'Kind — een derde portie', factor: 0.33 },
              ].map(opt => {
                const active = extraPerson && Math.abs(extraPerson.factor - opt.factor) < 0.01;
                return (
                  <button key={opt.label} onClick={() => setExtraPerson(p => ({ name: p?.name || '', factor: opt.factor }))}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border transition-colors
                      ${active ? 'border-[#182a48] bg-[#182a48] text-white font-semibold' : 'border-[#dfe3ea] bg-white text-[#14223c]'}`}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {extraPerson && (
              <button onClick={() => setExtraPerson(null)}
                className="mt-2 w-full py-2.5 rounded-xl border border-[#dfe3ea] text-[#c2410c] text-sm font-semibold">
                Extra persoon verwijderen
              </button>
            )}
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <p className="mt-8 text-[15px] text-[#8494aa] text-center">Geen voeding gelogd in dit bereik.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {list.map((g, gi) => (
            <div key={gi}>
              <Eyebrow className="mb-2">{g.category}</Eyebrow>
              <div className="bg-white border border-[#dfe3ea] rounded-[18px] overflow-hidden">
                {g.items.map(it => {
                  const on = checked.has(it.key);
                  const isExtra = it.key.startsWith('extra-');
                  const qty = overrides[it.key] ?? it.qty;
                  const isEditing = editKey === it.key;
                  return (
                    <div key={it.key} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#eef1f6] last:border-0">
                      <button onClick={() => toggleChecked(it.key)} aria-label={on ? 'Terug uit de kar' : 'In de kar'}
                        className="shrink-0" style={{ color: on ? QV.blue : '#cfd6e2' }}>
                        <Icon name={on ? 'CheckCircle2' : 'Circle'} size={19}/>
                      </button>
                      {isEditing ? (
                        <>
                          <span className="flex-1 min-w-0 truncate text-[15px] text-[#14223c]">
                            {it.name.charAt(0).toUpperCase() + it.name.slice(1)}
                          </span>
                          <input autoFocus type="number" inputMode="decimal" value={editVal}
                            onChange={e => setEditVal(e.target.value)} onBlur={confirmEdit}
                            onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditKey(null); }}
                            className="w-16 shrink-0 border border-[#182a48] rounded-lg px-2 py-1 text-center text-sm focus:outline-none"/>
                          <span className="shrink-0 text-xs text-[#8494aa]">{it.unit}</span>
                        </>
                      ) : (
                        <button onClick={() => toggleChecked(it.key)}
                          className="flex-1 min-w-0 text-left text-[15px] font-medium truncate"
                          style={{ color: on ? QV.ink3 : QV.ink, textDecoration: on ? 'line-through' : 'none' }}>
                          {labelFor(it.name, it.unit, qty * totalFactor)}
                        </button>
                      )}
                      <button onClick={() => isEditing ? confirmEdit() : startEdit(it.key, qty)}
                        aria-label="Hoeveelheid aanpassen" className="shrink-0 text-[#8494aa] active:text-[#14223c]">
                        <Icon name={isEditing ? 'CheckCircle2' : 'Pencil'} size={14}/>
                      </button>
                      {isExtra && (
                        <button onClick={() => setExtras(ex => ex.filter(e => e.key !== it.key))}
                          aria-label="Verwijderen" className="shrink-0 text-[#8494aa] active:text-[#c2410c]">
                          <Icon name="Trash2" size={14}/>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2.5 border border-dashed border-[#cfd6e2] rounded-[18px] px-4 py-3">
        <span className="text-[#4a5568] shrink-0"><Icon name="Plus" size={17}/></span>
        <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExtra()}
          placeholder="Zelf iets toevoegen"
          className="flex-1 min-w-0 bg-transparent text-[15px] text-[#14223c] placeholder:text-[#4a5568] focus:outline-none"/>
        {newItem.trim() && (
          <button onClick={addExtra} className="shrink-0 font-semibold text-[13px] text-[#c2410c]">Voeg toe</button>
        )}
      </div>

      {totalCount > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={copy}
            className="h-12 rounded-[18px] border border-[#dfe3ea] bg-white text-[#14223c] font-semibold text-sm flex items-center justify-center gap-2 active:scale-[.98] transition-transform">
            <Icon name="Copy" size={15}/>{copied ? 'Gekopieerd' : 'Kopieer lijst'}
          </button>
          <button onClick={shareWhatsApp}
            className="h-12 rounded-[18px] bg-[#25D366] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[.98] transition-transform">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
