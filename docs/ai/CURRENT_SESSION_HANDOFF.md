# Aktuelt sessionshandoff – 2026-08-15

## Sikker baseline og kandidat

- Seneste produktionsverificerede release er 4.0.206 på commit `4dc464a`, verificeret i GitHub Actions #31831068809 med frisk data, fuld validering, releasegate, Supabase-synkronisering, artifact og Pages-deploy.
- 4.0.207 fjerner kun de to uvirksomme adminfunktioner **Sæt nyt havpunkt** og **Sæt nyt landpunkt**. Den må først kaldes produktionsverificeret, når dens egen fulde GitHub-kørsel og deploy er grøn.
- Eksisterende trækbare markører, rød hav→land-pil, geometrikontrol, central gemning/readback, DMI-validering, runtimepropagering og rollback er bevaret.

## Bindende ejerbeslutning om land-/vandpunkter

- Hver af de 673 aktive lokale kyststrækninger har præcis ét autoritativt blåt havpunkt og ét grønt landpunkt. Der oprettes ikke ekstra aktive punktpar på samme del, og der foretages ikke en ny automatisk landsdækkende opdeling.
- Ejeren flytter senere de eksisterende markører manuelt og vælger en repræsentativ placering på bugtede strækninger. Efter **Godkend og gem centralt** bliver det flyttede par først autoritativt efter central readback og grøn efterfølgende DMI-/releasekørsel. Det gamle par bliver ikke et visuelt spøgelse og bruges ikke parallelt.
- En skrivebeskyttet orienteringsaudit flagger 199 af 673 dele i 122 zoner ved mindst 35 graders vedvarende variation. 171 er `MultiLineString`, så listen er triage, ikke 199 dokumenterede fejl. Albuen-del `dk-b10-14-fallback-recovery-02` er en klar kontrolkandidat; ejeren har vurderet Albuen-del 5 som irrelevant.
- Den manuelle ejerreview kan udskydes og blokerer ikke uafhængigt roadmaparbejde. Den skal være afsluttet før endelig faglig godkendelse af alle lokale scorer, større scorekalibrering og domæne-/brugerrelease.

## Næste arbejde

1. Ved opstart læses `AGENTS.md`, `docs/ai/CODEX_START_HERE.md`, den obligatoriske RDKS-kæde og DEC-0037 før kodearbejde.
2. Kontrollér `git status`, seneste commit og den seneste 4.0.207 GitHub Actions-kørsel. Et grønt topresultat er kun releasebevis, hvis fuld `validate` og `release:gate` faktisk er kørt før artifact/deploy.
3. Næste aktive udvikleropgave er P1-audit/design af komplette DMI-first femdøgnskæder pr. komponent under DEC-0030. Ingen ny kilde, fallback eller scoreændring må implementeres før dækning, provenance, overgange og regressioner er dokumenteret.
4. Supabase-egress overvåges gennem næste billingperiode. Den private, dataminimerede besøgstæller med enkel adminrapport er fortsat P2.
5. Ejerens manuelle markørreview udføres senere gradvist i admin og registreres kun gennem central readback plus grøn DMI-/releasevalidering.

## Arbejds- og modelregler

- Brug GPT-5.6 Sol og **Ekstra høj** indsats til DMI, RavScore, geometri, ukendt rodårsag, arkitektur og endelig kritisk validering. Codex skal selv anbefale et billigere valg før rent rutinearbejde og bede om Sol igen før kritisk arbejde, jf. DEC-0031.
- Administratorens centralt gemte data er runtime-sandhed. Historiske hardcodede værdier må ikke overskrive dem.
- Funktioner må ikke fjernes eller ændres uden en aktuel ejerbeslutning. 4.0.207's to knapper er den udtrykkeligt godkendte undtagelse; beslægtede funktioner er bevaret og regressionstestet.
- DMI er primær kilde. Manglende data forbliver `missing`; nul, stale gentagelse eller skjult interpolation må ikke opfindes.
- Gamle chats er historik, ikke ændringstilladelse. Ved konflikt gælder aktuel ejerinstruktion, aktiv RDKS, verificeret kode, håndbog, changelog og derefter historiske chats.
