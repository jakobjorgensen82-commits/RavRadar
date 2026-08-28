# DEC-0092 – Kompakt offentlig startpakke og behovsstyrede detaljer

## Status

Produktionsverificeret i 4.0.295 gennem PR #198/exact-head `33153155088`, merge `6c0602d7`, produktion `33153271907`, build `98790063641` og Pages `98794513908`. Offentlig funktionskontrol og varm start er grønne. En resterende stor READY-startprojektion lukkes særskilt i 4.0.296 under DEC-0093.

## Problem

Den offentlige HTML- og kortskal var hurtig, men normal opstart hentede derefter en komplet detaljepakke på cirka 90–132 MB ukomprimeret og gentog hentningen ved ny sideindlæsning. Browseren gennemløb samtidig alle 210 zoner og 673 kystdele for at beregne fem nationale top-5-lister. Observerede kontroller viste 25–29 sekunder til femdøgnsvisningen på eksisterende deploy og op til cirka 59 sekunder umiddelbart efter et nyt Pages-deploy. Cloudflare-assistenten var ikke i denne opstartskæde.

## Beslutning

1. Produktionsbygningen afleder et lille `nationalForecast`-indeks for fem dage og begge søgemåder fra den samme fulde Candidate G-runtime.
2. Indekset bruger den eksisterende `selectLocalBestForDay`, nationale breddekorrektion og sortering. Det indeholder kun zone-id, tidspunkt og score-/rangeringsværdier; ingen koordinater, rå U/V, forklaringer eller komponentdetaljer.
3. Kort, aktuelle **Bedste områder** og **5-dages RavRadar** tegnes fra startpakken. Den fulde detaljepakke hentes først ved områdevalg, konto, tur, assistentspørgsmål eller dybt kortzoom.
4. Manifestet forbliver `no-store`. Livefiler uden både dataset-id og gyldig SHA forbliver også `no-store`. Kun en eksakt dataset- og SHA-adresseret offentlig prognosefil må bruge browserens HTTP-cache.
5. Startup- og detaljepakken bevarer eksisterende dataset-, tids- og hashbindinger. En Candidate G-nødvisning opgraderes deterministisk med det kompakte indeks fra sit allerede auditerede offentlige datasæt; detaljefilen og dens hash ændres ikke.
6. Sidecache-recovery kræver kun detaljepakken, hvis brugeren faktisk havde anmodet om en detaljekrævende funktion. En ren kernevisning må ikke genindlæses, fordi en bevidst uanmodet detaljefil mangler.

## Sikkerheds- og datagrænser

- Candidate G, RavScore, vejr, prognoseinput, national sortering og synlige scoreværdier ændres ikke.
- Den fulde detaljepakke bevares og er fortsat integritetsbundet; den flyttes kun ud af normal opstart.
- Geometri, zoner, land-/vandpunkter og privat adminstate cachestyrkes ikke og ændres ikke af beslutningen.
- Konto-/turdata og assistentdata ændres ikke. Assistenten forbliver read-only og er fortsat isoleret fra kortets opstart.
- En ny Sibirien-punktrevision forbliver en privat staged kandidat. Ingen koordinater læses eller publiceres, og READY kan ikke aktivere kandidaten uden et senere særskilt ejer-go.

## Verifikation

Den målrettede 4.0.295-regression sammenligner det kompakte indeks med den tidligere fulde Candidate G-beregning for begge søgemåder og fem dage og låser lazy-load-, SHA-cache-, dybzoom- og sidecachekontrakterne. Eksisterende progressive runtime-, fallback-, mobilresume-, opstarts-, ikke-blokerende prognose-, nationale rangerings-, sitefunktions- og Pages-modultests samt fuld sourcegate/releasegate er grønne på exact head. Offentlig 4.0.295 viste korrekt version, farvet kort, fem aktuelle områder, fem færdige prognosedage og cirka 3,67 sekunders varm start. Cold-målingen af READY-nødvisning viste 3.562.253 byte/23,36 sekunder og førte til den supplerende minimale startprojektion i DEC-0093.
