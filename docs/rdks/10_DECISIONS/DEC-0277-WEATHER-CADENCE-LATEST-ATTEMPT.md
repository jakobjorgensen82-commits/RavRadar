# DEC-0277 – Et genkørt forsøg tæller i sit faktiske startslot

**Dato:** 2026-10-02.
**Status:** Afgrænset lokal4.0.530, stakket efter529; exact-head CI og levering afventer.

## Konkret fejl og afgrænsning

Den eksterne firetimerskontrol brugte kun GitHubs oprindelige created_at.
Et afsluttet andet forsøg kunne derfor være startet i det aktuelle slot,
men blive regnet som forrige slots gamle run. Det kunne tillade en ny
vejrhentning trods DEC-0259s regel om højst ét startet forsøg i samme slot.
Dette er særskilt schedulerarbejde fra den store revision, ikke en sideeffekt
af cache-, score- eller UI-arbejdet. Ingen faktisk dubletstart er målt.

GitHubs officielle workflow-run API returnerer run_attempt og run_started_at:
https://docs.github.com/en/rest/actions/workflow-runs . Read-only metadata for
to tidligere main-runs viste attempt2 med bevaret oprindelig created_at og
senere run_started_at. Der blev ikke hentet logs eller private vejrdata.

## Mindste rettelse og uændrede regler

Første forsøg beholder oprindelig created_at som slotidentitet. Et senere
forsøg bruger det faktisk oplyste run_started_at. Forsøgsnummer skal være
et positivt heltal, og senere start skal ligge mellem oprettelse og seneste
opdatering. Manglende eller modstridende metadata stopper uden dispatch;
updated_at alene må aldrig opfattes som en start.

Aktive og ventende runs spærrer stadig globalt. Også fejl og cancellation
i samme slot tæller som et allerede startet forsøg. Et afsluttet forsøg
fra forrige slot spærrer ikke kun fordi det blev færdigt efter slotgrænsen.
De tre eksakte legacy-køundtagelser, to friske kontroller, 1–90min-vinduet,
cronplan/payload, almindelige budgetter, concurrency og alle efterdatagates
bevares. Ingen ny retry, API, scheduler, credentials, geometri eller model.

## Bevis og levering

Den eksisterende regression reproducerede RED: et senere afsluttet forsøg
i samme slot gav fejlagtigt dispatch=true. Efter den lille rettelse består
begge indgange, success/failure/cancelled, foregående slots sene completion,
ukendt forsøgsnummer og ugyldigt/manglende starttid samt alle gamle cases.
Eksisterende production-watchdog-script importerer samme regression; ingen
nyt testmiljø eller ny testgruppe. Read-only vurdering af faktisk100+79-run-
metadata gav dispatch=false/weather-run-active-or-queued. Dette er faktisk
læsekompatibilitet, IKKE en produktionsobserveret genkørselsgren eller dublet.

529/PR497/head554a82f4 har grøn exact-head CI36944627707 og må ikke ændres.
530 stakkes separat på529. Ordinary36945405432 på528/mainba085f6b kører;
ingen merge/mainændring, ekstra dispatch eller cancellation. Efter afslutning
og resultatkontrol leveres klar529 først, så retarget/kontrol af530 mod main.
530 kræver egen exact-head CI. Publicering og næste naturlige kontrol skal
observeres før driftsvirkning påstås. Stor519 har samme lille lokale fix;
dens OFF-stack, top20 og særskilte afvisninger ændres ikke.

## Tillæg 2026-11-03 — sikre læseforsøg før én bestilling

Ved en kortvarig fejl hos GitHub skal systemet kunne forsøge den samme læsning igen. Den afgrænsede kandidat gør det kun ved serverfejl 502, 503 eller 504 og ved læserens egen tidsgrænse. Hver læsning har højst tre forsøg på hver ti sekunder med ét og to sekunders pause. De fem nødvendige læsninger holder sig dermed inden for kontrollens eksisterende fem minutter. Manglende adgang, ukendt svar eller uventede metadata giver fortsat stop.

Der kontrolleres stadig to gange, før en almindelig vejrhentning bestilles. Selve bestillingen forsøges kun én gang med en grænse på tyve sekunder. Hvis det ikke kan afgøres, om GitHub modtog den, må systemet ikke bestille endnu en automatisk. Tidsplan, slotregler, overlapværn, vejrkilder, cache, scoremodel og datakontroller bevares. Kandidaten er lokalt prøvet; faktisk Linux-kontrol, levering og observeret håndtering af en sådan fejl er fortsat åbne.

Den faktiske fejl var en skrivefri GitHub-læsning med HTTP 502 før dispatch. Kun de tre faste metadataadresser er tilladt i den nye læser. Authentificering genbruger det eksisterende jobtoken; faste fejlkategorier må ikke afsløre rå svar eller credentials. Ukendte netfejl får ikke genforsøg. Det normale Linux-mål skal udføre de faktiske workflowblokke med begge checkers og bestillingens ukendte udfald; manglende Bash på Windows er ikke en bestået Linux-prøve.

## Når den automatiske vejrhentning stopper

GitHub opretter en sag til ejeren, når en almindelig vejrkørsel fejler. Åbn sagen for at se den konkrete kørsel. Begynd med at kontrollere, om en nyere kørsel allerede har startet eller udgivet prognosen. [Almindelige vejrkørsler](https://github.com/jakobjorgensen82-commits/RavRadar/actions/workflows/run-current-weather-once.yml)

1. Hvis en almindelig vejrkørsel er i gang, følg den. Efter afslutningen viser jobbet **Require a verified current-weather deployment**, om den nye prognose er kontrolleret på RavRadar. Ved en tilladt gentagelse forsøger Pages-jobbet at udgive den samme færdige prognose i samme kørsel. Se resultatet af hele kørslen, når de relevante trin er færdige.
2. Hvis den forventede start mangler, åbn **Guard external RavRadar weather cadence**. Tjek beslutningen i den nyeste kørsel og se, om der findes en tilsvarende almindelig vejrkørsel. Et afslag om aktiv kørsel eller brugt slot er en forventet overlapkontrol. Hvis selve tidsplankontrollen mangler, kontrollér det eksisterende job på cron-job.org. Tidsplanen følger UTC. [Tidsplankontrollen](https://github.com/jakobjorgensen82-commits/RavRadar/actions/workflows/watch-missed-weather-schedule.yml)
3. Ejeren kan anmode om ét nyt forsøg på den seneste fejlede almindelige botkørsel i samme slot, hvis ingen nyere vejr- eller genudgivelseskørsel er startet. Vejrvagten regner også en afsluttet genudgivelse i mellemtiden som en nyere kørsel. Åbn **Guard external RavRadar weather cadence**, vælg **Run workflow** på `main`, og indsæt kørslens numeriske ID i `owner_retry_after_failed_run_id`. Lad `external_watchdog` være slået fra og `recovery_source_run_id` stå tomt. Slotgrænserne er 00.17, 04.17, 08.17, 12.17, 16.17 og 20.17 UTC. Startvinduet åbner ét minut efter grænsen og lukker 90 minutter efter den. Vejrvagten kontrollerer igen umiddelbart før bestillingen.
4. Hvis vinduet er lukket, følg næste planlagte start. Hvis bestillingen har uafklaret udfald, slå den modtagende kørsel op i GitHub Actions, før du foretager dig mere. Ved gentagne fejl giv den vedligeholdelsesansvarlige linket til den fejlede kørsel, det første trin med en konkret fejl og linket til seneste verificerede udgivelse.
