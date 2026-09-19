# DEC-0207 – uafhængig strømvalidering og tidligste hul først

**Status:** Aktiv; lokal 4.0.427, produktionsbevis afventer
**Dato:** 2026-09-19

## Problem

4.0.426 bestod exact-head `35404863947`, blev merged gennem PR #371 som main
`41a39bbc`, og normalrun `35405307261` nåede hele provider- og kontrolkæden.
Den operationelle strømlukning byggede 673 af 673 scoreklare aktuelle dele,
men scoreinputtet beholdt kun de 56 direkte DMI-dele. Årsagen var, at en fejl i
valgfrie historiske/referencebeviser kunne kassere hele den uafhængigt
forseglede aktuelle strømpakke.

Samme run viste to yderligere systemiske kanter. HARMONIE brugte omtrent 200
sekunder på et bredt katalog med 584 elementer og nåede derfor ikke det
aktuelle vindasset før den reserverede DKSS/WAM-tid. DKSS sorterede samtidig
reelle strømhuller efter størst antal og kunne derfor behandle femdøgnshalens
673 huller før de 617 mangler på den aktuelle time. Til sidst afviste den
private publicering den gamle models strukturelt gyldige descriptor, før en
nyere produktionstime kunne erstatte den.

## Beslutning

- Den forseglede operationelle strømlukning er sit eget tillidsdomæne.
  Ugyldig valgfri rådgivende historik eller privat native-referencehistorik
  ignoreres hver for sig og må ikke kassere gyldige aktuelle strømdata.
- En ugyldig operationel closure, vektor, identitet, tid eller proveniens
  afvises fortsat samlet. Rettelsen accepterer ikke svagere aktuelle data.
- Det kritiske HARMONIE-grundbehov afgøres af eksakt, verificeret vind på den
  låste produktionstime. Den akutte passage spørger kun DMI-kataloget efter
  denne time og forsøger højst ét asset. Den almindelige scheduler vedligeholder
  fortsat den øvrige horisont.
- Reelle DKSS-strømhuller går foran scalar-only vedligeholdelse og refresh.
  Inden for reelle huller behandles tidligste prognosetime først; ved samme tid
  bruges eksisterende genbrugs- og dækningsprioritet.
- En strukturelt gyldig privat runtime med historisk modelbinding må læses som
  forgængerevidens, når en strengt nyere produktionstime publiceres. Samme-time
  ændring kræver fortsat eksakt migrationsbevis, og tidsmæssig regression
  stopper før upload.

## Komplethed og produktionsbevis

Run `35405307261` havde fortsat 1.122 manglende par af 79.414 over hele
strømhorisonten. Det er ikke komplet. 4.0.427 må derfor først kaldes fuldt
driftsbevist, når en almindelig weather både deployer en aktuel scorepakke og
viser gyldige nødvendige felter overalt. Eventuelle rester skal analyseres som
en samlet fejlkategori fra den gemte stageoversigt; `MISSING` er kun lokal
robusthed og aldrig målet.

RavScore-formel, vægte, geometri, land-/vandpunkter og providerorden ændres
ikke. Den append-only migration
`20260919010000_current_input_foundation_binding.sql` binder den integrerede
pakke `b114d226…8c38`, Candidate G-rollback `2a0cba46…c09e` og continuation
`91251f6b…78f4`; den anvendte forgængermigration ændres ikke. Ingen oneoff er
nødvendig for denne rettelse.
