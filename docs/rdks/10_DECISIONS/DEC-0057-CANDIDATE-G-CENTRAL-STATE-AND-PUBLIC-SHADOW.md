# DEC-0057: Central Candidate G-tilstand og fallback-kompatibel offentlig shadow

**Status:** Aktiv score-neutral produktionsbeslutning for 4.0.259

**Dato:** 2026-08-23

**Scorepåvirkning:** Ingen ændring af den aktive offentlige RavScore

## Problem

DEC-0055 og DEC-0056 kræver, at transport- og mobiliseringstilstanden fortsætter mellem produktionskørsler. Den hidtidige aktive shadow hentede samtidig nye native DMI-serier for et mindre udsnit. Dens 243/673-resultat målte derfor en snæver testkontrakt og ikke RavRadars almindelige kontrollerede vejrdækning, som allerede bruger DMI, Copernicus og godkendte proxier til 673/673 dele.

En offentlig aktiveringskontrol må bruge den samme inputkontrakt som produktet. Ellers kan den både fejlagtigt kalde dækkede dele “manglende” og teste en anden modelkæde end den, der skal aktiveres.

## Beslutning

1. Version 4.0.259 beregner Candidate G centralt for hver aktiv kystdel fra den samme kontrollerede time, som bruges til den aktive lokale score.
2. Kun en kompakt afledt fortsættelsestilstand krydser kørselsgrænsen: model-/profilversion, hash af kystdelskonteksten, tidspunkt, transportpotentiale, effektive udtransporttimer og mobiliseringspotentiale.
3. Tilstanden må ikke indeholde rå U/V, strømretning, vind, bølgehøjde, bølgeperiode, koordinater, geometri eller private replaypayloads.
4. Hashen binder tilstanden til kystdel, vandpunkt, kystretning, model og profil uden at offentliggøre disse input i selve tilstanden. Ændres kontrakten, afvises den gamle tilstand og kandidaten starter fail-closed fra 0.
5. Den persistérede tilstand vælges ved zonens fælles `currentReferenceAt`, ikke ved enden af den fremtidige prognose. En senere prognosetime må ikke blive behandlet som observeret fortid i næste kørsel.
6. En gentagelse af samme referencetime holder tilstanden og må ikke tælle samme time to gange. Manglende verificeret strøm eller manglende bølgeinput holder ligeledes den seneste afledte deltilstand.
7. Transport bruger DEC-0055's anbefalede `0,03→0,15 m/s`, +10/-8 point pr. effektiv time, udtransport fra 13 timer og intet passivt neutralt tab. Mobilisering bruger DEC-0056's fire timers opbygning og 48 timers aftrapning.
8. Candidate G offentliggøres kun som et adskilt `diagnostic-only`-navnerum i start-/detaljeruntime. Den aktive `25/40/35`-score og dens farve, vinder, UI og regler ændres ikke. `automaticActivationAllowed` og `publicScoreChanged` er falske.
9. Den manuelle landskontrol læser den allerede producerede fallback-kompatible detaljefil og kræver 210 zoner, 673 dele og begge jagtformer. Den genberegner 20/50/30-resultatet fra delbidragene og kontrollerer nul-gate, forklaring, versionsbinding og dataminimering.
10. Shadowjobbet må ikke genhente en smallere native DMI-prøve, flytte punkter, hydrere beskyttede data, deploye eller skrive til central admin.
11. Den dataminimerede shadowrapport indeholder kun antal og scoreaggregater, korte digests og gate-status; ingen del-id'er, koordinater eller rå vejrværdier.
12. Den første produktionskørsel er en dokumenteret bootstrap fra 0. Offentlig scoreaktivering må ikke baseres på bootstrapfordelingen. Den endelige aktiveringsshadow skal bruge naturligt videreført tilstand og dokumentere dens alder; 48 timers aftrapningshukommelse må ikke foregives at være historisk observeret ved første kørsel.

## Forklaring og rollback

Candidate G-resultatet offentliggør eksakte komponenter, vægtede bidrag, fysisk gate, et eventuelt waders-loft og udtransportgaten. Ved udtømt udtransport bruges fortsat ejerens bindende forklaring fra DEC-0055.

Rollback i 4.0.259 er deterministisk: den aktive scorekode læser ikke Candidate G-navnerummet. Hvis den diagnostiske kæde fejler, kan navnerummet og den manuelle shadow fjernes eller den tidligere release genudgives, mens aktiv `25/40/35` fortsætter uændret. En senere reel aktivering kræver en særskilt, eksplicit versionsbundet omskifter og en testet tilbagekobling til `25/40/35`; 4.0.259 indfører ikke denne omskifter.

## Verifikation

- Opdelt og ubrudt beregning skal være byte-identisk for de afledte tilstandsrækker.
- Samme-time-rekørsel må ikke bygge, nedbryde eller nulstille et igangværende forløb.
- Inkompatibel kyst-/modelkontekst skal nulstille sikkert.
- Missing skal holde tilstanden.
- Den kompakte tilstand skal bestå en eksplicit raw-input-negativliste.
- Offentlig start- og detaljeprojektion skal bevare Candidate G adskilt fra den aktive score.
- Den syntetiske landsaudit skal bestå 210/673 og 1.346 modeevalueringer uden score-rekonstruktionsafvigelser.
- Exact-head-kildegate, fuld post-merge-produktion og en efterfølgende manuel fallback-kompatibel landsaudit kræves som eksternt leveringsbevis.

## Bevarede begrænsninger

- Kandidaten er fortsat ikke fundkalibreret; komplette ture og hold-out er senere efterkalibrering og skal fremgå som modelusikkerhed.
- `Hs² × T`, 4/48-timer og strømgrænserne er faglige forskningspriorer, ikke naturkonstanter.
- Bund, dybde, render, revler, adgang, stedegnethed og sikkerhedsrådgivning indgår ikke.
- Artifact, protected-dirty-data, geometri og land-/vandpunkter er urørte.

DEC-0057 erstatter den native 243/673-shadow som aktiveringsklar dækningskontrol. Den gamle validator bevares som historisk forskningsværktøj og må ikke længere fortolkes som almindelig produktdækning.

## Senere præcisering i DEC-0058

Ejeren accepterede nattens seks timers naturlige videreførelse som praktisk evidens til næste produkttrin. DEC-0058 erstatter derfor rækkefølgen, hvor selve den score-neutrale omskifter først måtte bygges efter 48 timer. Seks timer er ikke et 48-timersbevis, og Candidate G må fortsat ikke aktiveres uden frisk slutshadow på den eksakte aktiveringskode og særskilt ejer-gennemgang. Mobiliseringens 48 timers halveringstid ændres ikke.

## Senere erstatning af den ubundne transportstate

DEC-0059 erstatter videreførelse af selve transportpotentialet som næste kørsels startinput. Den centrale kontrakt fører nu højst 49 dataminimerede, kystrelative timebeviser for et fast 48-timersvindue videre og genberegner transporten fra samme rand hver gang. Rå U/V, fart, retning, koordinater og private payloads er fortsat forbudt.

Candidate G er ikke aktiveringsklar, før hele vinduet er sammenhængende. Den offentlige legacyprofil fortsætter uændret under opbygning eller datagab. Mobiliseringens særskilte afledte state og alle aktiveringskrav i DEC-0058 bevares.
