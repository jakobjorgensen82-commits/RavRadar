# Gemte vejrpakker – helhedsbillede og næste bevis

Dato: 2026-09-30. Kildestatus: main 4.0.518, offentlig 4.0.510,
tilbageholdt funktionel PR #487, isoleret læsekandidat 4.0.520.
Alle tal nedenfor er tidligere målte eller eksplicit syntetiske,
ikke resultat fra den endnu ukørte produktionsaudit.

## Hvad seneste offentlige pakke faktisk viste

Target 29/9 16 UTC; 673 kystdele × 118 timer = 79.414 par pr. familie.

| Vejrfamilie | Gyldige par | Nævner | Mangler |
| --- | ---: | ---: | ---: |
| Vind | 73.566 | 79.414 | 5.848 |
| Bølger | 79.414 | 79.414 | 0 |
| Havstrøm | 77.133 | 79.414 | 2.281 |
| Vandstand | 69.969 | 79.414 | 9.445 |
| Vandtemperatur | 69.925 | 79.414 | 9.489 |
| Alle fem | 370.007 | 397.070 | 27.063 |

På samme fælles 110 timer steg den målte dækning fra 350.866 til
357.392 af 370.150 (+6.526), uden faktisk tab i den sammenligning.
Skiftende prognosevinduer må ikke sammenlignes som samme målegrundlag.
B05-21/23/24 havde 96/96/116 scoretimer og var ikke længere helt tomme.
Baltic dækkede 2.172/2.596 havstrømspar i deres 22 kystdele; 424 manglede.
Det er ikke tal for alle fem vejrfamilier.

Fire tidligere vellykkede normale runs fortsatte alle 673 tilstande
uden cold/reset. Ved H0 havde 621/673 fulde 48 timers strømhistorik,
mens bølgehistorikken stadig var ufuldstændig i alle 673. 48 timers
havstrøm er ikke den længere 288-timers bølgehistorik. Historik kan
derfor opbygges, selv om UI fortsat viser reel historisk usikkerhed.

## Systemfejl og hypoteser skal holdes adskilt

- Tre logspor beviser 256-MiB-afvisning inde i en transport, der tillader
  768 MiB pr. DMI-forecastfil. Forkert intern læsegrænse kan både tabe
  genbrug og skjule, at tidligere hentearbejde ikke bidrager. Retningen
  er lokal i PR #487, ikke aktiveret af denne analyselevering.
- Reproducerede syntetiske tests viser uenighed mellem offentlig
  reservefletning og historisk replay. Direkte DMI, godkendt regional
  reserve og CP/OM må ikke få forskellige prioriteringsregler på vej
  gennem kæden. Fremtidig reserve-modeltid må ikke vinde ved låst
  produktionstid. Begge sider skal stadig selvstændigt være gyldige.
- En bølgerække kan være numerisk udfyldt, men miste retning senere,
  hvis retningen ikke har sit eget kildebevis. En OM-post kan efter
  kanonisk afrunding være ubrugelig og alligevel blokere ny hentning.
  Disse lokale tests er ikke optælling af faktiske produktionstilfælde.
- En anden mistanke blev afkræftet: brug af kun aktiv DMI-kontekst i
  scalar-planlægningen ændrede ikke dens fire familiers behov i den
  målrettede prøve. Der foretages ingen ekstra plannerændring på gæt.
- Bevarelse af en afledt DMI-værdi er ikke nok, hvis dens originale
  modelendpoints senere mangler i artifactkontrollen. Det er endnu
  ukendt, hvor ofte det sker i de gemte pakker. Dette er næste
  konkrete måling; endpointværdier må aldrig fremstilles fra resultatet.

## Alle hjørner: åbent arbejde og sikre næste skridt

| Område | Evidens/risiko | Næste kontrol |
| --- | --- | --- |
| Originale beviser | Kontekst og native endpoints er forskellige | Mål dem særskilt i gemte baseline-/progressdonorer |
| Langtidshistorik | Prognoseprøve er højst 121 timer, ikke 288 timer | Separat fuldt replay og persistens over generationer |
| Kapacitet | Perfil, pack, cipher, envelope, V8 og RAM har forskellige lofter | Mål faktiske bytes og RSS; plads på R2 er utilstrækkeligt bevis |
| DMI-rotation | Filrestore og native bulk-rotation er to forskellige spor | Sammenhold cursor/model/native timer med næste verificerede run |
| Vindhale | Lokale sentidsrester; DMI og OM skal vurderes særskilt | Mål gyldigt originalt forecastinput og tidshorisont |
| CP bølger/temperatur | Nul nye scalarbidrag i fire runs, ikke nul CP-havstrøm | Felt-/mask-/dybde-/timeoutårsager før ændret tid eller geografi |
| Limfjordsvandstand | Syv zoner havde kortere horisont; delvis LF-rotation | Følg faktisk centralt valgte kilder uden hardcodet ændring |
| Gemning/genoptagelse | Generisk færdigpakke-genoptagelse før CAS mangler; kort retention | Hold dette åbent, bevar allerede sikrede krypterede artifacts |
| R2-kvoter | Cleanup kan fejle, gamle glemte objekter er særskilt risiko | Mål faktisk konto/objektforbrug; ingen blind sletning |
| Scheduler | Cron pauset; tidligere forsøg/queued tidsstempler kan have særregler | Verificér slot/attempt/overlap før senere genåbning |
| Offentlig visning | Grøn source-CI eller audit publicerer ikke en prognose | Endelig artifactgate/CAS/R2/Pages og synlig datakontrol |

Copernicus' vindprodukter er ikke automatisk en brugbar vindprognose
til denne pipeline. Open-Meteo har allerede et vindspor. MET Norway
kan være en mulig nødkilde, men især den sene grove tidsopløsning,
kildebevis, cache, afledning og geografi kræver særskilt godkendt
kontrakt. Det aktiveres ikke i denne audit. Hverken AMM15-grænsen,
dybeste gyldige fælles U/V-lag eller DMI-vandstandsvalg ændres på gæt.
Forskningen fra den funktionelle analyse skal verificeres mod faktiske
behov, før en ny leverandør eller interpolation aktiveres.

## Auditens egne fejlruter

En tæt syntetisk kontrol af 673 × 121 = 81.433 DMI-valg tog 25,1
sekunder og nåede 136,5 MB peak RSS i den isolerede test. To snapshots
gange fem donorpassager svarer groft til 251 sekunders CPU, før
dekryptering, læsning og inflation. Derfor kan en femminutters grænse
for hele klientens levetid fejlagtigt stoppe sidste pointerkontrol.
Læseklienten skal afgrænse den aktive HTTP-/body-tid, mens jobbets
egen 30-minuttersgrænse fortsat begrænser samlet offlinearbejde.
Dette er ikke et forslag om flere minutter til vejrhentning.

Native-prototypen har 15 normale syntetiske tests og en opt-in tæt
benchmark. Den er ikke koblet til produktionsgemning. En konservativ
afvisning af forskellige originale værdier med samme immutable
native-identitet kan undervurdere bevisadgang ved en revideret fil;
den må ikke omtales som bevis for tabte vejrværdier. Auditresultatet
angiver derfor eksplicit sine begrænsninger.

## Leveringsrækkefølge

1. Isolér og kildevalidér den rent læsende 4.0.520; normal save/restore
   og øvrig produktion forbliver uændret.
2. Læs præcis eksisterende baseline og krypteret `36698472505-1` med
   original producentbinding. Udgiv kun den faste sikre talrapport.
3. Brug det faktiske resultat til at færdiggøre den samlede rettelse,
   kapacitetskontrollen og generationsbevarelsen. PR #487 rebases og
   får ny versions-/exact-head-kontrol; gammel grøn CI genbruges ikke.
4. Først derefter planlægges nødvendigt produktionsbevis fra seneste
   gyldige fremdrift. Ingen ny blind hentning, cron eller fuld-cachepåstand.
