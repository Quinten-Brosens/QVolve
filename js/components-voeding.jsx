// ─── Kleine componenten ───────────────────────────────────────────────────────
function MacroBar({label,consumed,target,unit,color}){
  const pct=target>0?Math.min((consumed/target)*100,100):0;
  const over=consumed>target;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className={`text-xs ${over?'text-red-600 font-semibold':'text-gray-500'}`}>{Math.round(consumed)} / {Math.round(target)} {unit}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${over?'bg-red-400':color}`} style={{width:`${pct}%`}} />
      </div>
    </div>
  );
}

function KcalAdjuster({targetKcal,onAdjust,onReset}){
  const [value,setValue]=useState(String(targetKcal));
  useEffect(()=>setValue(String(targetKcal)),[targetKcal]);
  function commit(v){const n=parseFloat(v);if(!isNaN(n)&&n>0)onAdjust(n);else setValue(String(targetKcal));}
  return (
    <div className="flex items-center gap-2">
      <button onClick={()=>commit(targetKcal-50)} className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 text-sm leading-none">−</button>
      <input type="number" value={value} onChange={e=>setValue(e.target.value)} onBlur={()=>commit(value)} onKeyDown={e=>e.key==='Enter'&&commit(value)}
        className="w-20 text-center text-sm font-semibold border border-gray-200 rounded-md py-1 bg-white" />
      <span className="text-xs text-gray-400">kcal</span>
      <button onClick={()=>commit(targetKcal+50)} className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 text-sm leading-none">+</button>
      <button onClick={onReset} className="text-[11px] text-gray-400 hover:text-gray-600 underline ml-1">Herstel</button>
    </div>
  );
}

function DateNav({dateStr,onChange}){
  return (
    <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-2.5">
      <button onClick={()=>onChange(addDays(dateStr,-1))} className="text-gray-400 hover:text-gray-700"><Icon name="ChevronLeft" size={18}/></button>
      <span className="text-sm font-medium text-gray-700 capitalize">{formatDateNice(dateStr)}</span>
      <button onClick={()=>onChange(addDays(dateStr,1))} className="text-gray-400 hover:text-gray-700"><Icon name="ChevronRight" size={18}/></button>
    </div>
  );
}

function MealTimeSelector({active,onChange}){
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
      {MEAL_TIMES.map(m=>(
        <button key={m.key} onClick={()=>onChange(m.key)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active===m.key?'bg-orange-500 text-white border-orange-500':'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ─── Barcode scanner (Open Food Facts) ───────────────────────────────────────
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
      // Enkel stoppen als de scanner echt liep — stop() gooit anders een (synchrone) fout
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

// ─── AddFoodPanel ────────────────────────────────────────────────────────────
function AddFoodPanel({pool,onAdd,onSaveCustom}){
  const [query,setQuery]=useState('');
  const [staged,setStaged]=useState([]);
  const [mode,setMode]=useState('search');
  const [offResults,setOffResults]=useState([]);
  const [offLoading,setOffLoading]=useState(false);
  const [offError,setOffError]=useState('');
  const [scanning,setScanning]=useState(false);
  const [barcodeMsg,setBarcodeMsg]=useState('');
  const [barcodeLoading,setBarcodeLoading]=useState(false);
  const [description,setDescription]=useState('');
  const [aiResult,setAiResult]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiError,setAiError]=useState('');
  const emptyManual={name:'',kcal:'',protein:'',carbs:'',fat:''};
  const [manual,setManual]=useState(emptyManual);
  const [manualError,setManualError]=useState('');
  const [manualSaved,setManualSaved]=useState(false);

  const results=useMemo(()=>{
    if(!query.trim())return[];
    const q=query.toLowerCase();
    return pool.filter(f=>f.name.toLowerCase().includes(q)).sort((a,b)=>a.name.toLowerCase().indexOf(q)-b.name.toLowerCase().indexOf(q)).slice(0,12);
  },[pool,query]);

  // Open Food Facts online doorzoeken (debounced, min. 3 tekens)
  useEffect(()=>{
    const q=query.trim();
    if(q.length<3){setOffResults([]);setOffLoading(false);setOffError('');return;}
    let active=true;
    setOffLoading(true);setOffError('');
    const t=setTimeout(async()=>{
      try{const r=await searchOpenFoodFacts(q);if(active){setOffResults(r);setOffLoading(false);}}
      catch(e){if(active){setOffResults([]);setOffError('Online zoeken lukte even niet.');setOffLoading(false);}}
    },450);
    return()=>{active=false;clearTimeout(t);};
  },[query]);

  async function handleBarcode(code){
    setScanning(false);setBarcodeMsg('');setBarcodeLoading(true);
    try{
      const item=await lookupOffBarcode(code);
      if(item){addToStaged(item);setMode('search');setBarcodeMsg(`✓ ${item.name} toegevoegd aan selectie — vul de grammen in.`);}
      else setBarcodeMsg(`Barcode ${code} niet gevonden in Open Food Facts. Voeg het product handmatig toe via "Zelf ingeven".`);
    }catch(e){setBarcodeMsg('Opzoeken mislukt: '+(e.message||''));}
    setBarcodeLoading(false);
  }

  const renderRow=(item)=>(
    <button key={item.id} onClick={()=>addToStaged(item)} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex justify-between items-center gap-2">
      <span className="text-gray-800 truncate">{item.name}</span>
      <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">{Math.round(item.kcal)} kcal{item.perGram?'/100g':''} <Icon name="Plus" size={12}/></span>
    </button>
  );

  function addToStaged(item){setStaged(s=>[...s,{...item,stagedId:`s-${Date.now()}-${Math.random().toString(36).slice(2)}`,grams:item.perGram?100:null}]);setQuery('');}
  function updateGrams(id,g){setStaged(s=>s.map(it=>it.stagedId===id?{...it,grams:g}:it));}
  function removeStaged(id){setStaged(s=>s.filter(it=>it.stagedId!==id));}

  function confirmAll(){
    const entries=staged.map(item=>{
      if(item.perGram){const g=parseFloat(item.grams)||0;return{id:`log-${Date.now()}-${Math.random()}`,name:item.name,grams:g,kcal:(item.kcal*g)/100,protein:(item.protein*g)/100,fat:(item.fat*g)/100,carbs:(item.carbs*g)/100,source:item.source||'nevo'};}
      return{id:`log-${Date.now()}-${Math.random()}`,name:item.name,grams:null,kcal:item.kcal,protein:item.protein,fat:item.fat,carbs:item.carbs,source:'custom',portionDescription:item.portionDescription};
    });
    onAdd(entries);setStaged([]);
  }

  function handleManualSave(addToLog){
    setManualError('');
    if(!manual.name.trim()){setManualError('Vul een naam in.');return;}
    const kcal=parseFloat(manual.kcal),protein=parseFloat(manual.protein),carbs=parseFloat(manual.carbs),fat=parseFloat(manual.fat);
    if([kcal,protein,carbs,fat].some(isNaN)){setManualError('Vul alle waarden in als getal.');return;}
    const food={id:`custom-${Date.now()}`,name:manual.name.trim(),kcal,protein,carbs,fat,fiber:0,perGram:true,group:'Eigen voedingsmiddelen'};
    onSaveCustom(food);
    if(addToLog){addToStaged(food);setMode('search');}
    setManualSaved(true);setManual(emptyManual);
    setTimeout(()=>setManualSaved(false),3000);
  }

  async function handleAiEstimate(){
    if(!description.trim())return;
    setAiLoading(true);setAiError('');setAiResult(null);
    try{setAiResult(await estimateFoodWithAI(description));}
    catch(e){setAiError(e.message||'Kon geen schatting maken.');}
    setAiLoading(false);
  }

  function addAiResult(alsoSave){
    onAdd([{id:`log-${Date.now()}-${Math.random()}`,name:aiResult.name,grams:null,kcal:aiResult.kcal,protein:aiResult.protein,fat:aiResult.fat,carbs:aiResult.carbs,source:'ai',portionDescription:aiResult.portionDescription}]);
    if(alsoSave)onSaveCustom({id:`custom-${Date.now()}`,name:aiResult.name,kcal:aiResult.kcal,protein:aiResult.protein,fat:aiResult.fat,carbs:aiResult.carbs,perGram:false,portionDescription:aiResult.portionDescription});
    setAiResult(null);setDescription('');
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      {scanning&&<BarcodeScanner onDetected={handleBarcode} onClose={()=>setScanning(false)} />}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {[{id:'search',label:'Zoeken'},{id:'manual',label:'Zelf ingeven'},{id:'describe',label:'AI-schatting'}].map(t=>(
          <button key={t.id} onClick={()=>setMode(t.id)} className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${mode===t.id?'bg-white shadow-sm text-gray-900':'text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      {mode==='search'&&(
        <div>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[15px]"><Icon name="Search" size={15}/></span>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Zoek voedingsmiddel of merk..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <button onClick={()=>{setBarcodeMsg('');setScanning(true);}} title="Scan barcode"
              className="shrink-0 flex items-center gap-1.5 px-3 rounded-lg bg-[#2f8bff] hover:bg-[#2076e8] text-white text-xs font-medium">
              <Icon name="Camera" size={15}/> Scan
            </button>
          </div>

          {barcodeLoading&&<p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><Icon name="Loader2" size={12}/> Barcode opzoeken…</p>}
          {barcodeMsg&&<p className="text-xs mb-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700">{barcodeMsg}</p>}

          {query.trim()&&(
            <div className="space-y-3 mb-3">
              {results.length>0&&(
                <div>
                  <p className="text-[11px] font-medium text-gray-400 px-1 mb-1">NEVO &amp; eigen producten</p>
                  <div className="border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-52 overflow-y-auto">
                    {results.map(renderRow)}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[11px] font-medium text-gray-400 px-1 mb-1 flex items-center gap-1.5">
                  Merkproducten · Open Food Facts {offLoading&&<Icon name="Loader2" size={11}/>}
                </p>
                {offResults.length>0?(
                  <div className="border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-52 overflow-y-auto">
                    {offResults.map(renderRow)}
                  </div>
                ):(
                  query.trim().length<3
                    ? <p className="text-xs text-gray-300 px-1">Typ minstens 3 tekens voor merkproducten…</p>
                    : (!offLoading&&<p className="text-xs text-gray-300 px-1">{offError||'Geen merkproducten gevonden.'}</p>)
                )}
              </div>
            </div>
          )}
          {staged.length>0&&(
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Geselecteerd — vul grammen in:</p>
              {staged.map(item=>(
                <div key={item.stagedId} className="border border-gray-100 rounded-lg p-2.5 flex items-center gap-2">
                  <span className="text-sm text-gray-800 flex-1 truncate">{item.name}</span>
                  {item.perGram?(<><input type="number" inputMode="decimal" value={item.grams} onChange={e=>updateGrams(item.stagedId,e.target.value)} className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center" /><span className="text-xs text-gray-400">g</span></>):
                  <span className="text-xs text-gray-400">vaste portie</span>}
                  <button onClick={()=>removeStaged(item.stagedId)} className="text-gray-300 hover:text-red-500"><Icon name="X" size={14}/></button>
                </div>
              ))}
              <button onClick={confirmAll} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 text-xs font-medium flex items-center justify-center gap-1 mt-2">
                <Icon name="Plus" size={13}/> Toevoegen ({staged.length})
              </button>
            </div>
          )}
        </div>
      )}

      {mode==='manual'&&(
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Voedingswaarden <strong>per 100g</strong>. Wordt opgeslagen in je persoonlijke lijst.</p>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Naam product</label>
            <input value={manual.name} onChange={e=>{setManual(m=>({...m,name:e.target.value}));setManualError('');setManualSaved(false);}}
              placeholder="Bv. Proteïnereep XYZ" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[{key:'kcal',label:'Calorieën',unit:'kcal',color:'text-orange-500'},{key:'protein',label:'Eiwitten',unit:'g',color:'text-blue-600'},{key:'carbs',label:'Koolhydraten',unit:'g',color:'text-purple-600'},{key:'fat',label:'Vetten',unit:'g',color:'text-amber-600'}].map(({key,label,unit,color})=>(
              <div key={key} className="bg-gray-50 rounded-xl p-3">
                <label className={`text-[11px] font-semibold ${color} block mb-1`}>{label}</label>
                <div className="flex items-center gap-1">
                  <input type="number" inputMode="decimal" min="0" value={manual[key]} onChange={e=>{setManual(m=>({...m,[key]:e.target.value}));setManualError('');setManualSaved(false);}} placeholder="0"
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <span className="text-xs text-gray-400 flex-shrink-0">{unit}</span>
                </div>
              </div>
            ))}
          </div>
          {manualError&&<p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{manualError}</p>}
          {manualSaved&&<p className="text-xs text-orange-500 bg-orange-50 rounded-lg px-3 py-2">✓ Opgeslagen!</p>}
          <div className="flex gap-2">
            <button onClick={()=>handleManualSave(false)} className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-2.5 text-sm font-medium">Alleen opslaan</button>
            <button onClick={()=>handleManualSave(true)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5">
              <Icon name="Plus" size={14}/> Opslaan & toevoegen
            </button>
          </div>
        </div>
      )}

      {mode==='describe'&&(
        <div>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Bv. 150g kipfilet met rijst en broccoli" rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-2 resize-none" />
          <button onClick={handleAiEstimate} disabled={aiLoading||!description.trim()}
            className="bg-[#2f8bff] hover:bg-[#2076e8] disabled:bg-gray-300 text-white rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
            {aiLoading?<Icon name="Loader2" size={13}/>:<Icon name="Sparkles" size={13}/>}{aiLoading?'Schatten...':'Schat macro\'s'}
          </button>
          {aiError&&<p className="text-xs text-red-600 mt-2">{aiError}</p>}
          {aiResult&&(
            <div className="mt-3 border border-orange-100 bg-orange-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-800 mb-1">{aiResult.name}</p>
              <p className="text-xs text-gray-500 mb-2">{aiResult.portionDescription}</p>
              <p className="text-xs text-gray-600 mb-3">{Math.round(aiResult.kcal)} kcal · {Math.round(aiResult.protein)}g eiwit · {Math.round(aiResult.fat)}g vet · {Math.round(aiResult.carbs)}g KH</p>
              <div className="flex gap-2">
                <button onClick={()=>addAiResult(false)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 text-xs font-medium">Toevoegen</button>
                <button onClick={()=>addAiResult(true)} className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg py-1.5 text-xs font-medium">+ Opslaan</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Maaltijdsuggestie ────────────────────────────────────────────────────────
function MealSuggestionPanel({remaining,onAdd}){
  const [mealTime,setMealTime]=useState(MEAL_TIMES[0].key);
  const [kcal,setKcal]=useState(String(Math.round(remaining.kcal)));
  const [protein,setProtein]=useState(String(Math.round(remaining.protein)));
  const [fat,setFat]=useState(String(Math.round(remaining.fat)));
  const [carbs,setCarbs]=useState(String(Math.round(remaining.carbs)));
  const [loading,setLoading]=useState(false);
  const [suggestion,setSuggestion]=useState(null);
  const [error,setError]=useState('');

  async function handleSuggest(){
    const targets={};
    if(kcal.trim())targets.kcal=parseFloat(kcal);
    if(protein.trim())targets.protein=parseFloat(protein);
    if(fat.trim())targets.fat=parseFloat(fat);
    if(carbs.trim())targets.carbs=parseFloat(carbs);
    if(Object.keys(targets).length===0){setError('Vul minstens één doelwaarde in.');return;}
    setLoading(true);setError('');setSuggestion(null);
    try{const lbl=MEAL_TIMES.find(m=>m.key===mealTime)?.label||'maaltijd';setSuggestion(await suggestMealWithAI(targets,lbl));}
    catch(e){setError(e.message||'Kon geen suggestie maken.');}
    setLoading(false);
  }

  function addSuggestion(){
    onAdd([{id:`log-${Date.now()}-${Math.random()}`,name:suggestion.title,grams:null,kcal:suggestion.kcal,protein:suggestion.protein,fat:suggestion.fat,carbs:suggestion.carbs,source:'ai',portionDescription:[(suggestion.ingredients||[]).join(', '),suggestion.description].filter(Boolean).join(' — ')}],mealTime);
    setSuggestion(null);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Stel een maaltijd voor</h2>
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">Eetmoment</label>
        <select value={mealTime} onChange={e=>setMealTime(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          {MEAL_TIMES.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {[['Kcal',kcal,setKcal],['Eiwit',protein,setProtein],['Vet',fat,setFat],['KH',carbs,setCarbs]].map(([l,v,s])=>(
          <div key={l}><label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
            <input type="number" inputMode="decimal" value={v} onChange={e=>s(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center" placeholder="-" /></div>
        ))}
      </div>
      <button onClick={handleSuggest} disabled={loading}
        className="flex items-center gap-1.5 bg-[#2f8bff] hover:bg-[#2076e8] disabled:bg-gray-300 text-white rounded-lg px-3 py-1.5 text-xs font-medium">
        {loading?<Icon name="Loader2" size={13}/>:<Icon name="Sparkles" size={13}/>}{loading?'Bezig...':'Genereer suggestie'}
      </button>
      {error&&<p className="text-xs text-red-600 mt-2">{error}</p>}
      {suggestion&&(
        <div className="border border-orange-100 bg-orange-50 rounded-lg p-3 mt-3">
          <p className="text-sm font-medium text-gray-800 mb-1">{suggestion.title}</p>
          {Array.isArray(suggestion.ingredients)&&suggestion.ingredients.length>0&&(
            <ul className="text-xs text-gray-600 mb-2 list-disc list-inside space-y-0.5">
              {suggestion.ingredients.map((ing,i)=><li key={i}>{ing}</li>)}
            </ul>
          )}
          {suggestion.description&&<p className="text-xs text-gray-500 mb-2 italic">{suggestion.description}</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium mb-3">
            <span className="text-orange-600">{Math.round(suggestion.kcal)} kcal</span>
            <span className="text-blue-600">{Math.round(suggestion.protein)}g eiwit</span>
            <span className="text-amber-600">{Math.round(suggestion.fat)}g vet</span>
            <span className="text-purple-600">{Math.round(suggestion.carbs)}g KH</span>
          </div>
          <button onClick={addSuggestion} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 text-xs font-medium">
            Toevoegen aan {MEAL_TIMES.find(m=>m.key===mealTime)?.label.toLowerCase()||'logboek'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── DailyLogList ─────────────────────────────────────────────────────────────
function DailyLogList({log,onRemove}){
  const grouped=useMemo(()=>groupByMeal(log),[log]);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Vandaag gelogd</h2>
      <div className="space-y-4">
        {MEAL_TIMES.map(meal=>{
          const entries=grouped[meal.key];
          const sub=entries.reduce((a,e)=>({kcal:a.kcal+e.kcal,protein:a.protein+e.protein,fat:a.fat+e.fat,carbs:a.carbs+e.carbs}),{kcal:0,protein:0,fat:0,carbs:0});
          return (
            <div key={meal.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700">{meal.label}</span>
                {entries.length>0&&<span className="text-xs text-gray-400">{Math.round(sub.kcal)} kcal · {Math.round(sub.protein)}g E</span>}
              </div>
              {entries.length===0?<p className="text-xs text-gray-300 pl-1">Nog niets gelogd</p>:
                <div className="space-y-1.5 pl-1">
                  {entries.map(e=>(
                    <div key={e.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                      <p className="text-sm text-gray-800 truncate flex-1">{e.name}{e.grams?` · ${e.grams}g`:''}</p>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-gray-400">{Math.round(e.kcal)} kcal</span>
                        <button onClick={()=>onRemove(e.id)} className="text-gray-300 hover:text-red-500"><Icon name="Trash2" size={15}/></button>
                      </div>
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

