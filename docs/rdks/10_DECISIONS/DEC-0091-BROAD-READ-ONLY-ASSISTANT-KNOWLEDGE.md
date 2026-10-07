# DEC-0091 – Bred, versionsbundet og read-only viden i Spørg RavRadar

## Status

Besluttet og produktionsverificeret i 4.0.293/4.0.294. Den offentlige formuleringstest udløste og lukkede en afgrænset 4.0.294-hotfix. **Kildebegrænsningen i beslutningens punkt 1 er historisk og erstattet af DEC-0105**, som tillader kildeklassificeret ekstern forskning, officielle kilder, RavRadars systematiske forskningsgrundlag og navngiven praktisk ekspertviden. Read-only-, sikkerheds-, privacy- og modelgrænserne består.

## Problem

Den offentlige GPT-OSS-gateway var sikker og domæneafgrænset, men dens godkendte vidensudsnit bestod kun af ti primært Candidate G-relaterede fakta. Den lokale fallback havde ni grove intents. Almindelige spørgsmål om ravets oprindelse, massefylde, skjulte lagre, kystformer, felttegn, identifikation og vejrforløb var derfor afhængige af AI-kvoten eller endte i et generisk svar.

## Beslutning

1. Grundbogens allerede godkendte, offentlige DA/DE/EN-viden er den faglige kilde. Assistenten må ikke opfinde nye naturgrænser eller gøre spor og mulige fælder til beviser eller garantier.
2. Den lokale router dækker 17 konkrete emner på dansk, tysk og engelsk: oprindelse, massefylde, tilgængelige ravlagre, vind, bølger, strøm, vandstand, kystfælder, felttegn, identifikation/UV, waders, vejrforløb, Candidate G, manglende data, modelbegrænsninger, teknik og udstyr.
3. Bedste sted, bedste tidspunkt og den valgte zones konkrete RavScore forbliver deterministiske Candidate G-funktioner. Almindelige faktaspørgsmål besvares lokalt uden netværk eller kvote; åbne relevante specialspørgsmål kan fortsat gå til GPT-OSS.
4. Den offentlige Edge-viden udvides fra 10 til 23 evidens-ID'er om de samme emner. Modellen skal fortsat returnere eksakt JSON, korrekt locale og kun kendte evidens-ID'er; ukendt eller ugyldigt output fejler lukket.
5. Fast afvisning, dobbelte domænegates, server-only credential, dataminimering, CORS, 6/minut, 40/time, 300/dag, syv sekunders timeout, gratis Workers-kvote og `ravAssistantRemoteEnabled=false` som rollback bevares.
6. Lokal viden låses med 51 reproducerbare cases, 17 pr. sprog. Den samlede provider-eval udvides til 66 balancerede cases, 22 pr. sprog, og dækker de nye evidensfamilier.

## Sikkerhedsgrænser

### Tillæg 2026-10-07 13.11 DK – aktuel originalrute og lokal assistentbinding

Den lokale 456-emneviden har nu en særskilt gennemgået efterfølger.
Den nye migrationsfil er oprettet og kontrolleret gennem den normale bygger;
de to tidligere migrationsfiler er uændrede. Den præcise originalrute til
den nye implementering bevarer den gamle originalidentitet og 455-ruten.

Direkte read-only kontrol af den beskyttede kilde peger nu på den normale
548-original fra 6. oktober kl.22 dansk tid, ikke den ældre 543-generation.
En særskilt låst originalrute bevarer den aktuelle identitet og de gamle
543-/455-ruter. Den normale workflow-forberedelse og negative identitets-
kontroller består. Dette er metadata og lokal kontrol, ikke autentificeret
B/S-restore, installation eller ny offentlig levering.

Alle otte normale lokale bindingsforbrugere er synkroniseret og kontrolleret.
Kun lokal implementeringsmetadata er ændret; øvrige administratordata,
fysiske kontrakter, score, geometri, privat lagring og offentlig projektion
er uændrede. Originalrute-/appendtesten, normal bindingskontrol,
releasekontraktens fejl-/historikværn og hele vidensmålprøven består.
De eksisterende normale gates bruger nu den præcise nye efterfølger.

Dette er ikke SQL-installation, aktuel produktionsautentificering, main-
integration, kilde-CI, offentlig levering eller fungerende ny ekstern AI.
Aktuelle originale B/S før T, sikker levering og faktisk offentlig effekt
er stadig nødvendige. Ingen tidligere afvisning eller gate er omgået.
Målet omfatter fortsat revision, brugerdata og Spørg RavRadar med selvstændig
drift uden Codex omkring 18. oktober; ingen abonnementssikkerhed loves.
Se 89.176 og privat checkpoint; tidligere daterede statusser er historik.

### Tillæg 2026-10-07 09.16 DK – kun normal lokal metadata-generation

Den allerede modtagne præcise tilladelse bruges til de to eksisterende
bundlebyggere i korrekt rækkefølge. Begge normale kontroller består for
456-emnekilden; kun de to vidensfiler og afledt Candidate G-metafil ændrer
kildeinventarerne. Fysik og privat/offentlig lagringskontrakt er uændrede.
Den allerede skrevne 455-emnemigration og dens forgænger bevares. Den
normale successor-kontrol afviser korrekt de nye bindinger. En gennemgået
append-only overgang, original B/S-før-T og alle relevante kilde- og
leveringsgates mangler stadig. Genberegning er ikke migration, offentlig
levering eller autoritet til tidligere særskilt afviste handlinger.

### Tillæg 2026-10-07 08.36 DK – faktisk AI-prøve, ikke færdig levering

Den eksisterende normale offentlige browservej gav først en kvotekontrolfejl
og senere et faktisk fjernsvar på samme spørgsmål. Den intermitterende
tekniske årsag er åben; sikkerhed og kvote må ikke lempes. Fjernsvaret havde
en misvisende faglig generalisering om advektion. En ny, afgrænset DA/DE/EN-
forklaring er derfor kildeklassificeret som kystanalogi og testes gennem
den normale lokale kalder. Nye lokale tal er 456 emner, 1368 sprogsvar,
16416 formuleringer, 473 emnekontrakter og 111 kilder. Ældre daterede tal er
historik, ikke den nye kandidat. Lokale svar og én offentlig AI-afprøvning
beviser hverken ny offentlig leverance, fuld provider-/modelidentitet,
målt ravrute eller fundgaranti. Tidligere bundleafklaring er modtaget;
de gamle gemte bindinger må ikke præsenteres som friske efter udvidelsen.
Read-only, originalbindinger, dataminimering, sprog, brugerfunktioner,
sikkerhed og alle kontrollerede leveringsgates består. Se håndbog 89.175.

- Begge assistentveje er read-only. De kan ikke skrive eller ændre kort, prognoser, RavScore, vejr, sortering, konto-/turdata, privatliv, geometri eller land-/vandpunkter.
- Browseren modtager fortsat ingen Cloudflare-credential. Fjernkonteksten er fortsat begrænset til den valgte zones offentlige, allowlistede felter uden koordinater, rå U/V, persondata eller interne diagnoser.
- RavScore er ikke en procentchance eller sikkerhedsvurdering og kan ikke garantere fund.
- Kvote-, timeout-, Edge- og providerfejl må kun påvirke det enkelte fritekstsvar og falder tilbage lokalt.

## Verifikation

Målrettet kontrakt dækker alle 51 lokale sprog-/intentkombinationer uden et eneste netværkskald, 66 balancerede modelcases, komplet i18n-nøgle-/parameterparitet, offentlig dataminimering, evidensvalidering og eksisterende Candidate G-svar. PR #194 exact-head `33130341973`, merge `25722abc`, produktion `33130425262`, build `98718434389` og Pages `98721765768` er grønne. Den offentlige kontrol fandt derefter, at **Hvordan opstod rav?** ikke matchede oprindelses-intentet. 4.0.294 tilføjede denne og tilsvarende tyske/engelske dannelsesformuleringer samt tre nul-netværksregressioner. PR #195/exact-head `33131976433`, merge `a3eb4ac5`, produktion `33132053882`, build `98723615102` og Pages `98725082313` er grønne; offentlig DA/DE/EN-kontrol beviser de tre lokale svar. Den live 23-fakta Edge består desuden DA/DE/EN, fast afvisning, CORS/origin og reel 6/minut-browsergrænse med lokal fallback uden ændring af beslutningens faglige eller sikkerhedsmæssige grænser. Den efterfølgende driftsrotation 2026-08-28 erstattede kun server-secret'en, bestod samme livegrænser før tilbagekaldelse og et `200`-kald efter tilbagekaldelsen og ændrede ingen af beslutningens produkt-, data- eller privatlivskontrakter.
