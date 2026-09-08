// ─── modules/fotomodus — maaltijd loggen vanaf een foto ──────────────────────
// De native camera van de telefoon doet het vastleggen (input met capture),
// niet een eigen viewfinder: dat werkt op iOS én Android zonder extra library
// en zonder videostream die opgeruimd moet worden.

function PhotoTab({ mealLabel, onConfirm }) {
  const [thumb, setThumb] = useState('');
  const [items, setItems] = useState(null);
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
    setError(''); setItems(null); setNote(''); setLoading(true);
    try {
      const photo = await prepareMealPhoto(file);
      setThumb(photo.thumb);
      setPhotoId(`p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      const res = await analyzeMealPhotoWithAI({ base64: photo.base64, mimeType: photo.mimeType });
      setItems(res.items);
      setNote(res.note);
    } catch (err) {
      setError(err.message || 'De foto kon niet geanalyseerd worden.');
    }
    setLoading(false);
  }

  function reset() {
    setThumb(''); setItems(null); setNote(''); setError(''); setPhotoId('');
  }

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

          {items && items.length === 0 && !error && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Geen herkenbaar eten op de foto. Probeer een duidelijkere foto, of beschrijf de maaltijd via AI-schatting.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
