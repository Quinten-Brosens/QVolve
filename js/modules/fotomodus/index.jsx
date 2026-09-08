// ─── modules/fotomodus — maaltijd loggen vanaf een foto ──────────────────────
// De native camera van de telefoon doet het vastleggen (input met capture),
// niet een eigen viewfinder: dat werkt op iOS én Android zonder extra library
// en zonder videostream die opgeruimd moet worden.

function PhotoTab({ mealLabel, onConfirm }) {
  const [thumb, setThumb] = useState('');
  // rows = de items uit de AI, aangevuld met wat de gebruiker eraan verandert.
  const [rows, setRows] = useState(null);
  const [note, setNote] = useState('');
  const [photoId, setPhotoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    // Dezelfde foto twee keer kiezen moet opnieuw een change geven.
    e.target.value = '';
    if (!file) return;
    setError(''); setRows(null); setNote(''); setLoading(true);
    try {
      const photo = await prepareMealPhoto(file);
      setThumb(photo.thumb);
      setPhotoId(`p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      const res = await analyzeMealPhotoWithAI({ base64: photo.base64, mimeType: photo.mimeType });
      setRows(res.items.map((it, i) => ({
        ...it,
        rowId: `r-${i}-${Math.random().toString(36).slice(2, 8)}`,
        grams: String(Math.round(it.grams) || 100),
        on: true,
      })));
      setNote(res.note);
    } catch (err) {
      setError(err.message || 'De foto kon niet geanalyseerd worden.');
    }
    setLoading(false);
  }

  function reset() {
    setThumb(''); setRows(null); setNote(''); setError(''); setPhotoId('');
  }

  // De AI geeft macro's per 100g; het gram-veld herrekent lokaal — net zoals
  // NEVO-producten in de zoek-tab werken.
  function scaled(row) {
    const g = parseFloat(row.grams) || 0;
    return {
      kcal: (row.kcal * g) / 100,
      protein: (row.protein * g) / 100,
      fat: (row.fat * g) / 100,
      carbs: (row.carbs * g) / 100,
    };
  }

  const chosen = (rows || []).filter(r => r.on);
  const total = chosen.reduce((a, r) => {
    const s = scaled(r);
    return { kcal: a.kcal + s.kcal, protein: a.protein + s.protein, fat: a.fat + s.fat, carbs: a.carbs + s.carbs };
  }, { kcal: 0, protein: 0, fat: 0, carbs: 0 });

  function setRow(rowId, patch) {
    setRows(rs => rs.map(r => r.rowId === rowId ? { ...r, ...patch } : r));
  }

  function confirm() {
    const entries = chosen.map(r => {
      const s = scaled(r);
      return {
        id: `log-${Date.now()}-${Math.random()}`,
        name: r.name,
        grams: parseFloat(r.grams) || 0,
        kcal: s.kcal, protein: s.protein, fat: s.fat, carbs: s.carbs,
        source: 'ai-photo',
        photoId,
        _thumb: thumb,
      };
    });
    if (entries.length) onConfirm(entries);
  }

  const fmtG = v => { v = Number(v) || 0; return v > 0 && v < 10 ? Math.round(v * 10) / 10 : Math.round(v); };

  return (
    <div className="space-y-3">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {!thumb && !loading && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3 text-center">
          <Icon name="Camera" size={30} className="text-gray-300 mx-auto"/>
          <p className="text-sm font-semibold text-gray-800">Maak een foto van je maaltijd</p>
          <p className="text-xs text-gray-500">De AI herkent de gerechten en schat de porties. Je past de grammen daarna zelf aan.</p>
          <button onClick={() => cameraRef.current.click()}
            className="w-full bg-[#2f8bff] hover:bg-[#2076e8] text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2">
            <Icon name="Camera" size={15}/> Foto maken
          </button>
          <button onClick={() => galleryRef.current.click()}
            className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2">
            <Icon name="Image" size={15}/> Kies uit galerij
          </button>
        </div>
      )}

      {(thumb || loading) && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-3">
            {thumb
              ? <img src={thumb} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
              : <div className="w-14 h-14 rounded-lg bg-gray-100 shrink-0" />}
            <div className="min-w-0 flex-1">
              {loading
                ? <p className="text-sm text-gray-600 flex items-center gap-2"><Icon name="Loader2" size={14}/> Foto analyseren…</p>
                : <p className="text-sm font-semibold text-gray-800">{error ? 'Analyse mislukt' : 'Herkend op de foto'}</p>}
              {!loading && note && <p className="text-[11px] text-gray-400 mt-0.5">{note}</p>}
            </div>
            {!loading && (
              <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-700 shrink-0">Opnieuw</button>
            )}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {rows && rows.length === 0 && !error && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Geen herkenbaar eten op de foto. Probeer een duidelijkere foto, of beschrijf de maaltijd via AI-schatting.
            </p>
          )}

          {rows && rows.length > 0 && (
            <div className="space-y-1.5">
              {rows.map(r => {
                const s = scaled(r);
                return (
                  <div key={r.rowId} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${r.on ? 'border-orange-100 bg-orange-50' : 'border-gray-100 bg-white opacity-60'}`}>
                    <button onClick={() => setRow(r.rowId, { on: !r.on })} className={r.on ? 'text-orange-500' : 'text-gray-300'}>
                      <Icon name={r.on ? 'CheckCircle2' : 'Circle'} size={18}/>
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 truncate">{r.name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px]">
                        <span className="text-orange-500 font-medium">{Math.round(s.kcal)} kcal</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-[#2f8bff]">E {fmtG(s.protein)}g</span>
                        <span className="text-[#1e3a8a]">KH {fmtG(s.carbs)}g</span>
                        <span className="text-[#f59e0b]">V {fmtG(s.fat)}g</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <input type="number" inputMode="decimal" value={r.grams}
                        onChange={e => setRow(r.rowId, { grams: e.target.value })}
                        className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      <span className="text-xs text-gray-400">g</span>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
                <span>{chosen.length} van {rows.length} geselecteerd</span>
                <span className="font-semibold text-gray-700">{Math.round(total.kcal)} kcal</span>
              </div>

              <button onClick={confirm} disabled={chosen.length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl py-2.5 text-sm font-medium">
                Voeg toe aan {mealLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
