# P1-driftcheckpoint - 4.0.238 / produktion #3261

**Dato:** 2026-08-20  
**Kilde:** produktion `#32361218606`, support `RavRadar-support-3261`, datasæt `rr-20260820105744-210`  
**Metode:** skrivebeskyttet artifact- og komponentmatrixkontrol

## Resultat

- Datasættet indeholder fortsat 210 zoner og 673 kystdele og bestod den fulde produktions- og browserkontrol.
- Alle 210 zoner har 72 rå historikprøver over 42,866 faktiske timer.
- 198 geografisk verificerbare parentzoner har 42,866 timers verificeret fælles DMI-U/V-historik. Af disse har 197 zoner 60 verificerede prøver og én zone 54.
- De 12 kendte parentzoner uden et egnet marint DMI-gitterpunkt har fortsat nul verificerede prøver. De må ikke udfyldes kunstigt.
- Største rå mellemrum er fire timer. Alle 210 zoner er fortsat under det bindende 72-timerskrav.
- Shadow-cachen spænder cirka 105,3 timer fra første til seneste capture. Den har 62.144 prøver ved 1.822 ankre og har besøgt alle 673 dele: 622 har delt U/V inden for 5 km, 47 har kun fjernere U/V, og fire har ingen observeret delt U/V.
- Den kontrollerede livepilot dækker fortsat 673/673 dele: 622 med lokal DMI, 43 med lokal Copernicus og otte med godkendt regional DMI-proxy.
- Den offentlige pilothistorik har 28.261 poster for 633 dele. Det globale validtidsinterval er 57 timer, men dette er ikke et bevis for 168 timers naturlig drift.
- HARMONIE 20. august 00Z, WAM 19. august 18Z og DKSS 19. august 12Z er fortsat de nyeste observerede modelstarter. Kørsel #3261 er derfor stabil drift og historikvækst, ikke en ny uafhængig DEC-0030-cyklus.
- Feggesund er fortsat eksplicit bølge-missing. De 12 parent-currenthuller og 51 lokale dele uden lokal DMI-dækning er uændrede og klassificerede.

## Konklusion

P1 fungerer som tiltænkt og vokser uden backfill, men 72- og 168-timerskravene er ikke nået. Der er ingen evidens for at ændre kildeorden, fallback, tærskler, RavScore eller geometri. Næste kontrol skal bruge et naturligt nyere artifact; gentagne identiske modelcyklusser tæller ikke som selvstændigt overgangsbevis.
## Post-merge produktion #3263

- PR #8 blev merged som `6d63ac3a` og bygget i produktion `#32363403425`.
- Fuld validering, releasegate, Supabase, Pages-build og deploy bestod. Build-and-prepare tog 336 sekunder.
- Support `RavRadar-support-3263` og det deployede datasæt `rr-20260820112436-210` matcher byte for byte.
- Den fulde Chromium/Playwright-kontrol bestod 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 prognosevisninger med nul data-, score-, pile-, forklarings-, konsol-, side- eller HTTP-fejl.
- Historikken voksede til 73 rå prøver/43,31 timer i alle zoner. 198 zoner har samme verificerede spænd, mens de 12 kendte parenthuller fortsat står ved nul.
- Shadow-cachen spænder cirka 105,75 timer og har 62.225 prøver. Livepiloten dækker fortsat 673/673 dele med uændret kildefordeling.
- DMI-bulktrinnet hentede ingen ny collection. #3263 er derfor fortsat driftsevidens, ikke en ny uafhængig komponentcyklus.
- GitHub viser en exit-2-annotation på det fulde valideringstrin, selv om alle deltests, trinnet, jobbet og runnet er grønne. Den samme annotation findes i #3259 og #3261; ingen skjult fejlet deltest blev fundet.