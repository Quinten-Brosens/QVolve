// ─── modules/weekschema — vragenlijst, schema genereren, importeren ───────────

const VRAGENLIJST = [
  { id: 'budget', label: 'Weekbudget voor boodschappen?', type: 'single', options: [
    { value: 'heel_laag', label: '💰 Heel laag — zo goedkoop mogelijk, maaltijden mogen veel herhalen (< €30/week)' },
    { value: 'laag', label: 'Laag (€30–€50/week)' },
    { value: 'gemiddeld', label: 'Gemiddeld (€50–€80/week)' },
    { value: 'hoog', label: 'Hoog — gevarieerde ingrediënten, geen compromis (€80+/week)' },
  ]},
  { id: 'variatie', label: 'Hoeveel variatie wil je in je weekmenu?', type: 'single', options: [
    { value: 'minimaal', label: '🔄 Minimaal — dezelfde maaltijden zo veel mogelijk herhalen (makkelijk & goedkoop)' },
    { value: 'deels', label: '🔁 Gedeeltelijk — ontbijt & lunch mogen herhalen, diner varieert' },
    { value: 'veel', label: '🌈 Veel — elke dag iets anders, ik hou van afwisseling' },
  ]},
  { id: 'ontbijt', label: 'Wat eet je graag als ontbijt? Wees concreet.', type: 'text', placeholder: 'bv. havermout met banaan en chiazaad, boterhammen met kaas, eieren met groenten, kwark met fruit...' },
  { id: 'lunch', label: 'Hoe wil je jouw lunch?', type: 'single', options: [
    { value: 'warm', label: '🍲 Warm (soep, restjes van gisteren, warme pasta...)' },
    { value: 'koud', label: '🥪 Koud (boterham, wrap, salade)' },
    { value: 'gemengd', label: '🔄 Afwisselend — beide is prima' },
  ]},
  { id: 'kooktijd', label: 'Hoeveel tijd wil je kwijt aan het avondmaal koken?', type: 'single', options: [
    { value: 'snel', label: '⚡ Snel (< 20 min — simpel en efficiënt)' },
    { value: 'normaal', label: '🕐 Normaal (20–40 min)' },
    { value: 'uitgebreid', label: '👨‍🍳 Uitgebreid (40+ min — ik kook graag)' },
  ]},
  { id: 'eetstijl', label: 'Welke eetstijl past bij jou?', type: 'multi', options: [
    { value: 'belgisch', label: '🇧🇪 Klassiek Belgisch/Hollands' },
    { value: 'mediterraan', label: '🫒 Mediterraan' },
    { value: 'aziatisch', label: '🍜 Aziatisch' },
    { value: 'mexicaans', label: '🌮 Mexicaans' },
    { value: 'gemengd', label: '🌍 Alles door elkaar' },
  ]},
  { id: 'dieet', label: 'Voedingsrestricties of voorkeuren?', type: 'multi', options: [
    { value: 'geen', label: 'Geen restricties' },
    { value: 'glutenvrij', label: 'Glutenvrij' },
    { value: 'lactosevrij', label: 'Lactosevrij' },
    { value: 'vegetarisch', label: 'Vegetarisch' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'halal', label: 'Halal' },
  ]},
  { id: 'niet_lust', label: 'Wat eet je absoluut niet? (of allergieën)', type: 'text', placeholder: 'bv. lever, spruitjes, garnalen, noten...' },
  { id: 'snacks', label: 'Snacks tussendoor?', type: 'multi', options: [
    { value: 'fruit', label: '🍎 Fruit' },
    { value: 'noten', label: '🥜 Noten' },
    { value: 'kwark', label: '🥛 Kwark/yoghurt' },
    { value: 'proteïnereep', label: '💪 Proteïnereep' },
    { value: 'groenten', label: '🥕 Rauwkost' },
    { value: 'geen', label: '🚫 Liever geen snacks' },
  ]},
  { id: 'extra', label: 'Nog iets anders dat het schema moet weten?', type: 'text', placeholder: "bv. ik sport 's ochtends, gezin van 4, ik werk in ploegen, ik wil veel eiwit bij het ontbijt..." },
];

function buildSchemaPrompt(macros, prefs) {
  const variatie = prefs.variatie || 'deels';
  const varTip = variatie === 'minimaal'
    ? 'Herhaal maaltijden MAXIMAAL. Gebruik hetzelfde ontbijt elke dag, dezelfde lunch elke dag, en beperk het aantal verschillende diners tot 2-3 in de week. Kies goedkope basisingrediënten (kip, eieren, havermout, rijst, pasta).'
    : variatie === 'veel'
    ? 'Zoveel mogelijk variatie — elke dag andere maaltijden en andere ingrediënten.'
    : 'Ontbijt en lunch mogen dagelijks herhalen, maar varieer de diners.';

  return `Je bent een professionele sportdiëtist. Stel een 7-daags weekmenu op.

## Macro-doelen per dag
- Calorieën: ${Math.round(macros.targetKcal)} kcal · Eiwit: ${Math.round(macros.proteinG)}g · Vet: ${Math.round(macros.fatG)}g · KH: ${Math.round(macros.carbsG)}g

## Voorkeuren
Budget: ${prefs.budget || 'gemiddeld'} · Kooktijd avondmaal: ${prefs.kooktijd || 'normaal'}
Variatie-instructie: ${varTip}
Ontbijt (concreet gewenst): ${prefs.ontbijt || 'vrij te kiezen'}
Lunch voorkeur: ${prefs.lunch || 'gemengd'}
Eetstijl: ${(prefs.eetstijl || []).join(', ') || 'gemengd'} · Dieet: ${(prefs.dieet || []).join(', ') || 'geen'}
Absoluut niet eten / allergieën: ${prefs.niet_lust || 'niets specifieks'}
Snacks: ${(prefs.snacks || []).join(', ') || 'vrij'}
Extra info: ${prefs.extra || 'geen'}

## Instructies
- 7 dagen, 6 maaltijden per dag. Gebruik voor "mealTime" EXACT deze keys:
  ontbijt, snack_vm, lunch, snack_nm, diner, snack_avond
- "day" is de Nederlandse weekdagnaam: Maandag, Dinsdag, ... Zondag
- Ingrediënten met exacte hoeveelheden (bv. "150g kipfilet", "200ml melk")
- BELANGRIJK — macro's: tel per maaltijd de kcal/eiwit/vet/koolhydraten op tot een dagtotaal,
  en pas de hoeveelheden net zo lang aan tot elk dagtotaal binnen ±5% van de macro-doelen
  hierboven valt (zowel calorieën als eiwit, vet én koolhydraten). Vul daarna het "totals"-veld
  per dag in met die werkelijk berekende som — niet met de doelwaarden.
- Reken nauwkeurig; een schema dat de macro's niet haalt is fout.
- ALLEEN JSON terug, geen markdown

{"days":[{"day":"Maandag","meals":[{"mealTime":"snack_vm","name":"...","ingredients":["80g havermout","200ml melk"],"tip":"...","kcal":0,"protein":0,"fat":0,"carbs":0}],"totals":{"kcal":0,"protein":0,"fat":0,"carbs":0}}],"shoppingList":[{"category":"Vlees & vis","items":["..."]}]}`;
}

function VragenlijstStap({ vraag, waarde, onChange }) {
  if (vraag.type === 'single') return (
    <div className="space-y-2">
      {vraag.options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${waarde === opt.value ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'}`}>
          {waarde === opt.value ? <Icon name="CheckCircle2" size={14} className="inline mr-2 text-orange-500"/> : <Icon name="Circle" size={14} className="inline mr-2 text-gray-300"/>}{opt.label}
        </button>
      ))}
    </div>
  );
  if (vraag.type === 'multi') {
    const sel = Array.isArray(waarde) ? waarde : [];
    return (
      <div className="space-y-2">
        {vraag.options.map(opt => {
          const isSel = sel.includes(opt.value);
          return (
            <button key={opt.value} onClick={() => onChange(isSel ? sel.filter(v => v !== opt.value) : [...sel, opt.value])}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${isSel ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'}`}>
              {isSel ? <Icon name="CheckCircle2" size={14} className="inline mr-2 text-orange-500"/> : <Icon name="Circle" size={14} className="inline mr-2 text-gray-300"/>}{opt.label}
            </button>
          );
        })}
      </div>
    );
  }
  return <textarea value={waarde || ''} onChange={e => onChange(e.target.value)} placeholder={vraag.placeholder} rows={3}
    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />;
}

function printWeekSchema(plan) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const label = mt => { const m = MEAL_TIMES.find(x => x.key === normalizeMealTime(mt)); return m ? m.label : mt; };
  let h = '<h1>Qvolve weekschema</h1>';
  (plan.days || []).forEach(dag => {
    h += `<h2>${esc(dag.day)}</h2>`;
    (dag.meals || []).forEach(m => {
      h += `<div class="meal"><div class="mt">${esc(label(m.mealTime))} — <b>${esc(m.name)}</b> <span class="mac">${Math.round(m.kcal || 0)} kcal · ${Math.round(m.protein || 0)}g E · ${Math.round(m.fat || 0)}g V · ${Math.round(m.carbs || 0)}g K</span></div>`;
      if (Array.isArray(m.ingredients) && m.ingredients.length) h += `<ul>${m.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
      if (m.tip) h += `<p class="tip">💡 ${esc(m.tip)}</p>`;
      h += '</div>';
    });
    if (dag.totals) h += `<p class="tot">Dagtotaal: ${Math.round(dag.totals.kcal)} kcal · ${Math.round(dag.totals.protein)}g eiwit · ${Math.round(dag.totals.fat)}g vet · ${Math.round(dag.totals.carbs)}g KH</p>`;
  });
  if (Array.isArray(plan.shoppingList) && plan.shoppingList.length) {
    h += '<h2>Boodschappenlijst</h2>';
    plan.shoppingList.forEach(c => { h += `<h3>${esc(c.category)}</h3><ul>${(c.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`; });
  }
  const css = 'body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:820px;margin:24px auto;padding:0 16px}h1{color:#f97316;margin:0 0 12px}h2{border-bottom:2px solid #1e3a8a;color:#1e3a8a;margin:22px 0 6px;padding-bottom:2px}h3{margin:10px 0 2px;font-size:14px}.meal{margin:6px 0 12px}.mt{font-size:14px}.mac{color:#666;font-size:12px}ul{margin:4px 0 4px 18px;padding:0}li{font-size:13px;margin:1px 0}.tip{font-size:12px;color:#888;font-style:italic;margin:2px 0}.tot{font-size:12px;color:#333;background:#f4f4f5;padding:4px 8px;border-radius:4px;display:inline-block}@media print{h2{page-break-after:avoid}.meal{page-break-inside:avoid}}';
  const w = window.open('', '_blank');
  if (!w) { alert('Sta pop-ups toe om het schema af te drukken.'); return; }
  w.document.write(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Qvolve weekschema</title><style>${css}</style></head><body>${h}</body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
}

function ImportSchemaModal({ plan, onImport, onClose, onGoToVoeding }) {
  const comingMonday = () => { const d = new Date(); const wd = d.getDay(); const diff = (1 - wd + 7) % 7; d.setDate(d.getDate() + diff); return toDateStr(d); };
  const [startDate, setStartDate] = useState(comingMonday());
  const [weeks, setWeeks] = useState(1);
  const [done, setDone] = useState(null);
  const monday = mondayOf(startDate);
  function go() { const w = Math.max(1, Math.min(parseInt(weeks) || 0, 12)); const r = onImport(plan, startDate, w); setDone({ ...r, w }); }
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">📥 Schema importeren</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><Icon name="X" size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          {done ? (
            <div className="text-center py-4">
              <Icon name="CheckCircle2" size={32} className="mx-auto text-green-500 mb-2"/>
              <p className="text-sm text-gray-700">Schema geladen vanaf <b className="capitalize">{formatDateNice(done.monday)}</b>, voor <b>{done.w}</b> {done.w === 1 ? 'week' : 'weken'} ({done.count} dagen).</p>
              <button onClick={() => { onClose(); onGoToVoeding && onGoToVoeding(); }} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 px-6 text-sm font-medium">Naar logboek</button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Vanaf welke datum?</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                <p className="text-[11px] text-gray-400 mt-1">Start op de maandag van die week: <b className="capitalize">{formatDateNice(monday)}</b>. Maandag→maandag, dinsdag→dinsdag, …</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Aanhouden voor</label>
                <input type="number" min="1" max="12" value={weeks} onChange={e => setWeeks(e.target.value)} className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                <label className="text-sm text-gray-600">{(parseInt(weeks) || 0) === 1 ? 'week' : 'weken'}</label>
              </div>
              <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Let op: bestaande voeding op die dagen wordt overschreven.</p>
              <button onClick={go} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-medium">Importeren</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function WeekSchemaPanel({ macros, userSlug, onImport, onGoToVoeding }) {
  const [fase, setFase] = useState('loading');
  const [stapIndex, setStapIndex] = useState(0);
  const [antwoorden, setAntwoorden] = useState({});
  const [plan, setPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [showShopping, setShowShopping] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const prefs = lsGet(`weekschema-prefs:${userSlug}`);
    const savedPlan = lsGet(`weekschema-plan:${userSlug}`);
    if (prefs) setAntwoorden(prefs);
    if (savedPlan) { setPlan(savedPlan); setFase('plan'); }
    else setFase('vragenlijst');
  }, [userSlug]);

  async function genereerSchema(prefs) {
    setGenerating(true); setGenError(''); setFase('generating');
    try {
      const text = await callGemini(buildSchemaPrompt(macros, prefs), 24000, 8000);
      const clean = text.replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{'), end = clean.lastIndexOf('}');
      const parsed = JSON.parse(start >= 0 && end > start ? clean.slice(start, end + 1) : clean);
      if (!parsed.days || !Array.isArray(parsed.days)) throw new Error('Ongeldig schema-formaat.');
      setPlan(parsed); setFase('plan'); lsSet(`weekschema-plan:${userSlug}`, parsed);
    } catch (e) { setGenError(e.message || 'Fout bij genereren.'); setFase('vragenlijst'); setStapIndex(VRAGENLIJST.length - 1); }
    setGenerating(false);
  }

  function handleAntwoord(val) { setAntwoorden(p => ({ ...p, [VRAGENLIJST[stapIndex].id]: val })); }
  function handleVolgende() {
    if (stapIndex < VRAGENLIJST.length - 1) setStapIndex(i => i + 1);
    else { lsSet(`weekschema-prefs:${userSlug}`, antwoorden); genereerSchema(antwoorden); }
  }

  const isGeldig = () => {
    const v = VRAGENLIJST[stapIndex]; const a = antwoorden[v.id];
    if (v.type === 'single') return !!a;
    if (v.type === 'multi') return Array.isArray(a) && a.length > 0;
    return true;
  };

  if (fase === 'generating') return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
      <div className="flex justify-center mb-4"><Icon name="ChefHat" size={36} className="text-orange-500"/></div>
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Schema wordt gegenereerd…</h2>
      <p className="text-xs text-gray-500">De AI stelt jouw weekmenu samen. Even geduld (±20 sec).</p>
    </div>
  );

  if (fase === 'vragenlijst' || fase === 'loading') {
    const vraag = VRAGENLIJST[stapIndex];
    const progress = ((stapIndex + 1) / VRAGENLIJST.length) * 100;
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Icon name="Calendar" size={16} className="text-orange-500"/><span className="text-sm font-semibold text-gray-900">Weekschema samenstellen</span></div>
          <span className="text-xs text-gray-400">{stapIndex + 1} / {VRAGENLIJST.length}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden"><div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${progress}%` }}/></div>
        <p className="text-sm font-medium text-gray-800 mb-4">{vraag.label}</p>
        <VragenlijstStap vraag={vraag} waarde={antwoorden[vraag.id]} onChange={handleAntwoord}/>
        {genError && <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{genError}</p>}
        <div className="flex gap-2 mt-5">
          {stapIndex > 0 && <button onClick={() => setStapIndex(i => i - 1)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">← Vorige</button>}
          <button onClick={handleVolgende} disabled={!isGeldig() && vraag.type !== 'text'}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${(isGeldig() || vraag.type === 'text') ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
            {stapIndex < VRAGENLIJST.length - 1 ? 'Volgende →' : '✨ Genereer weekschema'}
          </button>
        </div>
      </div>
    );
  }

  if (fase === 'plan' && plan) {
    const dag = plan.days[selectedDay];
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Icon name="Calendar" size={16} className="text-orange-500"/><span className="text-sm font-semibold text-gray-900">Jouw weekschema</span></div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500 text-white hover:bg-orange-600">📥 Importeren</button>
              <button onClick={() => printWeekSchema(plan)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">🖨️ Afdrukken</button>
              <button onClick={() => setShowShopping(!showShopping)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showShopping ? 'bg-orange-50 border-orange-300 text-orange-600' : 'border-gray-200 text-gray-600'}`}>🛒 Boodschappen</button>
              <button onClick={() => { setPlan(null); lsDel(`weekschema-plan:${userSlug}`); setFase('vragenlijst'); setStapIndex(0); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600"><Icon name="RefreshCw" size={12}/> Opnieuw</button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {plan.days.map((d, i) => (
              <button key={i} onClick={() => { setSelectedDay(i); setShowShopping(false); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedDay === i && !showShopping ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {d.day || `Dag ${i + 1}`}
              </button>
            ))}
          </div>
        </div>

        {showShopping && plan.shoppingList && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">🛒 Boodschappenlijst</h3>
            {plan.shoppingList.map((cat, i) => (
              <div key={i} className="mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">{cat.category}</p>
                <ul className="text-xs text-gray-600 space-y-0.5">{(cat.items || []).map((it, j) => <li key={j} className="flex gap-1"><span>•</span><span>{it}</span></li>)}</ul>
              </div>
            ))}
          </div>
        )}

        {!showShopping && dag && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">{dag.day}</h3>
            {(dag.meals || []).map((meal, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-orange-600">{MEAL_TIMES.find(m => m.key === normalizeMealTime(meal.mealTime))?.label || meal.mealTime}</span>
                  <span className="text-xs text-gray-400">{meal.kcal} kcal · {meal.protein}g E</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">{meal.name}</p>
                {meal.ingredients && <div className="flex flex-wrap gap-1 mb-2">{meal.ingredients.map((ing, j) => <span key={j} className="text-[11px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{ing}</span>)}</div>}
                {meal.tip && <p className="text-xs text-gray-500 italic">💡 {meal.tip}</p>}
              </div>
            ))}
            {dag.totals && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">Dagtotaal</p>
                <p className="text-xs text-gray-600">{Math.round(dag.totals.kcal)} kcal · {Math.round(dag.totals.protein)}g eiwit · {Math.round(dag.totals.fat)}g vet · {Math.round(dag.totals.carbs)}g KH</p>
              </div>
            )}
          </div>
        )}
        {showImport && <ImportSchemaModal plan={plan} onImport={onImport} onClose={() => setShowImport(false)} onGoToVoeding={onGoToVoeding}/>}
      </div>
    );
  }
  return null;
}
