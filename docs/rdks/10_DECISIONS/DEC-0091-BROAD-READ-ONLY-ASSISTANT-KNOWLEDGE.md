# DEC-0091 – Bred, versionsbundet og read-only viden i Spørg RavRadar

## Status

Besluttet og produktionsverificeret i 4.0.293/4.0.294. Den offentlige formuleringstest udløste og lukkede en afgrænset 4.0.294-hotfix.

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

- Begge assistentveje er read-only. De kan ikke skrive eller ændre kort, prognoser, RavScore, vejr, sortering, konto-/turdata, privatliv, geometri eller land-/vandpunkter.
- Browseren modtager fortsat ingen Cloudflare-credential. Fjernkonteksten er fortsat begrænset til den valgte zones offentlige, allowlistede felter uden koordinater, rå U/V, persondata eller interne diagnoser.
- RavScore er ikke en procentchance eller sikkerhedsvurdering og kan ikke garantere fund.
- Kvote-, timeout-, Edge- og providerfejl må kun påvirke det enkelte fritekstsvar og falder tilbage lokalt.

## Verifikation

Målrettet kontrakt dækker alle 51 lokale sprog-/intentkombinationer uden et eneste netværkskald, 66 balancerede modelcases, komplet i18n-nøgle-/parameterparitet, offentlig dataminimering, evidensvalidering og eksisterende Candidate G-svar. PR #194 exact-head `33130341973`, merge `25722abc`, produktion `33130425262`, build `98718434389` og Pages `98721765768` er grønne. Den offentlige kontrol fandt derefter, at **Hvordan opstod rav?** ikke matchede oprindelses-intentet. 4.0.294 tilføjede denne og tilsvarende tyske/engelske dannelsesformuleringer samt tre nul-netværksregressioner. PR #195/exact-head `33131976433`, merge `a3eb4ac5`, produktion `33132053882`, build `98723615102` og Pages `98725082313` er grønne; offentlig DA/DE/EN-kontrol beviser de tre lokale svar. Den live 23-fakta Edge består desuden DA/DE/EN, fast afvisning, CORS/origin og reel 6/minut-browsergrænse med lokal fallback uden ændring af beslutningens faglige eller sikkerhedsmæssige grænser. Den efterfølgende driftsrotation 2026-08-28 erstattede kun server-secret'en, bestod samme livegrænser før tilbagekaldelse og et `200`-kald efter tilbagekaldelsen og ændrede ingen af beslutningens produkt-, data- eller privatlivskontrakter.
