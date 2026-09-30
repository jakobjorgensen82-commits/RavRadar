# DEC-0264 – Beskyttet DMI-værdi ved ubevist revision af samme modelkørsel

**Status:** Aktiv beslutning; lokalt implementeret i 4.0.517, produktionsbevis afventer.
**Dato:** 2026-09-30

## Bevis og afgrænsning

Kort normalrun `36667807638` på eksakt main 4.0.516 gendannede
`36659094103-1` og beskyttet produktion, gennemførte DMI,
Copernicus og Open-Meteo og stoppede i central cache før fuld
artifactgate, CAS, R2 og Pages. Den uændrede replayvalidator
afviste **to** DMI/DMI-bølgepar fra samme modelkørsel i isolation.
Begge havde forskellige fysiske værdier; det ene par havde
forskelligt antal native tidstrin, det andet forskellige native
tidspunkter. Ni andre mulige par med samme værdier blev ikke
afvist i isolation. Dette udpeger ikke første konflikt i fuld
replay, men beviser begge afviste klasser. Krypteret fremdrift
`36667807638-1` findes i Actions-cache. Offentlig 4.0.510 er
uændret. Der er **intet** bevis for fejl i DMI's rå data.

RavRadar kan danne en time ved interpolation mellem native DMI-
tidspunkter og senere danne den igen med et andet gyldigt sæt
tidspunkter fra samme modelkørsel. At de afledte værdier er
forskellige, beviser ikke en nyere officiel prognoserevision.
`assetIdentitySha256` identificerer den kanoniske URL, ikke
filbytes; råcachens `contentSha256` er separat. Lige URL-/item-
bevis må derfor heller ikke bruges som bevis for identiske bytes.

## Beslutning

1. Kun ved det eksakte par `deployed-private-runtime` og
   `progressive-private-dmi`, samme kystdel, UTC-time, komponent,
   modelkørsel, collection, gitter, lag og prøvepunkt, og efter
   selvstændig fuld DMI-proveniensvalidering af **begge** komplette
   komponenter, beholdes den beskyttede tidligere valgte komponent,
   hvis ingen nyere officiel revision kan bevises.
2. En bevist nyere officiel revision af samme modelkørsel eller
   en nyere gyldig modelkørsel kan stadig overtage. En ældre
   progressiv modelkørsel, et hul eller ugyldig komponent kan
   aldrig slette en gyldig gammel komponent. Strømmens U/V-par og
   bølgens højde/periode/retning/kildebevis forbliver atomiske.
3. Ikke-sammenlignelige steder, gitre, leverandører, ugyldige
   native beviser, andre kildepar og øvrige replaykonflikter
   forbliver synlige for den uændrede strenge replayvalidator.
   Denne regel er **ikke** en generel ignorering af fejl.
4. Log alene aggregerede antal tilbageholdte strøm- og bølgepar,
   opdelt i faste `SAME_VALUES`/`DIFFERENT_VALUES`-klasser.
   Ingen sted, time, måling, kilde-id eller privat payload må
   logges. Høj tilbageholdelse, især forskellige værdier, skal
   undersøges som driftssignal; den er ikke bevis for fuld dækning.
5. RavScore-formel, modelbundle, scorevægtning, DMI-first,
   Copernicus/Open-Meteo-prioritet, 96-timersundtagelse, central
   vandstandsinterpolation, Limfjord-regel, geometri og scheduler
   ændres ikke.

Dette præciserer DEC-0192's og DEC-0229's hidtidige hårde stop
**kun** for det validerede beskyttede DMI-par uden bevist nyere
revision. DEC-0262/DEC-0263's diagnostik og den generiske strenge
replayvalidator består. Tidligere formuleringer om, at *enhver*
samme-modelkørselsforskel skal stoppe, er supersederet inden for
denne snævre grænse.

## Kontrol og rest

Måltests skal bevise bevarelse ved native/interpoleret bølge,
to forskellige interpolationsbrackets, samme fysiske værdi med
anden proveniens og ubevist strømændring; officiel nyere bølge-
og strømrevision skal fortsat overtage. Ugyldigt native bevis og
ikke-sammenligneligt gitter må ikke undertrykkes. Den låste
modelbundle skal være byte-/hashuændret. Kræv grøn exact-head
source-CI, sikker merge uden aktiv vejrkørsel og højst én kort
normal bekræftelse fra eksakt `36667807638-1`. Først efter fuld
artifactgate, CAS, R2, Pages, offentlig prognose og femfelts-
no-loss kan produktionseffekt påstås. Ekstern cron forbliver
pauset indtil flere sikre normale resultater er målt.
