# DEC-0194 – Last-mile-historikken lukkes korrekt, og normal reseal følger deployet

**Status:** Aktiv og bindende; implementeret lokalt i 4.0.411, livebevis afventer  
**Dato:** 2026-09-18

## Evidens

4.0.410 blev leveret gennem exact-head `35330643842`, PR #354, main
`ca2735af81137785ca6fd8a6432a578f1ae55e5b` og providerfri code-only
`35331109332`.

Den almindelige kørsel `35331664087` gennemførte DMI, Copernicus,
Open-Meteo, closure, syvdøgnshistorik, alle provider-cachewrites, offentlig
runtime, de øvrige driftskontroller, Pages-deploy og offentlig 210/673-
verifikation. Dermed er DEC-0193 livebevist: runtimeauditten var rød, men den
gyldige pakke kom online.

Den uploadede payloadfrie audit afgrænsede fejlen til 673 ens
`LAST_MILE_HISTORY_POINT`. Ingen state kunne genlæses. Ved den aktuelle time
var 48 zone/mode-kombinationer historikufuldstændige og 372 utilgængelige.
Browseren viste 4.0.410 i begrænset nødvisning, senest verificerede scorer fra
18. september kl. 11.00, gentagne historikintervaller og i en kontrolleret
zone kun tre timers verificeret historik uden lokal femdøgnsprognose.

Pages-deploy og offentlig verifikation bestod. Jobbet blev først rødt i den
efterfølgende centrale reseal med teksten om manglende bestået offentlig
audit. Dermed var der to forskellige fejl: stateårsagen gjorde scorerne
ufuldstændige, og den for snævre reseal gjorde et allerede vellykket deploy
rødt.

## Rodårsag

Efter last-mile-historiens konservative 40-timers reset fortsætter den
fysiske punkt-tilstand med at udvikle sig, mens scoreintervallet bevidst er
kollapset til den forsigtige nedre bane. Når et senere hul åbner usikkerheden
igen, blev resetmarkøren korrekt fjernet, men intervallet blev ikke udvidet
til også at rumme den fortsat gyldige punkt-tilstand. Producenten kunne derfor
gemme en intern modstridende tilstand, som næste kørsel korrekt afviste.

## Beslutning

1. Når last-mile-usikkerheden er åben, skal intervallet altid rumme den
   allerede validerede punkt-tilstand.
2. Udvidelsen må kun ske for et åbent usikkerhedsinterval. Eksakt historik,
   forkerte markører, ugyldige momenter, forkert tid og forkert modelbinding
   skal fortsat afvises.
3. Allerede gemte schema-6-tilstande med præcis punkt-mod-åbent-interval-
   fejlen repareres deterministisk ved læsning ved alene at udvide intervallet.
   Punktet ændres ikke, og der opfindes ingen vejrdata.
4. En almindelig integreret reseal må efter bestået Pages-verifikation
   acceptere en afgrænset payloadfri audit med diagnostiske fund. Auditens
   fejlkoder skal være unikke, sikre og have positive tællinger; binding,
   210/673, historikregnskab, rollbackstatus og privacy skal fortsat bestå.
5. En reseal med diagnostiske fund sætter altid
   `calibrationEligible=false`.
6. Første cutover, retur og skift mellem forskellige modelbindinger bevarer
   deres strengere auditkrav. En normal reseal må ikke skifte modelidentitet.
7. Formel, vægte, kildeprioritet, geometri og land-/vandpunkter ændres ikke.
   Kodeidentiteten ændres og bindes derfor gennem en ny append-only migration.

## Binding og verifikation

- Integrated modelcontract: `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`.
- Integrated bundle: `039abdfe0cede8dec764bbab904096854d0757a2c5f430b296f75baf1a686d3c`.
- Candidate G rollbackbundle: `d3ad4e8537c23865398acdb4674d141b8d94636aad0e8ddc22c5936a29cfd859`.
- Continuation closure: `c294198dd7e87fb09989555f36f9e2e168d7eb5fb248584137a370ec7b41a08a`.
- Append-only migration:
  `20260918125600_last_mile_history_envelope_binding.sql`.

Efter exact-head og merge køres én almindelig weather på de gemte cacher.
Den skal gennemføre den historiske bindingsovergang, vise den aktuelle time,
genopbygge lokale femdøgnsprognoser og bevise, at state kan genlæses.
Scheduler forbliver pauset indtil dette og en efterfølgende normal
cachevedligeholdelse er verificeret. Ingen oneoff.

## Tillæg 26. oktober 2026 — eksakt manifestventen før én fuld pakkekontrol

Den normale Pages-verifikation skal kunne afvente platformens dokumenterede publiceringsvindue på op til ti minutter. En faktisk offentlig aflæsning viste også max-age=600. Dette er begrundelse for en robust ventemekanisme, ikke bevis for den præcise historiske fejlårsag: den oprindelige HTTP-respons ved afvisningen blev ikke bevaret.

Kun manifestet genprøves, som standard højst 121 gange med fem sekunders mellemrum. Forsøgsantal skal være et sikkert heltal fra 1 til 121; intervallet et sikkert heltal fra 0 til 5000 millisekunder. Hele det kanoniske manifest skal matche den forseglede pakke. Dataset-ID alene er aldrig tilstrækkeligt.

Efter match gennemføres alle hidtidige digest-, envelope-, 210/673-, delivery- og browserkontroller én gang, uden en ydre fuldpakke-genprøvning. En afvigelse i en anden fil stopper straks. Gamle originaler, dataværdier, modelbindinger, SQL, kildeprioritet og geometri ændres ikke.

Den konkrete normale reproduktion er rød før og grøn efter rettelsen; hele den eksisterende normale Pages-målprøve består lokalt. Præcis kilde-CI og sikker levering af rettelsen er fortsat åbne. En senere normal offentlig fuldkontrol af det tidligere target er et selvstændigt læsebevis: den gør ikke den oprindelige røde GitHub-kørsel grøn og fuldfører ikke den udeblevne centrale ordinary-reseal. DEC-0197s særskilte afbrydelsesvindue må ikke erklæres lukket af denne rettelse. Kørselsidentiteter og detaljeret HTTP-evidens føres i privat checkpoint.

### Tillæg 26. oktober — afgrænsede midlertidige HTTP-afvisninger

Et providerfrit rettelsesdeploy har faktisk genbrugt den aktuelle prognose og bestået den installerede tomme databaseplan, autentificeret current-runtime samt B-før-S-gemning. Pages kvitterede for publicering, men den afsluttende offentlige kontrol fik HTTP 503 på én prognosefil. En senere afgrænset læsning af samme fil gav HTTP 200 og præcis fuld kontrolsum. Det er ikke bevis for en fejl i vejrhentningen, datatab eller den konkrete årsag hos leveringsplatformen; den oprindelige røde slutstatus bevares.

Den lokale rettelse genprøver kun det samme afviste HTTP-kald ved 502, 503 eller 504. Én samlet kontrol deler højst tre ekstra forsøg, højst tre forsøg i alt pr. fil og fem sekunders standardpause. Afviste svar lukkes før gentagelse. Godkendte filer og hele pakkegennemgangen startes ikke forfra. Kun et gyldigt, men endnu ikke matchende manifest kan bruge den særskilte 121-observationsventen. Forkert kontrolsum, JSON, model, adgang, 404, afbrydelse eller ukendt fejl giver ingen ny adgang.

Der bruges samme URL, observationsnonce og kaldsindstillinger. Forsøgsloftet ejes af én samlet verifikation og nulstilles ikke ved en ny manifestobservation. Et fejlet svar lukkes før ny brug; ukendt eller afbrudt lukning stopper. Den oprindelige årsag genkastes, og indholdskontrollerne gennemføres uændret efter et gyldigt HTTP-svar. Der indføres ingen ydre pakkegenprøvning eller adgang til at genbruge et afvist indhold.

Hele den eksisterende normale Pages-målprøve består én gang med de additive tilfælde for forbigående og vedvarende serverfejl, fælles forsøgsloft, uændrede gode filkald, defekt svar efter genforsøg og afbrudt svarlukning. Det er lokal kilde, ikke ny præcis CI eller verificeret offentlig afslutning. Version, C/I/T, SQL, vejr, scorer, kilder og geometri er uændrede; SOURCE og øvrige tilbageholdte aktiveringer forbliver særskilte. Se DEC-0194 og håndbog 89.270. Detaljerede kørsler og beviser står privat.
