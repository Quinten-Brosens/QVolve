// ─── modules/gegevens — back-up en opslagbewaking ────────────────────────────
//
// Zolang alles in localStorage staat is dit het veiligheidsnet: één knop die
// alles wat van jou is als bestand meegeeft. Later (fase 4, AVG) komt hier ook
// de verwijderknop bij.

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
