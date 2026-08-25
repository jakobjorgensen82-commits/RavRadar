# RavRadar – gældende systemspecifikation

Denne specifikation beskriver den aktive 4.0.278-arkitektur og den score-neutrale 4.0.279-kandidat. RDKS er fortsat bindende ved konflikt. Releaseversionens topfelt synkroniseres automatisk i de to beskyttede geodatafiler under en stående ejergodkendelse, men kun når særskilt diffkontrol beviser, at intet andet geodata ændres.

## Offentlig projektinformation

- Forsidens topmenu linker til `about.html` ved konto, tur og Rav-assistent.
- Siden forklarer ejer, formål, fravær af fundgaranti, forskellen mellem RavScore og landsdelens grundpotentiale samt nødvendige modelkompromiser.
- Kontakt bruger et `mailto`-link. Frivillig støtte bruger MobilePay Box `4214MX` med synligt link og lokalt genereret QR-kode. Der indsamles ingen nye brugerdata.
- Ejerbilleder leveres som responsive WebP-varianter. Siden har pc- og mobillayout og er en del af service-workerens versionsstyrede appskal.
- Informationssiden påvirker ikke Candidate G, score, runtime-data, geografi eller administration. Se DEC-0076.

## Offentlig scoremotor

RavRadar anvender kun Candidate G som offentlig scoreprofil:

- søgeforhold: 20 %;
- transport mod kysten: 50 %;
- rav i bevægelse: 30 %.

Den gamle 25/40/35-profil er ikke en offentlig fallback. `legacyPublicFallbackAllowed` er `false`, og der findes ingen rollbackprofil i den offentlige profilvælger.

Candidate G beregnes i `js/core/ravscore-candidate-g.js`. Tilstandshistorikken og dens videreførelse ligger i `js/core/ravscore-candidate-g-state-pipeline.js`. Profilkontrakten ligger i `js/core/ravscore-profile-switch.js`.

## Fysiske hoveddele

### Søgeforhold

Vurderer hvor let det er at lede på den valgte måde. Strandjagt kan bevare en høj samlet score ved kraftig vind, når transport og mobilisering er gode. Ved wadersjagt reduceres scoren trinvist over 6 m/s, fordi vindskabte krusninger gør det sværere at se gennem vandet; 15 m/s giver 0 i waders-søgeforhold.

### Transport mod kysten

Den bundnære strøm vurderes mod den lokale kystretning. Pålandskomponenten og varigheden af det sammenhængende forløb er centrale. Kraftig fralandsstrøm reducerer transporten glidende fra første time; efter 13 sammenhængende timer går transporten i 0. Når transport er 0, er den samlede RavScore 0, selv om der fortsat kan være mobilisering og gode søgeforhold.

### Rav i bevægelse

Vurderer om bølgeenergi kan have løsnet eller genmobiliseret tilgængeligt rav. Virkningen huskes og aftager over tid. Bølger er ikke hovedtransportøren mod kysten; strømmen står for transporten, mens bølger især kan mobilisere og hjælpe materiale over lokale barrierer eller op på stranden.

## Data og lokal geografi

- Hver aktiv kyststrækning har et havpunkt og et landpunkt, der fastlægger den lokale retning mod land.
- Aktuelle strømdata rekonstrueres eller interpoleres ikke.
- DMI-strøm accepteres inden for den normale lokale afstandskontrakt.
- Copernicus Baltic/AMM15 kan anvendes inden for den dokumenterede afstandskontrakt.
- Kun de otte godkendte `dkss_lf`-proxyer må bruge den særskilte 15 km-kontrakt. Proxyen skal have samme eksakte tidspunkt; en allerede dokumenteret afledt tilstand må højst holdes tre timer og må ikke opfinde strømstyrke, retning eller pil.
- Manglende nødvendig lokal strømtilstand lukker den berørte kyststrækning eller zone fail-closed. Andre zoner fortsætter med Candidate G.
- Uændrede punktmål bevarer deres historik på tværs af produktionskørsler. Flyttes et hav- eller landpunkt, nulstilles kun historikken for det ændrede punktmål.

## Produktionskæde

1. Centralt gemt administratorgeometri og routing hydreres.
2. Seneste verificerede Candidate G-tilstand hentes.
3. Friske vejr- og havdata indlæses med provenance og tidskontrol.
4. Score og forklaringer beregnes for kyststrækninger og zoner.
5. Kildevalidering, fuld produktionsvalidering og releasegate skal bestå.
6. Det offentlige artifact deployes og verificeres på den mergede commit.

## Administratorfunktioner

Adminfladen kan blandt andet kontrollere datakvalitet, vandstandsstationer, zoner, kystlinjer, hav-/landretning, observationer, læringsdækning, eksperter, håndbog og systemstatus.

Det tidligere Regelværksted er pensioneret. Centralt gemte regeludkast slettes ikke, men indlæses ikke som aktive adminfunktioner, publiceres ikke og påvirker ikke RavScore. Ekspertviden indsendes via håndbogens review og kan kun ændre scoren gennem kode, RDKS, tests, pull request og deployment.

## Brugerdata og læring

Brugere kan gemme ture og fund i Supabase. Turens relevante vejrsnapshot gemmes sammen med indberetningen til senere, pseudonymiseret analyse. Den præcise GPS-rute gemmes ikke.

Læringsmodulet måler aktuelt kun datadækning. Det ændrer ikke automatisk vægte, regler, zoner eller score. En fremtidig kalibrering kræver dokumenteret søgeindsats, uforanderligt forecastlink, tidsmæssig test, geografisk hold-out og en særskilt RDKS-godkendelse.

## Sandhedskilder

Ved konflikt gælder: ejerens aktuelle instruktion, derefter aktiv RDKS-beslutning, verificeret kodeadfærd, håndbog og changelog. Administratorens centralt gemte redigerbare geometri og routing er runtime-sandhed og må ikke erstattes af historiske hardcodede værdier.
