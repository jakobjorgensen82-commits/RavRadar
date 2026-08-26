# RavRadar 4.0.286

4.0.286 lukker den rullende Candidate G-regression, som den skærpede offentlige kontrol fandt efter 4.0.285, og flytter funktionskontrollen ind før deploy.

- 4.0.285 bestod exact-head og hele produktionskæden, men den offentlige positive audit afviste korrekt resultatet: 0/210 aktive zoner og 665/673 `WINDOW_INCOMPLETE`.
- Grænsebeviset før et faseskudt 48-timersvindue blev brugt til samme beregning, men ikke bevaret i den kompakte state. Derfor manglede næste rullende reference igen én times dokumenteret sammenhæng.
- Den virkelige forgænger bevares nu kompakt til næste reference, men afspilles ikke i det aktuelle vindue og tæller ikke som måling, interpolation eller ekstra dækning.
- Regressionstests følger to efterfølgende forskudte referencer og kræver fortsat `READY` med 48 timers dækning.
- Produktionsworkflowet kører nu Candidate G-shadowaudit på den faktisk genererede `data/live/conditions.json` før fuld validering, Supabase-sync, artifact og Pages.
- Den nye gate afviser det offentlige 4.0.285-artifact med den dokumenterede masseregression, mens en recoveryprøve mod de virkelige offentlige artifacts genskaber 672/673 `READY` og bliver inaktiv bagefter.

Candidate G 20/50/30, +10/-8-/13-timersreglerne, sikkerhedsgrænserne fra 4.0.284, vejr, zoner, geometri og land-/vandpunkter er uændrede. De to beskyttede geodatafiler ændrer kun topversionsfeltet til 4.0.286 under den stående godkendelse i DEC-0076. Se DEC-0081.

PR #157 bestod exact-head `32995801418` og blev merged som `2f2fd14883fbb974b331774858a61473ca06acc4`. Produktion `32995888183` beviste, at den nye faktiske runtimegate stopper før deploy, men den loggede i første version ikke de dataminimerede fejlkoder. Kandidaten logger nu kun fejlkoder og summerede optællinger til den fortsatte rodårsagsanalyse; 4.0.286 er endnu ikke offentligt udgivet.
