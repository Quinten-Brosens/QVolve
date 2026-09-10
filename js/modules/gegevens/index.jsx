// ─── modules/gegevens — back-up en opslagbewaking ────────────────────────────
//
// Zolang alles in localStorage staat is dit het veiligheidsnet: één knop die
// alles wat van jou is als bestand meegeeft. Later (fase 4, AVG) komt hier ook
// de verwijderknop bij.

// Vertaalt het resultaat van exportUserData naar een Nederlandstalige melding.
// Gedeeld door de banner en de exportkaart, zodat een mislukte export nooit
// stil blijft — vooral in de banner niet: die verschijnt net op het moment
// dat de app zelf zegt dat er data verloren gaat.
function describeExportResult(r) {
  return r.ok
    ? { ok: true, text: `${r.filename} gedownload — ${r.keyCount} onderdelen bewaard.` }
    : { ok: false, text: `Export mislukt: ${r.error}` };
}

// De banner verschijnt zodra één schrijfactie op een vol quotum stuit. Dat is
// het moment waarop de app stil begon te liegen: het scherm toont de maaltijd,
// de opslag heeft ze niet. Daarom staat de exportknop meteen in de melding.
function StorageWarningBanner({ userName, userSlug }) {
  const [fout, setFout] = useState(null);
  const [exportFout, setExportFout] = useState(null);

  useEffect(() => {
    // onStorageError geeft de opzegfunctie terug; die is meteen de cleanup.
    return onStorageError(setFout);
  }, []);

  if (!fout) return null;

  function handleExport() {
    const r = exportUserData(userName, userSlug);
    const uitkomst = describeExportResult(r);
    if (r.ok) { setFout(null); setExportFout(null); }
    else setExportFout(uitkomst.text);
  }

  return (
    <div className="rounded-[22px] bg-[#182a48] px-[22px] py-5">
      <div className="flex items-start gap-3">
        <span className="text-[#f97316] shrink-0 mt-0.5"><Icon name="AlertTriangle" size={18}/></span>
        <div className="flex-1 min-w-0">
          <p className="m-0 font-logo font-bold text-[20px] leading-tight text-white">
            Opslag vol — je laatste wijziging is niet bewaard
          </p>
          <p className="mt-2 mb-0 text-[13px] leading-relaxed text-white/75" style={{ textWrap: 'pretty' }}>
            Dit toestel heeft geen ruimte meer voor Qvolve. Exporteer nu je gegevens als
            back-up en maak daarna ruimte vrij (de foto's bij je maaltijden nemen daarvan
            verreweg het meeste in), anders gaat verloren wat je hierna logt.
          </p>
          {exportFout && <p className="mt-2 mb-0 text-[13px] font-semibold text-[#f97316]">{exportFout}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={handleExport}
              className="flex items-center gap-2 bg-white text-[#14223c] rounded-[14px] px-4 py-2.5 text-[13px] font-semibold active:scale-95 transition-transform">
              <Icon name="Download" size={14}/> Exporteer nu
            </button>
            <button onClick={() => setFout(null)}
              className="rounded-[14px] px-4 py-2.5 text-[13px] font-semibold text-white/70 border border-white/25 active:scale-95 transition-transform">
              Sluiten
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Exportkaart — staat op het profieltabblad, onder de instellingen.
function DataExportCard({ userName, userSlug }) {
  const [msg, setMsg] = useState(null);      // { ok: boolean, text: string }
  const [usage, setUsage] = useState(() => storageUsageBytes());

  useEffect(() => {
    // Ververs het cijfer ook bij een opslagmelding: exporteren zelf is
    // read-only en verandert het gebruik dus nooit.
    return onStorageError(() => setUsage(storageUsageBytes()));
  }, []);

  function handleExport() {
    const r = exportUserData(userName, userSlug);
    setMsg(describeExportResult(r));
    setUsage(storageUsageBytes());
  }

  return (
    <div className="bg-white border border-[#dfe3ea] rounded-[18px] px-[18px] py-4">
      <Eyebrow>Je gegevens</Eyebrow>
      <p className="mt-2 mb-3 text-[13px] leading-relaxed text-[#4a5568]" style={{ textWrap: 'pretty' }}>
        Alles staat enkel op dit toestel. Maak geregeld een back-up: bij het wissen van
        je browsergegevens is de rest weg.
      </p>
      <button onClick={handleExport}
        className="w-full h-12 rounded-[18px] bg-[#2f8bff] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[.98] transition-transform">
        <Icon name="Download" size={16}/> Exporteer alles als bestand
      </button>
      {msg && (
        <p className="mt-2 mb-0 text-[13px] font-medium" style={{ color: msg.ok ? QV.blueDeep : QV.orangeInk }}>
          {msg.text}
        </p>
      )}
      <p className="mt-2 mb-0 text-[11px] text-[#8494aa]">
        Gebruikte opslag op dit toestel: {formatBytes(usage)}
      </p>
    </div>
  );
}
