# DEC-0100 – Fælles offentlig RavRadar-kontakt

- **Status:** Produktionsverificeret i 4.0.304.
- **Dato:** 2026-08-28
- **Ejerbeslutning:** Kontaktknappen og mailadressen under **Om RavRadar** skal repræsentere RavRadar.

## Beslutning

1. Den danske knaptekst er **Skriv til RavRadar**.
2. Den offentlige kontaktadresse er `RavRadar@outlook.dk` og bruges uændret i `mailto:`-linket på dansk, tysk og engelsk.
3. Tysk og engelsk bruger tilsvarende RavRadar-brandet knaptekst frem for personnavnet.
4. Den tidligere personlige mailadresse og de tidligere personlige knaptekster må ikke findes i Om-sidens kilder.
5. Klik åbner fortsat brugerens eget mailprogram; siden indsamler ingen nye data.

## Verifikation

Om-sidekontrakten kontrollerer den danske tekst, de tyske og engelske oversættelser, tre ens `mailto:`-links samt fraværet af de tidligere kontaktværdier. PR #211 bestod exact-head `33183709302`/job `98891147198` på `cb018775` og blev merged som `e5eed868`. Produktion `33183809909`, build `98891543382` og Pages `98893788414` er grønne. Offentlig 4.0.304 viste 210 zoner, fem aktuelle områder og fem prognosedage; alle tre kontaktknapper var synlige med samme godkendte destination.

## Grænser

Kun kontaktknappens tekst og destination ændres. Candidate G, RavScore, vejr, prognoser, sortering, konto-/turdata, privatliv, assistent, geometri og land-/vandpunkter er uændrede. Geodatafiler må kun få topversion 4.0.304; Sibirien forbliver privat staged og uaktiveret.
