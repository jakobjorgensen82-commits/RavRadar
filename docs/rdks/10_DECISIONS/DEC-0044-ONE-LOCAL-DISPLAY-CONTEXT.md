# DEC-0044 – Én lokal visningskontekst gennem hele zonepanelet

- **Status:** Aktiv og produktionsverificeret i 4.0.235/4.0.237; direkte visuel onlinekontrol afventer Browser-plugin-diagnostik med ejer-godkendt Chromium/Playwright-fallback
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

## Produktionsbevis

`#32249770288`/`#3216` bestod frisk central 673/673, fuld validering, releasegate, Supabase og Pages. Live datasæt `rr-20260819115558-210` er hash- og runtimeverificeret for 210 zoner, 673 dele, 420 aktuelle visninger og 2.100 femdøgnsvisninger. Alle visninger bruger enten én komplet lokal kontekst eller en eksplicit samlet hovedzonefallback.

Den faktiske DOM-/kliktest af den online side skal gentages. Codex-browserpluginet og målrettet diagnostik forsøges først; hvis der ikke findes en konkret reparationsvej, bruges den ejer-godkendte Chromium/Playwright-fallback. Dette ændrer ikke det centrale data-, runtime- eller deploybevis og må ikke ændre ejerens land-/vandpunkter.
