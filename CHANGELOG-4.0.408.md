# RavRadar 4.0.408 – frisk Copernicus-journal efter referenceflyt

Dato: 2026-09-18

## Ændret

- Når en varigt gemt Copernicus-segmentjournal afspilles efter, at
  produktionstimen er flyttet, genbruges dens forsøgskvitteringer kun inden
  for den samme firetimersgrænse som den almindelige source-stage-rebase.
- Gyldige positive målinger bevares fortsat i donorbanken. Rettelsen fjerner
  kun forældet negativ forsøgs-/udmattelsesevidens; den ændrer ikke data,
  kildeprioritet, geometri, score eller providergrænser.
- En regression beviser både nul-overlap og fem timer gammel journal, og de
  målrettede source-stage-, pilot- og segmentjournaltests er grønne.

## Baggrund

4.0.407 blev leveret gennem exact-head `35305418536`, PR #351, main
`74ce8c38541e425150905f51c91d2a7dd434687b` og providerfri code-only
`35306056877`.

Normalrun `35306467385` gennemførte DMI og gemte fremgangen. Den almindelige
96-timers vindplan blev vurderet; HARMONIE havde nul nødvendige parametre for
den aktuelle targettime. Copernicus genfandt 3.181 dækkede par i sin gyldige
`IN_PROGRESS`-tilstand, men en ældre segmentjournal lagde derefter en
forældet forsøgsreference tilbage. Producenten stoppede på
`source attempt reference mismatch`, og den efterfølgende gate så derfor den
gamle source-stage som stale. Open-Meteo og deploy blev ikke nået.

## Drift

Efter exact-head, merge og en kort providerfri kodeleverance køres én
almindelig weather på de allerede gemte DMI- og Copernicus-cacher. Ingen
oneoff eller bootstrap startes, medmindre den målte restdækning efter den
normale kæde viser et reelt behov.
