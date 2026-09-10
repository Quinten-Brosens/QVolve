// ─── modules/onboarding — profiel setup wizard ───────────────────────────────

// Veld staat bewust op modulescope, niet binnen SetupWizard.
// Een component die in een render-functie wordt gedefinieerd, krijgt bij elke
// toetsaanslag een nieuwe identiteit: React ziet dan een ander componenttype,
// gooit het invoerveld weg en bouwt het opnieuw op. De focus gaat verloren en op
// een telefoon klapt het toetsenbord na elk cijfer dicht.
const WIZARD_VELD = 'w-full bg-[#f7f5f0] border border-[#dfe3ea] rounded-2xl px-4 py-3 text-[15px] text-[#14223c] focus:outline-none focus:border-[#182a48]';

function Veld({ label, children }) {
  return (
    <div>
      <Eyebrow className="mb-1.5">{label}</Eyebrow>
      {children}
    </div>
  );
}

function SetupWizard({ onComplete, onCancel, initial }) {
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
    <div className="bg-white border border-[#dfe3ea] rounded-[22px] p-5">
      <p className="m-0 mb-5 text-[13px] leading-relaxed text-[#4a5568]" style={{ textWrap: 'pretty' }}>
        Hiermee rekenen we je dagelijkse calorie- en macrodoel uit. Je kunt alles later bijstellen.
      </p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Veld label="Gewicht (kg)">
            <input type="number" inputMode="decimal" value={form.weight} placeholder="80"
              onChange={e => update('weight', e.target.value)} className={WIZARD_VELD}/>
          </Veld>
          <Veld label="Lengte (cm)">
            <input type="number" inputMode="decimal" value={form.height} placeholder="180"
              onChange={e => update('height', e.target.value)} className={WIZARD_VELD}/>
          </Veld>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Veld label="Leeftijd">
            <input type="number" inputMode="numeric" value={form.age} placeholder="30"
              onChange={e => update('age', e.target.value)} className={WIZARD_VELD}/>
          </Veld>
          <Veld label="Geslacht">
            <select value={form.gender} onChange={e => update('gender', e.target.value)} className={WIZARD_VELD}>
              <option value="man">Man</option><option value="vrouw">Vrouw</option>
            </select>
          </Veld>
        </div>
        <Veld label="Activiteitsniveau">
          <select value={form.activity} onChange={e => update('activity', e.target.value)} className={WIZARD_VELD}>
            {Object.entries(ACTIVITY_FACTORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Veld>
        <Veld label="Doel">
          <select value={form.goal} onChange={e => update('goal', e.target.value)} className={WIZARD_VELD}>
            {Object.entries(GOALS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Veld>
        <Veld label="Macroprofiel">
          <select value={form.macroProfile} onChange={e => update('macroProfile', e.target.value)} className={WIZARD_VELD}>
            {Object.entries(MACRO_PROFILES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Veld>
        {form.macroProfile === 'normal' && (
          <Veld label="Type sporter">
            <select value={form.sporterType} onChange={e => update('sporterType', e.target.value)} className={WIZARD_VELD}>
              {Object.entries(SPORTER_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Veld>
        )}
        {error && <p className="m-0 text-[13px] text-[#c2410c] bg-[#f7f5f0] rounded-xl px-4 py-3">{error}</p>}
        <div className="flex gap-2 pt-1">
          {onCancel && (
            <button onClick={onCancel}
              className="flex-1 h-14 rounded-[20px] border border-[#dfe3ea] bg-white text-[#14223c] font-semibold text-base active:scale-[.98] transition-transform">
              Annuleren
            </button>
          )}
          <PrimaryButton onClick={handleSubmit} className="flex-1">Bereken mijn macro's</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
