# RavRadar - aktivt roadmap

## Aktuel P0-status - 4.0.238 produktion

- P0.1 og P0.2 er afsluttet: PR #1 blev merged som `b8844841`, og den korrekte 4.0.238-pakke blev ført til `main` uden de fire beskyttede lokale datafiler.
- P0.4-P0.6 er afsluttet i `#32344813967`/support `RavRadar-support-3252`/datasæt `rr-20260820074127-210`: seks bølgehuller lukket, verificeret historik vokset til 39,594 timer og browseraudit grøn for 210/673/420/2.100.
- P0.3 er kun åbent for det krævede naturlige timeskiftebevis. Den fulde produktionskæde er allerede grøn; næste kvalificerede schedule skal starte før og afslutte efter en UTC-grænse uden manuel omgåelse.
- P1-observation: Copernicus-pilot #72 har 46 eksakte timer, 28.934 poster og nul gitter-/lagustabilitet. Fortsæt mod 168 timer.
- Ikke-blokeret driftsevidens og P1-analyse kan fortsætte, mens merge afventer. Ingen missing værdi må skjules, og ingen land-/vandpunkter må flyttes.

**Opdateret:** 2026-08-20  
**Statusgrundlag:** 4.0.238 live på merge `b8844841`; verifikationsbranch `codex/verify-4.0.238`

Dette er den eneste aktive opgaveliste. `IMPLEMENTATION_STATUS.md` og aeldre forsknings-/versionsafsnit bevares som revisionsspor. En tom afkrydsningsboks i historikken er ikke en aktiv opgave, medmindre punktet ogsaa findes her.

## P0 - luk den aktuelle kandidat

- [x] Gennemgaa draft-PR #1 og saml den korrekte 4.0.238-versionspakke med RDKS, changelog og haandbog.
- [x] Foer kandidaten sikkert til `main` uden de fire beskyttede lokale dataaendringer.
- [ ] Koer frisk fuld produktion med alle gates, Supabase og Pages. Et timeskifte er paakraevet som bevis for den laaste Open-Meteo-fallbacktime.
- [x] Bevis i frisk main-produktion, at de seks #3246-boelgehuller paa referencetimen er lukket, uden kortere hale eller aendret kildeorden.
- [x] Bevis i frisk main-produktion, at reference-time-rettelsen igen faar verificeret currenthistorik til at vokse i de 198 verificerbare parent-zoner; de 12 reelle huller skal forblive missing.
- [x] Gentag den fulde browseraudit: 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 femdoegnsvisninger med score, farve, pile, forklaringer, seks vejrmetrikker og `Mangler` i samme lokale kontekst.

## P1 - naturlig drift og DEC-0030

- [ ] Opbyg mindst 72 naturlige verificerede timer i alle aktive, geografisk verificerbare zoner. Ingen backfill.
- [ ] Foelg nye uafhaengige HARMONIE-, WAM- og DKSS-cyklusser og klassificer komponentovergange, modelkanter og fallbackhaler foer permanente graenser besluttes.
- [ ] Foelg de 12 parent-currenthuller som eksplicitte `no-marine-grid-point`; lokale 673/673-identiteter og parentzoner maa ikke blandes sammen.
- [ ] Foelg Feggesund som eksplicit boelge-missing; ingen opdigtet udfyldning eller flytning af punkter.
- [ ] Opbyg og maal Copernicus-shadow til det fulde naturlige 168-timersvindue. Duplikatruns taelles ikke som nye timer.
- [ ] Eftermaal en naturlig warning/critical paa en faktisk valgt effektiv vandstandskilde. Fremkald ikke kunstigt cacheudloeb.
- [ ] Foelg produktionsvarighed over nye modelrotationer; gates, marine audits og datakvalitet maa ikke reduceres for hastighed.

## P2 - forskning, kapacitet og vedligeholdelse

- [ ] Udfoer den planlagte RavScore-/fysikanalyse i fase A-D: kilder, faktisk kode, fysisk systemmodel og evidensmatrix/valideringseksperimenter.
- [ ] Fremlaeg forskningsresultatet foer enhver ny scoremodel eller faglig implementering. Implementering kraever en saerskilt ejerbeslutning.
- [ ] Maal faktisk Supabase-egress i naeste billingperiode; estimatorer er ikke billingbevis.
- [ ] Foelg GitHub Actions' Node-runtimeadvarsler og opgrader kun til officielle, verificerede actionversioner.
- [ ] Beslut senere, om raa diagnostiske zoneeksempler skal have en saerskilt beskyttet lagrings-/downloadvej uden at reducere ejerens diagnostik.

## P3 - ejerafgoerelser og manuel faglig kontrol

- [ ] Ejeren gennemgaar gradvist zoner og lokale punktpar paa bugtede/tvetydige kyststraekninger. Codex maa dokumentere og stoette, men ikke gaette eller flytte punkter.
- [ ] Privat national geometri, recoverykandidater og andre shadowresultater maa kun aktiveres efter eksplicit ejer-go/no-go.
- [ ] Afslut den manuelle faglige zone-/kystkontrol foer endelig domaene- og brugerrelease.

## Afsluttet og derfor ikke laengere aktivt

- [x] Produktionsworkflowet kan ikke bygge/deploye frisk data uden fulde gates; en separat ikke-deployende PR-kildegate er groen.
- [x] Browser-pluginet er diagnosticeret, og den godkendte Playwright/system-Chrome-fallback er reproducerbar.
- [x] Livebrowserkontrol dækker 210/210 zoner og 673/673 dele samt score, pile, forklaring og alle seks vejrmetrikker.
- [x] #3245/#3246 har afgraenset historikfejlen, parent-currenthullerne, vandkildehaendelserne, komponentovergangene og timeskifteregressionen uden punktflytning.

## Arbejdsregel

Arbejdet tages i P0 -> P1 -> P2 -> P3. Et blokeret naturligt observationspunkt bliver staaende aabent, mens naeste ikke-blokerede punkt fortsaetter. Afsluttede eller erstattede historiske bokse maa ikke genopstaa som roadmaparbejde uden ny evidens eller ejerbeslutning.
