# DEC-0248 – fair DMI-tid og kontrol af ærlig Limfjord-fastholdelse

**Dato:** 2026-09-23
**Status:** Lokal 4.0.478; livebevis afventer

Normalrun `35887652848` på `2bafe6c6` gemte cache og checkpoint,
byggede 210 zoner/673 kystdele og deployede datasæt
`rr-20260923170622-210` med reference 16:00 UTC. Terminalen var grøn,
men den samlede efterkontrol markerede præcis én af 54 kommandoer som
fejlet: den rumlige strømrevision afviste otte godkendte regionale
fastholdelser. Den integrerede model og den beskyttede tilstandsvalidator
accepterede dem med `WINDOW_HAS_MISSING_EVIDENCE`; revisionens hjælper
accepterede kun `WINDOW_INCOMPLETE` ved ikke-klar historik. En kildebundet
fastholdelse er ikke en ny vektor, og fuld historie er ikke bevist.

Revisionen bruger nu den integrerede models dokumenterede kombinationer:
`READY`/`READY_NATIVE_HOLD` ved klar historik og `WINDOW_INCOMPLETE`,
`WINDOW_HAS_MISSING_EVIDENCE` eller `WINDOW_HAS_TIME_GAP` ved ikke-klar
historik. Den historiske Candidate G-kontrol forbliver uændret. Eksakt
verificeret regional kilderække, nul rå strømvektor og højst tre timers
alder er stadig ufravigelige; `LATEST_SAMPLE_MISSING` og ukendte statusser
afvises. Måltesten prøver både gyldige og ugyldige tilstande.

Samme run planlagde alle 79.414 havstrømspar, men DMI havde kun 19.303
direkte par før Copernicus. To WAM-bølgefamilier brugte størstedelen af
det afgrænsede DMI-budget. `dkss_lf` nåede otte prognosetrin og
`dkss_idw` ét. Offentlige Dokkedal/Udbyhøj havde fortsat kun to
DMI-vandstandstimer ud af 118; referenceforskydningen gjorde ikke dette
til ny fremgang. Dette er en tidsfordelingsbarriere, ikke bevis for at
DMI mangler de senere værdier upstream.

Når en kritisk WAM- eller ikke-lead-DKSS-familie arbejder, reserveres
nu en proportional del af den resterende tid til **alle** ventende
kritiske WAM- og DKSS-familier. Eksisterende mindstereserver, leadets
en-asset-grænse, sidste checkpoint, officielle assets, DMI-first,
komponentadgang, afstande, geometri og datavalidering ændres ikke.
Ubrugt tid frigives videre. Dette skal forhindre en fuld WAM-passage i
at efterlade DMI-only-vandstand og havstrøm med kun ét sent forsøg.

Den samme kørsel viste en genbrugelig, men stadig `IN_PROGRESS`
Copernicus-stage og 5.531 uløste Open-Meteo-havstrømspar i 57
kystdele. De er separate restårsager og ikke lukket af tidsfordelingen.
Næste normale run må kun startes uden overlap på 4.0.478-main efter
grøn exact-head-kildekontrol. Det skal bevise cachelineage, faktisk
DMI-fremgang pr. familie og vejrtype, CP/OM-rest, offentlig visning,
efterkontrol og deploy. Ellers standses nye runs og den dokumenterede
årsag undersøges før næste ændring.
