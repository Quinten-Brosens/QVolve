// ─── modules/auth — gebruikersbeheer, sessie, login UI ───────────────────────
const DEFAULT_PASSWORD = "Qvolve123!";
const ADMIN_PASSWORD   = "QvolveAdmin!";
const USERS_KEY        = "qvolve-users-v2";
const SESSION_KEY      = "qvolve-session";
const BIO_KEY          = "qvolve-bio";
const BIO_SKIP_KEY     = "qvolve-bio-skip";
const SESSION_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

const DEFAULT_USERS = [
  { name: "Alvin Broers",        password: DEFAULT_PASSWORD, mustChangePw: true },
  { name: "Anthony Van Goethem", password: DEFAULT_PASSWORD, mustChangePw: true },
  { name: "Quinten Brosens",     password: DEFAULT_PASSWORD, mustChangePw: true },
  { name: "Hanne Nelen",         password: DEFAULT_PASSWORD, mustChangePw: true },
  { name: "Jasha Bosmans",       password: DEFAULT_PASSWORD, mustChangePw: true },
];

function loadUsers() {
  const stored = lsGet(USERS_KEY);
  if (!stored || !Array.isArray(stored)) { lsSet(USERS_KEY, DEFAULT_USERS); return DEFAULT_USERS; }
  let updated = [...stored]; let changed = false;
  for (const def of DEFAULT_USERS) {
    if (!updated.find(u => u.name.toLowerCase() === def.name.toLowerCase())) { updated.push(def); changed = true; }
  }
  if (changed) lsSet(USERS_KEY, updated);
  return updated;
}
function saveUsers(users) { return lsSet(USERS_KEY, users); }

// ─── Sessie ───────────────────────────────────────────────────────────────────
// Zonder "onthoud mij" verloopt de sessie na drie dagen, met een sliding window:
// elke keer dat de app opent schuift de teller op. Met "onthoud mij" blijft ze
// staan tot je zelf uitlogt.
function loadSession() {
  const s = lsGet(SESSION_KEY);
  if (!s || !s.name || !s.ts) return null;
  if (!s.remember && Date.now() - s.ts > SESSION_MAX_AGE_MS) { lsDel(SESSION_KEY); return null; }
  const u = loadUsers().find(u => u.name === s.name && !u.mustChangePw);
  if (!u) { lsDel(SESSION_KEY); return null; }
  return s.name;
}
function saveSession(name, remember) { return lsSet(SESSION_KEY, { name, ts: Date.now(), remember: !!remember }); }
// Schuift alleen de teller op en laat de "onthoud mij"-keuze staan.
function refreshSession() {
  const s = lsGet(SESSION_KEY);
  if (!s || !s.name) return false;
  return lsSet(SESSION_KEY, { ...s, ts: Date.now() });
}
function clearSession() { lsDel(SESSION_KEY); }

// ─── Biometrie (WebAuthn) ─────────────────────────────────────────────────────
// De sleutel wordt door het toestel zelf gemaakt en bewaard; wij houden enkel
// het id van die sleutel bij, zodat we hem kunnen opvragen. Er is geen server
// die de handtekening nakijkt — dit is een slot op dit toestel, niet meer.
// Het beschermt evenveel als het wachtwoord dat vandaag in localStorage staat.
function bioNaam() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'Face ID';
  if (/Android/.test(ua)) return 'je vingerafdruk';
  if (/Macintosh/.test(ua)) return 'Touch ID';
  if (/Windows/.test(ua)) return 'Windows Hello';
  return 'biometrie';
}
function toB64u(buf) {
  const b = new Uint8Array(buf); let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).split('+').join('-').split('/').join('_').split('=').join('');
}
function vanB64u(str) {
  const t = String(str).split('-').join('+').split('_').join('/');
  const bin = atob(t + '==='.slice((t.length + 3) % 4));
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}
function randomBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); }

function loadBio() { const b = lsGet(BIO_KEY); return b && b.name && b.credId ? b : null; }
function clearBio() { lsDel(BIO_KEY); }
function bioGeweigerd(name) { const l = lsGet(BIO_SKIP_KEY); return Array.isArray(l) && l.includes(name); }
function markeerBioGeweigerd(name) {
  const l = lsGet(BIO_SKIP_KEY);
  const lijst = Array.isArray(l) ? l : [];
  if (!lijst.includes(name)) lsSet(BIO_SKIP_KEY, [...lijst, name]);
}

// Kan dit toestel überhaupt? Vereist een beveiligde context (https of localhost).
async function bioMogelijk() {
  try {
    if (!window.PublicKeyCredential || !navigator.credentials) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) { return false; }
}

async function bioInschrijven(name) {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'Qvolve' },
      user: { id: randomBytes(16), name, displayName: name },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
      attestation: 'none',
    },
  });
  if (!cred) throw new Error('Geen sleutel aangemaakt.');
  lsSet(BIO_KEY, { name, credId: toB64u(cred.rawId), ts: Date.now() });
  return true;
}

async function bioAanmelden() {
  const rec = loadBio();
  if (!rec) throw new Error('Geen sleutel op dit toestel.');
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: 'public-key', id: vanB64u(rec.credId) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  if (!res) throw new Error('Aanmelden afgebroken.');
  return rec.name;
}

// ─── De schil van het loginscherm ────────────────────────────────────────────
// Donkere kop met het merk, daaronder een licht vel dat overloopt in de app.

function QvolveGloed() {
  return (
    <>
      <div className="absolute pointer-events-none" style={{
        top: '-120px', left: '-90px', width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(47,139,255,.34) 0%, rgba(47,139,255,0) 70%)' }}/>
      <div className="absolute pointer-events-none" style={{
        top: '120px', right: '-110px', width: '280px', height: '280px',
        background: 'radial-gradient(circle, rgba(249,115,22,.28) 0%, rgba(249,115,22,0) 70%)' }}/>
    </>
  );
}

function LoginShell({ boven, children }) {
  return (
    <div className="min-h-screen w-full bg-[#14223c]">
      <div className="mx-auto max-w-md min-h-screen flex flex-col relative overflow-hidden"
           style={{ background: 'radial-gradient(ellipse at 50% 0%, #26395f 0%, #14223c 68%)' }}>
        <QvolveGloed/>
        <div className="relative shrink-0 flex flex-col items-center px-6"
             style={{ paddingTop: 'calc(50px + env(safe-area-inset-top,0px))', paddingBottom: '42px' }}>
          <img src="logo-qvolve.png" alt="" className="w-[92px] h-[92px] rounded-[26px] shadow-2xl shadow-black/40"/>
          <p className="mt-[18px] mb-0 font-logo font-bold text-[30px] leading-none">
            <span style={{ color: QV.blue }}>Q</span><span style={{ color: QV.orange }}>volve</span>
          </p>
          <p className="mt-2.5 mb-0 font-mono text-[10px] uppercase tracking-[0.28em] text-[#8fa8ce]">
            Train · Fuel · Recover · Evolve
          </p>
          {boven}
        </div>
        <div className="relative flex-1 bg-[#f7f5f0] rounded-t-[34px] px-6 pt-7 flex flex-col"
             style={{ boxShadow: '0 -18px 40px rgba(20,34,60,.28)', paddingBottom: 'max(22px, env(safe-area-inset-bottom,0px))' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Invoerkaart: het label staat in de kaart zelf, het veld heeft geen eigen rand.
function VeldKaart({ label, actie, actief, children }) {
  return (
    <div className="bg-white rounded-[18px] px-[18px] py-3.5 transition-colors"
         style={{ border: `1.5px solid ${actief ? QV.navy : QV.line}` }}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <Eyebrow>{label}</Eyebrow>
        {actie}
      </div>
      {children}
    </div>
  );
}

const LOGIN_VELD = 'w-full bg-transparent border-0 p-0 text-[16px] text-[#14223c] placeholder-[#8494aa] focus:outline-none';

// Schakelaar uit het ontwerp: 46 × 28 met een knop van 22.
function Schakelaar({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className="relative shrink-0 rounded-full transition-colors"
      style={{ width: '46px', height: '28px', background: on ? QV.blue : '#cfd6e2' }}>
      <span className="absolute rounded-full bg-white transition-all"
        style={{ width: '22px', height: '22px', top: '3px', left: on ? '21px' : '3px', boxShadow: '0 1px 3px rgba(20,34,60,.3)' }}/>
    </button>
  );
}

// Melding in de lichte schil — oranje op licht is #c2410c, niet #f97316.
function LoginMelding({ children }) {
  if (!children) return null;
  return (
    <p className="m-0 flex items-start gap-2 text-[13px] leading-snug text-[#c2410c] bg-white border border-[#dfe3ea] rounded-[14px] px-4 py-3">
      <span className="shrink-0 mt-0.5"><Icon name="AlertTriangle" size={14}/></span>
      <span>{children}</span>
    </p>
  );
}

// Waas met het scanvenster, zolang het toestel om je gezicht of vinger vraagt.
function ScanOverlay({ tekst }) {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6"
         style={{ background: 'rgba(20,34,60,.86)', animation: 'qv-fade .2s ease-out' }}>
      <div className="rounded-[28px] flex items-center justify-center text-[#2f8bff]"
           style={{ width: '104px', height: '104px', border: '2px solid #2f8bff', animation: 'qv-scan 1.1s ease-in-out infinite' }}>
        <Icon name="ScanFace" size={44}/>
      </div>
      <p className="m-0 text-[15px] text-white/85">{tekst}</p>
    </div>
  );
}

// ─── Admin paneel ─────────────────────────────────────────────────────────────
function AdminPanel({ onClose }) {
  const [users, setUsers] = useState(loadUsers());
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState('');

  function handleAdd() {
    if (!newName.trim()) return;
    if (users.find(u => u.name.toLowerCase() === newName.trim().toLowerCase())) { setMsg('Gebruiker bestaat al.'); return; }
    const updated = [...users, { name: newName.trim(), password: DEFAULT_PASSWORD, mustChangePw: true }];
    if (!saveUsers(updated)) { setMsg('Opslaan mislukt: opslag zit vol.'); return; }
    setUsers(updated); setNewName(''); setMsg(`${newName.trim()} toegevoegd`);
  }
  function handleReset(name) {
    const updated = users.map(u => u.name === name ? { ...u, password: DEFAULT_PASSWORD, mustChangePw: true } : u);
    if (!saveUsers(updated)) { setMsg('Opslaan mislukt: opslag zit vol.'); return; }
    const bio = loadBio();
    if (bio && bio.name === name) clearBio();
    setUsers(updated); setMsg(`Wachtwoord van ${name} gereset naar ${DEFAULT_PASSWORD}`);
  }
  function handleDelete(name) {
    if (!window.confirm(`${name} verwijderen?`)) return;
    const updated = users.filter(u => u.name !== name);
    if (!saveUsers(updated)) { setMsg('Opslaan mislukt: opslag zit vol.'); return; }
    const bio = loadBio();
    if (bio && bio.name === name) clearBio();
    setUsers(updated); setMsg(`${name} verwijderd`);
  }

  return (
    <Sheet onClose={onClose}>
      <p className="m-0 mb-1 font-logo font-bold text-2xl text-[#14223c] shrink-0">Gebruikersbeheer</p>
      <p className="mt-0 mb-4 text-[13px] text-[#4a5568] shrink-0">
        Alleen op dit toestel. Elk toestel houdt zijn eigen lijst bij.
      </p>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-4">
        {msg && <p className="m-0 text-[13px] text-[#1e3a8a] bg-[#e6ecf6] rounded-[14px] px-4 py-3">{msg}</p>}
        <div className="bg-white border border-[#dfe3ea] rounded-[18px] overflow-hidden">
          {users.map(u => (
            <div key={u.name} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#eef1f6] last:border-0">
              <div className="flex-1 min-w-0">
                <p className="m-0 font-semibold text-[15px] text-[#14223c] truncate">{u.name}</p>
                <p className="mt-0.5 mb-0 text-xs text-[#4a5568]">
                  {u.mustChangePw ? 'Moet nog een wachtwoord kiezen' : 'Actief'}
                </p>
              </div>
              <button onClick={() => handleReset(u.name)}
                className="shrink-0 h-8 rounded-[10px] bg-[#e6ecf6] px-3 text-[12px] font-semibold text-[#35507d] active:scale-95 transition-transform">
                Reset
              </button>
              <button onClick={() => handleDelete(u.name)} aria-label={`${u.name} verwijderen`}
                className="shrink-0 w-8 h-8 rounded-[10px] bg-[#e6ecf6] flex items-center justify-center text-[#c2410c] active:scale-90 transition-transform">
                <Icon name="Trash2" size={14}/>
              </button>
            </div>
          ))}
        </div>
        <div>
          <Eyebrow className="mb-2">Gebruiker toevoegen</Eyebrow>
          <div className="flex gap-2">
            <input value={newName} onChange={e => { setNewName(e.target.value); setMsg(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Volledige naam"
              className="flex-1 min-w-0 bg-white border border-[#dfe3ea] rounded-[16px] px-4 py-3 text-[15px] text-[#14223c] placeholder-[#8494aa] focus:outline-none focus:border-[#182a48]"/>
            <button onClick={handleAdd} aria-label="Toevoegen"
              className="shrink-0 w-[52px] h-[50px] rounded-[16px] bg-[#182a48] text-white flex items-center justify-center active:scale-95 transition-transform">
              <Icon name="Plus" size={18}/>
            </button>
          </div>
          <p className="mt-2 mb-0 text-[12px] text-[#8494aa]">
            Nieuwe gebruikers starten op {DEFAULT_PASSWORD} en kiezen zelf iets anders bij de eerste login.
          </p>
        </div>
      </div>
    </Sheet>
  );
}

// ─── Wachtwoord wijzigen ──────────────────────────────────────────────────────
function ChangePwScreen({ userName, onDone }) {
  const [pw1, setPw1] = useState(''); const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false); const [err, setErr] = useState(''); const [saving, setSaving] = useState(false);

  function handleSave() {
    if (pw1.length < 8) { setErr('Minimaal 8 tekens.'); return; }
    if (pw1 !== pw2) { setErr('Wachtwoorden komen niet overeen.'); return; }
    if (pw1 === DEFAULT_PASSWORD) { setErr('Kies een ander wachtwoord dan het standaard.'); return; }
    setSaving(true);
    const updated = loadUsers().map(u => u.name === userName ? { ...u, password: pw1, mustChangePw: false } : u);
    if (!saveUsers(updated)) {
      setSaving(false);
      setErr('Opslaan mislukt: opslag zit vol. Exporteer je gegevens en maak ruimte vrij, en probeer dan opnieuw.');
      return;
    }
    setSaving(false); onDone();
  }

  return (
    <LoginShell>
      <p className="m-0 font-logo font-bold text-[26px] leading-tight text-[#14223c]">Kies je wachtwoord</p>
      <p className="mt-1.5 mb-5 text-[13px] leading-relaxed text-[#4a5568]" style={{ textWrap: 'pretty' }}>
        Welkom {userName.split(' ')[0]}. Minstens 8 tekens, en iets anders dan het standaardwachtwoord.
      </p>
      <div className="space-y-3">
        <VeldKaart label="Nieuw wachtwoord" actief={!!pw1}
          actie={<button type="button" onClick={() => setShow(!show)} className="text-[12px] font-semibold text-[#1e3a8a]">{show ? 'verberg' : 'toon'}</button>}>
          <input type={show ? 'text' : 'password'} value={pw1} autoComplete="new-password" placeholder="••••••••"
            onChange={e => { setPw1(e.target.value); setErr(''); }} className={LOGIN_VELD}/>
        </VeldKaart>
        <VeldKaart label="Nog eens ter controle" actief={!!pw2}>
          <input type={show ? 'text' : 'password'} value={pw2} autoComplete="new-password" placeholder="••••••••"
            onChange={e => { setPw2(e.target.value); setErr(''); }} onKeyDown={e => e.key === 'Enter' && handleSave()} className={LOGIN_VELD}/>
        </VeldKaart>
        <LoginMelding>{err}</LoginMelding>
        <PrimaryButton onClick={handleSave} disabled={saving} className="!h-[62px]">
          {saving && <Icon name="Loader2" size={16}/>} Opslaan en starten
        </PrimaryButton>
      </div>
    </LoginShell>
  );
}

// ─── Login scherm ─────────────────────────────────────────────────────────────
function AccessGate({ onUnlock }) {
  const [users] = useState(loadUsers());
  const [bio, setBio] = useState(loadBio);
  const [kanBio, setKanBio] = useState(false);
  const [modus, setModus] = useState(() => loadBio() ? 'bio' : 'wachtwoord');
  const [scanTekst, setScanTekst] = useState('');
  const [enroll, setEnroll] = useState(null);      // { name, remember } zolang we het vragen
  const [enrollErr, setEnrollErr] = useState('');
  const [selName, setSelName] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [uitleg, setUitleg] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [adminErr, setAdminErr] = useState('');
  const [adminOpen, setAdminOpen] = useState(false);
  const [changePw, setChangePw] = useState(null);

  // Of dit toestel een gezichts- of vingerafdrukslot heeft, weten we pas na een
  // asynchrone vraag. Tot dan tonen we de biometrie-knoppen niet.
  useEffect(() => {
    let levend = true;
    bioMogelijk().then(ok => { if (levend) setKanBio(ok); });
    return () => { levend = false; };
  }, []);

  // Na een geslaagd wachtwoord: aanbieden om voortaan met Face ID te openen.
  function naLogin(name, onthoud) {
    if (kanBio && !loadBio() && !bioGeweigerd(name)) { setEnroll({ name, remember: onthoud }); return; }
    onUnlock(name, onthoud);
  }

  function handleLogin() {
    const u = loadUsers().find(u => u.name === selName && u.password === password.trim());
    if (!u) { setError('Foutieve naam of wachtwoord.'); return; }
    if (u.mustChangePw) { setChangePw(u.name); return; }
    naLogin(u.name, remember);
  }

  async function handleBio() {
    setError(''); setScanTekst('Even wachten op ' + bioNaam() + '…');
    try {
      const name = await bioAanmelden();
      const u = loadUsers().find(u => u.name === name);
      if (!u) { clearBio(); setBio(null); setModus('wachtwoord'); setError('Die gebruiker bestaat niet meer op dit toestel.'); return; }
      if (u.mustChangePw) { setModus('wachtwoord'); setSelName(name); setError('Kies eerst een wachtwoord voor dit account.'); return; }
      onUnlock(name, true);
    } catch (e) {
      setModus('wachtwoord');
      setSelName(bio ? bio.name : '');
      setError(e && e.name === 'NotAllowedError' ? 'Afgebroken. Meld je aan met je wachtwoord.' : 'Dat lukte niet. Meld je aan met je wachtwoord.');
    } finally { setScanTekst(''); }
  }

  async function handleEnroll() {
    setEnrollErr(''); setScanTekst('Even wachten op ' + bioNaam() + '…');
    try {
      await bioInschrijven(enroll.name);
      onUnlock(enroll.name, true);
    } catch (e) {
      setEnrollErr(e && e.name === 'NotAllowedError' ? 'Afgebroken — je kunt dit later opnieuw proberen.' : 'Instellen lukte niet op dit toestel.');
    } finally { setScanTekst(''); }
  }
  function slaEnrollOver() {
    markeerBioGeweigerd(enroll.name);
    onUnlock(enroll.name, enroll.remember);
  }

  function vergeetSleutel() {
    if (!window.confirm('De sleutel van ' + bio.name + ' van dit toestel halen?')) return;
    clearBio(); setBio(null); setModus('wachtwoord'); setSelName(''); setError('');
  }

  function handleAdminLogin() {
    if (adminPw === ADMIN_PASSWORD) { setAdminOpen(true); setShowAdmin(false); setAdminPw(''); setAdminErr(''); }
    else setAdminErr('Fout admin-wachtwoord.');
  }

  if (changePw) return <ChangePwScreen userName={changePw} onDone={() => { const n = changePw; setChangePw(null); naLogin(n, remember); }}/>;

  const beheerLink = (
    <button onClick={() => setShowAdmin(true)} className="mt-auto pt-6 pb-1 mx-auto text-[12px] font-medium text-[#8494aa]">
      Beheer
    </button>
  );

  return (
    <>
      {scanTekst && <ScanOverlay tekst={scanTekst}/>}
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)}/>}

      {showAdmin && (
        <Sheet onClose={() => { setShowAdmin(false); setAdminPw(''); setAdminErr(''); }}>
          <p className="m-0 mb-1 font-logo font-bold text-2xl text-[#14223c]">Beheer</p>
          <p className="mt-0 mb-4 text-[13px] text-[#4a5568]">Gebruikers toevoegen, verwijderen of een wachtwoord resetten.</p>
          <VeldKaart label="Admin-wachtwoord" actief={!!adminPw}>
            <input type="password" value={adminPw} autoFocus placeholder="••••••••"
              onChange={e => { setAdminPw(e.target.value); setAdminErr(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} className={LOGIN_VELD}/>
          </VeldKaart>
          {adminErr && <p className="mt-3 mb-0 text-[13px] text-[#c2410c]">{adminErr}</p>}
          <PrimaryButton onClick={handleAdminLogin} className="mt-3 mb-2">Openen</PrimaryButton>
        </Sheet>
      )}

      {enroll && (
        <Sheet onClose={slaEnrollOver}>
          <div className="w-14 h-14 rounded-[20px] bg-[#e6ecf6] flex items-center justify-center text-[#35507d]">
            <Icon name="ScanFace" size={26}/>
          </div>
          <p className="mt-4 mb-1.5 font-logo font-bold text-[22px] leading-tight text-[#14223c]">Voortaan met {bioNaam()}?</p>
          <p className="m-0 text-[13px] leading-relaxed text-[#4a5568]" style={{ textWrap: 'pretty' }}>
            Dan hoef je je wachtwoord nooit meer te typen. De sleutel blijft op dit toestel — wij zien hem niet.
          </p>
          {enrollErr && <p className="mt-3 mb-0 text-[13px] text-[#c2410c]">{enrollErr}</p>}
          <div className="mt-5 mb-2 space-y-2.5">
            <PrimaryButton onClick={handleEnroll} className="!h-[58px]">Instellen</PrimaryButton>
            <button onClick={slaEnrollOver}
              className="w-full h-[52px] rounded-[20px] border border-[#dfe3ea] bg-white text-[15px] font-semibold text-[#4a5568] active:scale-[.98] transition-transform">
              Nu niet
            </button>
          </div>
        </Sheet>
      )}

      {modus === 'bio' && bio ? (
        <LoginShell boven={
          <div className="mt-9 flex flex-col items-center" style={{ animation: 'qv-pop .45s cubic-bezier(.22,1,.36,1)' }}>
            <div className="w-[72px] h-[72px] rounded-[24px] bg-[#f97316] flex items-center justify-center font-logo font-bold text-[26px] text-white">
              {initialen(bio.name)}
            </div>
            <p className="mt-3.5 mb-0 font-logo font-bold text-[22px] leading-none text-white">Hallo {bio.name.split(' ')[0]}</p>
          </div>
        }>
          <LoginMelding>{error}</LoginMelding>
          <div className={error ? 'mt-3 space-y-2.5' : 'space-y-2.5'}>
            <PrimaryButton onClick={handleBio} className="!h-[62px]">
              <Icon name="ScanFace" size={19}/> Aanmelden met {bioNaam()}
            </PrimaryButton>
            <button onClick={() => { setModus('wachtwoord'); setSelName(bio.name); setError(''); }}
              className="w-full h-[58px] rounded-[20px] border border-[#dfe3ea] bg-white flex items-center justify-center gap-2.5 text-[15px] font-semibold text-[#14223c] active:scale-[.98] transition-transform">
              <Icon name="Lock" size={17}/> Wachtwoord gebruiken
            </button>
          </div>
          <div className="mt-4 flex items-start gap-3 bg-[#e6ecf6] rounded-[18px] px-[18px] py-4">
            <span className="shrink-0 mt-0.5 text-[#35507d]"><Icon name="Key" size={17}/></span>
            <p className="m-0 text-[12.5px] leading-relaxed text-[#35507d]" style={{ textWrap: 'pretty' }}>
              Je sleutel staat op dit toestel, niet op onze server. Log je uit, dan blijft je logboek bewaard.
            </p>
          </div>
          <button onClick={vergeetSleutel} className="mt-5 mx-auto text-[13px] font-semibold text-[#1e3a8a]">
            Niet jij? Ander account
          </button>
          {beheerLink}
        </LoginShell>
      ) : (
        <LoginShell>
          <p className="m-0 font-logo font-bold text-[26px] leading-tight text-[#14223c]">Meld je aan</p>
          <p className="mt-1.5 mb-5 text-[13px] text-[#4a5568]">Eén keer per toestel. Daarna kent Qvolve je.</p>

          <div className="space-y-3">
            <VeldKaart label="Naam" actief={!!selName}>
              <select value={selName} onChange={e => { setSelName(e.target.value); setError(''); }}
                className={LOGIN_VELD + ' appearance-none'}>
                <option value="">Kies je naam</option>
                {users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
              </select>
            </VeldKaart>

            <VeldKaart label="Wachtwoord" actief={!!password}
              actie={<button type="button" onClick={() => setShowPw(!showPw)} className="text-[12px] font-semibold text-[#1e3a8a]">{showPw ? 'verberg' : 'toon'}</button>}>
              <input type={showPw ? 'text' : 'password'} value={password} autoComplete="current-password" placeholder="••••••••"
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} className={LOGIN_VELD}/>
            </VeldKaart>

            <div className="flex items-center gap-3.5 bg-[#e6ecf6] rounded-[18px] px-[18px] py-4">
              <div className="flex-1 min-w-0">
                <p className="m-0 font-semibold text-[14px] text-[#14223c]">Onthoud mij op dit toestel</p>
                <p className="mt-1 mb-0 text-[12px] leading-snug text-[#35507d]">
                  {remember ? 'Je blijft aangemeld tot je zelf uitlogt.' : 'Je blijft drie dagen aangemeld.'}
                </p>
              </div>
              <Schakelaar on={remember} onChange={setRemember} label="Onthoud mij op dit toestel"/>
            </div>

            <LoginMelding>{error}</LoginMelding>

            <PrimaryButton onClick={handleLogin} disabled={!selName || !password} className="!h-[62px]">
              Start <Icon name="ArrowRight" size={19}/>
            </PrimaryButton>
          </div>

          <button onClick={() => setUitleg(!uitleg)} className="mt-4 mx-auto text-[13px] text-[#4a5568]">
            Wachtwoord vergeten? <span className="font-semibold text-[#1e3a8a]">Vraag een reset</span>
          </button>
          {uitleg && (
            <p className="mt-2.5 mb-0 text-[12.5px] leading-relaxed text-[#4a5568] bg-white border border-[#dfe3ea] rounded-[14px] px-4 py-3" style={{ textWrap: 'pretty' }}>
              Qvolve heeft geen server die e-mail kan sturen: je wachtwoord staat alleen op dit toestel.
              Een reset gebeurt hieronder via Beheer — daarna staat je account terug op {DEFAULT_PASSWORD} en
              kies je bij de eerste login opnieuw iets persoonlijks. Je logboek blijft bewaard.
            </p>
          )}
          {beheerLink}
        </LoginShell>
      )}
    </>
  );
}
