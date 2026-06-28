// ─── modules/voeding — dagboek, voedingszoekopdracht, overlay ─────────────────

const HTML5_QRCODE_SRC = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';

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
      } catch (e) {
        try { inst.clear(); } catch (e2) {}
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-white">Scan een barcode</span>
          <button onClick={onClose} className="text-white/70 hover:text-white"><Icon name="X" size={20}/></button>
        </div>
        <div id="qvolve-barcode-reader" className="w-full rounded-2xl overflow-hidden bg-black min-h-[200px]" />
        {loading && !error && <p className="text-xs text-white/70 mt-3 flex items-center gap-2"><Icon name="Loader2" size={13}/> Camera starten…</p>}
        {error && <p className="text-xs text-red-300 bg-red-950/50 rounded-lg px-3 py-2 mt-3">{error}</p>}
        {!error && <p className="text-[11px] text-white/50 mt-3 text-center">Richt op de streepjescode van het product.</p>}
      </div>
    </div>
  );
}

// ─── AddFoodOverlay ───────────────────────────────────────────────────────────
function AddFoodOverlay({ pool, onAdd, onSaveCustom, onClose, initialMeal, remaining }) {
  const [activeMeal, setActiveMeal] = useState(initialMeal || MEAL_TIMES[0].key);
  const [tab, setTab] = useState('search');

  const [query, setQuery] = useState('');
  const [staged, setStaged] = useState([]);
  const [offResults, setOffResults] = useState([]);
  const [offLoading, setOffLoading] = useState(false);
  const [offError, setOffError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [barcodeMsg, setBarcodeMsg] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);

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

  async function handleBarcode(code) {
    setScanning(false); setBarcodeMsg(''); setBarcodeLoading(true);
    try {
      const item = await lookupOffBarcode(code);
      if (item) {
        addToStaged(item);
        setBarcodeMsg(`✓ ${item.name} toegevoegd${item.servingLabel ? ` — 1 portie = ${item.servingLabel}` : ''}. Pas de hoeveelheid aan indien nodig.`);
      } else {
        setBarcodeMsg(`Barcode ${code} niet gevonden. Voeg het handmatig toe via "Zelf ingeven".`);
      }
    } catch (e) { setBarcodeMsg('Opzoeken mislukt: ' + (e.message || '')); }
    setBarcodeLoading(false);
  }

  const renderRow = (item) => (
    <button key={item.id} onClick={() => addToStaged(item)} className="w-full text-left px-3 py-2.5 hover:bg-orange-50 text-sm flex justify-between items-center gap-2">
      <span className="text-gray-800 truncate">{item.name}</span>
      <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">{Math.round(item.kcal)} kcal{item.perGram ? '/100g' : ''} <Icon name="Plus" size={12} className="text-orange-400"/></span>
    </button>
  );

  function addToStaged(item) {
    const defaultGrams = item.servingQty || (item.perGram ? 100 : null);
    setStaged(s => [...s, { ...item, stagedId: `s-${Date.now()}-${Math.random().toString(36).slice(2)}`, grams: defaultGrams }]);
    setQuery('');
  }
  function updateGrams(id, g) { setStaged(s => s.map(it => it.stagedId === id ? { ...it, grams: g } : it)); }
  function removeStaged(id) { setStaged(s => s.filter(it => it.stagedId !== id)); }

  function confirmAll() {
    const entries = staged.map(item => {
      if (item.perGram) {
        const g = parseFloat(item.grams) || 0;
        return { id: `log-${Date.now()}-${Math.random()}`, name: item.name, grams: g, kcal: (item.kcal * g) / 100, protein: (item.protein * g) / 100, fat: (item.fat * g) / 100, carbs: (item.carbs * g) / 100, source: item.source || 'nevo' };
      }
      return { id: `log-${Date.now()}-${Math.random()}`, name: item.name, grams: null, kcal: item.kcal, protein: item.protein, fat: item.fat, carbs: item.carbs, source: 'custom', portionDescription: item.portionDescription };
    });
    onAdd(entries, activeMeal); setStaged([]); onClose();
  }

  function handleManualSave(addToLog) {
    setManualError('');
    if (!manual.name.trim()) { setManualError('Vul een naam in.'); return; }
    const kcal = parseFloat(manual.kcal), protein = parseFloat(manual.protein), carbs = parseFloat(manual.carbs), fat = parseFloat(manual.fat);
    if ([kcal, protein, carbs, fat].some(isNaN)) { setManualError('Vul alle waarden in als getal.'); return; }
    const food = { id: `custom-${Date.now()}`, name: manual.name.trim(), kcal, protein, carbs, fat, fiber: 0, perGram: true, group: 'Eigen voedingsmiddelen' };
    onSaveCustom(food);
    if (addToLog) { addToStaged(food); setTab('search'); setManual(emptyManual); }
    else { setManualSaved(true); setManual(emptyManual); setTimeout(() => setManualSaved(false), 3000); }
  }

  async function handleAiEstimate() {
    if (!description.trim()) return;
    setAiLoading(true); setAiError(''); setAiResult(null);
    try { setAiResult(await estimateFoodWithAI(description)); }
    catch (e) { setAiError(e.message || 'Kon geen schatting maken.'); }
    setAiLoading(false);
  }

  function addAiResult(alsoSave) {
    onAdd([{ id: `log-${Date.now()}-${Math.random()}`, name: aiResult.name, grams: null, kcal: aiResult.kcal, protein: aiResult.protein, fat: aiResult.fat, carbs: aiResult.carbs, source: 'ai', portionDescription: aiResult.portionDescription }], activeMeal);
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
    try {
      const lbl = MEAL_TIMES.find(m => m.key === activeMeal)?.label || 'maaltijd';
      setSuggestion(await suggestMealWithAI(targets, lbl));
    } catch (e) { setSugError(e.message || 'Kon geen suggestie maken.'); }
    setSugLoading(false);
  }

  function addSuggestion() {
    onAdd([{ id: `log-${Date.now()}-${Math.random()}`, name: suggestion.title, grams: null, kcal: suggestion.kcal, protein: suggestion.protein, fat: suggestion.fat, carbs: suggestion.carbs, source: 'ai', portionDescription: [(suggestion.ingredients || []).join(', '), suggestion.description].filter(Boolean).join(' — ') }], activeMeal);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      {scanning && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />}

      <div className="bg-[#182a48] border-b border-[#2b3e60] px-4 flex items-center gap-3 h-14 shrink-0">
        <button onClick={onClose} className="text-white/70 hover:text-white p-1 -ml-1"><Icon name="ArrowLeft" size={20}/></button>
        <span className="font-logo text-base font-bold text-white tracking-wide flex-1">Voeg toe</span>
        <span className="text-xs text-white/50">{MEAL_TIMES.find(m => m.key === activeMeal)?.label}</span>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-2 shrink-0 overflow-x-auto">
        <MealTimeSelector active={activeMeal} onChange={setActiveMeal}/>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-2 shrink-0">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[{ id: 'search', label: 'Zoeken' }, { id: 'manual', label: 'Zelf ingeven' }, { id: 'describe', label: 'AI-schatting' }, { id: 'suggest', label: 'AI Voorstel' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {tab === 'search' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon name="Search" size={15}/></span>
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Zoek voedingsmiddel of merk..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              </div>
              <button onClick={() => { setBarcodeMsg(''); setScanning(true); }} title="Scan barcode"
                className="shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-[#2f8bff] hover:bg-[#2076e8] text-white text-xs font-medium">
                <Icon name="Camera" size={15}/> Scan
              </button>
            </div>
            {barcodeLoading && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Icon name="Loader2" size={12}/> Barcode opzoeken…</p>}
            {barcodeMsg && <p className="text-xs px-3 py-2 rounded-xl bg-blue-50 text-blue-700">{barcodeMsg}</p>}
            {query.trim() && (
              <div className="space-y-3">
                {results.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 px-1 mb-1">NEVO &amp; eigen producten</p>
                    <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
                      {results.map(renderRow)}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-medium text-gray-400 px-1 mb-1 flex items-center gap-1.5">
                    Merkproducten · Open Food Facts {offLoading && <Icon name="Loader2" size={11}/>}
                  </p>
                  {offResults.length > 0 ? (
                    <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
                      {offResults.map(renderRow)}
                    </div>
                  ) : (
                    !offLoading && <p className="text-xs text-gray-300 px-1">{query.trim().length < 3 ? 'Typ minstens 3 tekens voor merkproducten…' : offError || 'Geen merkproducten gevonden.'}</p>
                  )}
                </div>
              </div>
            )}
            {staged.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600">Geselecteerd — vul grammen in:</p>
                {staged.map(item => (
                  <div key={item.stagedId} className="bg-white border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{item.name}</span>
                      {item.perGram ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <input type="number" inputMode="decimal" value={item.grams} onChange={e => updateGrams(item.stagedId, e.target.value)} className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center"/>
                          <span className="text-xs text-gray-400">g</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 shrink-0">vaste portie</span>
                      )}
                      <button onClick={() => removeStaged(item.stagedId)} className="text-gray-300 hover:text-red-500 shrink-0"><Icon name="X" size={14}/></button>
                    </div>
                    {item.servingLabel && item.perGram && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-gray-400">1 portie = {item.servingLabel}</span>
                        {Number(item.grams) !== item.servingQty && (
                          <button onClick={() => updateGrams(item.stagedId, item.servingQty)} className="text-[11px] text-orange-500 hover:text-orange-600 underline">Gebruik portie</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={confirmAll} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Icon name="Plus" size={15}/> Toevoegen ({staged.length})
                </button>
              </div>
            )}
            {!query.trim() && staged.length === 0 && (
              <p className="text-sm text-gray-300 text-center pt-8">Zoek een voedingsmiddel hierboven of scan een barcode.</p>
            )}
          </div>
        )}

        {tab === 'manual' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <p className="text-xs text-gray-500">Voedingswaarden <strong>per 100g</strong>. Wordt opgeslagen in je persoonlijke lijst.</p>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Naam product</label>
                <input value={manual.name} onChange={e => { setManual(m => ({ ...m, name: e.target.value })); setManualError(''); setManualSaved(false); }}
                  placeholder="Bv. Proteïnereep XYZ" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[{ key: 'kcal', label: 'Calorieën', unit: 'kcal', color: 'text-orange-500' }, { key: 'protein', label: 'Eiwitten', unit: 'g', color: 'text-blue-600' }, { key: 'carbs', label: 'Koolhydraten', unit: 'g', color: 'text-purple-600' }, { key: 'fat', label: 'Vetten', unit: 'g', color: 'text-amber-600' }].map(({ key, label, unit, color }) => (
                  <div key={key} className="bg-gray-50 rounded-xl p-3">
                    <label className={`text-[11px] font-semibold ${color} block mb-1`}>{label}</label>
                    <div className="flex items-center gap-1">
                      <input type="number" inputMode="decimal" min="0" value={manual[key]} onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setManualError(''); setManualSaved(false); }} placeholder="0"
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      <span className="text-xs text-gray-400 flex-shrink-0">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              {manualError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{manualError}</p>}
              {manualSaved && <p className="text-xs text-orange-500 bg-orange-50 rounded-lg px-3 py-2">✓ Opgeslagen in je productenlijst!</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleManualSave(false)} className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-2.5 text-sm font-medium">Alleen opslaan</button>
                <button onClick={() => handleManualSave(true)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5">
                  <Icon name="Plus" size={14}/> Opslaan & toevoegen
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'describe' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <p className="text-xs text-gray-500">Beschrijf wat je hebt gegeten en AI schat de macro's.</p>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Bv. 150g kipfilet met rijst en broccoli" rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              <button onClick={handleAiEstimate} disabled={aiLoading || !description.trim()}
                className="w-full bg-[#2f8bff] hover:bg-[#2076e8] disabled:bg-gray-300 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                {aiLoading ? <Icon name="Loader2" size={14}/> : <Icon name="Sparkles" size={14}/>}{aiLoading ? 'Schatten...' : "Schat macro's"}
              </button>
              {aiError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{aiError}</p>}
              {aiResult && (
                <div className="border border-orange-100 bg-orange-50 rounded-xl p-3 space-y-2">
                  <p className="text-sm font-semibold text-gray-800">{aiResult.name}</p>
                  {aiResult.portionDescription && <p className="text-xs text-gray-500">{aiResult.portionDescription}</p>}
                  <p className="text-xs text-gray-600">{Math.round(aiResult.kcal)} kcal · {Math.round(aiResult.protein)}g eiwit · {Math.round(aiResult.fat)}g vet · {Math.round(aiResult.carbs)}g KH</p>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => addAiResult(false)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 text-xs font-medium">Toevoegen</button>
                    <button onClick={() => addAiResult(true)} className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg py-2 text-xs font-medium">+ Opslaan</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'suggest' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-0.5">AI Maaltijdvoorstel</p>
                <p className="text-xs text-gray-500">Ingevuld op basis van wat je vandaag nog nodig hebt. Pas aan indien gewenst.</p>
              </div>
              {remaining && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                  Nog nodig vandaag: <strong>{Math.round(remaining.kcal)} kcal</strong> · {Math.round(remaining.protein)}g eiwit · {Math.round(remaining.fat)}g vet · {Math.round(remaining.carbs)}g KH
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {[['Kcal', sugKcal, setSugKcal, 'text-orange-500'], ['Eiwit', sugProtein, setSugProtein, 'text-blue-600'], ['Vet', sugFat, setSugFat, 'text-amber-600'], ['KH', sugCarbs, setSugCarbs, 'text-purple-600']].map(([l, v, s, c]) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-2.5">
                    <label className={`block text-[10px] font-semibold ${c} mb-1`}>{l}</label>
                    <input type="number" inputMode="decimal" value={v} onChange={e => s(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="-"/>
                  </div>
                ))}
              </div>
              <button onClick={handleSuggest} disabled={sugLoading}
                className="w-full bg-[#2f8bff] hover:bg-[#2076e8] disabled:bg-gray-300 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                {sugLoading ? <Icon name="Loader2" size={14}/> : <Icon name="Sparkles" size={14}/>}{sugLoading ? 'Bezig...' : 'Genereer voorstel'}
              </button>
              {sugError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{sugError}</p>}
              {suggestion && (
                <div className="border border-orange-100 bg-orange-50 rounded-xl p-3 space-y-2">
                  <p className="text-sm font-semibold text-gray-800">{suggestion.title}</p>
                  {Array.isArray(suggestion.ingredients) && suggestion.ingredients.length > 0 && (
                    <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                      {suggestion.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                    </ul>
                  )}
                  {suggestion.description && <p className="text-xs text-gray-500 italic">{suggestion.description}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
                    <span className="text-orange-600">{Math.round(suggestion.kcal)} kcal</span>
                    <span className="text-blue-600">{Math.round(suggestion.protein)}g eiwit</span>
                    <span className="text-amber-600">{Math.round(suggestion.fat)}g vet</span>
                    <span className="text-purple-600">{Math.round(suggestion.carbs)}g KH</span>
                  </div>
                  <button onClick={addSuggestion} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 text-xs font-medium">
                    Toevoegen aan {MEAL_TIMES.find(m => m.key === activeMeal)?.label.toLowerCase() || 'logboek'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DailyLogList ─────────────────────────────────────────────────────────────
function DailyLogList({ log, onRemove, onOpenAdd }) {
  const grouped = useMemo(() => groupByMeal(log), [log]);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Dagboek</h2>
      <div className="space-y-4">
        {MEAL_TIMES.map(meal => {
          const entries = grouped[meal.key];
          const sub = entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein, fat: a.fat + e.fat, carbs: a.carbs + e.carbs }), { kcal: 0, protein: 0, fat: 0, carbs: 0 });
          return (
            <div key={meal.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700">{meal.label}</span>
                <div className="flex items-center gap-2">
                  {entries.length > 0 && <span className="text-xs text-gray-400">{Math.round(sub.kcal)} kcal · {Math.round(sub.protein)}g E</span>}
                  <button onClick={() => onOpenAdd(meal.key)} className="w-6 h-6 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-400 hover:text-orange-600 flex items-center justify-center transition-colors" title={`Toevoegen aan ${meal.label}`}>
                    <Icon name="Plus" size={13}/>
                  </button>
                </div>
              </div>
              {entries.length === 0 ? <p className="text-xs text-gray-300 pl-1">Nog niets gelogd</p> :
                <div className="space-y-1.5 pl-1">
                  {entries.map(e => (
                    <div key={e.id} className="py-1 border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-800 flex-1 min-w-0">{e.name}{e.grams ? ` · ${e.grams}g` : ''}</p>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs text-gray-400">{Math.round(e.kcal)} kcal</span>
                          <button onClick={() => onRemove(e.id)} className="text-gray-300 hover:text-red-500"><Icon name="Trash2" size={15}/></button>
                        </div>
                      </div>
                      {Array.isArray(e.ingredients) && e.ingredients.length > 0 && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{e.ingredients.join(' · ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              }
            </div>
          );
        })}
      </div>
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
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">🔁 Dag herhalen</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><Icon name="X" size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          {done ? (
            <div className="text-center py-4">
              <Icon name="CheckCircle2" size={32} className="mx-auto text-green-500 mb-2"/>
              <p className="text-sm text-gray-700">Gekopieerd naar <b>{done.n}</b> {done.n === 1 ? 'dag' : 'dagen'} over de komende <b>{done.w}</b> {done.w === 1 ? 'week' : 'weken'}.</p>
              <button onClick={onClose} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 px-6 text-sm font-medium">Klaar</button>
            </div>
          ) : count === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Deze dag is leeg — er is niets om te herhalen.</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">Kopieer <b className="text-gray-800 capitalize">{formatDateNice(dateStr)}</b> ({count} {count === 1 ? 'item' : 'items'}) naar deze weekdagen:</p>
              <div className="flex gap-1.5">
                {weekdagen.map(w => { const on = days.includes(w.d); return (
                  <button key={w.d} onClick={() => toggle(w.d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${on ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{w.label}</button>
                ); })}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">de komende</label>
                <input type="number" min="1" max="26" value={weeks} onChange={e => setWeeks(e.target.value)} className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                <label className="text-sm text-gray-600">weken</label>
              </div>
              <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Let op: bestaande voeding op de gekozen weekdagen wordt overschreven.</p>
              <button onClick={go} disabled={!days.length} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl py-2.5 text-sm font-medium">Herhalen</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
