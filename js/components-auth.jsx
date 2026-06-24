// ─── Instellingen scherm ─────────────────────────────────────────────────────
function SettingsModal({ onClose }) {
  const hasKey = !!lsGet('qvolve-gemini-key');
  const [step, setStep] = useState(hasKey ? 'done' : 'start');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);

  async function handleActivate() {
    const key = apiKey.trim();
    if (!key) { setError('Plak eerst je API-sleutel.'); return; }
    setTesting(true); setError('');
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
        { method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':key},
          body: JSON.stringify({ contents:[{parts:[{text:'Zeg enkel: OK'}]}], generationConfig:{maxOutputTokens:10} }) }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      lsSet('qvolve-gemini-key', key);
      setStep('done');
    } catch(e) {
      setError('Sleutel werkt niet: ' + e.message);
    }
    setTesting(false);
  }

  function handleDisable() {
    lsDel('qvolve-gemini-key');
    setStep('start');
    setApiKey('');
  }

  if (step === 'done') return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-blue-900 border border-blue-700 rounded-2xl w-full max-w-md p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-white mb-1">AI Assistent actief!</h2>
        <p className="text-sm text-blue-300 mb-6">Je kan nu weekschema's genereren, maaltijden laten schatten en suggesties ontvangen.</p>
        <button onClick={onClose} className="w-full bg-orange-500 hover:bg-orange-400 text-white rounded-xl py-3 text-sm font-semibold mb-3">Sluiten</button>
        <button onClick={handleDisable} className="text-xs text-blue-500 hover:text-blue-300 underline">AI uitschakelen</button>
      </div>
    </div>
  );

  if (step === 'paste') return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-blue-900 border border-blue-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-blue-800">
          <span className="text-sm font-semibold text-white">Stap 2 — Plak je sleutel</span>
          <button onClick={onClose} className="text-blue-400 hover:text-white"><Icon name="X" size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-blue-800/50 rounded-xl p-3 text-sm text-blue-200 leading-relaxed space-y-1">
            <p>1. Je bent nu op Google AI Studio</p>
            <p>2. Klik <strong className="text-white">"Get API key"</strong></p>
            <p>3. Klik <strong className="text-white">"Create API key"</strong></p>
            <p>4. Kopieer de sleutel</p>
            <p>5. Plak hem hieronder</p>
          </div>
          <input
            type="text"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setError(''); }}
            placeholder="AIza..."
            autoFocus
            className="w-full bg-blue-800 border border-blue-700 rounded-xl text-white placeholder-blue-500 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {error && <p className="text-xs text-red-400 bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}
          <button onClick={handleActivate} disabled={testing || !apiKey.trim()}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2">
            {testing && <Icon name="Loader2" size={14}/>}
            {testing ? 'Sleutel testen...' : '✨ Activeer AI Assistent'}
          </button>
          <button onClick={() => setStep('start')} className="text-xs text-blue-500 hover:text-blue-300 underline w-full text-center">← Terug</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-blue-900 border border-blue-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-blue-800">
          <span className="text-sm font-semibold text-white">AI Assistent inschakelen</span>
          <button onClick={onClose} className="text-blue-400 hover:text-white"><Icon name="X" size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-center py-2">
            <div className="text-5xl mb-3">🤖</div>
            <h2 className="text-base font-bold text-white mb-1">Schakel de AI Assistent in</h2>
            <p className="text-sm text-blue-300">Genereer weekschema's, laat maaltijden schatten en krijg suggesties — volledig gratis via Google.</p>
          </div>
          <div className="bg-blue-800/40 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-blue-200"><span>✓</span><span>Gratis Google-account volstaat</span></div>
            <div className="flex items-center gap-2 text-sm text-blue-200"><span>✓</span><span>Gratis tot 1500 AI-aanvragen per dag</span></div>
            <div className="flex items-center gap-2 text-sm text-blue-200"><span>✓</span><span>Duurt minder dan 2 minuten</span></div>
          </div>
          <button
            onClick={() => { window.open('https://aistudio.google.com/app/apikey', '_blank'); setStep('paste'); }}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2">
            <Icon name="Sparkles" size={16}/> Schakel AI Assistent in
          </button>
          <p className="text-[11px] text-blue-500 text-center">Je sleutel wordt alleen lokaal op dit apparaat opgeslagen.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Paneel ────────────────────────────────────────────────────────────
function AdminPanel({ onClose }) {
  const [users, setUsers] = useState(loadUsers());
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState('');

  function handleAdd() {
    if (!newName.trim()) return;
    if (users.find(u => u.name.toLowerCase() === newName.trim().toLowerCase())) { setMsg('Gebruiker bestaat al.'); return; }
    const updated = [...users, { name: newName.trim(), password: DEFAULT_PASSWORD, mustChangePw: true }];
    saveUsers(updated); setUsers(updated); setNewName(''); setMsg(`✓ ${newName.trim()} toegevoegd`);
  }
  function handleReset(name) {
    const updated = users.map(u => u.name===name ? {...u, password:DEFAULT_PASSWORD, mustChangePw:true} : u);
    saveUsers(updated); setUsers(updated); setMsg(`✓ Wachtwoord van ${name} gereset`);
  }
  function handleDelete(name) {
    if (!window.confirm(`${name} verwijderen?`)) return;
    const updated = users.filter(u => u.name!==name);
    saveUsers(updated); setUsers(updated); setMsg(`✓ ${name} verwijderd`);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-blue-900 border border-blue-700 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-blue-800">
          <span className="text-sm font-semibold text-white">👤 Gebruikersbeheer</span>
          <button onClick={onClose} className="text-blue-400 hover:text-white"><Icon name="X" size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          {msg && <p className="text-xs text-orange-400 bg-orange-950/30 rounded-lg px-3 py-2">{msg}</p>}
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.name} className="flex items-center justify-between bg-blue-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{u.name}</p>
                  <p className="text-[11px] text-blue-400">{u.mustChangePw ? '⚠️ Moet wachtwoord wijzigen' : '✓ Actief'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReset(u.name)} className="text-[11px] text-amber-400 border border-amber-800 rounded-lg px-2 py-1">Reset pw</button>
                  <button onClick={() => handleDelete(u.name)} className="text-[11px] text-red-400 border border-red-900 rounded-lg px-2 py-1"><Icon name="Trash2" size={12}/></button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-blue-800 pt-4">
            <p className="text-xs text-blue-400 mb-2 font-medium">Gebruiker toevoegen</p>
            <div className="flex gap-2">
              <input value={newName} onChange={e=>{setNewName(e.target.value);setMsg('');}} onKeyDown={e=>e.key==='Enter'&&handleAdd()} placeholder="Volledige naam"
                className="flex-1 bg-blue-800 border border-blue-700 rounded-xl text-white text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-blue-500" />
              <button onClick={handleAdd} className="bg-orange-500 hover:bg-orange-400 text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Icon name="Plus" size={14}/></button>
            </div>
            <p className="text-[11px] text-blue-500 mt-1.5">Standaardwachtwoord: {DEFAULT_PASSWORD}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Wachtwoord wijzigen ──────────────────────────────────────────────────────
function ChangePwScreen({ userName, onDone }) {
  const [pw1,setPw1]=useState(''); const [pw2,setPw2]=useState('');
  const [show,setShow]=useState(false); const [err,setErr]=useState(''); const [saving,setSaving]=useState(false);

  function handleSave() {
    if (pw1.length<8) { setErr('Minimaal 8 tekens.'); return; }
    if (pw1!==pw2) { setErr('Wachtwoorden komen niet overeen.'); return; }
    if (pw1===DEFAULT_PASSWORD) { setErr('Kies een ander wachtwoord dan het standaard.'); return; }
    setSaving(true);
    const users = loadUsers();
    const updated = users.map(u => u.name===userName ? {...u,password:pw1,mustChangePw:false} : u);
    saveUsers(updated);
    setSaving(false);
    onDone();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-950 px-6">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-white mb-1">Q<span className="text-orange-400">volve</span></h1>
        <p className="text-xs tracking-widest text-blue-400 uppercase">Train. Fuel. Recover. Evolve.</p>
      </div>
      <div className="w-full max-w-sm bg-blue-900 border border-blue-800 rounded-2xl p-6 shadow-2xl">
        <p className="text-sm font-semibold text-white mb-1">Kies een nieuw wachtwoord</p>
        <p className="text-xs text-blue-400 mb-4">Welkom {userName.split(' ')[0]}! Kies een persoonlijk wachtwoord.</p>
        <div className="space-y-3">
          <div className="relative">
            <input type={show?'text':'password'} value={pw1} onChange={e=>{setPw1(e.target.value);setErr('');}} placeholder="Nieuw wachtwoord"
              className="w-full bg-blue-800 border border-blue-700 rounded-xl text-white placeholder-blue-500 px-4 py-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-[11px]">{show?'verberg':'toon'}</button>
          </div>
          <input type={show?'text':'password'} value={pw2} onChange={e=>{setPw2(e.target.value);setErr('');}} placeholder="Bevestig wachtwoord"
            onKeyDown={e=>e.key==='Enter'&&handleSave()}
            className="w-full bg-blue-800 border border-blue-700 rounded-xl text-white placeholder-blue-500 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          {err && <p className="text-xs text-red-400 bg-red-950/50 rounded-lg px-3 py-2">{err}</p>}
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {saving && <Icon name="Loader2" size={14}/>}
            Opslaan en starten
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Login scherm ─────────────────────────────────────────────────────────────
function AccessGate({ onUnlock }) {
  const [users] = useState(loadUsers());
  const [selName, setSelName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [adminErr, setAdminErr] = useState('');
  const [adminOpen, setAdminOpen] = useState(false);
  const [changePw, setChangePw] = useState(null);

  function handleLogin() {
    const u = loadUsers().find(u => u.name===selName && u.password===password.trim());
    if (!u) { setError('Foutieve naam of wachtwoord.'); return; }
    if (u.mustChangePw) { setChangePw(u.name); return; }
    onUnlock(u.name);
  }
  function handleAdminLogin() {
    if (adminPw===ADMIN_PASSWORD) { setAdminOpen(true); setShowAdmin(false); setAdminPw(''); setAdminErr(''); }
    else setAdminErr('Fout admin-wachtwoord.');
  }

  if (changePw) return <ChangePwScreen userName={changePw} onDone={() => { setChangePw(null); onUnlock(changePw); }} />;

  return (
    <>
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-950 px-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-1">Q<span className="text-orange-400">volve</span></h1>
          <p className="text-xs font-medium tracking-widest text-blue-400 uppercase">Train. Fuel. Recover. Evolve.</p>
        </div>
        <div className="w-full max-w-sm bg-blue-900 rounded-2xl border border-blue-800 p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Lock" size={14} className="text-orange-400" />
            <span className="text-sm font-semibold text-white">Inloggen</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-blue-400 mb-1">Naam</label>
              <select value={selName} onChange={e=>{setSelName(e.target.value);setError('');}}
                className="w-full bg-blue-800 border border-blue-700 rounded-xl text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none text-white"
                style={{colorScheme:'dark'}}>
                <option value="">— Selecteer je naam —</option>
                {users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-400 mb-1">Wachtwoord</label>
              <div className="relative">
                <input type={showPw?'text':'password'} value={password} onChange={e=>{setPassword(e.target.value);setError('');}}
                  onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="••••••••••"
                  className="w-full rounded-xl bg-blue-800 border border-blue-700 text-white placeholder-blue-500 px-4 py-3 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-[11px]">{showPw?'verberg':'toon'}</button>
              </div>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-950/50 rounded-lg px-3 py-2">{error}</p>}
            <button onClick={handleLogin} disabled={!selName||!password}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white rounded-xl py-3 text-sm font-semibold transition-colors">
              Start →
            </button>
          </div>
        </div>
        <button onClick={()=>setShowAdmin(!showAdmin)} className="mt-6 text-[11px] text-blue-700 hover:text-blue-500">Beheer</button>
        {showAdmin && (
          <div className="mt-3 w-full max-w-xs bg-blue-900 border border-blue-800 rounded-xl p-4">
            <p className="text-xs text-blue-400 mb-2">Admin-wachtwoord</p>
            <div className="flex gap-2">
              <input type="password" value={adminPw} onChange={e=>{setAdminPw(e.target.value);setAdminErr('');}}
                onKeyDown={e=>e.key==='Enter'&&handleAdminLogin()} placeholder="••••••"
                className="flex-1 bg-blue-800 border border-blue-700 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              <button onClick={handleAdminLogin} className="bg-orange-500 text-white rounded-lg px-3 py-2 text-sm">→</button>
            </div>
            {adminErr && <p className="text-[11px] text-red-400 mt-1">{adminErr}</p>}
          </div>
        )}
      </div>
    </>
  );
}

