// ─── modules/voeding — dagboek, voedingszoekopdracht, toevoeg-sheet ───────────

const HTML5_QRCODE_SRC = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
const VOEDING_HISTORY_DAYS = 45; // hoever "wat je vaak eet" terugkijkt

function BarcodeScanner({ onDetected, onClose }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const instRef = useRef(null);
  const doneRef = useRef(false);
  const runningRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await loadScript(HTML5_QRCODE_SRC);
        if (cancelled) return;
        const fmts = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
        ];
        const inst = new Html5Qrcode('qvolve-barcode-reader', { formatsToSupport: fmts, verbose: false });
        instRef.current = inst;
        await inst.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 160 } },
          (decoded) => {
            if (doneRef.current) return;
            doneRef.current = true;
            onDetected(decoded);
          },
          () => {}
        );
        runningRef.current = true;
        if (cancelled) { try { await inst.stop(); runningRef.current = false; } catch (e) {} return; }
        setLoading(false);
      } catch (e) {
        if (!cancelled) { setError(humanizeCamError(e)); setLoading(false); }
      }
    }
    init();
    return () => {
      cancelled = true;
      const inst = instRef.current;
      if (!inst) return;
      if (!runningRef.current) { try { inst.clear(); } catch (e) {} return; }
      try {
        const p = inst.stop();
        if (p && p.then) p.then(() => { try { inst.clear(); } catch (e) {} }).catch(() => {});
      } catch (e) {}
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-[#14223c] flex flex-col">
      <div className="h-14 shrink-0 flex items-center gap-3 px-4">
        <button onClick={onClose} className="text-white/70 active:text-white p-1 -ml-1"><Icon name="ArrowLeft" size={20}/></button>
        <span className="font-logo font-bold text-base text-white tracking-wide flex-1">Scan barcode</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div id="qvolve-barcode-reader" className="w-full max-w-sm rounded-2xl overflow-hidden"/>
        {loading && !error && <p className="mt-4 text-sm text-white/60 flex items-center gap-2"><Icon name="Loader2" size={14}/> Camera starten…</p>}
        {error && (
          <div className="mt-4 max-w-sm text-center">
            <p className="text-sm text-[#f97316]">{error}</p>
            <button onClick={onClose} className="mt-4 px-5 py-2.5 rounded-xl bg-white/10 border border-white/25 text-white text-sm font-semibold">Sluiten</button>
          </div>
        )}
        {!loading && !error && <p className="mt-4 text-sm text-white/60">Richt op de streepjescode van het product.</p>}
      </div>
    </div>
  );
}

// ─── Wat je vaak eet ──────────────────────────────────────────────────────────
// De namen uit je recente logboek opgezocht in de zoekpool, zodat we voor elk
// item de waarden per 100 g hebben en het gram-scherm kan rekenen. Eigen
// producten sluiten de rij, ook als je ze nog nooit logde.
function frequentFoods(userSlug, dateStr, pool, customFoods, limit = 8) {
  const telling = new Map();
  for (let i = 0; i <= VOEDING_HISTORY_DAYS; i++) {
    const dag = lsGet(`daily-log:${userSlug}:${addDays(dateStr, -i)}`);
    if (!Array.isArray(dag)) continue;
    for (const e of dag) {
      if (!e.name) continue;
      const k = e.name.toLowerCase();
      telling.set(k, (telling.get(k) || 0) + 1);
    }
  }
  const perNaam = new Map();
  for (const f of pool) {
    if (!f.perGram) continue;
    const k = f.name.toLowerCase();
    if (telling.has(k) && !perNaam.has(k)) perNaam.set(k, { food: f, n: telling.get(k) });
  }
  const uit = [...perNaam.values()].sort((a, b) => b.n - a.n).slice(0, limit).map(v => v.food);
  for (const c of customFoods) {
    if (uit.length >= limit) break;
    if (!uit.some(f => f.id === c.id)) uit.push(c);
  }
  return uit;
}

// ─── AddFoodOverlay — het toevoeg-sheet ───────────────────────────────────────
// Eén sheet met stappen: zoeken → afwegen. De overige manieren om iets te loggen
// (foto, zelf ingeven, AI-schatting, AI-voorstel) zijn eigen stappen achter de
// knoppenrij onder het zoekveld.
function AddFoodOverlay({ pool, customFoods = [], userSlug, dateStr, onAdd, onSaveCustom, onClose, initialMeal, remaining }) {
  const [activeMeal, setActiveMeal] = useState(initialMeal || MEAL_TIMES[0].key);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [step, setStep] = useState('search');

  const [query, setQuery] = useState('');
  const [offResults, setOffResults] = useState([]);
  const [offLoading, setOffLoading] = useState(false);
  const [offError, setOffError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [barcodeMsg, setBarcodeMsg] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  const [sel, setSel] = useState(null);
  const [grams, setGrams] = useState(100);

  const emptyManual = { name: '', kcal: '', protein: '', carbs: '', fat: '' };
  const [manual, setManual] = useState(emptyManual);
  const [manualError, setManualError] = useState('');
  const [manualSaved, setManualSaved] = useState(false);

  const [description, setDescription] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const [sugKcal, setSugKcal] = useState(String(Math.round(remaining?.kcal || 0)));
  const [sugProtein, setSugProtein] = useState(String(Math.round(remaining?.protein || 0)));
  const [sugFat, setSugFat] = useState(String(Math.round(remaining?.fat || 0)));
  const [sugCarbs, setSugCarbs] = useState(String(Math.round(remaining?.carbs || 0)));
  const [sugLoading, setSugLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [sugError, setSugError] = useState('');

  const mealLabel = MEAL_TIMES.find(m => m.key === activeMeal)?.label || 'maaltijd';

  const library = useMemo(
    () => frequentFoods(userSlug, dateStr, pool, customFoods),
    [userSlug, dateStr, pool, customFoods]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return pool.filter(f => f.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q))
      .slice(0, 12);
  }, [pool, query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setOffResults([]); setOffLoading(false); setOffError(''); return; }
    let active = true;
    setOffLoading(true); setOffError('');
    const t = setTimeout(async () => {
      try {
        const r = await searchOpenFoodFacts(q);
        if (active) { setOffResults(r); setOffLoading(false); }
      } catch (e) {
        if (active) { setOffResults([]); setOffError('Online zoeken lukte even niet.'); setOffLoading(false); }
      }
    }, 450);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  const nieuwId = () => `log-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Een product kiezen: per 100 g → afweegstap, vaste portie → meteen loggen.
  function pick(item) {
    if (!item.perGram) {
      onAdd([{ id: nieuwId(), name: item.name, grams: null, kcal: item.kcal, protein: item.protein, fat: item.fat, carbs: item.carbs, source: item.source || 'custom', portionDescription: item.portionDescription }], activeMeal);
      setQuery('');
      return;
    }
    setSel(item);
    setGrams(item.servingQty || 100);
    setStep('weigh');
  }

  function basePortion(item) { return item?.servingQty || 100; }

  function scaled(item, g) {
    const r = v => Math.round(((Number(v) || 0) * g) / 100);
    return { kcal: r(item.kcal), protein: r(item.protein), fat: r(item.fat), carbs: r(item.carbs) };
  }

  function confirmWeigh() {
    if (!sel) return;
    const g = Math.max(1, Math.round(grams) || 0);
    onAdd([{
      id: nieuwId(), name: sel.name, grams: g,
      kcal: (sel.kcal * g) / 100, protein: (sel.protein * g) / 100,
      fat: (sel.fat * g) / 100, carbs: (sel.carbs * g) / 100,
      source: sel.source || 'nevo',
    }], activeMeal);
    // Sheet blijft open op de zoekstap: zo log je een maaltijd met meerdere
    // ingrediënten zonder telkens opnieuw te openen. De toast bevestigt.
    setSel(null); setQuery(''); setStep('search');
  }

  async function handleBarcode(code) {
    setScanning(false); setBarcodeMsg(''); setBarcodeLoading(true);
    try {
      const item = await lookupOffBarcode(code);
      if (item) pick(item);
      else setBarcodeMsg(`Barcode ${code} niet gevonden. Voeg het handmatig toe via "Zelf ingeven".`);
    } catch (e) { setBarcodeMsg('Opzoeken mislukt: ' + (e.message || '')); }
    setBarcodeLoading(false);
  }

  function handleManualSave(addToLog) {
    setManualError('');
    if (!manual.name.trim()) { setManualError('Vul een naam in.'); return; }
    const kcal = parseFloat(manual.kcal), protein = parseFloat(manual.protein), carbs = parseFloat(manual.carbs), fat = parseFloat(manual.fat);
    if ([kcal, protein, carbs, fat].some(isNaN)) { setManualError('Vul alle waarden in als getal.'); return; }
    const food = { id: `custom-${Date.now()}`, name: manual.name.trim(), kcal, protein, carbs, fat, fiber: 0, perGram: true, group: 'Eigen voedingsmiddelen' };
    onSaveCustom(food);
    setManual(emptyManual);
    if (addToLog) pick(food);
    else { setManualSaved(true); setTimeout(() => setManualSaved(false), 3000); }
  }

  async function handleAiEstimate() {
    if (!description.trim()) return;
    setAiLoading(true); setAiError(''); setAiResult(null);
    try { setAiResult(await estimateFoodWithAI(description)); }
    catch (e) { setAiError(e.message || 'Kon geen schatting maken.'); }
    setAiLoading(false);
  }

  function addAiResult(alsoSave) {
    onAdd([{ id: nieuwId(), name: aiResult.name, grams: null, kcal: aiResult.kcal, protein: aiResult.protein, fat: aiResult.fat, carbs: aiResult.carbs, source: 'ai', portionDescription: aiResult.portionDescription }], activeMeal);
    if (alsoSave) onSaveCustom({ id: `custom-${Date.now()}`, name: aiResult.name, kcal: aiResult.kcal, protein: aiResult.protein, fat: aiResult.fat, carbs: aiResult.carbs, perGram: false, portionDescription: aiResult.portionDescription });
    onClose();
  }

  async function handleSuggest() {
    const targets = {};
    if (sugKcal.trim()) targets.kcal = parseFloat(sugKcal);
    if (sugProtein.trim()) targets.protein = parseFloat(sugProtein);
    if (sugFat.trim()) targets.fat = parseFloat(sugFat);
    if (sugCarbs.trim()) targets.carbs = parseFloat(sugCarbs);
    if (Object.keys(targets).length === 0) { setSugError('Vul minstens één doelwaarde in.'); return; }
    setSugLoading(true); setSugError(''); setSuggestion(null);
    try { setSuggestion(await suggestMealWithAI(targets, mealLabel)); }
    catch (e) { setSugError(e.message || 'Kon geen suggestie maken.'); }
    setSugLoading(false);
  }

  function addSuggestion() {
    onAdd([{ id: nieuwId(), name: suggestion.title, grams: null, kcal: suggestion.kcal, protein: suggestion.protein, fat: suggestion.fat, carbs: suggestion.carbs, source: 'ai', portionDescription: [(suggestion.ingredients || []).join(', '), suggestion.description].filter(Boolean).join(' — ') }], activeMeal);
    onClose();
  }

  const fmtG = v => { v = Number(v) || 0; return v > 0 && v < 10 ? Math.round(v * 10) / 10 : Math.round(v); };

  const productRij = (item) => (
    <button key={item.id} onClick={() => pick(item)}
      className="w-full flex items-center gap-3.5 bg-[#f7f5f0] border border-[#dfe3ea] rounded-[18px] px-4 py-3.5 text-left
        active:scale-[.98] active:border-[#182a48] transition-transform shrink-0">
      <span className="w-9 h-9 rounded-xl bg-[#e6ecf6] flex items-center justify-center font-logo font-semibold text-[15px] text-[#35507d] shrink-0">
        {item.name.charAt(0).toUpperCase()}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-[15px] text-[#14223c] truncate">{item.name}</span>
        <span className="block mt-0.5 text-xs text-[#4a5568]">
          {Math.round(item.kcal)} kcal{item.perGram ? ' / 100 g' : ''} · {fmtG(item.protein)} g eiwit
        </span>
      </span>
      <span className="text-[#c2410c] shrink-0"><Icon name="Plus" size={17}/></span>
    </button>
  );

  const terugKnop = (
    <button onClick={() => { setStep('search'); setSel(null); }}
      className="flex items-center gap-2 font-semibold text-[13px] text-[#4a5568] shrink-0">
      <Icon name="ArrowLeft" size={15}/> Terug
    </button>
  );

  // ─── Stap: afwegen ─────────────────────────────────────────────────────────
  if (step === 'weigh' && sel) {
    const sc = scaled(sel, grams);
    const basis = basePortion(sel);
    const porties = [
      { label: sel.servingLabel ? `1 portie (${basis} g)` : `Portie (${basis} g)`, v: basis },
      { label: '100 g', v: 100 },
      { label: 'Half', v: Math.max(5, Math.round(basis / 2)) },
    ].filter((p, i, arr) => arr.findIndex(x => x.v === p.v) === i);
    return (
      <Sheet onClose={onClose}>
        {terugKnop}
        <p className="mt-3.5 mb-0 font-logo font-bold text-2xl text-[#14223c]">{sel.name}</p>
        <p className="mt-1.5 mb-0 text-[13px] text-[#4a5568]">
          {Math.round(sel.kcal)} kcal per 100 g · {sel.source === 'off' ? 'Open Food Facts' : (sel.group === 'Eigen voedingsmiddelen' ? 'eigen product' : 'NEVO')}
        </p>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-center gap-5 mt-6">
            <button onClick={() => setGrams(g => Math.max(5, g - 10))} aria-label="10 gram minder"
              className="w-[58px] h-[58px] shrink-0 rounded-[20px] bg-[#f7f5f0] border border-[#dfe3ea] flex items-center justify-center text-[#14223c] active:scale-95 transition-transform">
              <Icon name="Minus" size={22}/>
            </button>
            <div className="min-w-[130px] text-center">
              <input type="number" inputMode="numeric" value={grams}
                onChange={e => setGrams(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                onBlur={() => setGrams(g => Math.max(5, parseInt(g) || 5))}
                className="w-full bg-transparent text-center font-logo font-bold text-[54px] leading-none tabular-nums text-[#14223c] focus:outline-none"/>
              <p className="mt-0.5 mb-0 font-logo font-semibold text-[13px] tracking-[.14em] text-[#4a5568]">GRAM</p>
            </div>
            <button onClick={() => setGrams(g => (parseInt(g) || 0) + 10)} aria-label="10 gram meer"
              className="w-[58px] h-[58px] shrink-0 rounded-[20px] bg-[#f7f5f0] border border-[#dfe3ea] flex items-center justify-center text-[#14223c] active:scale-95 transition-transform">
              <Icon name="Plus" size={22}/>
            </button>
          </div>

          <div className="flex gap-2 justify-center flex-wrap mt-4">
            {porties.map(p => {
              const on = Number(grams) === p.v;
              return (
                <button key={p.label} onClick={() => setGrams(p.v)}
                  className={`px-4 py-2 rounded-full text-[13px] font-semibold border transition-colors
                    ${on ? 'bg-[#182a48] text-white border-[#182a48]' : 'bg-[#f7f5f0] text-[#14223c] border-[#dfe3ea]'}`}>
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex mt-6 bg-[#182a48] rounded-[20px] px-[18px] py-4">
            {[['kcal', sc.kcal, QV.orange], ['g eiwit', sc.protein, '#fff'], ['g KH', sc.carbs, '#fff'], ['g vet', sc.fat, '#fff']].map(([l, v, c]) => (
              <div key={l} className="flex-1 text-center">
                <p className="m-0 font-logo font-bold text-[22px] tabular-nums" style={{ color: c }}>{v}</p>
                <p className="mt-0.5 mb-0 text-[11px] font-medium text-white/70">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <PrimaryButton onClick={confirmWeigh}>
              <Icon name="CheckCircle2" size={19}/> Toevoegen aan {mealLabel.toLowerCase()}
            </PrimaryButton>
          </div>
        </div>
      </Sheet>
    );
  }

  // ─── Stap: foto ────────────────────────────────────────────────────────────
  if (step === 'photo') {
    return (
      <Sheet onClose={onClose}>
        {terugKnop}
        <p className="mt-3.5 mb-4 font-logo font-bold text-2xl text-[#14223c] shrink-0">Foto van je maaltijd</p>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <PhotoTab mealLabel={mealLabel} onConfirm={entries => { onAdd(entries, activeMeal); onClose(); }}/>
        </div>
      </Sheet>
    );
  }

  // ─── Stap: zelf ingeven ────────────────────────────────────────────────────
  if (step === 'manual') {
    const velden = [
      { key: 'kcal', label: 'Calorieën', unit: 'kcal' },
      { key: 'protein', label: 'Eiwitten', unit: 'g' },
      { key: 'carbs', label: 'Koolhydraten', unit: 'g' },
      { key: 'fat', label: 'Vetten', unit: 'g' },
    ];
    return (
      <Sheet onClose={onClose}>
        {terugKnop}
        <p className="mt-3.5 mb-0 font-logo font-bold text-2xl text-[#14223c] shrink-0">Zelf ingeven</p>
        <p className="mt-1.5 mb-4 text-[13px] text-[#4a5568] shrink-0">Waarden <strong>per 100 g</strong>. Wordt bewaard in je eigen lijst.</p>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3">
          <input value={manual.name} placeholder="Naam product, bv. Proteïnereep XYZ"
            onChange={e => { setManual(m => ({ ...m, name: e.target.value })); setManualError(''); setManualSaved(false); }}
            className="w-full bg-[#f7f5f0] border border-[#dfe3ea] rounded-2xl px-4 py-3.5 text-[15px] text-[#14223c] focus:outline-none focus:border-[#182a48]"/>
          <div className="grid grid-cols-2 gap-2">
            {velden.map(({ key, label, unit }) => (
              <div key={key} className="bg-[#f7f5f0] border border-[#dfe3ea] rounded-2xl p-3">
                <Eyebrow className="mb-1.5">{label}</Eyebrow>
                <div className="flex items-center gap-1">
                  <input type="number" inputMode="decimal" min="0" value={manual[key]} placeholder="0"
                    onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setManualError(''); setManualSaved(false); }}
                    className="w-full bg-white border border-[#dfe3ea] rounded-xl px-2 py-2 text-center font-logo font-semibold text-[15px] text-[#14223c] focus:outline-none focus:border-[#182a48]"/>
                  <span className="text-xs text-[#8494aa] shrink-0">{unit}</span>
                </div>
              </div>
            ))}
          </div>
          {manualError && <p className="m-0 text-[13px] text-[#c2410c] bg-[#f7f5f0] rounded-xl px-4 py-3">{manualError}</p>}
          {manualSaved && <p className="m-0 text-[13px] text-[#35507d] bg-[#e6ecf6] rounded-xl px-4 py-3">Opgeslagen in je productenlijst.</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => handleManualSave(false)}
              className="flex-1 h-12 rounded-[18px] border border-[#dfe3ea] bg-white text-[#14223c] font-semibold text-sm active:scale-[.98] transition-transform">
              Alleen opslaan
            </button>
            <PrimaryButton onClick={() => handleManualSave(true)} className="flex-1 h-12 text-sm">
              <Icon name="Plus" size={15}/> Opslaan &amp; toevoegen
            </PrimaryButton>
          </div>
        </div>
      </Sheet>
    );
  }

  // ─── Stap: AI-schatting ────────────────────────────────────────────────────
  if (step === 'describe') {
    return (
      <Sheet onClose={onClose}>
        {terugKnop}
        <p className="mt-3.5 mb-0 font-logo font-bold text-2xl text-[#14223c] shrink-0">AI-schatting</p>
        <p className="mt-1.5 mb-4 text-[13px] text-[#4a5568] shrink-0">Beschrijf wat je at, de AI schat de macro's.</p>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="Bv. 150 g kipfilet met rijst en broccoli"
            className="w-full bg-[#f7f5f0] border border-[#dfe3ea] rounded-2xl px-4 py-3.5 text-[15px] text-[#14223c] resize-none focus:outline-none focus:border-[#182a48]"/>
          <button onClick={handleAiEstimate} disabled={aiLoading || !description.trim()}
            className="w-full h-12 rounded-[18px] bg-[#2f8bff] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[.98] transition-transform">
            {aiLoading ? <Icon name="Loader2" size={15}/> : <Icon name="Sparkles" size={15}/>}
            {aiLoading ? 'Schatten…' : "Schat macro's"}
          </button>
          {aiError && <p className="m-0 text-[13px] text-[#c2410c] bg-[#f7f5f0] rounded-xl px-4 py-3">{aiError}</p>}
          {aiResult && (
            <div className="bg-[#f7f5f0] border border-[#dfe3ea] rounded-[18px] p-4 space-y-2">
              <p className="m-0 font-semibold text-[15px] text-[#14223c]">{aiResult.name}</p>
              {aiResult.portionDescription && <p className="m-0 text-xs text-[#4a5568]">{aiResult.portionDescription}</p>}
              <p className="m-0 text-[13px] text-[#4a5568]">
                {Math.round(aiResult.kcal)} kcal · {Math.round(aiResult.protein)} g eiwit · {Math.round(aiResult.fat)} g vet · {Math.round(aiResult.carbs)} g KH
              </p>
              <div className="flex gap-2 pt-1">
                <PrimaryButton onClick={() => addAiResult(false)} className="flex-1 h-11 text-sm">Toevoegen</PrimaryButton>
                <button onClick={() => addAiResult(true)}
                  className="flex-1 h-11 rounded-[18px] border border-[#dfe3ea] bg-white text-[#14223c] font-semibold text-sm">+ Opslaan</button>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    );
  }

  // ─── Stap: AI-voorstel ─────────────────────────────────────────────────────
  if (step === 'suggest') {
    return (
      <Sheet onClose={onClose}>
        {terugKnop}
        <p className="mt-3.5 mb-0 font-logo font-bold text-2xl text-[#14223c] shrink-0">AI-voorstel</p>
        <p className="mt-1.5 mb-4 text-[13px] text-[#4a5568] shrink-0">Ingevuld met wat je vandaag nog nodig hebt. Pas gerust aan.</p>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {[['Kcal', sugKcal, setSugKcal], ['Eiwit', sugProtein, setSugProtein], ['Vet', sugFat, setSugFat], ['KH', sugCarbs, setSugCarbs]].map(([l, v, s]) => (
              <div key={l} className="bg-[#f7f5f0] border border-[#dfe3ea] rounded-2xl p-2.5">
                <Eyebrow className="mb-1.5">{l}</Eyebrow>
                <input type="number" inputMode="decimal" value={v} onChange={e => s(e.target.value)} placeholder="–"
                  className="w-full bg-white border border-[#dfe3ea] rounded-xl px-1 py-1.5 text-center font-logo font-semibold text-[15px] text-[#14223c] focus:outline-none focus:border-[#182a48]"/>
              </div>
            ))}
          </div>
          <button onClick={handleSuggest} disabled={sugLoading}
            className="w-full h-12 rounded-[18px] bg-[#2f8bff] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[.98] transition-transform">
            {sugLoading ? <Icon name="Loader2" size={15}/> : <Icon name="Sparkles" size={15}/>}
            {sugLoading ? 'Bezig…' : 'Genereer voorstel'}
          </button>
          {sugError && <p className="m-0 text-[13px] text-[#c2410c] bg-[#f7f5f0] rounded-xl px-4 py-3">{sugError}</p>}
          {suggestion && (
            <div className="bg-[#f7f5f0] border border-[#dfe3ea] rounded-[18px] p-4 space-y-2">
              <p className="m-0 font-semibold text-[15px] text-[#14223c]">{suggestion.title}</p>
              {Array.isArray(suggestion.ingredients) && suggestion.ingredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestion.ingredients.map((ing, i) => (
                    <span key={i} className="text-[11px] font-medium bg-[#eef1f6] text-[#35507d] rounded-md px-2 py-1">{ing}</span>
                  ))}
                </div>
              )}
              {suggestion.description && <p className="m-0 text-xs text-[#4a5568] italic">{suggestion.description}</p>}
              <p className="m-0 text-[13px] text-[#4a5568]">
                {Math.round(suggestion.kcal)} kcal · {Math.round(suggestion.protein)} g eiwit · {Math.round(suggestion.fat)} g vet · {Math.round(suggestion.carbs)} g KH
              </p>
              <PrimaryButton onClick={addSuggestion} className="h-11 text-sm">Toevoegen aan {mealLabel.toLowerCase()}</PrimaryButton>
            </div>
          )}
        </div>
      </Sheet>
    );
  }

  // ─── Stap: zoeken ──────────────────────────────────────────────────────────
  return (
    <>
      {scanning && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)}/>}
      <Sheet onClose={onClose}>
        <div className="shrink-0">
          <p className="m-0 mb-1 font-logo font-bold text-[22px] text-[#14223c]">Wat heb je gegeten?</p>
          <button onClick={() => setShowMealPicker(v => !v)} className="flex items-center gap-1.5 text-[13px] text-[#4a5568]">
            Gaat naar <span className="font-semibold text-[#c2410c]">{mealLabel.toLowerCase()}</span>
            <Icon name={showMealPicker ? 'ChevronLeft' : 'ChevronRight'} size={13}/>
          </button>
          {showMealPicker && (
            <div className="mt-3">
              <MealTimeSelector active={activeMeal} onChange={k => { setActiveMeal(k); setShowMealPicker(false); }}/>
            </div>
          )}

          <div className="flex gap-2.5 mt-4">
            <div className="flex-1 flex items-center gap-2.5 bg-[#f7f5f0] border border-[#dfe3ea] rounded-2xl px-4 py-3.5 focus-within:border-[#182a48]">
              <span className="text-[#4a5568] shrink-0"><Icon name="Search" size={17}/></span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Zoek een product"
                className="w-full bg-transparent text-[15px] text-[#14223c] placeholder:text-[#4a5568] focus:outline-none"/>
            </div>
            <button onClick={() => { setBarcodeMsg(''); setScanning(true); }} title="Scan barcode" aria-label="Scan barcode"
              className="w-[52px] bg-[#eef1f6] rounded-2xl flex items-center justify-center text-[#1e3a8a] active:scale-95 transition-transform">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="5" width="18" height="14" rx="2"/><line x1="7" y1="9" x2="7" y2="15"/>
                <line x1="11" y1="9" x2="11" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/><line x1="19" y1="9" x2="19" y2="15"/>
              </svg>
            </button>
            <button onClick={() => setStep('photo')} title="Foto van je maaltijd" aria-label="Foto van je maaltijd"
              className="w-[52px] bg-[#eef1f6] rounded-2xl flex items-center justify-center text-[#1e3a8a] active:scale-95 transition-transform">
              <Icon name="Camera" size={19}/>
            </button>
          </div>

          <div className="flex gap-2 mt-2.5">
            {[
              { id: 'manual', label: 'Zelf ingeven', icon: 'Plus' },
              { id: 'describe', label: 'AI-schatting', icon: 'Sparkles' },
              { id: 'suggest', label: 'AI-voorstel', icon: 'ChefHat' },
            ].map(t => (
              <button key={t.id} onClick={() => setStep(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-[#dfe3ea] bg-white px-2 py-2 text-[12px] font-semibold text-[#35507d] active:scale-95 transition-transform">
                <Icon name={t.icon} size={12}/> {t.label}
              </button>
            ))}
          </div>

          {barcodeLoading && <p className="mt-3 mb-0 text-[13px] text-[#4a5568] flex items-center gap-2"><Icon name="Loader2" size={13}/> Barcode opzoeken…</p>}
          {barcodeMsg && <p className="mt-3 mb-0 text-[13px] text-[#35507d] bg-[#e6ecf6] rounded-xl px-4 py-3">{barcodeMsg}</p>}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar mt-5">
          {query.trim() ? (
            <div className="space-y-4">
              {results.length > 0 && (
                <div>
                  <Eyebrow className="mb-2.5">NEVO &amp; eigen producten</Eyebrow>
                  <div className="flex flex-col gap-2">{results.map(productRij)}</div>
                </div>
              )}
              <div>
                <Eyebrow className="mb-2.5 flex items-center gap-2">
                  Merkproducten {offLoading && <Icon name="Loader2" size={11}/>}
                </Eyebrow>
                {offResults.length > 0
                  ? <div className="flex flex-col gap-2">{offResults.map(productRij)}</div>
                  : !offLoading && (
                    <p className="m-0 text-[13px] text-[#8494aa]">
                      {query.trim().length < 3 ? 'Typ minstens 3 tekens voor merkproducten…' : offError || 'Geen merkproducten gevonden.'}
                    </p>
                  )}
              </div>
            </div>
          ) : (
            <div>
              <Eyebrow className="mb-2.5">Wat je vaak eet</Eyebrow>
              {library.length > 0
                ? <div className="flex flex-col gap-2">{library.map(productRij)}</div>
                : <p className="m-0 text-[13px] text-[#8494aa]">Nog niets gelogd. Zoek hierboven een product, scan een barcode of maak een foto.</p>}
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}

// ─── Dagboek — tijdlijn per eetmoment ────────────────────────────────────────
// Logregels dragen geen kloktijd, dus het eetmoment staat in de linkerkolom waar
// het ontwerp een tijdstip toont. Elk moment houdt zijn eigen plus-knop.
function DailyLogList({ log, onRemove, onOpenAdd, mealPhotos = {} }) {
  const grouped = useMemo(() => groupByMeal(log), [log]);
  return (
    <div>
      <div className="h-px bg-[#dfe3ea] mt-7"/>
      {MEAL_TIMES.map(meal => {
        const entries = grouped[meal.key];
        const sub = entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein }), { kcal: 0, protein: 0 });
        return (
          <div key={meal.key} className="border-b border-[#dfe3ea]">
            <div className="flex items-center gap-4 pt-4 pb-1">
              <span className="w-[52px] shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[.1em] text-[#4a5568] leading-tight">
                {meal.short || meal.label}
              </span>
              <span className="flex-1 min-w-0 text-[13px] text-[#8494aa]">
                {entries.length > 0 ? `${Math.round(sub.kcal)} kcal · ${Math.round(sub.protein)} g eiwit` : 'Nog niets gelogd'}
              </span>
              <button onClick={() => onOpenAdd(meal.key)} aria-label={`Toevoegen aan ${meal.label}`}
                className="w-7 h-7 rounded-[9px] bg-[#e6ecf6] flex items-center justify-center text-[#35507d] shrink-0 active:scale-90 transition-transform">
                <Icon name="Plus" size={14}/>
              </button>
            </div>
            {entries.map(e => (
              <div key={e.id} className="flex items-center gap-4 py-3">
                <span className="w-[52px] shrink-0"/>
                {e.photoId && mealPhotos[e.photoId] && (
                  <img src={mealPhotos[e.photoId]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 -ml-2"/>
                )}
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-[16px] text-[#14223c] truncate">{e.name}{e.grams ? ` · ${Math.round(e.grams)} g` : ''}</p>
                  <p className="mt-0.5 mb-0 text-[13px] text-[#4a5568]">
                    {Math.round(e.kcal)} kcal · {Math.round(e.protein)} g eiwit
                  </p>
                  {Array.isArray(e.ingredients) && e.ingredients.length > 0 && (
                    <p className="mt-1 mb-0 text-[11px] text-[#8494aa] truncate">{e.ingredients.join(' · ')}</p>
                  )}
                </div>
                <button onClick={() => onRemove(e.id)} aria-label={`${e.name} verwijderen`}
                  className="w-7 h-7 rounded-[9px] bg-[#e6ecf6] flex items-center justify-center text-[#35507d] shrink-0 active:scale-90 transition-transform">
                  <Icon name="X" size={13}/>
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Dag herhalen naar gekozen weekdagen ─────────────────────────────────────
function RepeatDayModal({ dateStr, count, onConfirm, onClose }) {
  const weekdagen = [{ d: 1, label: 'Ma' }, { d: 2, label: 'Di' }, { d: 3, label: 'Wo' }, { d: 4, label: 'Do' }, { d: 5, label: 'Vr' }, { d: 6, label: 'Za' }, { d: 0, label: 'Zo' }];
  const baseDay = new Date(dateStr + 'T00:00:00').getDay();
  const [days, setDays] = useState([baseDay]);
  const [weeks, setWeeks] = useState(4);
  const [done, setDone] = useState(null);
  function toggle(d) { setDays(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d]); }
  function go() { if (!days.length) return; const w = Math.max(1, Math.min(parseInt(weeks) || 0, 26)); const n = onConfirm(w, days); setDone({ n, w }); }
  return (
    <Sheet onClose={onClose}>
      <p className="m-0 mb-4 font-logo font-bold text-2xl text-[#14223c] shrink-0">Dag herhalen</p>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-4">
        {done ? (
          <div className="text-center py-4">
            <Icon name="CheckCircle2" size={32} className="mx-auto text-[#2f8bff] mb-3"/>
            <p className="m-0 text-[15px] text-[#14223c]">
              Gekopieerd naar <b>{done.n}</b> {done.n === 1 ? 'dag' : 'dagen'} over de komende <b>{done.w}</b> {done.w === 1 ? 'week' : 'weken'}.
            </p>
            <div className="mt-5"><PrimaryButton onClick={onClose}>Klaar</PrimaryButton></div>
          </div>
        ) : count === 0 ? (
          <p className="m-0 text-[15px] text-[#8494aa] text-center py-6">Deze dag is leeg — er is niets om te herhalen.</p>
        ) : (
          <>
            <p className="m-0 text-[15px] text-[#4a5568]">
              Kopieer <b className="text-[#14223c] capitalize">{formatDateNice(dateStr)}</b> ({count} {count === 1 ? 'item' : 'items'}) naar deze weekdagen:
            </p>
            <div className="flex gap-1.5">
              {weekdagen.map(w => {
                const on = days.includes(w.d);
                return (
                  <button key={w.d} onClick={() => toggle(w.d)}
                    className={`flex-1 py-2.5 rounded-[14px] text-[13px] font-semibold border transition-colors
                      ${on ? 'bg-[#182a48] text-white border-[#182a48]' : 'bg-white text-[#14223c] border-[#dfe3ea]'}`}>{w.label}</button>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[15px] text-[#4a5568]">de komende</span>
              <input type="number" min="1" max="26" value={weeks} onChange={e => setWeeks(e.target.value)}
                className="w-16 border border-[#dfe3ea] rounded-xl px-3 py-2 text-center font-logo font-semibold text-[#14223c] focus:outline-none focus:border-[#182a48]"/>
              <span className="text-[15px] text-[#4a5568]">weken</span>
            </div>
            <p className="m-0 text-[13px] text-[#c2410c] bg-[#f7f5f0] border border-[#dfe3ea] rounded-xl px-4 py-3">
              Let op: bestaande voeding op de gekozen weekdagen wordt overschreven.
            </p>
            <PrimaryButton onClick={go} disabled={!days.length}>Herhalen</PrimaryButton>
          </>
        )}
      </div>
    </Sheet>
  );
}
