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
