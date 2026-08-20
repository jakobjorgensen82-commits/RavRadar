# RavScore: tripbaseret kalibreringsprotokol

Status: bindende fase D-design, endnu ikke aktiveret som modeltræning.

## Grundprincip

Kalibreringsenheden er en afsluttet søgetur, ikke et enkelt ravfund.

Et fund uden kendt søgeindsats siger meget lidt. Ét fund på ti minutter og ét fund efter seks timers grundig søgning er ikke samme evidens. Et nul-fund er tilsvarende kun brugbart, når vi ved, at brugeren faktisk søgte, hvor længe, hvordan og på hvilken kystdel.

Fundmængde kan bevares som sekundær beskrivelse. Den må ikke stå alene som mål for næste RavScore.

## Obligatoriske felter for fremtidig kalibrering

Hver kvalificeret tur skal have:

- stabilt trip- og observations-ID
- start- og sluttid i UTC
- faktisk søgetid
- jagtform: waders eller strand
- faktisk zone og lokal kystdel
- udfald: fund eller nul-fund
- dækningsgrad: delvis, normal eller grundig
- uforanderligt ID for det prognosesnapshot, der var tilgængeligt ved turens start
- prognosens udgivelsestid og gyldige time
- RavScore-version og datakildekvalitet fra snapshotreferencen

Valgfrie støttefelter kan være antal søgere, erfaringsniveau, afbrudt tur og grov fundmængde. De skal kun indsamles, hvis de konkret reducerer bias og kan forklares enkelt for brugeren.

## Felter der ikke må indgå i kalibreringsdatasættet

- præcis GPS eller rute
- navn, e-mail eller fri tekst
- billeder
- rå private diagnostikpayloads
- direkte bruger- eller enhedsidentitet

Ruten kan fortsat ligge lokalt på brugerens enhed som turfunktion. Den må ikke sendes til den centrale observationstabel. Hvis lokal afstand senere bruges som indsatsmål, skal den omdannes til et groft afledt felt før upload, hvorefter punkterne kasseres fra fjernpayloaden.

## Eksisterende observationer

Den nuværende formular gemmer Ja/Nej, gram, dato og zone. Den bruger kl. 12 på den valgte dato, den jagtform der er aktiv ved senere besvarelse, og den vejrsituation som den daværende app kan finde. Den mangler lokal kystdel, faktisk varighed, dækningsgrad og stabil prognosereference.

Disse rækker må bevares som historik og bruges i dækningsoptælling. De må ikke bruges til koefficienttilpasning, medmindre alle nødvendige felter kan bevises uden gæt. Ingen historiske rækker slettes uden særskilt ejergodkendelse.

## Bias-kontrol

Første analyse skal rapportere, ikke skjule:

- andel fund og nul-fund
- dækning i begge jagtformer
- dækning på vest-, øst- og beskyttede kyster
- antal uafhængige vejrhændelser
- fordeling af søgetid og dækningsgrad
- andel med gyldigt snapshot- og kystdelslink
- hvor stor en del af data der kommer fra de mest aktive bidragydere, uden at udlevere identiteter
- om brugere primært vælger højt rangerede zoner

Den sidste faktor er vigtig: RavRadar påvirker selv, hvor folk tager hen. En simpel sammenligning af fund mod score kan derfor forveksle modellens effekt på brugernes valg med modellens evne til at forudsige rav.

## Trænings- og evalueringsdesign

Når dækningsgaten senere er opfyldt, skal B0 og kandidaterne sammenlignes på de samme frosne ture og snapshots.

- Opdel efter tid, så fremtidig information aldrig lækker bagud.
- Hold hele vejrhændelser ude af træning.
- Hold mindst én samlet kystgruppe ude for geografisk overførsel.
- Gruppér gentagne ture fra samme bidragyder i samme fold via en beskyttet, ikke-eksporteret gruppering.
- Vægt eller modeller søgeindsats eksplicit.
- Rapporter kalibrering, rangordning, falsk tryghed, stabilitet og usikkerhedsintervaller hver for sig.
- Sammenlign altid mod den præcise produktionsbaseline, ikke en efterligning.

En model må ikke aktiveres på baggrund af høj træningsnøjagtighed, enkeltfund, en enkelt storm eller en lille forbedring uden stabilt hold-out-resultat.

## Første implementering

Den næste sikre produktændring er en datakontrakt, ikke en scoreændring:

1. Gem prognose-/datasetreferencen og jagtformen ved turstart.
2. Gem start og slut og beregn faktisk søgetid.
3. Spørg straks ved turstop om fund/nul-fund, dækningsgrad og faktisk kystdel.
4. Send kun den dataminimerede turpost uden GPS.
5. Vis en dækningsrapport i admin, mens kalibreringslåsen forbliver aktiv.

Først efter reel dækning træffes en ny beslutning om numeriske minimumskrav og eventuel kandidattilpasning.
