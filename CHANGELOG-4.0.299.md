# RavRadar 4.0.299 – én hurtig Om-retur uden tvungen reload

Dato: 2026-08-28

## Ændret

- Bevarer RavRadar-knappens unikke versions-/noncebaserede navigation i både Safari og Hjemmeskærm-app.
- Fjerner 4.0.298's ekstra synkrone head-værn, timer og automatiske reload.
- Lader den eksisterende hurtige appopstart fuldføre én gang uden at blive genstartet efter seks sekunder.
- Fjerner det forkastede værn fra service-workerens appskal.

## Uændret

- 4.0.292/297's eksisterende sidecache-/bfcache-recovery.
- 4.0.296's kompakte startup.
- Candidate G, RavScore, vejr, prognoseinput, scorer, bestetid, sortering, konto-/turdata, privatliv, assistent/Edge, geometri og land-/vandpunkter.

## Verifikation

- Offentlig 4.0.298 beviste, at Om-returen allerede var komplet efter cirka ét sekund med 210 zonelinjer og 5 + 5 + 5, hvorefter det fejlagtige værn tvang en ny navigation ved cirka seks sekunder.
- Ejerens fysiske iPhone-test beskrev siden som meget langsom og derefter helt udeblevet. 4.0.298 må ikke kaldes fysisk løst.
- PR #204/exact-head `33166362478`, merge `0ac66199`, produktion `33166424816`, build `98832864492` og Pages `98834824939` er grønne.
- Offentlig desktopkontrol viste 210 zonelinjer, fem aktuelle områder, fem dagsfaner/fem viste rækker og cirka 1,36 sekunders Om-retur uden senere URL-skift.
- Ejerens efterfølgende fysiske iPhone-test var fortsat rød: kort og prognoser manglede, indtil telefonen blev låst og åbnet igen. 4.0.299 må derfor ikke kaldes den fysiske løsning; se DEC-0097/4.0.300.
