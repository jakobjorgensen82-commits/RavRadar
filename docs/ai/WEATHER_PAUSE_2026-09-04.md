# Midlertidig pause af normal vejrproduktion – 2026-09-04

## Aktuel tilstand: pausen er ophævet efter engangsstart

Nyeste status: Engangsrun `33871205875` og normal efterfølger `33871347088` er afsluttet med kontrolleret Copernicus-budgetstop. Begge gemte fremgangen. Normal efterfølger restored faktisk alle fire cachefamilier fra engangsrun. Ingen pause er genindført. Afvent den lokale fælles HARMONIE-vindrettelse og dens sikre merge før ejerens næste store engangsopfyldning. Nedenstående running/pending-status er historisk, ikke aktuelle kørsler.

- PR #251 bestod kildekontrol `33868559595` / job `101008888803` på head `476b969a` og blev merged 12:06:47Z som `bd47dc9f21f4d0bbc01848a8ebd7d6327a960afd`.
- Engangsrun `33871205875` blev oprettet 12:07:31Z på denne main med `operational_118_preflight=true`, `full_coast=false` og uden sample_time. Job `101017362341` startede 12:07:34Z og arbejder nu i DMI. Rå DMI-, behandlede DMI-, regionale og Copernicus-cacher er alle gendannet med grønne trin; dette er ikke et fuldt 118-timersbevis.
- Normal workflow `318363965` blev derefter genaktiveret; GitHub bekræfter `state=active`. Der er INGEN resterende planlagt deaktivering.
- Præcis én normal efterfølger blev bestilt efter en kontrol for eksisterende aktive normale runs: `33871347088` på samme main. GitHub bekræfter `pending` og `total_count=0`; den venter bag engangsrun og arbejder ikke samtidig. Genoptagelsen afhænger således ikke af, at Codex/computeren forbliver online.
- Den gamle normal run `33869747348` er cancelled. Denne historiske pause må ikke automatisk anvendes igen. Følg nu engangsrun og den ventende efterfølger; genbestil ikke nogen af dem i blinde.

Nedenstående afsnit bevarer begrundelse, tidligere status og nødkommando som revisionsspor. De beskriver ikke en stadig aktiv pause.

## Ejerbeslutning og afgrænsning

Ejeren har udtrykkeligt bedt om at annullere den almindelige vejrkørsel og sætte normale kørsler på pause, mens den samlede engangsopfyldning gennemføres. Sol med Ekstra høj indsats bruges til driftsændringen.

- Normal run `33869747348` på `61575559b82ad22ca3d3fa3f86b43d846f0f7581`: GitHub bekræfter `completed/cancelled`. Den var i DMI-trinnet før cache-save; nyt ikke-uploadet arbejde kan kræve genhentning. Allerede gemte caches slettes ikke.
- PR #251, head `476b969a3ac365ad9dc07721128b3e1358135ab7`, source-run `33868559595`: senest i kontrol; ingen ny engangsopfyldning er startet.
- En samlet deaktivering af normal vejrproduktion og cachekeepalive blev afvist af automatisk sikkerhedskontrol. Ingen af de to ændringer blev udført.

## Snævrere pause og genoptagelse

Den snævrere pause er gennemført og verificeret: kun workflow `318363965` / `update-and-deploy.yml` har `state=disabled_manually`. Keepalive, eksternt cron-job, PR-kontrol og den manuelle engangsvej bevares. GitHubs officielle dokumentation bekræfter, at workflowet kan genaktiveres uden sletning eller kodeændring.

Nyeste ejerpræcisering tillader normal drift, hvis engangskørslen ikke forsinkes. Main `61575559` bruger samme concurrencygruppe `ravradar-weather-production`, `queue: max` og `cancel-in-progress: false` i normal produktion og engangsworkflow. PR #251 ændrer ikke dette. Genaktivér derfor normal produktion STRAKS EFTER, at den nye engangskørsels job faktisk er startet og ejer køen. Normale kørsler venter bag den og overtager automatisk, også hvis ejerens computer senere slukkes. Pending/queued alene er ikke et startbevis. Ved afbrydelse før engangsstart genaktiveres normal drift straks. Kommando:

```text
gh workflow enable update-and-deploy.yml --repo jakobjorgensen82-commits/RavRadar
```

Genoptagelsen kræver readback `state=active` og kontrol af, at en eventuel normal kørsel venter bag det aktive engangsjob. Kontrollér eksisterende eksterne cronleverancer efter genaktivering. Ingen dubletmonitor, ny scheduler, cachesletning, kunstig historik, credentialhandling, geometri- eller punktændring indgår.

Den eksisterende Codex-kontrol er nu read-only til status og dokumenterede delmål. Sikkerhedskontrollen afviste at gemme bred automatisk kode-/merge-/driftsautoritet i prompten; driftsændringer håndteres i den aktive Sol-opgave under ejerens aktuelle autoritet. Kontrollen skal kende pausen og advare, hvis genaktivering efter engangsstart mangler. Dette er et lokalt driftscheckpoint og må ikke genstarte PR-kontrollen gennem en status-only commit.
