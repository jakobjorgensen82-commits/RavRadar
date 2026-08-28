# DEC-0100 – Fælles offentlig RavRadar-kontakt

- **Status:** Kildevalideret kandidat til 4.0.304; produktion afventer.
- **Dato:** 2026-08-28
- **Ejerbeslutning:** Kontaktknappen og mailadressen under **Om RavRadar** skal repræsentere RavRadar.

## Beslutning

1. Den danske knaptekst er **Skriv til RavRadar**.
2. Den offentlige kontaktadresse er `RavRadar@outlook.dk` og bruges uændret i `mailto:`-linket på dansk, tysk og engelsk.
3. Tysk og engelsk bruger tilsvarende RavRadar-brandet knaptekst frem for personnavnet.
4. Den tidligere personlige mailadresse og de tidligere personlige knaptekster må ikke findes i Om-sidens kilder.
5. Klik åbner fortsat brugerens eget mailprogram; siden indsamler ingen nye data.

## Verifikation

Om-sidekontrakten kontrollerer den danske tekst, de tyske og engelske oversættelser, tre ens `mailto:`-links samt fraværet af de tidligere kontaktværdier. Målrettede kontroller, RDKS, versionskontrol, fuld lokal sourcegate, releasegate og et særskilt geodatabevis er grønne. Exact-head-, produktions- og offentlig DA/DE/EN-verifikation afventer.

## Grænser

Kun kontaktknappens tekst og destination ændres. Candidate G, RavScore, vejr, prognoser, sortering, konto-/turdata, privatliv, assistent, geometri og land-/vandpunkter er uændrede. Geodatafiler må kun få topversion 4.0.304; Sibirien forbliver privat staged og uaktiveret.
