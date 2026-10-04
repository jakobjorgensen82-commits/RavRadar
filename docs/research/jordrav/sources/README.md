# Afgrænsede offentlige mark-/jordbunds- og vej-/kystkilder

## Landsdækkende valgbare WMS-markomrids – 2026-10-05

`fields-wms-2026-capabilities.xml.gz` er det tabsfrit arkiverede offentlige
GetCapabilities-råsvar fra SGAV. `fields-wms-2026-metadata.json` binder
URL, rå/gzip-SHA256, byteantal, `Marker:Marker_2026`, formats og CRS.
Dette er servicemetadata, ingen national feature- eller ejerdatabase.
Kortet bruger valgbare GetMap-rasteromrids fra lokal zoom 12, uden fyld,
tekst eller GetFeatureInfo. Omrids dokumenterer ikke dagens pløjning,
bar jord, vegetation, ravtilførsel eller lagadgang. Serviceindhold kan
ændres; den lokale konfiguration skifter ikke år automatisk.

## Asaa–Voerså og fem marine sammenligninger

`asaa-fields2026.source.gz` og de fem `marine-*-fields2026.source.gz`
indeholder uændrede minimale offentlige Marker 2026-råsvar fra 2026-10-04.
Kun geometri, `Afgkode` og `Afgroede` samt teknisk feature-ID indgår.
Samtlige bindinger angiver URL, EPSG:25832-BBOX, ISO-8859-1, rå bytes/SHA,
ren UTF-8-transkodnings-SHA og ens matched/returned/faktisk antal:

| Hentning | Komplette poster |
|---|---:|
| Asaa–Voerså | 399 |
| Hals–Hou | 2.295 |
| Jerup–Ålbæk | 919 |
| Lammefjord | 2.207 |
| Rødbyfjord | 1.521 |
| Hjardemål | 1.281 |

Antal hentede poster er ikke antal positive klip eller antal marker.
Fem sammenligningsrammer er eksplicitte analysevalg, ikke fundgrænser.
Gzip er tabsfri arkivering; sources har ingen ejer-/CVR-/marknummerfelter.
Metode og regionale/native tal:
[sammenligningsanalysen](../../JORDRAV_TIDLIGERE_KYSTMARKER_DANMARK_2026-10-04.md).

`asaa-route-coast.json.gz` er en **afledt minimal projektion** af et
offentligt OSM-kortsvar, ikke et uændret råsvar. Den bevarer vej-/kyst-
geometri, navne/ref/highway/natural for 31 valgte ways samt to bypunkter.
URL, udvalgte ID'er og projektionens SHA står i Asaa-auditten.
© OpenStreetMap contributors, ODbL 1.0. Sæbyvej/Østkystvejen, route 541,
bruges til det eksplicit valgte vej-/strandudsnit; et præcist fundbælte
kan ikke udledes af ejerens beskrivelse. Ingen private stedpunkter er hentet.

## Stenstrup

De to `.source.gz`-filer indeholder uændrede råsvar fra ministeriets offentlige WFS, hentet 2026-10-04. Gzip er kun tabsfri arkivering. Bindingerne beskriver URL, BBOX, selekterede felter, CRS, charset, antal, rå SHA-256 og SHA-256 efter ren UTF-8-transkodning. JSON normaliseres ikke til en ny nøgleorden.

Marksvaret har kun `Afgkode`, `Afgroede` og geometri samt WFS' tekniske feature-ID. JB-svaret har kun `JB_kode`, `Jordtype` og geometri samt teknisk ID. Ejer-, CVR-, journal-, marknummer- og markblokfelter blev ikke anmodet. Det afledte figurgrundlag har kun type/kategori og opløst geometri.

GetFeature-svarenes `numberMatched`, `numberReturned` og faktisk featureantal er ens: 641 markposter og 8.284 JB-poster. BBOX er EPSG:25832 `[592394.37, 6107368.56, 599709.58, 6112597.8]`; den er kun en hentebegrænsning. Analysearealet klippes til GEUS Issøflade 10265. Ingen hel national markdatabase er hentet.

En senere forespørgsel kan give ændrede data eller svartidsbytes; den skal behandles som en ny kildeidentitet. De arkiverede svar gør netop denne mark/JB-analyse gentagelig. GEUS' større originalfiler og verified native-cache er fortsat eksterne, SHA-bundne forudsætninger beskrevet i de eksisterende forskningsaudits.

Administrative JB-klasser må ikke omdøbes til sikre pløjelagsprøver. Modelleret eller registreret jordbund og årlig afgrøde fastlægger ikke rav, nuværende pløjning eller lagtilgængelighed. Metode, konkrete kildegrænseoverlap og primærlitteratur: [markkontekstanalysen](../../JORDRAV_MARKKONTEKST_STENSTRUP_2026-10-04.md).
