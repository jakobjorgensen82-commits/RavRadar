# DEC-0271 – DMI-prioritet med præcis aktiv native-række

**Status:** Lokal 4.0.524-kandidat; måltest bestået, exact-head CI og produktion afventer.
**Dato:** 2026-10-01.

## Formål og grænse

Efter ejerens ordre fortsættes revisionen med små færdige rettelser til
produktion. 4.0.523 er publiceret og UI-rettelsen faktisk kontrolleret.
Den tilbageværende PUBLIC-fejl reproduceres med den faktiske producent:
en gyldig DMI-række bliver erstattet af en tidligere beregnet CP-reserve,
selv om DMI har sin præcise aktive native-række. 523 rettede kun replay.

PUBLIC får en snæver indgang til samme eksisterende prioriteringskode.
Kun aktiv bulk kan give autoritet; historiske/deployed kontekster, banker,
session og alternative callbacks giver ingen ekstra adgang. Den eksisterende
aktive sanitizer efter valget er uændret. Der ændres kun strømkonflikten,
ikke de øvrige fire familier, raw-data eller closure-rækker/hashes.

Den eksisterende artifactkontrols udvælgelse af præcis én verificeret
native-række er udtrukket og genbrugt, ikke kopieret som ny validator.
Samme tidspunkt, proveniens og eksisterende DMI-admission kræves.
Producenten kræver desuden eksakt femdecimal-U/V samt hele den afledte
kildeidentitet inklusive gridpunkt og native lineage. Den virkelige
frosne forecastbuilder laver projektionen. Manglende, dubleret eller
afvigende aktiv evidens beholder det tidligere gyldige reservevalg.
Bracket/edge-rekonstruktion og header alene giver ikke denne nye retention.
Den fælles 96h-undtagelse bruger fortsat låst productionReferenceAt og
admitteret responsbundet CP-modeltid. Ingen ny vinderregel indføres.

Den genbrugte native-projektor kunne omdanne null, tom tekst og false til
numerisk nul via Number. Dette er særskilt syntetisk reproduceret og nu
afvist før projektion; faktisk numerisk nul bevares. Artifactkontrollen
bruger samme projektor og beholder alle sine øvrige kontroller.

## Evidens og release

Før rettelsen gav faktisk PUBLIC-producent CP i den nye positive regression.
Efter rettelsen består producent → aktiv sanitizer → faktisk score/pil →
eksisterende native-artifactkontrol. Tre eksisterende kildefiler kørte i én
kommando: 3/3 PASS, ingen fejl/skips, 0,766373 s. Assertions dækker også
header/historisk-only, rå række/dublet/tid/tuple/grid/lineage, tomme værdier,
reelt nul, 96h samt eksisterende replay/OM/regional/hold. De sidste reserve-
familier er eksisterende fælles prioriteringstests, ikke nye landsmålinger.
En gammel caller-navneassertion blev opdateret; ingen gammel gate fjernet.
Den frosne model er uændret: 67 filer, c557f91a520ae64211f9441f25fc72a9c230691cdb7b48551ecb7286463420eb.

Efter version/dokumentation bestod særskilt 7/7 relevante runtime-/docs- og
sikkerhedstests på0,884181s; tre browser-/håndbogskontroller3/3 på1,106043s;
normal wireup/integration3/3 på0,157481s. Ingen skips. Den tidligere3/3-prøve
overlapper og må ikke lægges til som nye unikke tests. Sourceplan47, RDKS14
chatkilder, version524, model67/otte bindinger og diffcheck bestod. Geodata
er særskilt bevist ONLY topversion; SQL ændrer ONLY lokal håndbogspayload,
alle øvrige SQL-bytes er uændrede. Ingen SQL-installation. Source-CI afventer.

Der er ingen privat måling af hvor ofte konflikten forekommer, intet nyt
nationalt kapacitetsbevis og ingen produktionseffekt endnu. Ingen bred
PUBLIC-donoradgang, SOURCE, modelændring, sessionaktivering eller workflowgate
følger med. 523's replay-only-afgrænsning er historisk korrekt for 523.
Denne særskilte kandidat kræver version/RDKS/begge håndbøger, exact-head CI,
sikker kode-only levering efter DEC-0148 og effektkontrol i næste almindelige
vejrkørsel med uændret no-loss/artifact/private/CAS/R2/Pages.

Cron 8348098 skal aktiveres som allerede bestilt; alle 523-leveringskrav er
opfyldt. En ubesvaret login-handoff er eneste kendte blocker, ikke denne
kandidat eller den resterende revision. Ingen konkurrerende manuel start.
Astra Ekstra høj er tilstrækkelig til denne afgrænsede integration.
