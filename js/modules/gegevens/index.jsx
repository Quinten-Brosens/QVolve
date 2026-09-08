// ─── modules/gegevens — back-up en opslagbewaking ────────────────────────────
//
// Zolang alles in localStorage staat is dit het veiligheidsnet: één knop die
// alles wat van jou is als bestand meegeeft. Later (fase 4, AVG) komt hier ook
// de verwijderknop bij.

// De banner verschijnt zodra één schrijfactie op een vol quotum stuit. Dat is
// het moment waarop de app stil begon te liegen: het scherm toont de maaltijd,
// de opslag heeft ze niet. Daarom staat de exportknop meteen in de melding.
function StorageWarningBanner({ userName, userSlug }) {
  const [fout, setFout] = useState(null);

  useEffect(() => {
    // onStorageError geeft de opzegfunctie terug; die is meteen de cleanup.
    return onStorageError(setFout);
  }, []);

  if (!fout) return null;

  function handleExport() {
    const r = exportUserData(userName, userSlug);
    if (r.ok) setFout(null);
  }

  return (
    <div className="rounded-2xl border border-orange-300 bg-orange-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-orange-500 shrink-0 mt-0.5"><Icon name="AlertTriangle" size={18}/></span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-orange-900">
            Opslag vol — je laatste wijziging is niet bewaard
          </h3>
          <p className="text-xs text-orange-800 mt-1">
            Dit toestel heeft geen ruimte meer voor Qvolve. Exporteer nu je gegevens als
            back-up en maak daarna ruimte vrij, anders gaat verloren wat je hierna logt.
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium">
              <Icon name="Download" size={13}/> Exporteer nu
            </button>
            <button onClick={() => setFout(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-orange-800 border border-orange-300">
              Sluiten
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataExportCard({ userName, userSlug }) {
  const [msg, setMsg] = useState(null);      // { ok: boolean, text: string }
  const [usage, setUsage] = useState(() => storageUsageBytes());

  function handleExport() {
    const r = exportUserData(userName, userSlug);
    if (r.ok) setMsg({ ok: true, text: `${r.filename} gedownload — ${r.keyCount} onderdelen bewaard.` });
    else setMsg({ ok: false, text: `Export mislukt: ${r.error}` });
    setUsage(storageUsageBytes());
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Je gegevens</h2>
      <p className="text-xs text-gray-500 mb-3">
        Alles staat enkel op dit toestel. Maak geregeld een back-up: bij het wissen van
        je browsergegevens is de rest weg.
      </p>
      <button onClick={handleExport}
        className="w-full flex items-center justify-center gap-2 bg-[#2f8bff] hover:bg-[#1f77e8] active:scale-[0.99] text-white rounded-xl py-2.5 text-sm font-medium transition-transform">
        <Icon name="Download" size={16}/> Exporteer alles als bestand
      </button>
      {msg && (
        <p className={`text-xs mt-2 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>
          {msg.ok ? '✓ ' : ''}{msg.text}
        </p>
      )}
      <p className="text-[10px] text-gray-400 pt-2">
        Gebruikte opslag op dit toestel: {formatBytes(usage)}
      </p>
    </div>
  );
}
