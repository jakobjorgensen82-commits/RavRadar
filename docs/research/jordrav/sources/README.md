# Afgrænsede offentlige WFS-kilder til Stenstrup

De to `.source.gz`-filer indeholder uændrede råsvar fra ministeriets offentlige WFS, hentet 2026-10-04. Gzip er kun tabsfri arkivering. Bindingerne beskriver URL, BBOX, selekterede felter, CRS, charset, antal, rå SHA-256 og SHA-256 efter ren UTF-8-transkodning. JSON normaliseres ikke til en ny nøgleorden.

Marksvaret har kun `Afgkode`, `Afgroede` og geometri samt WFS' tekniske feature-ID. JB-svaret har kun `JB_kode`, `Jordtype` og geometri samt teknisk ID. Ejer-, CVR-, journal-, marknummer- og markblokfelter blev ikke anmodet. Det afledte figurgrundlag har kun type/kategori og opløst geometri.

GetFeature-svarenes `numberMatched`, `numberReturned` og faktisk featureantal er ens: 641 markposter og 8.284 JB-poster. BBOX er EPSG:25832 `[592394.37, 6107368.56, 599709.58, 6112597.8]`; den er kun en hentebegrænsning. Analysearealet klippes til GEUS Issøflade 10265. Ingen hel national markdatabase er hentet.

En senere forespørgsel kan give ændrede data eller svartidsbytes; den skal behandles som en ny kildeidentitet. De arkiverede svar gør netop denne mark/JB-analyse gentagelig. GEUS' større originalfiler og verified native-cache er fortsat eksterne, SHA-bundne forudsætninger beskrevet i de eksisterende forskningsaudits.

Administrative JB-klasser må ikke omdøbes til sikre pløjelagsprøver. Modelleret eller registreret jordbund og årlig afgrøde fastlægger ikke rav, nuværende pløjning eller lagtilgængelighed. Metode, konkrete kildegrænseoverlap og primærlitteratur: [markkontekstanalysen](../../JORDRAV_MARKKONTEKST_STENSTRUP_2026-10-04.md).
