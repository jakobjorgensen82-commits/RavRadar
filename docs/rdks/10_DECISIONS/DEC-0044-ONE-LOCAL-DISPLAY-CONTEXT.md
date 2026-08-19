# DEC-0044 – Én lokal visningskontekst gennem hele zonepanelet

- **Status:** Aktiv beslutning, lokalt implementeret i 4.0.235; central produktion og direkte livebrowser afventer
- **Dato:** 2026-08-19

## Beslutning

Når RavRadar udpeger en lokal kystdel, skal del-ID, delnavn, valgt tidspunkt, RavScore, forklaring, debug og alle synlige vejrdata komme fra den samme lokale runtimepost. Den aktuelle visning og femdøgnsvisningen må ikke kombinere en lokal score med hovedzonens vejr eller et andet tidsvalg.

Den nationale prognose og zonepanelets femdøgnsfaner skal bruge samme fælles lokale `bestForDay`-funktion. Runtimebyggeren skal derfor bevare den vindende dels kompakte præsentationsgrundlag på hver fælles time: komponenter, forklaringsårsager, transportforklaring og de viste vejrmetrikker. Det fulde aktuelle debuggrundlag bevares fortsat på den eksakte vinderdel.

Hvis alle lokale dele ikke har en komplet fælles post ved det valgte tidspunkt, må systemet kun vise en udtrykkeligt mærket hovedzonefallback, hvor score, tekst, debug og vejr samlet kommer fra hovedzonen. Mangler kun den lokale vejrpost, vises felterne som manglende; hovedzonens værdier må ikke lånes ind under den lokale score.

## Afgrænsning

Beslutningen flytter eller omskriver ingen centralt gemte land-/vandpunkter, kystlinjer eller retningsankre. Den ændrer heller ikke U/V, pilceller, kildeorden, afstandsgrænser, RavScoreformel, 168-timersretention, rollback eller kravet om præcis 673/673.

## Beviskrav

- En landsdækkende regression skal dække 210 zoner, 673 kystdele, begge jagtformer og fem døgn og sammenligne vinder, tid, score, vejr og forklaring.
- Eksisterende lokale score-, forklarings-, kort-, null-safety- og payloadtests skal bestå.
- Frisk central validering, releasegate, Supabase, Pages og direkte livebrowser skal bestå, før rettelsen kaldes produktionsverificeret.
- Fælles aktuel timedækning skal fortsat rapporteres særskilt fra artifactets samlede 673/673-proveniens. En ny kilde eller lavere gate kræver ejerbeslutning.
