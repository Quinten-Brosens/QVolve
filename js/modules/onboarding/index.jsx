// ─── modules/onboarding — profiel setup wizard ───────────────────────────────
function SetupWizard({ onComplete, initial }) {
  const [form, setForm] = useState(() => initial ? {
    weight: String(initial.weight), height: String(initial.height), age: String(initial.age),
    gender: initial.gender, activity: initial.activity, goal: initial.goal,
    sporterType: initial.sporterType || 'other', macroProfile: initial.macroProfile || 'normal',
  } : { weight: '', height: '', age: '', gender: 'man', activity: 'moderate', goal: 'maintain', sporterType: 'other', macroProfile: 'normal' });
  const [error, setError] = useState('');

  function update(f, v) { setForm(x => ({ ...x, [f]: v })); }
  function handleSubmit() {
    const w = parseFloat(form.weight), h = parseFloat(form.height), a = parseInt(form.age, 10);
    if (!w || !h || !a || w <= 0 || h <= 0 || a <= 0) { setError('Vul gewicht, lengte en leeftijd correct in.'); return; }
    onComplete({ weight: w, height: h, age: a, gender: form.gender, activity: form.activity, goal: form.goal, sporterType: form.sporterType, macroProfile: form.macroProfile });
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Vertel ons over jezelf</h2>
      <p className="text-sm text-gray-500 mb-5">We berekenen je dagelijkse macro's.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Gewicht (kg)</label>
            <input type="number" inputMode="decimal" value={form.weight} onChange={e => update('weight', e.target.value)} placeholder="80"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Lengte (cm)</label>
            <input type="number" inputMode="decimal" value={form.height} onChange={e => update('height', e.target.value)} placeholder="180"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Leeftijd</label>
            <input type="number" inputMode="numeric" value={form.age} onChange={e => update('age', e.target.value)} placeholder="30"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Geslacht</label>
            <select value={form.gender} onChange={e => update('gender', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="man">Man</option><option value="vrouw">Vrouw</option></select></div>
        </div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Activiteitsniveau</label>
          <select value={form.activity} onChange={e => update('activity', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            {Object.entries(ACTIVITY_FACTORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Doel</label>
          <select value={form.goal} onChange={e => update('goal', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            {Object.entries(GOALS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Macroprofiel</label>
          <select value={form.macroProfile} onChange={e => update('macroProfile', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            {Object.entries(MACRO_PROFILES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        {form.macroProfile === 'normal' && <div><label className="block text-xs font-medium text-gray-600 mb-1">Type sporter</label>
          <select value={form.sporterType} onChange={e => update('sporterType', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            {Object.entries(SPORTER_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={handleSubmit} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">Bereken mijn macro's</button>
      </div>
    </div>
  );
}
